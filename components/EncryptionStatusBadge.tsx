/**
 * Encryption Status Badge
 *
 * Shows encryption status and provides quick lock/unlock access
 * Displays:
 * - 🔒 Locked (encryption active but session locked)
 * - 🔓 Unlocked (encryption active and ready)
 * - ⚠️ Not Encrypted (encryption not set up)
 */

import React, { useEffect, useState } from 'react';
import { Shield, Lock, Unlock, AlertTriangle } from 'lucide-react';
import { keyManager, documentEncryption } from '../services/encryption';

interface EncryptionStatusBadgeProps {
  onUnlockClick?: () => void;
  onLockClick?: () => void;
  onSetupClick?: () => void;
  className?: string;
}

export const EncryptionStatusBadge: React.FC<EncryptionStatusBadgeProps> = ({
  onUnlockClick,
  onLockClick,
  onSetupClick,
  className = ''
}) => {
  const [status, setStatus] = useState<{
    initialized: boolean;
    unlocked: boolean;
    version: string;
  }>({ initialized: false, unlocked: false, version: '1.0' });

  useEffect(() => {
    updateStatus();

    // Update status every 5 seconds (in case of auto-lock)
    const interval = setInterval(updateStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const updateStatus = async () => {
    const encryptionStatus = await documentEncryption.getEncryptionStatus();
    setStatus(encryptionStatus);
  };

  const handleLock = () => {
    keyManager.clearSession();
    updateStatus();
    onLockClick?.();
  };

  if (!status.initialized) {
    // Encryption not set up
    return (
      <button
        onClick={onSetupClick}
        className={`inline-flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-800 rounded-lg text-xs font-bold hover:bg-amber-200 transition-all ${className}`}
        title="Click to set up encryption"
      >
        <AlertTriangle className="w-4 h-4" />
        Not Encrypted
      </button>
    );
  }

  if (status.unlocked) {
    // Encryption unlocked
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-800 rounded-lg text-xs font-bold">
          <Unlock className="w-4 h-4" />
          <span>Encryption Active</span>
        </div>
        <button
          onClick={handleLock}
          className="px-2 py-1.5 text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-all"
          title="Lock encryption"
        >
          <Lock className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Encryption locked
  return (
    <button
      onClick={onUnlockClick}
      className={`inline-flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-800 rounded-lg text-xs font-bold hover:bg-red-200 transition-all ${className}`}
      title="Click to unlock encryption"
    >
      <Lock className="w-4 h-4" />
      Locked
    </button>
  );
};

/**
 * Encryption Icon Badge (Compact version for document items)
 */
export const EncryptionIconBadge: React.FC<{ encrypted: boolean }> = ({ encrypted }) => {
  if (!encrypted) return null;

  return (
    <div
      className="inline-flex items-center justify-center w-5 h-5 bg-green-100 rounded-full"
      title="End-to-end encrypted"
    >
      <Shield className="w-3 h-3 text-green-700" />
    </div>
  );
};
