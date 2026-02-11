import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { parseJobText } from "../_shared/gemini-parser.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { raw_content } = await req.json();

        if (!raw_content) {
            throw new Error("Missing 'raw_content' in request body");
        }

        const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
        if (!GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY is not set");
        }

        const parsedContent = await parseJobText(raw_content, GEMINI_API_KEY);

        return new Response(JSON.stringify({ success: true, data: parsedContent }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        return new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
