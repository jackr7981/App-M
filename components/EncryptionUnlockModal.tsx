/**
 * Encryption Unlock Modal
 *
 * Prompts users to unlock their encryption with password
 * Shows when:
 * - User logs in and has encryption enabled
 * - Session is locked after inactivity
 * - User tries to access encrypted documents
 */

import React, { useState } from 'react';
import { Lock, Unlock, Key, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { keyManager } from '../services/encryption';

interface EncryptionUnlockModalProps {
  onUnlock: () => void;
  onForgotPassword?: () => void;
  allowDismiss?: boolean;
  onDismiss?: () => void;
}

export const EncryptionUnlockModal: React.FC<EncryptionUnlockModalProps> = ({
  onUnlock,
  onForgotPassword,
  allowDismiss = false,
  onDismiss
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [error, setError] = useState('');

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsUnlocking(true);

    try {
      const success = await keyManager.unlockWithPassword(password);

      if (success) {
        onUnlock();
      } else {
        setError('Incorrect password. Please try again.');
        setPassword('');
      }
    } catch (err) {
      console.error('Unlock error:', err);
      setError(`Failed to unlock: ${(err as Error).message}`);
    } finally {
      setIsUnlocking(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              Unlock Encryption
            </h2>
            <p className="text-slate-600">
              Enter your master password to access encrypted documents
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Password Form */}
          <form onSubmit={handleUnlock}>
            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Master Password
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  className="w-full pl-10 pr-10 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Enter your password"
                  autoFocus
                  disabled={isUnlocking}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600"
                  disabled={isUnlocking}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Unlock Button */}
            <button
              type="submit"
              disabled={!password || isUnlocking}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-3"
            >
              {isUnlocking ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Unlocking...
                </>
              ) : (
                <>
                  <Unlock className="w-5 h-5" />
                  Unlock
                </>
              )}
            </button>

            {/* Forgot Password Link */}
            {onForgotPassword && (
              <button
                type="button"
                onClick={onForgotPassword}
                className="w-full text-sm text-blue-600 hover:text-blue-800 font-semibold"
                disabled={isUnlocking}
              >
                Forgot password? Use recovery phrase
              </button>
            )}

            {/* Dismiss Button (if allowed) */}
            {allowDismiss && onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="w-full mt-3 px-6 py-2 text-slate-600 hover:text-slate-800 text-sm font-semibold"
                disabled={isUnlocking}
              >
                Skip for now
              </button>
            )}
          </form>

          {/* Info Box */}
          <div className="mt-6 p-4 bg-blue-50 rounded-xl">
            <p className="text-xs text-blue-700">
              <strong>💡 Tip:</strong> Your password never leaves your device. Only you can decrypt your documents.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
