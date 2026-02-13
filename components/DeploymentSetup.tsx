import React, { useState, useEffect } from 'react';
import {
  Rocket,
  Key,
  Terminal,
  Cloud,
  CheckCircle,
  XCircle,
  Copy,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  Loader,
} from 'lucide-react';
import {
  generateWebhookSecret,
  copyToClipboard,
  setTelegramWebhook,
  getTelegramWebhookInfo,
  testEdgeFunction,
  getRecentJobPostings,
  validateBotToken,
  validateProjectRef,
  generateDeploymentCommands,
} from '../utils/deployment';

interface DeploymentSetupProps {
  onComplete?: () => void;
}

interface Credentials {
  telegramBotToken: string;
  geminiApiKey: string;
  supabaseProjectRef: string;
  supabaseServiceRoleKey: string;
  webhookSecret: string;
}

type Step = 1 | 2 | 3 | 4 | 5;

export function DeploymentSetup({ onComplete }: DeploymentSetupProps) {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [credentials, setCredentials] = useState<Credentials>({
    telegramBotToken: '',
    geminiApiKey: '',
    supabaseProjectRef: '',
    supabaseServiceRoleKey: '',
    webhookSecret: generateWebhookSecret(),
  });

  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [copySuccess, setCopySuccess] = useState<Record<string, boolean>>({});

  // Validation states
  const [validationErrors, setValidationErrors] = useState<
    Partial<Credentials>
  >({});

  const handleCredentialChange = (field: keyof Credentials, value: string) => {
    setCredentials((prev) => ({ ...prev, [field]: value }));
    // Clear validation error when user types
    setValidationErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validateStep1 = (): boolean => {
    const newErrors: Partial<Credentials> = {};

    if (!credentials.telegramBotToken) {
      newErrors.telegramBotToken = 'Bot token is required';
    } else if (!validateBotToken(credentials.telegramBotToken)) {
      newErrors.telegramBotToken = 'Invalid bot token format';
    }

    if (!credentials.geminiApiKey) {
      newErrors.geminiApiKey = 'Gemini API key is required';
    }

    if (!credentials.supabaseProjectRef) {
      newErrors.supabaseProjectRef = 'Project reference is required';
    } else if (!validateProjectRef(credentials.supabaseProjectRef)) {
      newErrors.supabaseProjectRef =
        'Invalid format (should be 20 lowercase alphanumeric chars)';
    }

    if (!credentials.supabaseServiceRoleKey) {
      newErrors.supabaseServiceRoleKey = 'Service role key is required';
    }

    setValidationErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 1 && !validateStep1()) {
      return;
    }

    if (currentStep < 5) {
      setCurrentStep((prev) => (prev + 1) as Step);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as Step);
    }
  };

  const handleCopy = async (text: string, key: string) => {
    await copyToClipboard(text);
    setCopySuccess((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopySuccess((prev) => ({ ...prev, [key]: false }));
    }, 2000);
  };

  const handleSetWebhook = async () => {
    setLoading((prev) => ({ ...prev, webhook: true }));
    setErrors((prev) => ({ ...prev, 4: '' }));

    const webhookUrl = `https://${credentials.supabaseProjectRef}.supabase.co/functions/v1/telegram-webhook`;

    const result = await setTelegramWebhook(
      credentials.telegramBotToken,
      webhookUrl,
      credentials.webhookSecret
    );

    setLoading((prev) => ({ ...prev, webhook: false }));

    if (result.success) {
      setCompletedSteps((prev) => new Set([...prev, 4]));
      setErrors((prev) => ({ ...prev, 4: '' }));
    } else {
      setErrors((prev) => ({ ...prev, 4: result.message }));
    }
  };

  const handleTestFunctions = async () => {
    setLoading((prev) => ({ ...prev, functions: true }));

    const webhookTest = await testEdgeFunction(
      credentials.supabaseProjectRef,
      'telegram-webhook'
    );
    const parserTest = await testEdgeFunction(
      credentials.supabaseProjectRef,
      'job-parser'
    );

    setLoading((prev) => ({ ...prev, functions: false }));

    if (webhookTest && parserTest) {
      setCompletedSteps((prev) => new Set([...prev, 3]));
      setErrors((prev) => ({ ...prev, 3: '' }));
    } else {
      const missing = [];
      if (!webhookTest) missing.push('telegram-webhook');
      if (!parserTest) missing.push('job-parser');
      setErrors((prev) => ({
        ...prev,
        3: `Functions not deployed: ${missing.join(', ')}`,
      }));
    }
  };

  const handleTestIntegration = async () => {
    setLoading((prev) => ({ ...prev, integration: true }));

    const result = await getRecentJobPostings(5);

    setLoading((prev) => ({ ...prev, integration: false }));

    if (result.success) {
      setCompletedSteps((prev) => new Set([...prev, 5]));
      if (onComplete) {
        onComplete();
      }
    } else {
      setErrors((prev) => ({ ...prev, 5: result.error || 'Failed to fetch jobs' }));
    }
  };

  const commands = generateDeploymentCommands(credentials);

  const renderProgressBar = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        {[1, 2, 3, 4, 5].map((step) => (
          <div key={step} className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                currentStep === step
                  ? 'bg-emerald-600 text-white'
                  : completedSteps.has(step)
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              {completedSteps.has(step) ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                step
              )}
            </div>
            {step < 5 && (
              <div
                className={`w-12 h-1 mx-2 ${
                  completedSteps.has(step)
                    ? 'bg-emerald-500'
                    : 'bg-slate-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between text-xs text-slate-600">
        <span>Credentials</span>
        <span>Set Env</span>
        <span>Deploy</span>
        <span>Webhook</span>
        <span>Test</span>
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
          <Key className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            Enter Your Credentials
          </h2>
          <p className="text-slate-600">
            We'll use these to configure your deployment
          </p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Telegram Bot Token
        </label>
        <input
          type="text"
          value={credentials.telegramBotToken}
          onChange={(e) =>
            handleCredentialChange('telegramBotToken', e.target.value)
          }
          placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
            validationErrors.telegramBotToken
              ? 'border-red-500'
              : 'border-slate-300'
          }`}
        />
        {validationErrors.telegramBotToken && (
          <p className="text-red-500 text-sm mt-1">
            {validationErrors.telegramBotToken}
          </p>
        )}
        <p className="text-xs text-slate-500 mt-1">
          Get this from @BotFather on Telegram
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Gemini API Key
        </label>
        <input
          type="text"
          value={credentials.geminiApiKey}
          onChange={(e) =>
            handleCredentialChange('geminiApiKey', e.target.value)
          }
          placeholder="AIzaSy..."
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
            validationErrors.geminiApiKey
              ? 'border-red-500'
              : 'border-slate-300'
          }`}
        />
        {validationErrors.geminiApiKey && (
          <p className="text-red-500 text-sm mt-1">
            {validationErrors.geminiApiKey}
          </p>
        )}
        <p className="text-xs text-slate-500 mt-1">
          Get from{' '}
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-600 hover:underline"
          >
            Google AI Studio
          </a>
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Supabase Project Reference
        </label>
        <input
          type="text"
          value={credentials.supabaseProjectRef}
          onChange={(e) =>
            handleCredentialChange('supabaseProjectRef', e.target.value)
          }
          placeholder="zlgfadgwlwreezwegpkx"
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
            validationErrors.supabaseProjectRef
              ? 'border-red-500'
              : 'border-slate-300'
          }`}
        />
        {validationErrors.supabaseProjectRef && (
          <p className="text-red-500 text-sm mt-1">
            {validationErrors.supabaseProjectRef}
          </p>
        )}
        <p className="text-xs text-slate-500 mt-1">
          Found in your Supabase Dashboard URL
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Supabase Service Role Key
        </label>
        <input
          type="password"
          value={credentials.supabaseServiceRoleKey}
          onChange={(e) =>
            handleCredentialChange('supabaseServiceRoleKey', e.target.value)
          }
          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
            validationErrors.supabaseServiceRoleKey
              ? 'border-red-500'
              : 'border-slate-300'
          }`}
        />
        {validationErrors.supabaseServiceRoleKey && (
          <p className="text-red-500 text-sm mt-1">
            {validationErrors.supabaseServiceRoleKey}
          </p>
        )}
        <p className="text-xs text-slate-500 mt-1">
          Found in Project Settings → API → service_role key
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Webhook Secret (auto-generated)
        </label>
        <div className="flex space-x-2">
          <input
            type="text"
            value={credentials.webhookSecret}
            readOnly
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg bg-slate-50"
          />
          <button
            onClick={() =>
              setCredentials((prev) => ({
                ...prev,
                webhookSecret: generateWebhookSecret(),
              }))
            }
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Regenerate</span>
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Used to secure your webhook endpoint
        </p>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
          <Terminal className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            Set Environment Variables
          </h2>
          <p className="text-slate-600">
            Copy and run this command in your terminal
          </p>
        </div>
      </div>

      <div className="bg-slate-900 rounded-lg p-4 relative">
        <button
          onClick={() => handleCopy(commands.setSecrets, 'secrets')}
          className="absolute top-4 right-4 px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded flex items-center space-x-2 text-sm"
        >
          {copySuccess.secrets ? (
            <>
              <CheckCircle className="w-4 h-4" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copy</span>
            </>
          )}
        </button>
        <pre className="text-green-400 text-sm font-mono overflow-x-auto pr-24">
          {commands.setSecrets}
        </pre>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start space-x-3">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">Important:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Open a terminal on your local machine</li>
            <li>Navigate to your project directory</li>
            <li>Paste and run the command above</li>
            <li>Wait for confirmation that secrets were set</li>
          </ol>
        </div>
      </div>

      <label className="flex items-center space-x-3 p-4 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100">
        <input
          type="checkbox"
          checked={completedSteps.has(2)}
          onChange={(e) => {
            if (e.target.checked) {
              setCompletedSteps((prev) => new Set([...prev, 2]));
            } else {
              setCompletedSteps((prev) => {
                const newSet = new Set(prev);
                newSet.delete(2);
                return newSet;
              });
            }
          }}
          className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"
        />
        <span className="text-slate-700">
          I've successfully set the environment variables
        </span>
      </label>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
          <Cloud className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            Deploy Edge Functions
          </h2>
          <p className="text-slate-600">
            Deploy telegram-webhook and job-parser functions
          </p>
        </div>
      </div>

      <div className="bg-slate-900 rounded-lg p-4 relative">
        <button
          onClick={() => handleCopy(commands.deployFunctions, 'functions')}
          className="absolute top-4 right-4 px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded flex items-center space-x-2 text-sm"
        >
          {copySuccess.functions ? (
            <>
              <CheckCircle className="w-4 h-4" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copy</span>
            </>
          )}
        </button>
        <pre className="text-green-400 text-sm font-mono overflow-x-auto pr-24">
          {commands.deployFunctions}
        </pre>
      </div>

      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 flex items-start space-x-3">
        <AlertCircle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-purple-800">
          <p className="font-medium mb-1">What this does:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Deploys telegram-webhook function (processes Telegram messages)</li>
            <li>Deploys job-parser function (handles retry logic)</li>
            <li>Both functions are now live and accessible</li>
          </ul>
        </div>
      </div>

      <button
        onClick={handleTestFunctions}
        disabled={loading.functions}
        className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white rounded-lg flex items-center justify-center space-x-2 font-medium"
      >
        {loading.functions ? (
          <>
            <Loader className="w-5 h-5 animate-spin" />
            <span>Testing...</span>
          </>
        ) : (
          <>
            <CheckCircle className="w-5 h-5" />
            <span>Verify Functions Are Deployed</span>
          </>
        )}
      </button>

      {errors[3] && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-800">{errors[3]}</div>
        </div>
      )}

      {completedSteps.has(3) && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-start space-x-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-emerald-800">
            Both functions are deployed and accessible!
          </div>
        </div>
      )}
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-4">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
          <ExternalLink className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            Configure Telegram Webhook
          </h2>
          <p className="text-slate-600">
            Connect your bot to the deployed function
          </p>
        </div>
      </div>

      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
        <p className="text-sm text-indigo-800 mb-2">
          <strong>Webhook URL:</strong>
        </p>
        <code className="block bg-white px-3 py-2 rounded border border-indigo-300 text-sm break-all">
          https://{credentials.supabaseProjectRef}.supabase.co/functions/v1/telegram-webhook
        </code>
      </div>

      <button
        onClick={handleSetWebhook}
        disabled={loading.webhook || !completedSteps.has(3)}
        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-lg flex items-center justify-center space-x-2 font-medium"
      >
        {loading.webhook ? (
          <>
            <Loader className="w-5 h-5 animate-spin" />
            <span>Configuring...</span>
          </>
        ) : (
          <>
            <ExternalLink className="w-5 h-5" />
            <span>Set Webhook Automatically</span>
          </>
        )}
      </button>

      {errors[4] && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-800">{errors[4]}</div>
        </div>
      )}

      {completedSteps.has(4) && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-start space-x-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-emerald-800">
            <p className="font-medium mb-1">Webhook configured successfully!</p>
            <p>Your bot will now receive messages from Telegram groups.</p>
          </div>
        </div>
      )}

      {!completedSteps.has(3) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800">
            Please deploy Edge Functions (Step 3) before configuring the webhook.
          </div>
        </div>
      )}
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-4">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
          <Rocket className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            Test Integration
          </h2>
          <p className="text-slate-600">
            Verify everything is working correctly
          </p>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 space-y-4">
        <div>
          <h3 className="font-semibold text-slate-800 mb-2">
            📱 Test with a Telegram Message
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-slate-700">
            <li>Make sure your bot is added to a Telegram group</li>
            <li>Send a job posting message to that group</li>
            <li>
              Click the button below to check if it was received and processed
            </li>
          </ol>
        </div>
      </div>

      <button
        onClick={handleTestIntegration}
        disabled={loading.integration || !completedSteps.has(4)}
        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg flex items-center justify-center space-x-2 font-medium"
      >
        {loading.integration ? (
          <>
            <Loader className="w-5 h-5 animate-spin" />
            <span>Checking...</span>
          </>
        ) : (
          <>
            <CheckCircle className="w-5 h-5" />
            <span>Check Recent Job Postings</span>
          </>
        )}
      </button>

      {errors[5] && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-800">{errors[5]}</div>
        </div>
      )}

      {completedSteps.has(5) && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
            <div>
              <h3 className="text-lg font-bold text-emerald-800">
                🎉 Deployment Complete!
              </h3>
              <p className="text-sm text-emerald-700">
                Your Telegram bot integration is now live and working.
              </p>
            </div>
          </div>
          <div className="border-t border-emerald-200 pt-4 mt-4">
            <p className="text-sm text-emerald-800 mb-2">
              <strong>What's happening now:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-emerald-700">
              <li>
                Messages from your Telegram groups are being processed
                automatically
              </li>
              <li>Job postings are parsed using Gemini AI</li>
              <li>Structured data is saved to your database</li>
              <li>You can review and approve jobs in the Jobs tab</li>
            </ul>
          </div>
        </div>
      )}

      {!completedSteps.has(4) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800">
            Please configure the webhook (Step 4) before testing.
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2 flex items-center space-x-3">
            <Rocket className="w-8 h-8 text-emerald-600" />
            <span>Deployment Setup Wizard</span>
          </h1>
          <p className="text-slate-600">
            Follow these steps to deploy your Telegram job integration
          </p>
        </div>

        {renderProgressBar()}

        <div className="min-h-[500px]">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
          {currentStep === 5 && renderStep5()}
        </div>

        <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="px-6 py-2 bg-slate-200 hover:bg-slate-300 disabled:bg-slate-100 disabled:text-slate-400 text-slate-700 rounded-lg font-medium"
          >
            Previous
          </button>

          {currentStep < 5 ? (
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium"
            >
              Next
            </button>
          ) : (
            <button
              onClick={() => {
                if (onComplete) onComplete();
              }}
              disabled={!completedSteps.has(5)}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg font-medium"
            >
              Finish
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
