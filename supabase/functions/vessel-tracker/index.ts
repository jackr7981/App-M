import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VESSELFINDER_API_KEY = Deno.env.get("VESSELFINDER_API_KEY");
const AISHUB_USERNAME = Deno.env.get("AISHUB_USERNAME");

interface VesselTrackerRequest {
  vesselName: string;
  userId: string;
}

interface VesselFinderResponse {
  AIS?: {
    MMSI: string;
    SHIPNAME: string;
    SOG: string;
    COG: string;
    HEADING: string;
    LATITUDE: string;
    LONGITUDE: string;
    DESTINATION: string;
    ETA: string;
    IMO?: string;
    CALLSIGN?: string;
    SHIPTYPE?: string;
  };
  ERROR?: string;
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

    // 1. CHECK RATE LIMIT
    const { data: rateLimitResult, error: rateLimitError } = await supabase.rpc(
      "check_rate_limit",
      {
        p_user_id: userId,
        p_endpoint: "vessel-tracker",
        p_max_requests: 10,
      }
    );

    if (rateLimitError || !rateLimitResult) {
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded: 10 requests per hour",
          message: "Please try again later",
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
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3. FETCH FROM AIS API
    const vesselData = await searchVessel(vesselName);

    if (!vesselData) {
      return new Response(
        JSON.stringify({ error: "Vessel not found in AIS databases" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 4. FETCH WEATHER DATA
    const weatherData = await getWeatherData(
      parseFloat(vesselData.AIS!.LATITUDE),
      parseFloat(vesselData.AIS!.LONGITUDE)
    );

    // 5. PROCESS & CALCULATE
    const shipTypeNum = vesselData.AIS!.SHIPTYPE
      ? parseInt(vesselData.AIS!.SHIPTYPE)
      : 80;
    const sogValue = parseFloat(vesselData.AIS!.SOG || "0");
    const averageSpeed = calculateAverageSpeed(shipTypeNum);
    const speedDifference = sogValue - averageSpeed;

    const vesselRecord = {
      user_id: userId,
      vessel_name: vesselData.AIS!.SHIPNAME.toUpperCase(),
      imo_number: vesselData.AIS!.IMO || null,
      mmsi: vesselData.AIS!.MMSI || null,
      call_sign: vesselData.AIS!.CALLSIGN || null,
      vessel_type: getVesselTypeName(shipTypeNum),
      latitude: parseFloat(vesselData.AIS!.LATITUDE) || null,
      longitude: parseFloat(vesselData.AIS!.LONGITUDE) || null,
      speed_over_ground: sogValue || null,
      course_over_ground: parseFloat(vesselData.AIS!.COG || "0") || null,
      heading: parseFloat(vesselData.AIS!.HEADING || "0") || null,
      status: getNAVStatus(0), // Default status
      destination: vesselData.AIS!.DESTINATION || null,
      next_port: vesselData.AIS!.DESTINATION || null,
      eta: vesselData.AIS!.ETA ? parseETA(vesselData.AIS!.ETA) : null,
      wind_speed: weatherData.windSpeed,
      wind_direction: weatherData.windDirection,
      sea_state: weatherData.seaState,
      data_source: "vesselfinder",
      voyage_data: {
        mmsi: vesselData.AIS!.MMSI,
        shiptype: shipTypeNum,
        imo: vesselData.AIS!.IMO,
        destination: vesselData.AIS!.DESTINATION,
        eta: vesselData.AIS!.ETA,
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
 * Search for vessel in AIS databases
 * Primary: VesselFinder API (name search)
 * Fallback: AISHub (requires MMSI)
 */
async function searchVessel(vesselName: string): Promise<VesselFinderResponse | null> {
  try {
    // Try VesselFinder API first
    if (VESSELFINDER_API_KEY) {
      const url = `https://api.vesselfinder.com/vesselfinder?userkey=${VESSELFINDER_API_KEY}&name=${encodeURIComponent(
        vesselName
      )}`;

      const response = await fetch(url);

      if (response.ok) {
        const data = (await response.json()) as VesselFinderResponse;
        if (!data.ERROR && data.AIS) {
          console.log("Found vessel via VesselFinder:", vesselName);
          return data;
        }
      }
    }

    // Fallback: Return null if not found
    console.log("Vessel not found in AIS databases:", vesselName);
    return null;
  } catch (error) {
    console.error("Error fetching AIS data:", error);
    return null;
  }
}

/**
 * Fetch weather data from Open-Meteo API
 * Free, no authentication required
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

/**
 * Parse ETA from AIS format (MMDDHHMM)
 */
function parseETA(etaString: string): string | null {
  try {
    if (!etaString || etaString.length < 8) return null;

    const month = etaString.substring(0, 2);
    const day = etaString.substring(2, 4);
    const hour = etaString.substring(4, 6);
    const minute = etaString.substring(6, 8);

    const currentYear = new Date().getFullYear();
    const eta = new Date(`${currentYear}-${month}-${day}T${hour}:${minute}:00Z`);

    return eta.toISOString();
  } catch {
    return null;
  }
}
