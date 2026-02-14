#!/usr/bin/env python3
"""
Gemini Model Availability Checker
Monitors Gemini AI models and alerts if the primary model becomes unavailable.
Provides recommendations for alternative models.
"""

import os
import sys
import json
from datetime import datetime
from google import genai

# Configuration
PRIMARY_MODEL = "models/gemini-2.5-flash"
FALLBACK_MODELS = [
    "models/gemini-2.0-flash-exp",
    "models/gemini-1.5-flash",
    "models/gemini-1.5-flash-latest",
    "models/gemini-pro"
]

def get_model_info(client, model_name):
    """Get detailed information about a specific model."""
    try:
        model = client.models.get(model_name)
        return {
            "name": model.name,
            "display_name": getattr(model, 'display_name', 'N/A'),
            "description": getattr(model, 'description', 'N/A'),
            "input_token_limit": getattr(model, 'input_token_limit', 'N/A'),
            "output_token_limit": getattr(model, 'output_token_limit', 'N/A'),
            "supported_generation_methods": getattr(model, 'supported_generation_methods', [])
        }
    except Exception as e:
        return None

def check_gemini_status():
    """Check Gemini model availability and provide recommendations."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("❌ Error: GEMINI_API_KEY not found in environment.")
        print("Please set the GEMINI_API_KEY secret in GitHub Settings.")
        sys.exit(1)

    try:
        client = genai.Client(api_key=api_key)

        # Fetch all available models
        print("🔍 Fetching available Gemini models...")
        all_models = list(client.models.list())
        available_model_names = [m.name for m in all_models]

        print(f"\n📊 Total models available: {len(available_model_names)}")
        print("=" * 80)

        # Filter for Gemini models only (exclude embedding models, etc.)
        gemini_models = [name for name in available_model_names if 'gemini' in name.lower()]
        print(f"\n🤖 Gemini Models Found: {len(gemini_models)}")
        print("-" * 80)
        for model in sorted(gemini_models):
            print(f"  • {model}")

        # Check primary model status
        print("\n" + "=" * 80)
        print(f"🎯 PRIMARY MODEL CHECK: {PRIMARY_MODEL}")
        print("=" * 80)

        if PRIMARY_MODEL in available_model_names:
            print(f"✅ SUCCESS: {PRIMARY_MODEL} is ACTIVE and available!")

            # Get detailed info
            model_info = get_model_info(client, PRIMARY_MODEL)
            if model_info:
                print(f"\n📋 Model Details:")
                print(f"  Display Name: {model_info['display_name']}")
                print(f"  Description: {model_info['description'][:100]}...")
                print(f"  Input Token Limit: {model_info['input_token_limit']}")
                print(f"  Output Token Limit: {model_info['output_token_limit']}")

            exit_code = 0
        else:
            print(f"❌ WARNING: {PRIMARY_MODEL} is NOT AVAILABLE!")
            print("\n🚨 ALERT: Primary model unavailable. Please review alternatives below.")
            exit_code = 1

        # Check fallback models
        print("\n" + "=" * 80)
        print("🔄 FALLBACK MODEL STATUS")
        print("=" * 80)

        available_fallbacks = []
        for fallback in FALLBACK_MODELS:
            if fallback in available_model_names:
                print(f"✅ {fallback} - AVAILABLE")
                available_fallbacks.append(fallback)
            else:
                print(f"❌ {fallback} - NOT AVAILABLE")

        # Recommendations
        print("\n" + "=" * 80)
        print("💡 RECOMMENDATIONS")
        print("=" * 80)

        if PRIMARY_MODEL not in available_model_names:
            if available_fallbacks:
                print(f"\n⚠️  IMMEDIATE ACTION REQUIRED:")
                print(f"   Primary model '{PRIMARY_MODEL}' is down.")
                print(f"\n   Recommended Fallback: {available_fallbacks[0]}")
                print(f"\n   To update your app:")
                print(f"   1. Update supabase/functions/_shared/gemini-parser.ts")
                print(f"   2. Change model name to: {available_fallbacks[0]}")
                print(f"   3. Redeploy Edge Functions: supabase functions deploy")
            else:
                print(f"\n🚨 CRITICAL: No fallback models available!")
                print(f"   Contact Google Cloud support immediately.")
        else:
            print(f"\n✨ All systems operational. No action needed.")

        # Save report to file
        report = {
            "timestamp": datetime.utcnow().isoformat(),
            "primary_model": PRIMARY_MODEL,
            "primary_model_available": PRIMARY_MODEL in available_model_names,
            "total_models": len(available_model_names),
            "gemini_models": gemini_models,
            "fallback_models": {
                "configured": FALLBACK_MODELS,
                "available": available_fallbacks
            },
            "status": "OK" if exit_code == 0 else "WARNING"
        }

        # Save to reports directory
        os.makedirs("reports", exist_ok=True)
        report_file = f"reports/gemini-model-check-{datetime.utcnow().strftime('%Y-%m-%d')}.json"
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)

        print(f"\n📁 Report saved to: {report_file}")

        # Also save latest report
        with open("reports/latest-model-check.json", 'w') as f:
            json.dump(report, f, indent=2)

        print("\n" + "=" * 80)
        print(f"✅ Check completed at {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC")
        print("=" * 80)

        sys.exit(exit_code)

    except Exception as e:
        print(f"\n❌ API ERROR: Could not connect to Gemini API")
        print(f"Error details: {str(e)}")
        print(f"\nPossible causes:")
        print(f"  1. Invalid API key")
        print(f"  2. Network connectivity issues")
        print(f"  3. Gemini API service outage")
        print(f"\nPlease check:")
        print(f"  - API key is correct in GitHub Secrets")
        print(f"  - Gemini API status: https://status.cloud.google.com/")
        sys.exit(1)

if __name__ == "__main__":
    check_gemini_status()
