import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { parseJobText } from "../_shared/gemini-parser.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const webhookSecret = Deno.env.get("WEBHOOK_SECRET") || "";
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

interface TelegramMessage {
    message_id: number;
    from?: {
        id: number;
        username?: string;
        first_name?: string;
    };
    chat: {
        id: number;
        title?: string;
        type: string;
    };
    date: number;
    text?: string;
    caption?: string;
}

interface TelegramUpdate {
    update_id: number;
    message?: TelegramMessage;
    edited_message?: TelegramMessage;
}

/**
 * Determines if message content resembles a job posting
 * Uses keyword matching and pattern recognition
 */
function isLikelyJobPosting(content: string): boolean {
    if (!content || content.length < 50) {
        return false;
    }

    const lowerContent = content.toLowerCase();

    // Keywords commonly found in maritime job postings
    const jobKeywords = [
        "rank", "position", "vacancy", "hiring", "urgent",
        "master", "chief officer", "engineer", "rating",
        "salary", "wage", "usd", "joining", "embark",
        "vessel", "ship", "tanker", "bulk", "container",
        "agency", "manning", "crew", "seafarer", "officer"
    ];

    // Check if at least 3 job keywords are present
    const keywordMatches = jobKeywords.filter(kw => lowerContent.includes(kw)).length;

    if (keywordMatches >= 3) {
        return true;
    }

    // Check for common patterns like "RANK:" or "Position:"
    const patternRegex = /(rank|position|salary|joining|agency|vessel|ship)\s*[:=]/i;
    if (patternRegex.test(content)) {
        return true;
    }

    return false;
}

serve(async (req) => {
    try {
        console.log("🚀 Webhook called - Version: 2.0 (Auth disabled)");
        console.log("Method:", req.method);
        console.log("Headers:", Object.fromEntries(req.headers.entries()));

        // Handle GET requests for testing
        if (req.method === "GET") {
            return new Response(JSON.stringify({
                status: "ok",
                version: "2.0-auth-disabled",
                message: "Webhook is running - send POST requests with Telegram updates"
            }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        }

        // 1. Verify webhook secret for security (DISABLED for now)
        // TODO: Re-enable after setting up webhook secret properly
        // if (webhookSecret) {
        //     const authHeader = req.headers.get("X-Telegram-Bot-Api-Secret-Token");
        //     if (authHeader !== webhookSecret) {
        //         console.warn("Unauthorized webhook attempt - invalid secret token");
        //         return new Response(JSON.stringify({ error: "Unauthorized" }), {
        //             status: 401,
        //             headers: { "Content-Type": "application/json" },
        //         });
        //     }
        // }

        const update: TelegramUpdate = await req.json();

        // 2. Handle both new messages and edited messages
        const message = update.message || update.edited_message;

        if (!message) {
            return new Response(JSON.stringify({ ok: true, skipped: "no_message" }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        }

        // 3. Only process group messages
        if (message.chat.type !== "group" && message.chat.type !== "supergroup") {
            return new Response(JSON.stringify({ ok: true, skipped: "not_group" }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        }

        // 4. Extract text content (from text or caption)
        const text = message.text || message.caption || "";

        // 5. Filter: Only process messages that look like job postings
        if (!isLikelyJobPosting(text)) {
            return new Response(JSON.stringify({ ok: true, skipped: "not_job_posting" }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        }

        // 6. Create unique source_id combining chat and message ID
        const sourceId = `tg_${message.chat.id}_${message.message_id}`;

        // 7. Check for duplicates - avoid processing the same message twice
        const { data: existingJob } = await supabase
            .from("job_postings")
            .select("id")
            .eq("source_id", sourceId)
            .maybeSingle();

        if (existingJob) {
            console.log("Duplicate message detected, skipping:", sourceId);
            return new Response(JSON.stringify({ ok: true, skipped: "duplicate" }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });
        }

        const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
        if (!GEMINI_API_KEY) {
            console.error("GEMINI_API_KEY is not set");
            return new Response("Error", { status: 500 });
        }

        // 8. Parse content with AI
        let parsedContent = {};
        let parsingStatus = "pending";
        try {
            parsedContent = await parseJobText(text, GEMINI_API_KEY);

            // Validate that essential fields were extracted
            const hasEssentialFields = parsedContent.rank && parsedContent.agency;
            if (hasEssentialFields) {
                parsingStatus = "parsed"; // Successfully parsed
            } else {
                console.warn("Parsing incomplete - missing essential fields");
                parsingStatus = "pending"; // Needs manual review
            }
        } catch (err) {
            console.error("AI Parsing failed:", err);
            parsingStatus = "pending"; // Failed parsing, needs review
        }

        // 9. Save to Supabase with enhanced metadata
        const { error, data } = await supabase
            .from("job_postings")
            .insert({
                source: "telegram",
                source_id: sourceId,
                source_group_name: message.chat.title || "Unknown Group",
                source_group_id: message.chat.id.toString(),
                raw_content: text,
                parsed_content: parsedContent,
                status: parsingStatus,
                parsing_attempts: 1,
                published_at: parsingStatus === "parsed" ? new Date().toISOString() : null,
            })
            .select();

        console.log("Insert Attempt Result - Error:", error);
        console.log("Insert Attempt Result - Data:", data);

        if (error) {
            console.error("Supabase Insert Error:", error);
            return new Response(JSON.stringify({ error, message: "Insert Failed" }), {
                status: 500,
                headers: { "Content-Type": "application/json" }
            });
        }

        // ... (rest of code)

        return new Response(JSON.stringify({ data, message: "Success" }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    } catch (err) {
        console.error("Webhook Error:", err);
        return new Response(JSON.stringify({ error: String(err), message: "Exception" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
});
