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
            case "fetch_captcha":
                return await fetchCaptcha();

            case "submit_verification":
                return await submitVerification(body);

            case "scrape_details":
                return await scrapeDetails(body);

            default:
                return jsonResponse(
                    {
                        error: `Unknown action: "${action}". Use "fetch_captcha", "submit_verification", or "scrape_details".`,
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
