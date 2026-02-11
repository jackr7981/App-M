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

        // 1. Parse content with AI
        let parsedContent = {};
        try {
            parsedContent = await parseJobText(text, GEMINI_API_KEY);
        } catch (err) {
            console.error("AI Parsing failed:", err);
            // We still save the job, but with empty parsed content or status 'failed'?
            // Plan says status 'pending'. Parsed content can be empty or partial.
        }

        // 2. Save to Supabase
        const { error } = await supabase
            .from("job_postings")
            .insert({
                source: "telegram",
                source_id: messageId,
                raw_content: text,
                parsed_content: parsedContent,
                status: "pending",
            });

        if (error) {
            console.error("Supabase Insert Error:", error);
            return new Response("Error", { status: 500 });
        }

        // 3. Optional: Reply to user (if chat type is private)
        if (message.chat.type === "private") {
            const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
            if (BOT_TOKEN) {
                await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: "Job received and sent for review!",
                        reply_to_message_id: message.message_id,
                    }),
                });
            }
        }

        return new Response("OK", { status: 200 });
    } catch (err) {
        console.error("Webhook Error:", err);
        return new Response("Error", { status: 500 });
    }
});
