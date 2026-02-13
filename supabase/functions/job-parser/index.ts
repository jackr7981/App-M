import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { parseJobText } from "../_shared/gemini-parser.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface JobParserRequest {
  job_id: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { job_id }: JobParserRequest = await req.json();

    if (!job_id) {
      return new Response(JSON.stringify({ error: "job_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Fetch the job posting
    const { data: job, error: fetchError } = await supabase
      .from("job_postings")
      .select("*")
      .eq("id", job_id)
      .single();

    if (fetchError || !job) {
      return new Response(JSON.stringify({ error: "Job not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Check if already parsed successfully
    if (job.status === "parsed" || job.status === "published" || job.status === "approved") {
      return new Response(JSON.stringify({
        ok: true,
        status: "already_parsed",
        message: "Job already successfully parsed"
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Prevent infinite retry loops - max 3 attempts
    if (job.parsing_attempts >= 3) {
      await supabase
        .from("job_postings")
        .update({
          status: "rejected",
          last_parsing_error: "Maximum parsing attempts (3) exceeded"
        })
        .eq("id", job_id);

      return new Response(JSON.stringify({
        error: "Max parsing attempts reached",
        parsing_attempts: job.parsing_attempts
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Parse using Gemini AI
    let parsedFields: any = {};
    let parsingError: string | null = null;

    try {
      parsedFields = await parseJobText(job.raw_content, GEMINI_API_KEY);

      // Validate essential fields
      if (!parsedFields.rank || !parsedFields.agency) {
        parsingError = "Missing essential fields: rank or agency";
      }
    } catch (error) {
      console.error("Gemini parsing error:", error);
      parsingError = error.message || "AI parsing failed";
    }

    // 5. Update database with parsed results
    const updateData: any = {
      parsed_content: parsedFields,
      parsing_attempts: (job.parsing_attempts || 0) + 1,
      last_parsing_error: parsingError,
    };

    // If parsing succeeded, update status and set published timestamp
    if (!parsingError && parsedFields.rank && parsedFields.agency) {
      updateData.status = "parsed";
      updateData.published_at = new Date().toISOString();

      // Also populate individual columns (trigger will handle this, but being explicit)
      updateData.rank = parsedFields.rank;
      updateData.salary = parsedFields.salary;
      updateData.joining_date = parsedFields.joining_date;
      updateData.agency = parsedFields.agency;
      updateData.mla_number = parsedFields.mla_number;
      updateData.agency_address = parsedFields.address;
      updateData.mobile_number = parsedFields.mobile;
      updateData.agency_email = parsedFields.email;
    } else {
      // Parsing failed or incomplete
      if ((job.parsing_attempts || 0) + 1 >= 3) {
        updateData.status = "rejected";
      }
    }

    const { error: updateError } = await supabase
      .from("job_postings")
      .update(updateData)
      .eq("id", job_id);

    if (updateError) {
      console.error("Update error:", updateError);
      return new Response(JSON.stringify({ error: "Database update failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. Return success response
    return new Response(JSON.stringify({
      ok: true,
      job_id,
      parsed_fields: parsedFields,
      parsing_attempts: updateData.parsing_attempts,
      status: updateData.status,
      parsing_error: parsingError,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Parser error:", error);

    return new Response(JSON.stringify({
      error: "Internal server error",
      message: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
