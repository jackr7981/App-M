import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface VesselTrackerRequest {
  vesselName: string;
  userId: string;
}

interface VesselFinderResponse {
  shipName?: string;
  imo?: string;
  mmsi?: string;
  callSign?: string;
  shipType?: string;
  latitude?: number;
  longitude?: number;
  speedOverGround?: number;
  courseOverGround?: number;
  heading?: number;
  destination?: string;
  eta?: string;
  navStatus?: string;
}

interface WeatherData {
  windSpeed: number | null;
  windDirection: number | null;
  seaState: string | null;
}

// Navigation status mapping
const NAV_STATUS: Record<number, string> = {
  0: "UNDERWAY USING ENGINE",
  1: "AT ANCHOR",
  2: "NOT UNDER COMMAND",
  3: "RESTRICTED MANOEUVRABILITY",
  5: "MOORED",
  8: "UNDERWAY SAILING",
  15: "UNDEFINED",
};

// Vessel type mapping
const VESSEL_TYPE_MAP: Record<number, string> = {
  70: "CARGO",
  71: "TANKER",
  72: "CONTAINER",
  73: "BULK CARRIER",
  74: "PASSENGER",
  80: "OTHER",
};

// Average speeds by vessel type (knots)
const AVERAGE_SPEEDS: Record<number, number> = {
  70: 15, // Cargo
  71: 12, // Tanker
  72: 18, // Container
  73: 10, // Bulk carrier
  74: 20, // Passenger
  80: 12, // Other
};

// VesselFinder headers (mimic real browser)
const VF_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

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
    const { vesselName, userId } = (await req.json()) as VesselTrackerRequest;

    // Validate input
    if (!vesselName || vesselName.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: "Vessel name must be at least 2 characters" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "User ID is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. CHECK RATE LIMIT (20 requests/hour to avoid IP bans)
    const { data: rateLimitResult, error: rateLimitError } = await supabase.rpc(
      "check_rate_limit",
      {
        p_user_id: userId,
        p_endpoint: "vessel-tracker",
        p_max_requests: 20,
      }
    );

    if (rateLimitError || !rateLimitResult) {
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded: 20 requests per hour",
          message: "Please try again later to avoid IP bans",
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 2. CHECK CACHE (5-minute TTL)
    const cacheThreshold = new Date(Date.now() - 5 * 60 * 1000);
    const { data: cachedVessel, error: cacheError } = await supabase
      .from("vessel_tracking")
      .select("*")
      .eq("user_id", userId)
      .eq("vessel_name", vesselName.toUpperCase())
      .gte("last_updated", cacheThreshold.toISOString())
      .single();

    if (!cacheError && cachedVessel) {
      console.log("Returning cached vessel data for:", vesselName);
      return new Response(
        JSON.stringify({
          ...cachedVessel,
          speedDifference: calculateSpeedDifference(
            parseFloat(cachedVessel.speed_over_ground || "0"),
            cachedVessel.vessel_type
          ),
          averageSpeed: calculateAverageSpeed(cachedVessel.vessel_type),
          cached: true,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3. SCRAPE FROM VESSELFINDER.COM
    const vesselData = await searchVessel(vesselName);

    if (!vesselData) {
      return new Response(
        JSON.stringify({ error: "Vessel not found in VesselFinder" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 4. FETCH WEATHER DATA
    const weatherData = await getWeatherData(
      vesselData.latitude || 0,
      vesselData.longitude || 0
    );

    // 5. PROCESS & CALCULATE
    const shipTypeNum = 80; // Default to OTHER since we don't have numeric codes from scraping
    const sogValue = vesselData.speedOverGround || 0;
    const averageSpeed = calculateAverageSpeed(shipTypeNum);
    const speedDifference = sogValue - averageSpeed;

    const vesselRecord = {
      user_id: userId,
      vessel_name: (vesselData.shipName || "UNKNOWN").toUpperCase(),
      imo_number: vesselData.imo || null,
      mmsi: vesselData.mmsi || null,
      call_sign: vesselData.callSign || null,
      vessel_type: vesselData.shipType || "UNKNOWN",
      latitude: vesselData.latitude || null,
      longitude: vesselData.longitude || null,
      speed_over_ground: sogValue || null,
      course_over_ground: vesselData.courseOverGround || null,
      heading: vesselData.heading || null,
      status: vesselData.navStatus || "UNKNOWN",
      destination: vesselData.destination || null,
      next_port: vesselData.destination || null,
      eta: vesselData.eta ? new Date(vesselData.eta).toISOString() : null,
      wind_speed: weatherData.windSpeed,
      wind_direction: weatherData.windDirection,
      sea_state: weatherData.seaState,
      data_source: "vesselfinder",
      voyage_data: {
        shipName: vesselData.shipName,
        imo: vesselData.imo,
        mmsi: vesselData.mmsi,
        callSign: vesselData.callSign,
        shipType: vesselData.shipType,
        destination: vesselData.destination,
        eta: vesselData.eta,
      },
    };

    // 6. UPSERT TO DATABASE
    const { data: savedVessel, error: upsertError } = await supabase
      .from("vessel_tracking")
      .upsert(vesselRecord, { onConflict: "user_id,vessel_name" })
      .select()
      .single();

    if (upsertError) {
      console.error("Upsert error:", upsertError);
      return new Response(
        JSON.stringify({ error: "Failed to save vessel data" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 7. INSERT SEARCH HISTORY
    await supabase.from("vessel_search_history").insert({
      user_id: userId,
      search_query: vesselName,
      result_found: true,
    });

    // 8. RETURN RESPONSE
    return new Response(
      JSON.stringify({
        ...savedVessel,
        speedDifference,
        averageSpeed,
        cached: false,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Vessel tracker error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

/**
 * Search for vessel on VesselFinder.com
 * Uses web scraping (same pattern as CDC verification)
 */
async function searchVessel(vesselName: string): Promise<VesselFinderResponse | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8 second timeout

    // Step 1: Search for vessel by name
    const searchUrl = `https://www.vesselfinder.com/vessels?name=${encodeURIComponent(
      vesselName
    )}`;

    console.log("Searching for vessel:", vesselName);

    const searchRes = await fetch(searchUrl, {
      headers: VF_HEADERS,
      signal: controller.signal,
    });

    if (!searchRes.ok) {
      clearTimeout(timeout);
      console.log("Search returned status:", searchRes.status);
      return null;
    }

    const searchHtml = await searchRes.text();

    // Step 2: Extract first result's details link
    const detailsLinkMatch = searchHtml.match(
      /href="(\/vessels\/details\/[^"]+)"/
    );
    if (!detailsLinkMatch) {
      clearTimeout(timeout);
      console.log("No vessel found in search results");
      return null;
    }

    const detailsUrl = `https://www.vesselfinder.com${detailsLinkMatch[1]}`;
    console.log("Found vessel details URL:", detailsUrl);

    // Step 3: Fetch vessel details page
    const detailsRes = await fetch(detailsUrl, {
      headers: VF_HEADERS,
      signal: controller.signal,
    });

    if (!detailsRes.ok) {
      clearTimeout(timeout);
      return null;
    }

    const detailsHtml = await detailsRes.text();
    clearTimeout(timeout);

    // Step 4: Parse vessel data from HTML
    const vesselData = parseVesselHtml(detailsHtml);
    return vesselData;
  } catch (error) {
    console.error("Vessel search error:", error);
    return null;
  }
}

/**
 * Parse vessel data from VesselFinder HTML
 */
function parseVesselHtml(html: string): VesselFinderResponse {
  return {
    // Vessel identification
    shipName: extractField(html, /(?:<h1[^>]*>|Ship Name[^>]*>)([^<]+)</i),
    imo: extractField(html, /IMO[^>]*>([0-9]+)</i),
    mmsi: extractField(html, /MMSI[^>]*>([0-9]+)</i),
    callSign: extractField(html, /Call Sign[^>]*>([^<]+)</i),
    shipType: extractField(html, /Ship Type[^>]*>([^<]+)</i),

    // Position data
    latitude: parseFloat(extractField(html, /Latitude[^>]*>([-0-9.]+)°?/i) || "0") || undefined,
    longitude: parseFloat(extractField(html, /Longitude[^>]*>([-0-9.]+)°?/i) || "0") || undefined,

    // Speed and course
    speedOverGround: parseFloat(extractField(html, /Speed[^>]*>([0-9.]+)\s*(?:kn|knots)/i) || "0") || undefined,
    courseOverGround: parseFloat(extractField(html, /Course[^>]*>([0-9.]+)°/i) || "0") || undefined,
    heading: parseFloat(extractField(html, /Heading[^>]*>([0-9.]+)°/i) || "0") || undefined,

    // Voyage data
    destination: extractField(html, /Destination[^>]*>([^<]+)</i) || undefined,
    eta: extractField(html, /ETA[^>]*>([^<]+)</i) || undefined,
    navStatus: extractField(html, /Status[^>]*>([^<]+)</i) || undefined,
  };
}

/**
 * Extract field from HTML using regex
 */
function extractField(html: string, regex: RegExp): string | null {
  const match = html.match(regex);
  return match ? match[1].trim() : null;
}

/**
 * Fetch weather data from Open-Meteo API (free, no auth required)
 */
async function getWeatherData(
  lat: number,
  lon: number
): Promise<WeatherData> {
  try {
    const url = `https://api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&current=wind_speed_10m,wind_direction_10m,wave_height`;

    const response = await fetch(url);
    const data = await response.json();

    const windSpeed = data.current?.wind_speed_10m || 0;
    const waveHeight = data.current?.wave_height || 0;

    return {
      windSpeed: Math.round(windSpeed * 0.539957), // Convert m/s to knots
      windDirection: data.current?.wind_direction_10m || 0,
      seaState: getSeaState(waveHeight),
    };
  } catch (error) {
    console.error("Error fetching weather:", error);
    return { windSpeed: null, windDirection: null, seaState: null };
  }
}

/**
 * Get vessel type name from code
 */
function getVesselTypeName(shipType: number): string {
  return VESSEL_TYPE_MAP[shipType] || "UNKNOWN";
}

/**
 * Get navigation status name from code
 */
function getNAVStatus(navstat: number): string {
  return NAV_STATUS[navstat] || "UNKNOWN";
}

/**
 * Calculate average speed for vessel type
 */
function calculateAverageSpeed(shipTypeNum: number | string): number {
  const typeNum = typeof shipTypeNum === "string" ? parseInt(shipTypeNum) : shipTypeNum;
  return AVERAGE_SPEEDS[typeNum] || 12;
}

/**
 * Calculate speed difference from average
 */
function calculateSpeedDifference(sog: number, vesselType: string | null): number {
  if (!vesselType) return 0;

  // Map vessel type name back to code for average calculation
  const typeCode = Object.entries(VESSEL_TYPE_MAP).find(
    ([_, name]) => name === vesselType
  )?.[0];

  if (!typeCode) return 0;

  const avgSpeed = calculateAverageSpeed(parseInt(typeCode));
  return Math.round((sog - avgSpeed) * 10) / 10; // Round to 1 decimal
}

/**
 * Get sea state from wave height
 */
function getSeaState(waveHeight: number): string {
  if (waveHeight < 0.5) return "Calm";
  if (waveHeight < 1.25) return "Slight";
  if (waveHeight < 2.5) return "Moderate";
  if (waveHeight < 4) return "Rough";
  return "Very Rough";
}
