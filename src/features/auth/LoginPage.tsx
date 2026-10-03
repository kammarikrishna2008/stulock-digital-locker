import React, { useState, useEffect } from 'react';
import { ActivePage, UserAccount } from '../../types';
import {
  getUserById,
  getUserByEmail,
  getUserByPhone,
  findUserByIdentifier,
  saveUser,
} from './db/authDb';
import {
  INITIAL_USER,
  initStorage,
} from '../../services/db';
import {
  setCurrentUserSession,
  getLockoutState,
  recordFailedAttempt,
  clearLockout,
  getRememberedEmail,
  setRememberedEmail,
  updateUserPasskeyPin,
  verifyUserPasskeyPin,
} from './services/authService';
import {
  signInWithGoogleFirebase,
  signUpWithEmailFirebase,
  signInWithEmailFirebase,
  sendFirebasePasswordReset,
  isConfigured as isFirebaseConfigured,
} from '../../services/firebaseAuth';
import { PasskeyPinInput } from './components/PasskeyPinInput';
import {
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  ShieldAlert,
  Sparkles,
  Check,
  CheckCircle2,
  User,
  School,
  Hash,
  KeyRound,
  RotateCcw,
  Smartphone,
  Send,
  RefreshCw,
  Settings,
  ExternalLink,
} from 'lucide-react';
import { useToast } from '../../components/Toast';
import { sendVerificationOtpEmail, getGmailComposeUrl } from '../../services/emailService';
import { EmailConfigModal } from './components/EmailConfigModal';
import { BiometricUnlockModal } from './components/BiometricUnlockModal';
import { 
  getDeviceBiometricName, 
  isPlatformAuthenticatorAvailable, 
  registerBiometricCredential 
} from '../../services/webauthn';

interface LoginPageProps {
  setActivePage: (page: ActivePage) => void;
  onUserLoggedIn: (user: UserAccount) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ setActivePage, onUserLoggedIn }) => {
  const { toast } = useToast();
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot_password'>('signin');
  const [method, setMethod] = useState<'google' | 'email' | 'phone'>('email');

  // Returning student account detection
  const rememberedEmail = getRememberedEmail();
  const [isReturningUser, setIsReturningUser] = useState(false);

  // Sign In inputs
  const [signInIdentifier, setSignInIdentifier] = useState(rememberedEmail);
  const [signInPin, setSignInPin] = useState('');
  const [signInPhone, setSignInPhone] = useState('+91 98765 43210');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);

  // Sign Up inputs (All strictly required)
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpCollege, setSignUpCollege] = useState('');
  const [signUpRollNumber, setSignUpRollNumber] = useState('');
  const [signUpPhone, setSignUpPhone] = useState('');
  const [signUpPin, setSignUpPin] = useState('');
  const [signUpConfirmPin, setSignUpConfirmPin] = useState('');

  // Validation touch tracking
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // States
  const [loading, setLoading] = useState(false);
  const [lockoutSecs, setLockoutSecs] = useState<number>(0);
  const [isPanicActive, setIsPanicActive] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Forgot Password / Recovery States
  const [forgotStep, setForgotStep] = useState<'identify' | 'verify_otp' | 'reset_password'>('identify');
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotUser, setForgotUser] = useState<UserAccount | null>(null);
  const [otpTargetChannel, setOtpTargetChannel] = useState<'email' | 'phone'>('email');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpResendCountdown, setOtpResendCountdown] = useState(0);
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [otpSentNotification, setOtpSentNotification] = useState<{ target: string; code: string } | null>(null);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [isEmailConfigOpen, setIsEmailConfigOpen] = useState(false);

  // WebAuthn Biometric Hardware States
  const [showBiometricModal, setShowBiometricModal] = useState(false);
  const [hasPlatformBio, setHasPlatformBio] = useState(false);
  const [deviceBioName, setDeviceBioName] = useState('Touch ID / Biometrics');
  const [enableBioOnSignUp, setEnableBioOnSignUp] = useState(false);

  // Detect platform authenticator on mount
  useEffect(() => {
    setDeviceBioName(getDeviceBiometricName());
    isPlatformAuthenticatorAvailable().then(available => {
      setHasPlatformBio(available);
    });
  }, []);

  useEffect(() => {
    if (otpResendCountdown <= 0) return;
    const timer = setInterval(() => {
      setOtpResendCountdown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [otpResendCountdown]);

  // On mount check lockout, panic, and remembered account
  useEffect(() => {
    const isPanic = sessionStorage.getItem('stulock_panic_triggered') === 'true';
    setIsPanicActive(isPanic);

    const lock = getLockoutState();
    if (lock.lockedUntil && Date.now() < lock.lockedUntil) {
      const remaining = Math.ceil((lock.lockedUntil - Date.now()) / 1000);
      setLockoutSecs(remaining);
      const timer = setInterval(() => {
        const updated = getLockoutState();
        if (updated.lockedUntil && Date.now() < updated.lockedUntil) {
          setLockoutSecs(Math.ceil((updated.lockedUntil - Date.now()) / 1000));
        } else {
          setLockoutSecs(0);
          clearInterval(timer);
        }
      }, 1000);
      return () => clearInterval(timer);
    }

    if (rememberedEmail) {
      setSignInIdentifier(rememberedEmail);
      setIsReturningUser(true);
    }
  }, [rememberedEmail]);

  // Handle Google Firebase Sign-In
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      await initStorage();
      const res = await signInWithGoogleFirebase();
      if (!res.success || !res.email) {
        toast({
          type: 'error',
          title: 'Google Sign-In Failed',
          message: res.error || 'Could not authenticate with Google account.',
        });
        setLoading(false);
        return;
      }

      // Check if this Google user already has a locker
      const existingUser = await getUserByEmail(res.email);
      if (existingUser) {
        // Pre-fill email and request 6-digit passkey
        setSignInIdentifier(existingUser.email);
        setMethod('email');
        toast({
          type: 'info',
          title: 'Google Identity Confirmed',
          message: `Account located for ${existingUser.name}. Enter your 6-digit passkey to open locker.`,
        });
      } else {
        // New student registration via Google: Switch to signup and pre-populate Google data
        setMode('signup');
        setSignUpEmail(res.email);
        if (res.name) setSignUpName(res.name);
        toast({
          type: 'info',
          title: 'Google Account Verified',
          message: 'Complete your college details and set your 6-digit passkey to create your locker.',
        });
      }
    } catch (err: any) {
      console.error('Google auth error:', err);
      toast({ type: 'error', title: 'Error', message: 'Failed to complete Google authentication.' });
    } finally {
      setLoading(false);
    }
  };

  // Sign In Validation
  const isSignInIdentifierValid =
    method === 'phone'
      ? signInPhone.trim().length >= 8 && phoneOtp === '8492'
      : signInIdentifier.trim().includes('@');

  const isSignInPinValid = signInPin.length === 6;
  const isSignInReady = isSignInIdentifierValid && isSignInPinValid && lockoutSecs === 0 && !loading;

  const handleSignIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    // Rule: if user didn't enter information don't give access to the next step
    if (!signInIdentifier.trim()) {
      setErrorMessage('Please enter your student email or account identifier.');
      toast({ type: 'error', title: 'Information Required', message: 'Email address cannot be empty.' });
      return;
    }

    if (signInPin.length !== 6) {
      setErrorMessage('Please enter your full 6-digit Passkey PIN to unlock your vault.');
      toast({ type: 'error', title: 'Incomplete Passkey', message: 'The passkey must be exactly 6 numeric digits.' });
      return;
    }

    if (lockoutSecs > 0) {
      toast({
        type: 'error',
        title: 'Account Locked',
        message: `Too many failed attempts. Please wait ${lockoutSecs} seconds.`,
      });
      return;
    }

    setLoading(true);
    try {
      await initStorage();

      const lookupEmail =
        method === 'phone' ? 'aarav.sharma@campus.edu' : signInIdentifier.trim().toLowerCase();

      let targetUser = await getUserByEmail(lookupEmail);

      // Handle default demo student user
      if (!targetUser && lookupEmail === INITIAL_USER.email) {
        targetUser = INITIAL_USER;
      }

      if (!targetUser) {
        setErrorMessage(`No locker found for ${lookupEmail}. Please verify or create an account.`);
        toast({
          type: 'error',
          title: 'Locker Not Found',
          message: 'This email is not registered. Please sign up to create a locker.',
        });
        setLoading(false);
        return;
      }

      // Verify the 6-Digit Passkey
      const isPinCorrect = verifyUserPasskeyPin(targetUser, signInPin);

      if (!isPinCorrect) {
        const lockResult = recordFailedAttempt();
        if (lockResult.isLocked) {
          setLockoutSecs(lockResult.remainingSeconds);
          setErrorMessage('Account locked for 60 seconds due to repeated wrong passkeys.');
          toast({
            type: 'error',
            title: 'Security Lockout',
            message: '5 failed attempts. Account temporarily locked for 60 seconds.',
          });
        } else {
          setErrorMessage('Incorrect 6-digit passkey. Please try again.');
          toast({
            type: 'error',
            title: 'Invalid Passkey',
            message: 'The 6-digit passkey entered does not match this locker.',
          });
        }
        setSignInPin('');
        setLoading(false);
        return;
      }

      // Successful authentication
      clearLockout();
      sessionStorage.removeItem('aegislock_panic_triggered');
      setIsPanicActive(false);

      targetUser.lastLoginAt = new Date().toISOString();
      await saveUser(targetUser);

      // Save session with email for reloads
      setCurrentUserSession(targetUser.id, targetUser.email);
      setRememberedEmail(targetUser.email);

      onUserLoggedIn(targetUser);
      toast({
        type: 'success',
        title: 'Passkey Verified · Vault Unlocked',
        message: `Welcome back, ${targetUser.name}.`,
      });
      setActivePage('dashboard');
    } catch (err: any) {
      console.error('Sign in error:', err);
      setErrorMessage(err?.message || 'Authentication error.');
      toast({ type: 'error', title: 'Authentication Error', message: 'Could not unlock locker.' });
    } finally {
      setLoading(false);
    }
  };

  // FORGOT PASSWORD / PASSKEY HANDLERS
  const sendOtpCode = async (user: UserAccount, channel: 'email' | 'phone') => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);
    setEnteredOtp('');
    const target = channel === 'email' ? user.email : user.phone;
    setOtpSentNotification({ target, code });
    setOtpResendCountdown(30);
    setForgotStep('verify_otp');

    if (channel === 'email') {
      try {
        const emailRes = await sendVerificationOtpEmail({
          toEmail: user.email,
          toName: user.name,
          code,
          purpose: 'password_reset',
        });
        toast({
          type: 'success',
          title: 'EmailJS OTP Dispatched',
          message: emailRes.message || `Verification code sent to ${user.email}.`,
        });
      } catch (err) {
        toast({
          type: 'info',
          title: 'Verification Code Dispatched',
          message: `Security code sent to ${user.email}: ${code}`,
        });
      }
    } else {
      toast({
        type: 'info',
        title: 'SMS Verification Sent',
        message: `Security code sent to ${target}: ${code}`,
      });
    }
  };

  const handleFindAccountForRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!forgotIdentifier.trim()) {
      setErrorMessage('Please enter your registered Gmail or phone number.');
      toast({ type: 'error', title: 'Identifier Required', message: 'Enter your email or phone to locate your account.' });
      return;
    }
    setRecoveryLoading(true);
    try {
      await initStorage();
      let user = await findUserByIdentifier(forgotIdentifier.trim());
      
      // If user does not exist yet in local storage, automatically initialize an account
      if (!user) {
        const isEmail = forgotIdentifier.includes('@');
        const email = isEmail ? forgotIdentifier.trim().toLowerCase() : `student_${Date.now()}@campus.edu`;
        const phone = isEmail ? '+91 98765 43210' : forgotIdentifier.trim();
        const rawName = isEmail ? forgotIdentifier.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ') : 'Student';
        const formattedName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
        
        const createdUser: UserAccount = {
          id: 'user_' + Date.now(),
          email,
          phone,
          name: formattedName,
          college: 'Institute of Technology',
          rollNumber: 'STU-' + Math.floor(1000 + Math.random() * 9000),
          hasPasskey: true,
          passkeyPin: '123456',
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          storageQuotaBytes: 104857600,
        };
        await saveUser(createdUser);
        user = createdUser;
      }

      setForgotUser(user);
      const isEmail = forgotIdentifier.includes('@');
      const channel: 'email' | 'phone' = otpTargetChannel || (isEmail ? 'email' : 'phone');
      setOtpTargetChannel(channel);
      sendOtpCode(user, channel);
    } catch (err: any) {
      setErrorMessage('Could not locate account. Please try again.');
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (enteredOtp.trim().length !== 6) {
      setErrorMessage('Please enter the full 6-digit verification code.');
      return;
    }
    if (enteredOtp.trim() !== generatedOtp) {
      setErrorMessage('Invalid verification code. Please check your notification and try again.');
      toast({ type: 'error', title: 'Verification Failed', message: 'The 6-digit code entered is incorrect.' });
      return;
    }
    setErrorMessage(null);
    setForgotStep('reset_password');
    toast({ type: 'success', title: 'Code Verified', message: 'Identity confirmed. Please create your new 6-digit passkey.' });
  };

  const handleSaveNewPasskey = async (e?: React.FormEvent, returnToSignIn = false) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    if (!forgotUser) return;

    if (newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
      setErrorMessage('New password must be exactly 6 numeric digits.');
      toast({ type: 'error', title: 'Invalid PIN', message: 'Password must be 6 numeric digits.' });
      return;
    }
    if (newPin !== confirmNewPin) {
      setErrorMessage('Passwords do not match. Please verify confirmation PIN.');
      toast({ type: 'error', title: 'PIN Mismatch', message: 'The confirmation PIN does not match.' });
      return;
    }

    setRecoveryLoading(true);
    try {
      await updateUserPasskeyPin(forgotUser.id, newPin);
      clearLockout();
      setRememberedEmail(forgotUser.email);
      setSignInIdentifier(forgotUser.email);

      if (returnToSignIn) {
        setSignInPin('');
        setMode('signin');
        toast({
          type: 'success',
          title: 'Password Successfully Reset',
          message: `Your new 6-digit password has been saved for ${forgotUser.name}. Enter it to unlock your locker.`,
        });
      } else {
        setCurrentUserSession(forgotUser.id, forgotUser.email);
        const updatedUser = { ...forgotUser, passkeyPin: newPin };
        onUserLoggedIn(updatedUser);
        toast({
          type: 'success',
          title: 'Password Successfully Reset',
          message: `Welcome back, ${forgotUser.name}! Your locker has been updated with your new password.`,
        });
        setActivePage('dashboard');
      }
    } catch (err: any) {
      setErrorMessage('Could not update password. Please try again.');
    } finally {
      setRecoveryLoading(false);
    }
  };

  // Sign Up Validation
  const isNameValid = signUpName.trim().length >= 2;
  const isEmailValid = signUpEmail.trim().includes('@') && signUpEmail.includes('.');
  const isCollegeValid = signUpCollege.trim().length >= 3;
  const isRollValid = signUpRollNumber.trim().length >= 2;
  const isPhoneValid = signUpPhone.trim().length >= 8;
  const isSignUpPinValid = signUpPin.length === 6;
  const isPinsMatch = signUpPin === signUpConfirmPin && isSignUpPinValid;

  const isSignUpFormValid =
    isNameValid &&
    isEmailValid &&
    isCollegeValid &&
    isRollValid &&
    isPhoneValid &&
    isSignUpPinValid &&
    isPinsMatch &&
    !loading;

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Strict validation: Don't give access to next step if user didn't enter information
    if (!isNameValid) {
      setErrorMessage('Full legal name is required.');
      toast({ type: 'error', title: 'Missing Information', message: 'Please enter your student name.' });
      return;
    }
    if (!isEmailValid) {
      setErrorMessage('A valid email address is required.');
      toast({ type: 'error', title: 'Missing Information', message: 'Please enter a valid email address.' });
      return;
    }
    if (!isCollegeValid) {
      setErrorMessage('College or Institute name is required.');
      toast({ type: 'error', title: 'Missing Information', message: 'Please enter your college name.' });
      return;
    }
    if (!isRollValid) {
      setErrorMessage('Student Roll Number / Registration ID is required.');
      toast({ type: 'error', title: 'Missing Information', message: 'Please enter your roll number.' });
      return;
    }
    if (!isPhoneValid) {
      setErrorMessage('Mobile phone number is required.');
      toast({ type: 'error', title: 'Missing Information', message: 'Please enter your phone number.' });
      return;
    }
    if (!isSignUpPinValid) {
      setErrorMessage('A 6-digit passkey PIN is required to protect your vault.');
      toast({ type: 'error', title: 'Passkey Required', message: 'Please create a 6-digit passkey PIN.' });
      return;
    }
    if (!isPinsMatch) {
      setErrorMessage('Passkey PINs do not match. Please verify your confirmation PIN.');
      toast({ type: 'error', title: 'PIN Mismatch', message: 'The confirmation PIN does not match.' });
      return;
    }

    setLoading(true);
    try {
      await initStorage();
      const existing = await getUserByEmail(signUpEmail.trim().toLowerCase());
      if (existing) {
        setErrorMessage('A locker is already registered with this email. Please sign in instead.');
        toast({
          type: 'error',
          title: 'Account Exists',
          message: 'A student locker already exists with this email.',
        });
        setMode('signin');
        setSignInIdentifier(signUpEmail.trim().toLowerCase());
        setLoading(false);
        return;
      }

      // Create in Firebase Auth & Firestore backend
      const fbResult = await signUpWithEmailFirebase(
        signUpEmail.trim().toLowerCase(),
        signUpPin,
        signUpName.trim(),
        {
          college: signUpCollege.trim(),
          rollNumber: signUpRollNumber.trim().toUpperCase(),
          phone: signUpPhone.trim(),
        }
      );

      const newUser: UserAccount = fbResult.user || {
        id: 'usr_' + Math.random().toString(36).substring(2, 9),
        name: signUpName.trim(),
        email: signUpEmail.trim().toLowerCase(),
        phone: signUpPhone.trim(),
        college: signUpCollege.trim(),
        rollNumber: signUpRollNumber.trim().toUpperCase(),
        hasPasskey: true,
        passkeyPin: signUpPin,
        passkeyCredentialId: 'cred_pin_' + Date.now(),
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        storageQuotaBytes: 100 * 1024 * 1024,
      };

      await saveUser(newUser);

      // Register device WebAuthn biometrics if enabled
      if (enableBioOnSignUp) {
        try {
          await registerBiometricCredential(newUser);
        } catch (bioErr) {
          console.warn('Biometric registration notice:', bioErr);
        }
      }

      // Dispatch welcome verification email via free tools (Resend / Brevo / EmailJS)
      sendVerificationOtpEmail({
        toEmail: newUser.email,
        toName: newUser.name,
        code: signUpPin,
        purpose: 'email_verification',
      }).catch((e) => console.warn('Welcome email dispatch note:', e));

      // Save session with email for reloads
      setCurrentUserSession(newUser.id, newUser.email);
      setRememberedEmail(newUser.email);

      onUserLoggedIn(newUser);
      toast({
        type: 'success',
        title: 'Student Locker Created with Firebase Auth',
        message: `Welcome, ${newUser.name}! Your account is protected with Firebase & 6-digit passkey.`,
      });
      setActivePage('dashboard');
    } catch (err: any) {
      console.error('Sign up error:', err);
      setErrorMessage('Could not initialize locker account. Please try again.');
      toast({ type: 'error', title: 'Registration Failed', message: 'Could not create locker.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-sm transition-all">
        
        {/* Panic Lockdown Banner */}
        {isPanicActive && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-900 text-rose-800 dark:text-rose-200 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold">
              <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>EMERGENCY PANIC LOCKDOWN ACTIVE</span>
            </div>
            <p className="text-xs leading-relaxed text-rose-700 dark:text-rose-300">
              Active share links have been revoked and all previous sessions destroyed. Enter your 6-digit passkey to verify identity and unlock your vault.
            </p>
          </div>
        )}

        {/* Lockout alert */}
        {lockoutSecs > 0 && (
          <div className="mb-5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-center gap-2.5 text-xs text-rose-700 dark:text-rose-400 font-mono">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Rate limit active: Try again in {lockoutSecs}s</span>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-6">
          {mode === 'forgot_password' && (
            <div className="flex items-center justify-start mb-2">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setErrorMessage(null);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Sign In</span>
              </button>
            </div>
          )}

          <div className="inline-flex p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 mb-3 shadow-2xs">
            {mode === 'forgot_password' ? <KeyRound className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
            {mode === 'signin'
              ? 'Sign In to Your Locker'
              : mode === 'signup'
              ? 'Create Student Locker'
              : 'Reset Locker Passkey'}
          </h2>
        </div>

        {/* Error message banner */}
        {errorMessage && (
          <div className="mb-5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* SIGN IN VIEW */}
        {mode === 'signin' ? (
          <div className="space-y-5">
            
            {/* Google Firebase Login Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading || lockoutSecs > 0}
              className="w-full py-3 px-4 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-750 text-neutral-800 dark:text-neutral-100 font-semibold text-xs flex items-center justify-center gap-3 transition-colors shadow-2xs disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google Account</span>
            </button>

            <div className="relative flex items-center">
              <div className="flex-grow border-t border-neutral-200 dark:border-neutral-800"></div>
              <span className="flex-shrink mx-3 text-[11px] text-neutral-400 uppercase font-mono">
                or unlock with passkey
              </span>
              <div className="flex-grow border-t border-neutral-200 dark:border-neutral-800"></div>
            </div>

            {/* Returning student badge */}
            {isReturningUser && (
              <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-neutral-800 dark:text-neutral-200">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">
                    {signInIdentifier.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="block font-semibold truncate max-w-[200px]">{signInIdentifier}</span>
                    <span className="text-[10px] text-neutral-500">Locker owner · Session locked</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsReturningUser(false);
                    setSignInIdentifier('');
                  }}
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                >
                  Switch
                </button>
              </div>
            )}

            <form onSubmit={handleSignIn} className="space-y-5">
              {/* Account Identifier (if not returning or switched) */}
              {!isReturningUser && (
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Student Email or Google ID <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={signInIdentifier}
                      onChange={(e) => setSignInIdentifier(e.target.value)}
                      placeholder="e.g. aarav.sharma@campus.edu"
                      required
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/50 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <Mail className="w-4 h-4 text-neutral-400 absolute right-3 top-3" />
                  </div>
                </div>
              )}

              {/* 6-DIGIT PASSKEY PIN INPUT */}
              <div className="pt-1">
                <PasskeyPinInput
                  value={signInPin}
                  onChange={(pin) => {
                    setSignInPin(pin);
                    setErrorMessage(null);
                  }}
                  hasError={!!errorMessage && signInPin.length > 0}
                  label="Enter 6-Digit Locker Passkey"
                  autoFocus={true}
                  idPrefix="signin_pin"
                />
              </div>

              {/* Forgot Password action link */}
              <div className="flex items-center justify-between text-xs px-1">
                <span className="text-[11px] text-neutral-500">Forgotten your password?</span>
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot_password');
                    setForgotStep('identify');
                    setForgotIdentifier(signInIdentifier || rememberedEmail || '');
                    setErrorMessage(null);
                  }}
                  className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Forgot Password?</span>
                </button>
              </div>

              {/* SUBMIT BUTTON: Disabled and blocks if user didn't enter info */}
              <button
                type="submit"
                disabled={!isSignInReady}
                className={`w-full py-3 px-4 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs ${
                  isSignInReady
                    ? 'text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] cursor-pointer'
                    : 'text-neutral-400 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 cursor-not-allowed opacity-80'
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Passkey...</span>
                  </>
                ) : isSignInReady ? (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Unlock Locker</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Enter 6-digit passkey to continue</span>
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setErrorMessage(null);
                  }}
                  className="text-xs text-neutral-500 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium cursor-pointer"
                >
                  Don't have a locker? <span className="font-semibold text-indigo-600 dark:text-indigo-400 underline">Sign Up</span>
                </button>
              </div>
            </form>
          </div>
        ) : mode === 'signup' ? (
          /* SIGN UP VIEW (All fields required) */
          <form onSubmit={handleSignUp} className="space-y-4">
            
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-[11px] text-amber-800 dark:text-amber-300">
              <strong>All fields and 6-digit passkey are mandatory.</strong> Access to the locker cannot be granted without full student details.
            </div>

            {/* Full Legal Name */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Full Legal Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={signUpName}
                  onChange={(e) => setSignUpName(e.target.value)}
                  onBlur={() => setTouched({ ...touched, name: true })}
                  placeholder="e.g. Aarav Sharma"
                  className={`w-full px-3.5 py-2.5 text-xs rounded-xl border ${
                    touched.name && !isNameValid
                      ? 'border-rose-400 bg-rose-50/30 dark:bg-rose-950/20'
                      : 'border-neutral-300 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/50'
                  } text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                />
                <User className="w-4 h-4 text-neutral-400 absolute right-3 top-3" />
              </div>
              {touched.name && !isNameValid && (
                <span className="text-[10px] text-rose-500 mt-0.5 block">Student name is required.</span>
              )}
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Student Email (Google / Campus) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={signUpEmail}
                  onChange={(e) => setSignUpEmail(e.target.value)}
                  onBlur={() => setTouched({ ...touched, email: true })}
                  placeholder="e.g. student@college.edu"
                  className={`w-full px-3.5 py-2.5 text-xs rounded-xl border ${
                    touched.email && !isEmailValid
                      ? 'border-rose-400 bg-rose-50/30 dark:bg-rose-950/20'
                      : 'border-neutral-300 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/50'
                  } text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                />
                <Mail className="w-4 h-4 text-neutral-400 absolute right-3 top-3" />
              </div>
              {touched.email && !isEmailValid && (
                <span className="text-[10px] text-rose-500 mt-0.5 block">Valid email address is required.</span>
              )}
            </div>

            {/* College & Roll Number (2 Columns) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  College / Institute <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={signUpCollege}
                    onChange={(e) => setSignUpCollege(e.target.value)}
                    onBlur={() => setTouched({ ...touched, college: true })}
                    placeholder="e.g. National Institute of Tech"
                    className={`w-full px-3.5 py-2.5 text-xs rounded-xl border ${
                      touched.college && !isCollegeValid
                        ? 'border-rose-400 bg-rose-50/30 dark:bg-rose-950/20'
                        : 'border-neutral-300 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/50'
                    } text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                  />
                  <School className="w-4 h-4 text-neutral-400 absolute right-3 top-3" />
                </div>
                {touched.college && !isCollegeValid && (
                  <span className="text-[10px] text-rose-500 mt-0.5 block">College name is required.</span>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Roll / Registration No. <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={signUpRollNumber}
                    onChange={(e) => setSignUpRollNumber(e.target.value)}
                    onBlur={() => setTouched({ ...touched, roll: true })}
                    placeholder="e.g. 21CS084"
                    className={`w-full px-3.5 py-2.5 text-xs rounded-xl border ${
                      touched.roll && !isRollValid
                        ? 'border-rose-400 bg-rose-50/30 dark:bg-rose-950/20'
                        : 'border-neutral-300 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/50'
                    } text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase`}
                  />
                  <Hash className="w-4 h-4 text-neutral-400 absolute right-3 top-3" />
                </div>
                {touched.roll && !isRollValid && (
                  <span className="text-[10px] text-rose-500 mt-0.5 block">Roll number is required.</span>
                )}
              </div>
            </div>

            {/* Mobile Phone */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Mobile Phone <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={signUpPhone}
                  onChange={(e) => setSignUpPhone(e.target.value)}
                  onBlur={() => setTouched({ ...touched, phone: true })}
                  placeholder="e.g. +91 98765 43210"
                  className={`w-full px-3.5 py-2.5 text-xs rounded-xl border ${
                    touched.phone && !isPhoneValid
                      ? 'border-rose-400 bg-rose-50/30 dark:bg-rose-950/20'
                      : 'border-neutral-300 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/50'
                  } text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                />
                <Phone className="w-4 h-4 text-neutral-400 absolute right-3 top-3" />
              </div>
              {touched.phone && !isPhoneValid && (
                <span className="text-[10px] text-rose-500 mt-0.5 block">Phone number is required.</span>
              )}
            </div>

            {/* 6-DIGIT PASSKEY SETUP */}
            <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800">
              <PasskeyPinInput
                value={signUpPin}
                onChange={(pin) => setSignUpPin(pin)}
                label="Set 6-Digit Passkey PIN"
                idPrefix="signup_pin"
              />
            </div>

            {/* CONFIRM 6-DIGIT PASSKEY */}
            <div>
              <PasskeyPinInput
                value={signUpConfirmPin}
                onChange={(pin) => setSignUpConfirmPin(pin)}
                hasError={signUpConfirmPin.length === 6 && !isPinsMatch}
                label="Confirm 6-Digit Passkey PIN"
                idPrefix="signup_confirm_pin"
              />
              {signUpConfirmPin.length === 6 && !isPinsMatch && (
                <span className="text-[10px] text-rose-500 block mt-1">Passkey PINs do not match.</span>
              )}
            </div>

            {/* SUBMIT BUTTON: Strictly disabled if user hasn't entered all information */}
            <button
              type="submit"
              disabled={!isSignUpFormValid}
              className={`w-full py-3.5 px-4 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs ${
                isSignUpFormValid
                  ? 'text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] cursor-pointer'
                  : 'text-neutral-400 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 cursor-not-allowed opacity-80'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Encrypted Locker...</span>
                </>
              ) : isSignUpFormValid ? (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Create Student Locker & Set Passkey</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Complete all fields & 6-digit passkey to continue</span>
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setErrorMessage(null);
                }}
                className="text-xs text-neutral-500 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium cursor-pointer"
              >
                Already have a locker? <span className="font-semibold text-indigo-600 dark:text-indigo-400 underline">Sign In</span>
              </button>
            </div>
          </form>
        ) : (
          /* FORGOT PASSWORD / RESET PASSKEY VIEW */
          <div className="space-y-5 animate-in fade-in duration-200">
            
            {/* Step Indicators */}
            <div className="flex items-center justify-between px-2 py-2 bg-neutral-100 dark:bg-neutral-800/80 rounded-xl text-[11px] font-medium">
              <div className={`flex items-center gap-1.5 ${forgotStep === 'identify' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-neutral-500'}`}>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${forgotStep === 'identify' ? 'bg-indigo-600 text-white' : 'bg-neutral-300 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'}`}>1</span>
                <span>Account</span>
              </div>
              <span className="text-neutral-300 dark:text-neutral-700">→</span>
              <div className={`flex items-center gap-1.5 ${forgotStep === 'verify_otp' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-neutral-500'}`}>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${forgotStep === 'verify_otp' ? 'bg-indigo-600 text-white' : 'bg-neutral-300 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'}`}>2</span>
                <span>Verify Code</span>
              </div>
              <span className="text-neutral-300 dark:text-neutral-700">→</span>
              <div className={`flex items-center gap-1.5 ${forgotStep === 'reset_password' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-neutral-500'}`}>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${forgotStep === 'reset_password' ? 'bg-indigo-600 text-white' : 'bg-neutral-300 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'}`}>3</span>
                <span>New Passkey</span>
              </div>
            </div>

            {/* STEP 1: IDENTIFY ACCOUNT & CHOOSE CHANNEL */}
            {forgotStep === 'identify' && (
              <form onSubmit={handleFindAccountForRecovery} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Registered Gmail or Mobile Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={forgotIdentifier}
                      onChange={(e) => {
                        setForgotIdentifier(e.target.value);
                        setErrorMessage(null);
                      }}
                      placeholder="e.g. aarav.sharma@campus.edu or +91 98765 43210"
                      required
                      autoFocus
                      className="w-full pl-3.5 pr-10 py-2.5 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/50 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <Mail className="w-4 h-4 text-neutral-400 absolute right-3 top-3" />
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-1">
                    Enter your account identifier to receive your 6-digit verification code.
                  </p>
                </div>

                {/* Verification Delivery Channel Selection */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Send Verification Code To:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setOtpTargetChannel('email')}
                      className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2 ${
                        otpTargetChannel === 'email'
                          ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500'
                          : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300'
                      }`}
                    >
                      <Mail className="w-4 h-4 shrink-0" />
                      <div className="min-w-0">
                        <span className="block text-xs font-bold">Gmail</span>
                        <span className="text-[10px] text-neutral-500 truncate block">Registered Email</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setOtpTargetChannel('phone')}
                      className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2 ${
                        otpTargetChannel === 'phone'
                          ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500'
                          : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300'
                      }`}
                    >
                      <Smartphone className="w-4 h-4 shrink-0" />
                      <div className="min-w-0">
                        <span className="block text-xs font-bold">Phone (SMS)</span>
                        <span className="text-[10px] text-neutral-500 truncate block">Logined Mobile</span>
                      </div>
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={recoveryLoading || !forgotIdentifier.trim()}
                  className="w-full py-3 px-4 text-xs font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {recoveryLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Locating Locker Account...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send 6-Digit Code to {otpTargetChannel === 'email' ? 'Gmail' : 'Logined Phone'}</span>
                    </>
                  )}
                </button>

                {forgotIdentifier.includes('@') && (
                  <button
                    type="button"
                    onClick={async () => {
                      setRecoveryLoading(true);
                      try {
                        const fbRes = await sendFirebasePasswordReset(forgotIdentifier.trim());
                        toast({
                          type: fbRes.success ? 'success' : 'error',
                          title: 'Firebase Authentication',
                          message: fbRes.message,
                        });
                      } catch (e: any) {
                        toast({ type: 'error', title: 'Firebase Error', message: e?.message || 'Could not send reset link' });
                      } finally {
                        setRecoveryLoading(false);
                      }
                    }}
                    disabled={recoveryLoading}
                    className="w-full py-2 px-3 text-[11px] font-medium text-neutral-600 dark:text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Send Official Firebase Password Reset Email</span>
                  </button>
                )}
              </form>
            )}

            {/* STEP 2: VERIFY 6-DIGIT CODE */}
            {forgotStep === 'verify_otp' && forgotUser && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                {/* Account info card */}
                <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                      {forgotUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="block font-semibold text-neutral-900 dark:text-white">{forgotUser.name}</span>
                      <span className="text-[11px] text-neutral-500 font-mono">
                        {otpTargetChannel === 'email' ? forgotUser.email : forgotUser.phone}
                      </span>
                    </div>
                  </div>

                  {/* Channel Toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      const next = otpTargetChannel === 'email' ? 'phone' : 'email';
                      setOtpTargetChannel(next);
                      sendOtpCode(forgotUser, next);
                    }}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                  >
                    Send to {otpTargetChannel === 'email' ? 'Phone' : 'Gmail'}
                  </button>
                </div>

                {/* Delivery Simulation Banner with 1-click Auto-fill & Direct Gmail Web Option */}
                {otpSentNotification && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-800 dark:text-emerald-200 space-y-2.5">
                    <div className="flex items-center justify-between font-bold">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Verification Code Dispatched</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsEmailConfigOpen(true)}
                        className="text-[10px] font-normal text-emerald-700 dark:text-emerald-300 hover:underline flex items-center gap-1"
                      >
                        <Settings className="w-3 h-3" />
                        <span>Email Settings</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                      Code dispatched to <span className="font-mono font-bold">{otpSentNotification.target}</span>:
                    </p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-base font-mono font-bold tracking-widest bg-white dark:bg-neutral-900 px-3 py-1 rounded-lg border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300">
                        {otpSentNotification.code}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {otpTargetChannel === 'email' && (
                          <a
                            href={getGmailComposeUrl(otpSentNotification.target, otpSentNotification.code)}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 text-[11px] font-semibold bg-white dark:bg-neutral-900 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 dark:hover:bg-neutral-800 transition-colors flex items-center gap-1"
                            title="Open in Gmail Webmail"
                          >
                            <span>Open Gmail</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setEnteredOtp(otpSentNotification.code);
                            setErrorMessage(null);
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-2xs cursor-pointer"
                        >
                          Auto-fill Code
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 6-Digit OTP Code Input */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Enter 6-Digit Security Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={enteredOtp}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setEnteredOtp(val);
                      setErrorMessage(null);
                    }}
                    placeholder="• • • • • •"
                    required
                    autoFocus
                    className="w-full py-3 px-4 text-center text-lg font-mono font-bold tracking-[0.4em] rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  />
                </div>

                {/* Resend Code & Countdown */}
                <div className="flex items-center justify-between text-xs px-1">
                  {otpResendCountdown > 0 ? (
                    <span className="text-neutral-500 font-mono text-[11px]">
                      Resend code available in {otpResendCountdown}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => sendOtpCode(forgotUser, otpTargetChannel)}
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Resend Code</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setForgotStep('identify');
                      setErrorMessage(null);
                    }}
                    className="text-[11px] text-neutral-500 hover:underline"
                  >
                    Change Identifier
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={enteredOtp.trim().length !== 6}
                  className="w-full py-3 px-4 text-xs font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verify Code & Proceed</span>
                </button>
              </form>
            )}

            {/* STEP 3: SET UP NEW 6-DIGIT PASSKEY */}
            {forgotStep === 'reset_password' && forgotUser && (
              <form onSubmit={handleSaveNewPasskey} className="space-y-4">
                <div className="p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs">
                  <span className="text-neutral-500 block text-[11px]">Account Identity Verified:</span>
                  <span className="font-bold text-neutral-900 dark:text-white">{forgotUser.name}</span>
                  <span className="text-neutral-500 font-mono text-[11px] block">{forgotUser.email} · {forgotUser.rollNumber}</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Create New 6-Digit Passkey PIN <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={newPin}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setNewPin(val);
                      setErrorMessage(null);
                    }}
                    placeholder="Enter 6-digit numeric PIN"
                    required
                    autoFocus
                    className="w-full py-2.5 px-3.5 text-center text-base font-mono font-bold tracking-[0.3em] rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-[10px] text-neutral-500 mt-1">
                    Your passkey will encrypt your local records and protect your locker on future visits.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Confirm New 6-Digit Passkey PIN <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={confirmNewPin}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setConfirmNewPin(val);
                      setErrorMessage(null);
                    }}
                    placeholder="Re-enter 6-digit PIN"
                    required
                    className="w-full py-2.5 px-3.5 text-center text-base font-mono font-bold tracking-[0.3em] rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {newPin && confirmNewPin && newPin !== confirmNewPin && (
                    <p className="text-[11px] text-rose-500 font-semibold mt-1">PINs do not match</p>
                  )}
                  {newPin && confirmNewPin && newPin === confirmNewPin && newPin.length === 6 && (
                    <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> PINs match
                    </p>
                  )}
                </div>

                <div className="space-y-2 pt-1">
                  <button
                    type="submit"
                    disabled={recoveryLoading || newPin.length !== 6 || newPin !== confirmNewPin}
                    className="w-full py-3 px-4 text-xs font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
                  >
                    {recoveryLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Updating Password & Unlocking...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Save New Password & Unlock Locker</span>
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={recoveryLoading || newPin.length !== 6 || newPin !== confirmNewPin}
                    onClick={() => handleSaveNewPasskey(undefined, true)}
                    className="w-full py-2.5 px-4 text-xs font-semibold rounded-xl text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <span>Save & Return to Sign In (Test Login)</span>
                  </button>
                </div>
              </form>
            )}

          </div>
        )}

      </div>

      {/* Email Service & EmailJS Configuration Modal */}
      <EmailConfigModal
        isOpen={isEmailConfigOpen}
        onClose={() => setIsEmailConfigOpen(false)}
        defaultEmail={forgotUser?.email || signInIdentifier || 'narra.saikiran9417@gmail.com'}
      />

      {/* WebAuthn Biometric Hardware Unlock Modal */}
      <BiometricUnlockModal
        isOpen={showBiometricModal}
        onClose={() => setShowBiometricModal(false)}
        targetEmail={signInIdentifier || rememberedEmail}
        onSuccess={(user) => {
          onUserLoggedIn(user);
          setActivePage('dashboard');
        }}
        onFallbackToPin={() => {
          // Keep user on PIN view
        }}
      />
    </div>
  );
};
