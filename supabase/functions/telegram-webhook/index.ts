import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { parseJobText } from "../_shared/gemini-parser.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

serve(async (req) => {
    try {
        const update = await req.json();

        if (!update.message || !update.message.text) {
            return new Response("OK", { status: 200 }); // Ignore non-text messages
        }

        const { message } = update;
        const chatId = message.chat.id;
        const text = message.text;
        const messageId = message.message_id.toString();

        const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
        if (!GEMINI_API_KEY) {
            console.error("GEMINI_API_KEY is not set");
            return new Response("Error", { status: 500 });
        }

        // 1. Check for duplicates - avoid processing the same message twice
        const { data: existingJob, error: checkError } = await supabase
            .from("job_postings")
            .select("id")
            .eq("source", "telegram")
            .eq("source_id", messageId)
            .maybeSingle();

        if (existingJob) {
            console.log("Duplicate message detected, skipping:", messageId);
            return new Response(JSON.stringify({ message: "Duplicate message, already processed" }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });
        }

        // 2. Parse content with AI
        let parsedContent = {};
        let parsingStatus = "pending"; // Default status
        try {
            parsedContent = await parseJobText(text, GEMINI_API_KEY);

            // Validate that essential fields were extracted
            const hasEssentialFields = parsedContent.rank && parsedContent.agency;
            if (hasEssentialFields) {
                parsingStatus = "pending"; // Ready for admin review
            } else {
                console.warn("Parsing incomplete - missing essential fields (rank or agency)");
                parsingStatus = "pending"; // Still pending, but admin will review
            }
        } catch (err) {
            console.error("AI Parsing failed:", err);
            // We still save the job with raw content for manual review
            parsingStatus = "pending";
        }

        // 3. Save to Supabase
        const { error, data } = await supabase
            .from("job_postings")
            .insert({
                source: "telegram",
                source_id: messageId,
                raw_content: text,
                parsed_content: parsedContent,
                status: parsingStatus,
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
