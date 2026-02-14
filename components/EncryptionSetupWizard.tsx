/**
 * Encryption Setup Wizard
 *
 * Guides new users through setting up end-to-end encryption:
 * 1. Password creation
 * 2. Password strength validation
 * 3. Recovery phrase generation
 * 4. Force user to save recovery phrase
 * 5. Verify recovery phrase (re-enter random words)
 */

import React, { useState, useEffect } from 'react';
import { Shield, Lock, Key, Copy, Check, AlertTriangle, Eye, EyeOff, Download, CheckCircle } from 'lucide-react';
import { keyManager, validatePasswordStrength, type RecoveryKit } from '../services/encryption';

interface EncryptionSetupWizardProps {
  onComplete: (recoveryKit: RecoveryKit) => void;
  onSkip?: () => void;
}

type Step = 'intro' | 'password' | 'recovery' | 'verify' | 'complete';

export const EncryptionSetupWizard: React.FC<EncryptionSetupWizardProps> = ({ onComplete, onSkip }) => {
  const [step, setStep] = useState<Step>('intro');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [recoveryKit, setRecoveryKit] = useState<RecoveryKit | null>(null);
  const [recoveryWords, setRecoveryWords] = useState<string[]>([]);
  const [copiedRecovery, setCopiedRecovery] = useState(false);
  const [downloadedRecovery, setDownloadedRecovery] = useState(false);
  const [verificationIndices, setVerificationIndices] = useState<number[]>([]);
  const [verificationInputs, setVerificationInputs] = useState<string[]>(['', '', '']);
  const [isProcessing, setIsProcessing] = useState(false);

  // Validate password strength on change
  useEffect(() => {
    if (password) {
      const validation = validatePasswordStrength(password);
      setPasswordErrors(validation.errors);
    } else {
      setPasswordErrors([]);
    }
  }, [password]);

  const handlePasswordSubmit = async () => {
    if (password !== confirmPassword) {
      alert('Passwords do not match!');
      return;
    }

    const validation = validatePasswordStrength(password);
    if (!validation.isValid) {
      alert(`Password is too weak:\n${validation.errors.join('\n')}`);
      return;
    }

    setIsProcessing(true);
    try {
      // Initialize encryption
      const kit = await keyManager.initializeEncryption(password);
      setRecoveryKit(kit);
      setRecoveryWords(kit.mnemonic.split(' '));

      // Select 3 random word indices for verification
      const indices: number[] = [];
      while (indices.length < 3) {
        const randomIndex = Math.floor(Math.random() * 24);
        if (!indices.includes(randomIndex)) {
          indices.push(randomIndex);
        }
      }
      setVerificationIndices(indices.sort((a, b) => a - b));

      setStep('recovery');
    } catch (error) {
      console.error('Encryption setup failed:', error);
      alert(`Failed to set up encryption: ${(error as Error).message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const copyRecoveryPhrase = () => {
    if (recoveryKit) {
      navigator.clipboard.writeText(recoveryKit.mnemonic);
      setCopiedRecovery(true);
      setTimeout(() => setCopiedRecovery(false), 2000);
    }
  };

  const downloadRecoveryKit = () => {
    if (!recoveryKit) return;

    const kitData = {
      recoveryPhrase: recoveryKit.mnemonic,
      createdAt: recoveryKit.timestamp,
      instructions: [
        '🔐 BD Mariner Hub - Encryption Recovery Kit',
        '',
        '⚠️ CRITICAL: Keep this file in a safe place!',
        '',
        'This 24-word recovery phrase is the ONLY way to recover your encrypted documents if you forget your password.',
        '',
        'Recovery Phrase:',
        recoveryKit.mnemonic,
        '',
        '📌 Important Notes:',
        '1. Never share this phrase with anyone',
        '2. Store it offline (print, write down, or use a password manager)',
        '3. If someone gets this phrase, they can access ALL your encrypted documents',
        '4. If you lose this phrase AND forget your password, your data is PERMANENTLY LOST',
        '',
        `Created: ${new Date(recoveryKit.timestamp).toLocaleString()}`,
        '',
        'To recover your account:',
        '1. Go to BD Mariner Hub login page',
        '2. Click "Forgot Password?"',
        '3. Enter this 24-word recovery phrase',
        '4. Set a new password',
      ].join('\n'),
    };

    const blob = new Blob([kitData.instructions], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bd-mariner-hub-recovery-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setDownloadedRecovery(true);
  };

  const verifyRecoveryPhrase = () => {
    if (!recoveryWords) return;

    const isCorrect = verificationIndices.every((index, i) => {
      return verificationInputs[i].trim().toLowerCase() === recoveryWords[index].toLowerCase();
    });

    if (isCorrect) {
      setStep('complete');
      setTimeout(() => {
        if (recoveryKit) {
          onComplete(recoveryKit);
        }
      }, 2000);
    } else {
      alert('❌ Verification failed! The words you entered do not match your recovery phrase. Please try again.');
      setVerificationInputs(['', '', '']);
    }
  };

  const passwordStrength = password.length === 0 ? 0 :
    passwordErrors.length === 0 ? 100 :
    passwordErrors.length === 1 ? 75 :
    passwordErrors.length === 2 ? 50 :
    passwordErrors.length === 3 ? 25 : 10;

  const passwordStrengthColor = passwordStrength >= 75 ? 'bg-green-500' :
    passwordStrength >= 50 ? 'bg-yellow-500' :
    passwordStrength >= 25 ? 'bg-orange-500' : 'bg-red-500';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">

        {/* Intro Step */}
        {step === 'intro' && (
          <div className="p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mb-4">
                <Shield className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-slate-800 mb-2">
                Secure Your Documents
              </h2>
              <p className="text-slate-600">
                End-to-end encryption for your seafarer credentials
              </p>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-xl">
                <Lock className="w-6 h-6 text-blue-600 shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-blue-900 mb-1">Military-Grade Encryption</h3>
                  <p className="text-sm text-blue-700">
                    Your documents are encrypted with AES-256-GCM on your device before upload. Not even we can access them.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-green-50 rounded-xl">
                <Key className="w-6 h-6 text-green-600 shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-green-900 mb-1">You Control the Keys</h3>
                  <p className="text-sm text-green-700">
                    Only you have the encryption keys. Your password never leaves your device.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-amber-50 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-amber-900 mb-1">Recovery Phrase Required</h3>
                  <p className="text-sm text-amber-700">
                    You'll receive a 24-word recovery phrase. <strong>If you lose it AND your password, your data is permanently lost.</strong>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('password')}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:shadow-lg transition-all"
              >
                Set Up Encryption
              </button>
              {onSkip && (
                <button
                  onClick={onSkip}
                  className="px-6 py-3 border-2 border-slate-300 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all"
                >
                  Skip for Now
                </button>
              )}
            </div>
          </div>
        )}

        {/* Password Creation Step */}
        {step === 'password' && (
          <div className="p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Create Master Password</h2>
              <p className="text-slate-600">This password will protect all your encrypted documents</p>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Master Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Enter a strong password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {password && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-600">Password Strength</span>
                      <span className={`font-bold ${passwordStrength >= 75 ? 'text-green-600' : passwordStrength >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {passwordStrength >= 75 ? 'Strong' : passwordStrength >= 50 ? 'Medium' : 'Weak'}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${passwordStrengthColor}`}
                        style={{ width: `${passwordStrength}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Password Requirements */}
                {passwordErrors.length > 0 && (
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs font-bold text-red-800 mb-1">Password must have:</p>
                    <ul className="text-xs text-red-700 space-y-1">
                      {passwordErrors.map((error, i) => (
                        <li key={i}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Re-enter password"
                  />
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="mt-1 text-xs text-red-600">Passwords do not match</p>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('intro')}
                className="px-6 py-3 border-2 border-slate-300 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all"
              >
                Back
              </button>
              <button
                onClick={handlePasswordSubmit}
                disabled={!password || !confirmPassword || password !== confirmPassword || passwordErrors.length > 0 || isProcessing}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Generating Keys...' : 'Continue'}
              </button>
            </div>
          </div>
        )}

        {/* Recovery Phrase Step */}
        {step === 'recovery' && recoveryWords && (
          <div className="p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Save Your Recovery Phrase</h2>
              <p className="text-slate-600">Write down these 24 words in order. You'll need them to recover your account.</p>
            </div>

            <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-red-900 mb-1">⚠️ CRITICAL: Save This Phrase!</h3>
                  <p className="text-sm text-red-700">
                    If you lose your password AND this recovery phrase, your encrypted documents are <strong>PERMANENTLY LOST</strong>. We cannot recover them for you.
                  </p>
                </div>
              </div>
            </div>

            {/* Recovery Words Grid */}
            <div className="grid grid-cols-4 gap-3 mb-6 p-6 bg-slate-50 rounded-xl border-2 border-slate-200">
              {recoveryWords.map((word, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-xs font-bold text-slate-400 w-6">{index + 1}.</span>
                  <span className="text-sm font-mono font-bold text-slate-800">{word}</span>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                onClick={copyRecoveryPhrase}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-100 text-blue-700 rounded-xl font-bold hover:bg-blue-200 transition-all"
              >
                {copiedRecovery ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                {copiedRecovery ? 'Copied!' : 'Copy to Clipboard'}
              </button>
              <button
                onClick={downloadRecoveryKit}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-green-100 text-green-700 rounded-xl font-bold hover:bg-green-200 transition-all"
              >
                {downloadedRecovery ? <Check className="w-5 h-5" /> : <Download className="w-5 h-5" />}
                {downloadedRecovery ? 'Downloaded!' : 'Download Recovery Kit'}
              </button>
            </div>

            <button
              onClick={() => setStep('verify')}
              disabled={!copiedRecovery && !downloadedRecovery}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              I've Saved My Recovery Phrase
            </button>

            {!copiedRecovery && !downloadedRecovery && (
              <p className="mt-3 text-xs text-center text-amber-600">
                Please copy or download your recovery phrase before continuing
              </p>
            )}
          </div>
        )}

        {/* Verification Step */}
        {step === 'verify' && recoveryWords && (
          <div className="p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Verify Recovery Phrase</h2>
              <p className="text-slate-600">Enter the following words from your recovery phrase to confirm you saved it correctly</p>
            </div>

            <div className="space-y-4 mb-6">
              {verificationIndices.map((wordIndex, i) => (
                <div key={i}>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Word #{wordIndex + 1}
                  </label>
                  <input
                    type="text"
                    value={verificationInputs[i]}
                    onChange={(e) => {
                      const newInputs = [...verificationInputs];
                      newInputs[i] = e.target.value;
                      setVerificationInputs(newInputs);
                    }}
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono"
                    placeholder="Enter the word"
                    autoComplete="off"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setStep('recovery');
                  setVerificationInputs(['', '', '']);
                }}
                className="px-6 py-3 border-2 border-slate-300 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all"
              >
                Back
              </button>
              <button
                onClick={verifyRecoveryPhrase}
                disabled={verificationInputs.some(input => !input.trim())}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Verify & Complete Setup
              </button>
            </div>
          </div>
        )}

        {/* Complete Step */}
        {step === 'complete' && (
          <div className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full mb-4 animate-bounce">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-slate-800 mb-2">
              Encryption Activated!
            </h2>
            <p className="text-slate-600 mb-6">
              Your documents are now protected with military-grade end-to-end encryption
            </p>
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-green-50 border-2 border-green-200 rounded-xl">
              <Shield className="w-5 h-5 text-green-600" />
              <span className="font-bold text-green-800">All uploads will be automatically encrypted</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
