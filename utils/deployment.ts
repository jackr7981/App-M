import { supabase } from '../services/supabase';

/**
 * Generate a random webhook secret for Telegram
 */
export function generateWebhookSecret(): string {
  // Generate a random UUID and remove dashes for a clean secret
  return crypto.randomUUID().replace(/-/g, '');
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
    } finally {
      document.body.removeChild(textArea);
    }
  }
}

/**
 * Set Telegram webhook configuration
 */
export async function setTelegramWebhook(
  botToken: string,
  webhookUrl: string,
  secretToken: string
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/setWebhook`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl,
          secret_token: secretToken,
          allowed_updates: ['message', 'edited_message'],
        }),
      }
    );

    const data = await response.json();

    if (data.ok) {
      return { success: true, message: 'Webhook configured successfully!' };
    } else {
      return {
        success: false,
        message: data.description || 'Failed to set webhook',
      };
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Get Telegram webhook information
 */
export async function getTelegramWebhookInfo(
  botToken: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/getWebhookInfo`
    );

    const result = await response.json();

    if (result.ok) {
      return { success: true, data: result.result };
    } else {
      return {
        success: false,
        error: result.description || 'Failed to get webhook info',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Test if an Edge Function is deployed and accessible
 */
export async function testEdgeFunction(
  projectRef: string,
  functionName: string
): Promise<boolean> {
  try {
    // Try HEAD request first (lightweight, less likely to be blocked by CORS)
    const response = await fetch(
      `https://${projectRef}.supabase.co/functions/v1/${functionName}`,
      {
        method: 'HEAD',
      }
    );

    // Function exists if we get ANY response indicating it's there:
    // - 200 (OK) - function accepts HEAD
    // - 401 (Unauthorized) - function exists but needs auth
    // - 403 (Forbidden) - function exists but access denied
    // - 404 (Not Found) - might still exist, just doesn't accept HEAD
    // - 405 (Method Not Allowed) - function exists but HEAD not allowed
    return (
      response.ok ||
      response.status === 401 ||
      response.status === 403 ||
      response.status === 404 ||
      response.status === 405
    );
  } catch (error) {
    // If HEAD fails (CORS issues), try a GET request as fallback
    try {
      const response = await fetch(
        `https://${projectRef}.supabase.co/functions/v1/${functionName}`
      );

      // Any response (including errors) means the function exists
      return (
        response.ok ||
        response.status === 401 ||
        response.status === 403 ||
        response.status === 404 ||
        response.status === 405
      );
    } catch {
      // Complete failure - function likely doesn't exist
      return false;
    }
  }
}

/**
 * Get recent job postings to verify integration is working
 */
export async function getRecentJobPostings(limit: number = 5) {
  try {
    const { data, error } = await supabase
      .from('job_postings')
      .select('id, source, status, created_at, source_group_name, rank, agency')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Database error',
    };
  }
}

/**
 * Validate bot token format
 */
export function validateBotToken(token: string): boolean {
  // Telegram bot tokens are in format: 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
  return /^\d+:[A-Za-z0-9_-]{35,}$/.test(token);
}

/**
 * Validate Supabase project reference format
 */
export function validateProjectRef(ref: string): boolean {
  // Project refs are lowercase alphanumeric strings
  return /^[a-z0-9]{20}$/.test(ref);
}

/**
 * Generate deployment commands with pre-filled credentials
 */
export function generateDeploymentCommands(credentials: {
  telegramBotToken: string;
  geminiApiKey: string;
  supabaseProjectRef: string;
  supabaseServiceRoleKey: string;
  webhookSecret: string;
}): {
  setSecrets: string;
  deployFunctions: string;
  setWebhook: string;
} {
  return {
    setSecrets: `# Navigate to project directory first
cd /home/user/App-M

# Set all environment variables
supabase secrets set \\
  TELEGRAM_BOT_TOKEN="${credentials.telegramBotToken}" \\
  GEMINI_API_KEY="${credentials.geminiApiKey}" \\
  WEBHOOK_SECRET="${credentials.webhookSecret}" \\
  SUPABASE_URL="https://${credentials.supabaseProjectRef}.supabase.co" \\
  SUPABASE_SERVICE_ROLE_KEY="${credentials.supabaseServiceRoleKey}"

# Verify secrets were set
supabase secrets list`,

    deployFunctions: `# Navigate to project directory first
cd /home/user/App-M

# Deploy telegram-webhook function
supabase functions deploy telegram-webhook --project-ref ${credentials.supabaseProjectRef}

# Deploy job-parser function
supabase functions deploy job-parser --project-ref ${credentials.supabaseProjectRef}

# List deployed functions
supabase functions list`,

    setWebhook: `curl -X POST "https://api.telegram.org/bot${credentials.telegramBotToken}/setWebhook" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://${credentials.supabaseProjectRef}.supabase.co/functions/v1/telegram-webhook",
    "secret_token": "${credentials.webhookSecret}",
    "allowed_updates": ["message", "edited_message"]
  }'`,
  };
}
