// Follow this project: https://supabase.com/docs/guides/functions
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const BASE_URL = "https://erp.gso.gov.bd";
const HTTP_BASE_URL = "http://erp.gso.gov.bd"; // HTTP fallback for TLS issues
const SEARCH_PAGE = `${BASE_URL}/cdc-search/`;
const SEARCH_ACTION = `${BASE_URL}/frontend/web/cdc-search`;

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Wrapper: try HTTPS first, fall back to HTTP if TLS cert fails
async function fetchGov(url: string, init?: RequestInit): Promise<Response> {
    try {
        return await fetch(url, init);
    } catch (err: unknown) {
        const msg = (err as Error).message || "";
        if (
            msg.includes("UnknownIssuer") ||
            msg.includes("certificate") ||
            msg.includes("tls")
        ) {
            const httpUrl = url.replace("https://", "http://");
            return await fetch(httpUrl, init);
        }
        throw err;
    }
}

// ─── In-App Session Store ──────────────────────────────────
// Stores DOS session cookies + CSRF tokens, keyed by a random sessionId.
// Each entry expires after 10 minutes.

interface SessionData {
    cookies: string;
    csrfToken: string;
    createdAt: number;
}

const sessionStore = new Map<string, SessionData>();
const SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutes

function cleanupSessions() {
    const now = Date.now();
    for (const [id, data] of sessionStore) {
        if (now - data.createdAt > SESSION_TTL_MS) {
            sessionStore.delete(id);
        }
    }
}

function generateSessionId(): string {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    return Array.from(arr, b => b.toString(16).padStart(2, "0")).join("");
}

// ─── Action: init_session ──────────────────────────────────
// Fetches the DOS search page, gets session cookies + CSRF, fetches the
// CAPTCHA image, and returns {sessionId, captchaBase64} to the frontend.

async function initSession(): Promise<Response> {
    cleanupSessions();

    try {
        console.log("[CDC] init_session started");
        // 1. Fetch the search page to get cookies + CSRF token
        const pageRes = await fetchGov(SEARCH_PAGE, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                Accept: "text/html",
            },
            redirect: "follow",
        });

        if (!pageRes.ok) {
            console.error(`[CDC] DOS site returned HTTP ${pageRes.status}`);
            return jsonResponse({ success: false, error: `DOS site returned HTTP ${pageRes.status}` }, 502);
        }

        const cookies = extractCookies(pageRes);
        console.log(`[CDC] Page cookies: ${cookies}`);

        const html = await pageRes.text();

        // Extract CSRF token from meta tag
        const csrfMatch = html.match(/name="csrf-token"\s+content="([^"]+)"/);
        if (!csrfMatch) {
            console.error("[CDC] Could not extract CSRF token.");
            return jsonResponse({ success: false, error: "Could not extract CSRF token from DOS page." }, 500);
        }
        const csrfToken = csrfMatch[1];

        // Extract CAPTCHA image URL
        const captchaUrlMatch = html.match(/id="cdcsearchform-captcha-image"\s+src="([^"]+)"/);
        if (!captchaUrlMatch) {
            console.error("[CDC] Could not find CAPTCHA image URL.");
            return jsonResponse({ success: false, error: "Could not find CAPTCHA image on DOS page." }, 500);
        }
        const captchaPath = captchaUrlMatch[1];
        const captchaUrl = captchaPath.startsWith("http") ? captchaPath : `${BASE_URL}${captchaPath}`;

        console.log(`[CDC] Fetching CAPTCHA from: ${captchaUrl}`);

        // 2. Fetch the CAPTCHA image using the same session cookies
        const captchaRes = await fetchGov(captchaUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                Cookie: cookies,
                Referer: SEARCH_PAGE,
            },
        });

        if (!captchaRes.ok) {
            console.error(`[CDC] Failed to fetch CAPTCHA image: HTTP ${captchaRes.status}`);
            return jsonResponse({ success: false, error: `Failed to fetch CAPTCHA image: HTTP ${captchaRes.status}` }, 502);
        }

        // Merge any new cookies from the CAPTCHA response
        const captchaCookies = extractCookies(captchaRes);
        console.log(`[CDC] CAPTCHA cookies: ${captchaCookies}`);
        const allCookies = mergeCookies(cookies, captchaCookies);
        console.log(`[CDC] Final session cookies: ${allCookies}`);

        // Convert CAPTCHA to base64
        const captchaBuffer = await captchaRes.arrayBuffer();
        const captchaBase64 = btoa(
            String.fromCharCode(...new Uint8Array(captchaBuffer))
        );

        // 3. Store session
        const sessionId = generateSessionId();
        sessionStore.set(sessionId, {
            cookies: allCookies,
            csrfToken,
            createdAt: Date.now(),
        });
        console.log(`[CDC] Session created: ${sessionId}`);

        return jsonResponse({
            success: true,
            sessionId,
            captchaBase64: `data:image/png;base64,${captchaBase64}`,
        });
    } catch (err) {
        console.error(`[CDC] init_session error: ${(err as Error).message}`);
        return jsonResponse({ success: false, error: `init_session error: ${(err as Error).message}` }, 500);
    }
}


// ─── Action: submit_search ─────────────────────────────────
// Takes {sessionId, cdcNumber, dob, captcha}, POSTs to DOS, parses results.

async function submitSearch(body: {
    sessionId: string;
    cdcNumber: string;
    dob: string;
    captcha: string;
}): Promise<Response> {
    const { sessionId, cdcNumber, dob, captcha } = body;

    if (!sessionId || !cdcNumber || !dob || !captcha) {
        return jsonResponse({ success: false, error: "Missing required fields: sessionId, cdcNumber, dob, captcha" }, 400);
    }

    const session = sessionStore.get(sessionId);
    if (!session) {
        console.warn(`[CDC] Session expired/not found: ${sessionId}`);
        return jsonResponse({ success: false, error: "Session expired or invalid. Please refresh the CAPTCHA.", expired: true }, 400);
    }

    // Clean up used session
    sessionStore.delete(sessionId);

    try {
        console.log(`[CDC] Submitting search for ${sessionId} with Cookies: ${session.cookies}`);

        // Build form data
        const formBody = new URLSearchParams();
        formBody.append("_csrf-search", session.csrfToken);
        formBody.append("CdcSearchForm[cdc_number]", cdcNumber);
        formBody.append("CdcSearchForm[date_of_birth]", dob);
        formBody.append("CdcSearchForm[captcha]", captcha);

        // POST to DOS
        const postRes = await fetchGov(SEARCH_ACTION, {
            method: "POST",
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Content-Type": "application/x-www-form-urlencoded",
                Cookie: session.cookies,
                Referer: SEARCH_PAGE,
                Origin: BASE_URL, // Added Origin
                "X-CSRF-Token": session.csrfToken, // Added X-CSRF-Token just in case
                Accept: "text/html",
            },
            body: formBody.toString(),
            redirect: "follow",
        });

        if (!postRes.ok) {
            console.error(`[CDC] POST failed: HTTP ${postRes.status}`);
            return jsonResponse({ success: false, error: `DOS returned HTTP ${postRes.status}` }, 502);
        }

        // Merge cookies from response
        const newCookies = extractCookies(postRes);
        const allCookies = mergeCookies(session.cookies, newCookies);

        const html = await postRes.text();

        // Check for CAPTCHA error (incorrect verification code)
        const captchaError = html.match(
            /field-cdcsearchform-captcha[^>]*has-error/i
        ) || html.match(
            /verification code is incorrect/i
        );

        // Also check if the help-block has an error message for captcha
        const captchaHelpError = html.match(
            /field-cdcsearchform-captcha[\s\S]*?help-block-error\s*">\s*([^<]+)/
        );

        if (captchaError || (captchaHelpError && captchaHelpError[1].trim())) {
            return jsonResponse({
                success: false,
                error: "Incorrect CAPTCHA. Please try again.",
                captchaError: true,
            });
        }

        // Check for "No results found" scenario
        const noResults = html.includes("No results found") ||
            html.includes("No data found") ||
            html.includes("Result not found");

        if (noResults) {
            return jsonResponse({
                success: false,
                error: "No CDC records found for this CDC number and date of birth.",
            });
        }

        // Look for a Details/View link
        const detailsLinkMatch = html.match(
            /href="([^"]*(?:cdc-search\/view|details|detail)[^"]*)"/i
        );

        if (detailsLinkMatch) {
            // Follow the details link to get full info
            const detailsPath = detailsLinkMatch[1];
            const detailsUrl = detailsPath.startsWith("http")
                ? detailsPath
                : `${BASE_URL}${detailsPath.startsWith("/") ? "" : "/"}${detailsPath}`;

            const detailsRes = await fetchGov(detailsUrl, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    Cookie: allCookies,
                    Referer: SEARCH_ACTION,
                    Accept: "text/html",
                },
                redirect: "follow",
            });

            if (detailsRes.ok) {
                const detailsHtml = await detailsRes.text();
                const cdcInfo = parseDetailsPage(detailsHtml, []);

                // Enrich with ship types
                const records = cdcInfo.seaServiceRecords as Record<string, string>[];
                if (records && records.length > 0) {
                    const shipTypeMap = await lookupShipTypes(records);
                    for (const rec of records) {
                        const imoKey = Object.keys(rec).find(k => k.toLowerCase().includes('imo'));
                        const imo = imoKey ? rec[imoKey]?.trim() : '';
                        const nameKey = Object.keys(rec).find(k => k.toLowerCase().includes('ship') || k.toLowerCase().includes('vessel'));
                        const shipName = nameKey ? rec[nameKey]?.trim().toLowerCase() : '';
                        if (imo && shipTypeMap[imo]) {
                            rec['_shipType'] = shipTypeMap[imo];
                        } else if (shipName && shipTypeMap[shipName]) {
                            rec['_shipType'] = shipTypeMap[shipName];
                        }
                    }
                }

                return jsonResponse({ success: true, cdcInfo });
            }
        }

        // If no details link, try to parse the search results page directly
        const cdcInfo = parseDetailsPage(html, []);
        if (cdcInfo.detailsAvailable) {
            return jsonResponse({ success: true, cdcInfo });
        }

        // Try to extract search results table
        const tableMatch = html.match(/<table[^>]*>([\s\S]*?)<\/table>/gi);
        if (tableMatch) {
            const lastTable = tableMatch[tableMatch.length - 1];
            const rows = lastTable.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
            const resultRows: Record<string, string>[] = [];
            let headers: string[] = [];

            for (const row of rows) {
                const thCells = row.match(/<th[^>]*>([\s\S]*?)<\/th>/gi);
                if (thCells && thCells.length > 0) {
                    headers = thCells.map(th => stripTags(th).trim());
                    continue;
                }
                const tdCells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
                if (tdCells && tdCells.length > 0) {
                    const rowData: Record<string, string> = {};
                    tdCells.forEach((td, idx) => {
                        rowData[headers[idx] || `col_${idx}`] = stripTags(td).trim();
                    });
                    resultRows.push(rowData);
                }
            }

            if (resultRows.length > 0) {
                return jsonResponse({
                    success: true,
                    cdcInfo: {
                        searchResults: resultRows,
                        details: {},
                        detailsAvailable: false,
                        note: "Found search results but could not auto-navigate to details page.",
                    },
                });
            }
        }

        return jsonResponse({
            success: false,
            error: "Could not find CDC details. The CAPTCHA may have been incorrect, or the CDC number/DOB may not match.",
        });
    } catch (err) {
        return jsonResponse({
            success: false,
            error: `submit_search error: ${(err as Error).message}`,
        }, 500);
    }
}

// ─── Helpers ───────────────────────────────────────────────

/** Extract all Set-Cookie headers and return them as a single cookie string */
function extractCookies(response: Response): string {
    const cookies: string[] = [];
    const setCookieHeaders = response.headers.getSetCookie?.() ?? [];
    for (const sc of setCookieHeaders) {
        const nameValue = sc.split(";")[0].trim();
        if (nameValue) cookies.push(nameValue);
    }
    if (cookies.length === 0) {
        const raw = response.headers.get("set-cookie");
        if (raw) {
            for (const part of raw.split(",")) {
                const nameValue = part.split(";")[0].trim();
                if (nameValue && nameValue.includes("=")) cookies.push(nameValue);
            }
        }
    }
    return cookies.join("; ");
}

/** Merge new cookies into an existing cookie string */
function mergeCookies(existing: string, newCookies: string): string {
    const map = new Map<string, string>();
    for (const c of existing.split("; ").filter(Boolean)) {
        const [k, ...v] = c.split("=");
        map.set(k, v.join("="));
    }
    for (const c of newCookies.split("; ").filter(Boolean)) {
        const [k, ...v] = c.split("=");
        map.set(k, v.join("="));
    }
    return Array.from(map.entries())
        .map(([k, v]) => `${k}=${v}`)
        .join("; ");
}

/** Simple HTML entity decoder */
function decodeEntities(html: string): string {
    return html
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&#39;/g, "'");
}

/** Extract text between tags, stripping inner HTML */
function stripTags(html: string): string {
    return decodeEntities(html.replace(/<[^>]*>/g, "")).trim();
}

// ─── Action 1: Fetch CAPTCHA ──────────────────────────────

async function fetchCaptcha(): Promise<Response> {
    try {
        // Step 1: GET the search page to obtain CSRF token & session cookies
        const pageRes = await fetchGov(SEARCH_PAGE, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                Accept:
                    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
            redirect: "follow",
        });

        if (!pageRes.ok) {
            return jsonResponse(
                {
                    success: false,
                    error: `Failed to load search page: ${pageRes.status}`,
                },
                500
            );
        }

        const html = await pageRes.text();
        let sessionCookies = extractCookies(pageRes);

        // Step 2: Extract CSRF token
        const csrfMatch = html.match(
            /name="(_csrf-search|_csrf)"[^>]*value="([^"]*)"/
        );
        if (!csrfMatch) {
            return jsonResponse(
                { success: false, error: "Could not find CSRF token on search page" },
                500
            );
        }
        const csrfName = csrfMatch[1];
        const csrfToken = csrfMatch[2];

        // Step 3: Extract CAPTCHA image URL
        const captchaImgMatch = html.match(
            /id="cdcsearchform-captcha-image"[^>]*src="([^"]*)"/
        );
        if (!captchaImgMatch) {
            return jsonResponse(
                {
                    success: false,
                    error: "Could not find CAPTCHA image on search page",
                },
                500
            );
        }
        let captchaUrl = captchaImgMatch[1];
        if (captchaUrl.startsWith("/")) {
            captchaUrl = BASE_URL + captchaUrl;
        }

        // Step 4: Fetch the CAPTCHA image with session cookies
        const imgRes = await fetchGov(captchaUrl, {
            headers: {
                Cookie: sessionCookies,
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                Referer: SEARCH_PAGE,
            },
        });

        if (!imgRes.ok) {
            return jsonResponse(
                {
                    success: false,
                    error: `Failed to fetch CAPTCHA image: ${imgRes.status}`,
                },
                500
            );
        }

        // Merge any new cookies from the CAPTCHA request
        const imgCookies = extractCookies(imgRes);
        if (imgCookies) {
            sessionCookies = mergeCookies(sessionCookies, imgCookies);
        }

        // Step 5: Convert image to base64
        const imgBuffer = await imgRes.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(imgBuffer)));
        const contentType = imgRes.headers.get("content-type") || "image/png";
        const captchaImage = `data:${contentType};base64,${base64}`;

        return jsonResponse({
            success: true,
            captchaImage,
            csrfToken,
            csrfName,
            sessionCookies,
        });
    } catch (err) {
        return jsonResponse(
            {
                success: false,
                error: `fetch_captcha error: ${(err as Error).message}`,
            },
            500
        );
    }
}

// ─── Action 2: Submit Verification ────────────────────────

async function submitVerification(body: {
    cdcNumber: string;
    dob: string;
    captcha: string;
    csrfToken: string;
    csrfName?: string;
    sessionCookies: string;
}): Promise<Response> {
    const {
        cdcNumber,
        dob,
        captcha,
        csrfToken,
        csrfName = "_csrf-search",
        sessionCookies,
    } = body;

    if (!cdcNumber || !dob || !captcha || !csrfToken || !sessionCookies) {
        return jsonResponse(
            {
                success: false,
                error:
                    "Missing required fields: cdcNumber, dob, captcha, csrfToken, sessionCookies",
            },
            400
        );
    }

    let currentCookies = sessionCookies;

    try {
        // ── Step 1: POST the search form ──────────────────────
        const formData = new URLSearchParams();
        formData.set(csrfName, csrfToken);
        formData.set("CdcSearchForm[cdc_number]", cdcNumber);
        formData.set("CdcSearchForm[date_of_birth]", dob);
        formData.set("CdcSearchForm[captcha]", captcha);

        const searchRes = await fetchGov(SEARCH_ACTION, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Cookie: currentCookies,
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                Referer: SEARCH_PAGE,
                Origin: BASE_URL,
            },
            body: formData.toString(),
            redirect: "follow",
        });

        if (!searchRes.ok) {
            return jsonResponse(
                {
                    success: false,
                    error: `Search form submission failed: ${searchRes.status}`,
                },
                500
            );
        }

        // Merge cookies
        const searchCookies = extractCookies(searchRes);
        if (searchCookies) {
            currentCookies = mergeCookies(currentCookies, searchCookies);
        }

        const resultsHtml = await searchRes.text();

        // ── Step 2: Check for errors ──────────────────────────
        if (
            resultsHtml.includes("The verification code is incorrect") ||
            (resultsHtml.includes("captcha") &&
                resultsHtml.includes("help-block"))
        ) {
            const errorMatch = resultsHtml.match(
                /class="help-block"[^>]*>([^<]*)</
            );
            return jsonResponse({
                success: false,
                error: errorMatch
                    ? stripTags(errorMatch[1])
                    : "CAPTCHA verification failed. Please try again.",
                errorType: "captcha_invalid",
            });
        }

        // ── Step 3: Parse results table ───────────────────────
        const tableMatch = resultsHtml.match(
            /<table[^>]*>([\s\S]*?)<\/table>/gi
        );
        if (!tableMatch || tableMatch.length === 0) {
            if (
                resultsHtml.includes("No results found") ||
                resultsHtml.includes("no record")
            ) {
                return jsonResponse({
                    success: false,
                    error: "No CDC records found for the given information.",
                    errorType: "not_found",
                });
            }
            return jsonResponse({
                success: false,
                error:
                    "Could not find results table in response. The search may have failed.",
                errorType: "parse_error",
                rawHtmlSnippet: resultsHtml.substring(0, 2000),
            });
        }

        // Parse the results table
        const resultsTable = tableMatch[tableMatch.length - 1];
        const rowMatches =
            resultsTable.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];

        const resultRows: Record<string, string>[] = [];
        let headers: string[] = [];

        for (const rowHtml of rowMatches) {
            const thMatches = rowHtml.match(/<th[^>]*>([\s\S]*?)<\/th>/gi);
            if (thMatches && thMatches.length > 0) {
                headers = thMatches.map((th) => stripTags(th).toUpperCase());
                continue;
            }

            const tdMatches = rowHtml.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
            if (tdMatches && tdMatches.length > 0) {
                const row: Record<string, string> = {};
                tdMatches.forEach((td, idx) => {
                    const key = headers[idx] || `col_${idx}`;
                    row[key] = stripTags(td);
                });
                resultRows.push(row);
            }
        }

        // ── Step 4: Extract Details button URL ────────────────
        let detailsUrl: string | null = null;

        const detailsLinkMatch = resultsHtml.match(
            /<a[^>]*href="([^"]*)"[^>]*>[\s\S]*?(?:Details|View|detail)[\s\S]*?<\/a>/i
        );
        if (detailsLinkMatch) {
            detailsUrl = detailsLinkMatch[1];
        }

        if (!detailsUrl && tableMatch) {
            const lastTdLinks = resultsTable.match(
                /<a[^>]*href="([^"]*)"[^>]*>/gi
            );
            if (lastTdLinks && lastTdLinks.length > 0) {
                const hrefMatch = lastTdLinks[lastTdLinks.length - 1].match(
                    /href="([^"]*)"/
                );
                if (hrefMatch) detailsUrl = hrefMatch[1];
            }
        }

        if (!detailsUrl) {
            return jsonResponse({
                success: true,
                cdcInfo: {
                    searchResults: resultRows,
                    detailsAvailable: false,
                    note: "Could not find Details link. Returning search results only.",
                },
            });
        }

        // Resolve relative URL
        if (detailsUrl.startsWith("/")) {
            detailsUrl = BASE_URL + detailsUrl;
        } else if (!detailsUrl.startsWith("http")) {
            detailsUrl = BASE_URL + "/" + detailsUrl;
        }

        // ── Step 5: GET the details page ──────────────────────
        const detailsRes = await fetchGov(detailsUrl, {
            headers: {
                Cookie: currentCookies,
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                Referer: SEARCH_ACTION,
            },
        });

        if (!detailsRes.ok) {
            return jsonResponse({
                success: true,
                cdcInfo: {
                    searchResults: resultRows,
                    detailsAvailable: false,
                    error: `Failed to fetch details page: ${detailsRes.status}`,
                },
            });
        }

        const detailsHtml = await detailsRes.text();

        // ── Step 6: Parse the details page ────────────────────
        const cdcInfo = parseDetailsPage(detailsHtml, resultRows);

        return jsonResponse({
            success: true,
            cdcInfo,
        });
    } catch (err) {
        return jsonResponse(
            {
                success: false,
                error: `submit_verification error: ${(err as Error).message}`,
            },
            500
        );
    }
}

/** Parse the full CDC details page into structured data */
function parseDetailsPage(
    html: string,
    searchResults: Record<string, string>[]
): Record<string, unknown> {
    const info: Record<string, string> = {};

    // Strategy 1: table rows with label-value pairs
    const pairRows =
        html.match(
            /<tr[^>]*>\s*<t[hd][^>]*>([\s\S]*?)<\/t[hd]>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi
        ) || [];

    for (const row of pairRows) {
        const cells = row.match(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi);
        if (cells && cells.length >= 2) {
            const key = stripTags(cells[0]).replace(/:/g, "").trim();
            const value = stripTags(cells[1]).trim();
            if (key && value && key.length < 60) {
                info[key] = value;
            }
        }
    }

    // Strategy 2: definition lists
    const dtMatches =
        html.match(
            /<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi
        ) || [];
    for (const dt of dtMatches) {
        const parts = dt.match(
            /<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/i
        );
        if (parts) {
            const key = stripTags(parts[1]).replace(/:/g, "").trim();
            const value = stripTags(parts[2]).trim();
            if (key && value) info[key] = value;
        }
    }

    // Strategy 3: form-group label-value patterns
    const formGroups =
        html.match(
            /<label[^>]*>([\s\S]*?)<\/label>\s*[\s\S]*?<(?:span|p|div|input)[^>]*>([\s\S]*?)<\/(?:span|p|div|input)>/gi
        ) || [];
    for (const fg of formGroups) {
        const labelMatch = fg.match(/<label[^>]*>([\s\S]*?)<\/label>/i);
        const valueMatch = fg.match(
            /<(?:span|p|div)[^>]*class="[^"]*(?:form-control|value|detail)[^"]*"[^>]*>([\s\S]*?)<\/(?:span|p|div)>/i
        );
        if (labelMatch && valueMatch) {
            const key = stripTags(labelMatch[1]).replace(/:/g, "").trim();
            const value = stripTags(valueMatch[1]).trim();
            if (key && value) info[key] = value;
        }
    }

    // Strategy 4: Yii2 DetailView widget
    const detailViewMatch = html.match(
        /<table[^>]*class="[^"]*detail-view[^"]*"[^>]*>([\s\S]*?)<\/table>/i
    );
    if (detailViewMatch) {
        const dvRows =
            detailViewMatch[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
        for (const row of dvRows) {
            const cells = row.match(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi);
            if (cells && cells.length >= 2) {
                const key = stripTags(cells[0]).replace(/:/g, "").trim();
                const value = stripTags(cells[1]).trim();
                if (key && value) info[key] = value;
            }
        }
    }

    // Extract photo if available
    const photoMatch = html.match(
        /<img[^>]*(?:class="[^"]*(?:photo|profile|passport)[^"]*"|id="[^"]*photo[^"]*")[^>]*src="([^"]*)"[^>]*>/i
    );
    if (photoMatch) {
        let photoUrl = photoMatch[1];
        if (photoUrl.startsWith("/")) photoUrl = BASE_URL + photoUrl;
        info["photo_url"] = photoUrl;
    }

    // ── Table Data Extraction (Sea Service, etc.) ──────
    // Extract ALL multi-row tables from the page (not just key-value detail tables)
    const allTables = html.match(/<table[^>]*>([\s\S]*?)<\/table>/gi) || [];
    const seaServiceRecords: Record<string, string>[] = [];
    const allTableHeaders: string[][] = [];

    for (const table of allTables) {
        const rows = table.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
        let tableHeaders: string[] = [];
        const tableRows: Record<string, string>[] = [];

        for (const row of rows) {
            const thCells = row.match(/<th[^>]*>([\s\S]*?)<\/th>/gi);
            if (thCells && thCells.length > 0) {
                tableHeaders = thCells.map(th => stripTags(th).trim());
                continue;
            }
            const tdCells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
            if (tdCells && tdCells.length > 0) {
                const rowData: Record<string, string> = {};
                tdCells.forEach((td, idx) => {
                    const key = tableHeaders[idx] || `col_${idx}`;
                    rowData[key] = stripTags(td).trim();
                });
                tableRows.push(rowData);
            }
        }

        // Include any table with 3+ columns and at least 1 data row
        // (skip small 2-column key-value detail tables)
        if (tableHeaders.length >= 3 && tableRows.length > 0) {
            allTableHeaders.push(tableHeaders);
            seaServiceRecords.push(...tableRows);
        }
    }

    return {
        searchResults,
        details: info,
        detailsAvailable: Object.keys(info).length > 0,
        seaServiceRecords,
        tableHeaders: allTableHeaders,
    };
}

// ─── Action 3: Scrape Details URL ─────────────────────────

async function scrapeDetails(body: { url: string }): Promise<Response> {
    const { url } = body;
    if (!url) {
        return jsonResponse(
            { success: false, error: "Missing required field: url" },
            400
        );
    }

    // Validate that it looks like a DOS/GSO URL
    if (
        !url.includes("gso.gov.bd") &&
        !url.includes("erp.gso") &&
        !url.includes("cdc-search")
    ) {
        return jsonResponse(
            {
                success: false,
                error:
                    "Invalid URL. Please provide a URL from the DOS (erp.gso.gov.bd) website.",
            },
            400
        );
    }

    try {
        const res = await fetchGov(url, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                Accept:
                    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
            redirect: "follow",
        });

        if (!res.ok) {
            return jsonResponse(
                {
                    success: false,
                    error: `Failed to fetch page: HTTP ${res.status}. The page may require an active session.`,
                },
                500
            );
        }

        const html = await res.text();
        const cdcInfo = parseDetailsPage(html, []);

        if (
            !cdcInfo.detailsAvailable ||
            Object.keys(cdcInfo.details as Record<string, string>).length === 0
        ) {
            // Maybe the URL was the search results page, try to parse tables
            const tableMatch = html.match(
                /<table[^>]*>([\s\S]*?)<\/table>/gi
            );
            if (tableMatch) {
                const resultsTable = tableMatch[tableMatch.length - 1];
                const rowMatches =
                    resultsTable.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
                const resultRows: Record<string, string>[] = [];
                let headers: string[] = [];

                for (const rowHtml of rowMatches) {
                    const thMatches = rowHtml.match(/<th[^>]*>([\s\S]*?)<\/th>/gi);
                    if (thMatches && thMatches.length > 0) {
                        headers = thMatches.map((th) => stripTags(th).toUpperCase());
                        continue;
                    }
                    const tdMatches = rowHtml.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
                    if (tdMatches && tdMatches.length > 0) {
                        const row: Record<string, string> = {};
                        tdMatches.forEach((td, idx) => {
                            const key = headers[idx] || `col_${idx}`;
                            row[key] = stripTags(td);
                        });
                        resultRows.push(row);
                    }
                }

                if (resultRows.length > 0) {
                    return jsonResponse({
                        success: true,
                        cdcInfo: {
                            searchResults: resultRows,
                            details: {},
                            detailsAvailable: false,
                            note: "This appears to be a search results page, not a details page. Please navigate to the details page and paste that URL instead.",
                        },
                    });
                }
            }

            return jsonResponse({
                success: false,
                error:
                    "Could not extract CDC details from this page. Make sure you are on the CDC details/view page.",
            });
        }

        // ── Enrich sea service records with ship types from VesselFinder ──
        const records = cdcInfo.seaServiceRecords as Record<string, string>[];
        if (records && records.length > 0) {
            const shipTypeMap = await lookupShipTypes(records);
            // Apply ship types to records (try IMO first, then ship name)
            for (const rec of records) {
                const imoKey = Object.keys(rec).find(k => k.toLowerCase().includes('imo'));
                const imo = imoKey ? rec[imoKey]?.trim() : '';
                const nameKey = Object.keys(rec).find(k => k.toLowerCase().includes('ship') || k.toLowerCase().includes('vessel'));
                const shipName = nameKey ? rec[nameKey]?.trim().toLowerCase() : '';

                if (imo && shipTypeMap[imo]) {
                    rec['_shipType'] = shipTypeMap[imo];
                } else if (shipName && shipTypeMap[shipName]) {
                    rec['_shipType'] = shipTypeMap[shipName];
                }
            }
        }

        return jsonResponse({
            success: true,
            cdcInfo,
        });
    } catch (err) {
        return jsonResponse(
            {
                success: false,
                error: `scrape_details error: ${(err as Error).message}`,
            },
            500
        );
    }
}

// ─── Ship Type Lookup via VesselFinder ────────────────────

const VF_HEADERS = {
    "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "text/html",
};

function extractShipTypeFromHtml(html: string): string | null {
    const match = html.match(
        /<td[^>]*class="tpc1"[^>]*>Ship Type<\/td>\s*<td[^>]*class="tpc2"[^>]*>([^<]+)<\/td>/i
    );
    return match ? match[1].trim() : null;
}

async function lookupShipTypes(
    records: Record<string, string>[]
): Promise<Record<string, string>> {
    // shipTypeMap: keyed by IMO number AND ship name (lowercased)
    const shipTypeMap: Record<string, string> = {};

    // Collect lookup tasks: { imo?, shipName }
    const lookupTasks: { imo: string; shipName: string }[] = [];
    const seen = new Set<string>();

    for (const rec of records) {
        const imoKey = Object.keys(rec).find(k => k.toLowerCase().includes('imo'));
        const imo = imoKey ? rec[imoKey]?.trim() : '';
        const nameKey = Object.keys(rec).find(k => k.toLowerCase().includes('ship') || k.toLowerCase().includes('vessel'));
        const shipName = nameKey ? rec[nameKey]?.trim() : '';

        const dedupKey = imo || shipName.toLowerCase();
        if (!dedupKey || seen.has(dedupKey)) continue;
        seen.add(dedupKey);

        lookupTasks.push({ imo: /^\d{5,}$/.test(imo) ? imo : '', shipName });
    }

    if (lookupTasks.length === 0) return shipTypeMap;

    // Process all lookups concurrently
    const lookups = lookupTasks.map(async ({ imo, shipName }) => {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);

            let shipType: string | null = null;

            if (imo) {
                // ── Lookup by IMO directly ──
                const res = await fetch(
                    `https://www.vesselfinder.com/vessels/details/${imo}`,
                    { headers: VF_HEADERS, signal: controller.signal }
                );
                if (res.ok) {
                    const html = await res.text();
                    shipType = extractShipTypeFromHtml(html);
                }
            }

            if (!shipType && shipName) {
                // ── Fallback: Search by ship name ──
                const cleanName = shipName
                    .replace(/^(M\.?V\.?\s*|S\.?S\.?\s*|MT\.?\s*)/i, '')
                    .trim();
                const searchUrl = `https://www.vesselfinder.com/vessels?name=${encodeURIComponent(cleanName)}`;
                const searchRes = await fetch(searchUrl, {
                    headers: VF_HEADERS,
                    signal: controller.signal,
                });

                if (searchRes.ok) {
                    const searchHtml = await searchRes.text();
                    // Extract first result's details link: /vessels/details/IMO_NUMBER
                    const linkMatch = searchHtml.match(
                        /href="\/vessels\/details\/(\d+)"/
                    );
                    if (linkMatch) {
                        const detailsUrl = `https://www.vesselfinder.com/vessels/details/${linkMatch[1]}`;
                        const detailsRes = await fetch(detailsUrl, {
                            headers: VF_HEADERS,
                            signal: controller.signal,
                        });
                        if (detailsRes.ok) {
                            const detailsHtml = await detailsRes.text();
                            shipType = extractShipTypeFromHtml(detailsHtml);
                        }
                    }
                }
            }

            clearTimeout(timeout);

            if (shipType) {
                if (imo) shipTypeMap[imo] = shipType;
                shipTypeMap[shipName.toLowerCase()] = shipType;
            }
        } catch {
            // Silently skip failed lookups
        }
    });

    await Promise.all(lookups);
    return shipTypeMap;
}

// ─── Response helper ──────────────────────────────────────

function jsonResponse(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data, null, 2), {
        status,
        headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
        },
    });
}

// ─── Main Handler ─────────────────────────────────────────

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    if (req.method !== "POST") {
        return jsonResponse({ error: "Method not allowed. Use POST." }, 405);
    }

    try {
        const body = await req.json();
        const { action } = body;

        switch (action) {
            case "init_session":
                return await initSession();

            case "submit_search":
                return await submitSearch(body);

            case "fetch_captcha":
                return await fetchCaptcha();

            case "submit_verification":
                return await submitVerification(body);

            case "scrape_details":
                return await scrapeDetails(body);

            default:
                return jsonResponse(
                    {
                        error: `Unknown action: "${action}". Use "init_session", "submit_search", "fetch_captcha", "submit_verification", or "scrape_details".`,
                    },
                    400
                );
        }
    } catch (err) {
        return jsonResponse(
            { error: `Invalid request: ${(err as Error).message}` },
            400
        );
    }
});
