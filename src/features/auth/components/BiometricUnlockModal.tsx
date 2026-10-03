import React, { useState, useEffect } from 'react';
import { 
  Fingerprint, 
  ShieldCheck, 
  AlertCircle, 
  X, 
  Loader2, 
  CheckCircle2, 
  Sparkles, 
  KeyRound, 
  Lock,
  Laptop,
  Check
} from 'lucide-react';
import { 
  authenticateWithBiometrics, 
  getDeviceBiometricName, 
  isPlatformAuthenticatorAvailable,
  isWebAuthnSupported
} from '../../../services/webauthn';
import { getUserByEmail, initStorage, INITIAL_USER } from '../../../services/db';
import { setCurrentUserSession, clearLockout } from '../services/authService';
import { UserAccount } from '../../../types';
import { useToast } from '../../../components/Toast';

interface BiometricUnlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetEmail?: string;
  onSuccess: (user: UserAccount) => void;
  onFallbackToPin?: () => void;
}

export const BiometricUnlockModal: React.FC<BiometricUnlockModalProps> = ({
  isOpen,
  onClose,
  targetEmail,
  onSuccess,
  onFallbackToPin,
}) => {
  const { toast } = useToast();
  const [deviceBioName, setDeviceBioName] = useState<string>('Touch ID / Biometrics');
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [identifiedUser, setIdentifiedUser] = useState<UserAccount | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDeviceBioName(getDeviceBiometricName());
      setStatus('scanning');
      setErrorMessage(null);
      triggerBiometricAuth();
    } else {
      setStatus('idle');
      setErrorMessage(null);
    }
  }, [isOpen, targetEmail]);

  const triggerBiometricAuth = async () => {
    setStatus('scanning');
    setErrorMessage(null);

    try {
      await initStorage();
      const emailToLookup = targetEmail?.trim().toLowerCase() || localStorage.getItem('stulock_last_bio_user') || 'aarav.sharma@campus.edu';
      let user = await getUserByEmail(emailToLookup);
      
      if (!user && emailToLookup === INITIAL_USER.email) {
        user = INITIAL_USER;
      }

      setIdentifiedUser(user);

      // Perform WebAuthn Biometric API verification
      const result = await authenticateWithBiometrics(emailToLookup);

      if (result.success) {
        setStatus('success');
        
        const finalUser = user || result.user || INITIAL_USER;
        
        // Log in the user session
        clearLockout();
        sessionStorage.removeItem('aegislock_panic_triggered');
        setCurrentUserSession(finalUser.id, finalUser.email);

        setTimeout(() => {
          onSuccess(finalUser);
          toast({
            type: 'success',
            title: 'Biometric Authenticated',
            message: `${deviceBioName} verified. Welcome to your student locker, ${finalUser.name}!`,
          });
          onClose();
        }, 850);
      } else {
        setStatus('failed');
        setErrorMessage(result.error || 'Biometric verification could not be confirmed.');
      }
    } catch (err: any) {
      setStatus('failed');
      setErrorMessage(err?.message || 'Biometric hardware sensor error.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl p-6 text-center space-y-5 overflow-hidden">
        
        {/* Subtle top ambient glow */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-24 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-white rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Icon & Device Type */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-[11px] font-semibold tracking-wide border border-indigo-200/50 dark:border-indigo-900/50">
            <Laptop className="w-3.5 h-3.5" />
            <span>WebAuthn Biometric API</span>
          </div>
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white pt-1">
            {deviceBioName}
          </h3>
          <p className="text-xs text-neutral-500">
            {targetEmail ? (
              <span>Unlocking locker for <strong className="text-neutral-700 dark:text-neutral-300">{targetEmail}</strong></span>
            ) : (
              <span>Touch sensor or look at camera to unlock your locker</span>
            )}
          </p>
        </div>

        {/* Central Biometric Scanner graphic */}
        <div className="py-2 flex flex-col items-center justify-center">
          <div className="relative flex items-center justify-center">
            
            {/* Animated Pulsing Waves */}
            {status === 'scanning' && (
              <>
                <div className="absolute w-24 h-24 rounded-full bg-indigo-500/10 animate-ping duration-1000" />
                <div className="absolute w-28 h-28 rounded-full border border-indigo-500/30 animate-pulse" />
              </>
            )}

            {/* Core Scanner Disc */}
            <div className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
              status === 'success' 
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-105'
                : status === 'failed'
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                : 'bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-xl shadow-indigo-600/30'
            }`}>
              {status === 'scanning' && (
                <Fingerprint className="w-10 h-10 animate-pulse text-white" />
              )}
              {status === 'success' && (
                <Check className="w-10 h-10 animate-in zoom-in-50 duration-200" />
              )}
              {status === 'failed' && (
                <AlertCircle className="w-10 h-10 animate-in zoom-in-50 duration-200" />
              )}
              {status === 'idle' && (
                <Fingerprint className="w-10 h-10 text-white" />
              )}
            </div>

          </div>

          {/* Status Label */}
          <div className="mt-4 text-xs font-semibold">
            {status === 'scanning' && (
              <span className="text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Waiting for biometric verification...</span>
              </span>
            )}
            {status === 'success' && (
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Identity Verified! Unlocking Locker...</span>
              </span>
            )}
            {status === 'failed' && (
              <span className="text-rose-600 dark:text-rose-400">
                {errorMessage || 'Verification Failed'}
              </span>
            )}
          </div>
        </div>

        {/* Fallback & Retry Actions */}
        <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
          {status === 'failed' && (
            <button
              type="button"
              onClick={triggerBiometricAuth}
              className="w-full py-2.5 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs"
            >
              Try Biometrics Again
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              onClose();
              if (onFallbackToPin) onFallbackToPin();
            }}
            className="w-full py-2 px-3 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors flex items-center justify-center gap-1.5"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Use 6-Digit Passkey PIN Instead</span>
          </button>
        </div>

        {/* Security Assurance Guarantee */}
        <div className="text-[10px] text-neutral-400 flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>FIDO2 / WebAuthn Client-Side Security Enclave</span>
        </div>

      </div>
    </div>
  );
};
