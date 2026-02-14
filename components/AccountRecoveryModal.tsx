/**
 * Account Recovery Modal
 *
 * Allows users to recover their account using the 24-word BIP-39 recovery phrase
 * Prompts for:
 * 1. 24-word recovery phrase
 * 2. New password
 * 3. Confirmation
 */

import React, { useState } from 'react';
import { Key, Lock, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { keyManager, validatePasswordStrength } from '../services/encryption';

interface AccountRecoveryModalProps {
  onRecoverySuccess: () => void;
  onCancel: () => void;
}

export const AccountRecoveryModal: React.FC<AccountRecoveryModalProps> = ({
  onRecoverySuccess,
  onCancel
}) => {
  const [step, setStep] = useState<'phrase' | 'password'>('phrase');
  const [recoveryPhrase, setRecoveryPhrase] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const handlePhraseSubmit = () => {
    const words = recoveryPhrase.trim().split(/\s+/);

    if (words.length !== 24) {
      setError(`Recovery phrase must be exactly 24 words. You entered ${words.length} words.`);
      return;
    }

    setError('');
    setStep('password');
  };

  const handleRecovery = async () => {
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match!');
      return;
    }

    const validation = validatePasswordStrength(newPassword);
    if (!validation.isValid) {
      setError(`Password is too weak:\n${validation.errors.join('\n')}`);
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const success = await keyManager.recoverWithPhrase(
        recoveryPhrase.trim(),
        newPassword
      );

      if (success) {
        onRecoverySuccess();
      } else {
        setError('Recovery failed. Please check your recovery phrase and try again.');
      }
    } catch (err) {
      console.error('Recovery error:', err);
      setError(`Recovery failed: ${(err as Error).message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const wordCount = recoveryPhrase.trim().split(/\s+/).filter(w => w.length > 0).length;
  const passwordStrength = newPassword.length === 0 ? 0 :
    validatePasswordStrength(newPassword).errors.length === 0 ? 100 :
    validatePasswordStrength(newPassword).errors.length === 1 ? 75 :
    validatePasswordStrength(newPassword).errors.length === 2 ? 50 : 25;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full mb-4">
              <Key className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              Recover Your Account
            </h2>
            <p className="text-slate-600">
              {step === 'phrase'
                ? 'Enter your 24-word recovery phrase'
                : 'Set a new password for your account'}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 whitespace-pre-line">{error}</p>
            </div>
          )}

          {/* Recovery Phrase Step */}
          {step === 'phrase' && (
            <>
              <div className="mb-6">
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Recovery Phrase (24 words)
                </label>
                <textarea
                  value={recoveryPhrase}
                  onChange={(e) => {
                    setRecoveryPhrase(e.target.value);
                    setError('');
                  }}
                  rows={6}
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm resize-none"
                  placeholder="Enter your 24-word recovery phrase, separated by spaces"
                  autoFocus
                />
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Words entered: {wordCount}/24</span>
                  {wordCount === 24 && (
                    <span className="text-green-600 font-bold flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      Complete
                    </span>
                  )}
                </div>
              </div>

              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-xs text-blue-700">
                  <strong>💡 Tip:</strong> Your recovery phrase is 24 words separated by spaces.
                  It was shown to you when you first set up encryption.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onCancel}
                  className="px-6 py-3 border-2 border-slate-300 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePhraseSubmit}
                  disabled={wordCount !== 24}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            </>
          )}

          {/* New Password Step */}
          {step === 'password' && (
            <>
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-bold text-sm">Recovery phrase verified!</span>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setError('');
                      }}
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
                  {newPassword && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-600">Password Strength</span>
                        <span className={`font-bold ${passwordStrength >= 75 ? 'text-green-600' : passwordStrength >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {passwordStrength >= 75 ? 'Strong' : passwordStrength >= 50 ? 'Medium' : 'Weak'}
                        </span>
                      </div>
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${passwordStrength >= 75 ? 'bg-green-500' : passwordStrength >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${passwordStrength}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setError('');
                      }}
                      className="w-full pl-10 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="Re-enter new password"
                    />
                  </div>
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="mt-1 text-xs text-red-600">Passwords do not match</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('phrase')}
                  className="px-6 py-3 border-2 border-slate-300 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all"
                  disabled={isProcessing}
                >
                  Back
                </button>
                <button
                  onClick={handleRecovery}
                  disabled={!newPassword || !confirmPassword || newPassword !== confirmPassword || passwordStrength < 75 || isProcessing}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? 'Recovering Account...' : 'Recover Account'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
