import React, { useState, useEffect } from 'react';
import { 
  Mail, Key, Server, FileText, CheckCircle2, AlertTriangle, 
  Send, RefreshCw, X, ExternalLink, HelpCircle, ShieldCheck,
  Zap, SendHorizontal
} from 'lucide-react';
import { 
  getMultiEmailConfig, 
  saveMultiEmailConfig, 
  sendVerificationOtpEmail, 
  getGmailComposeUrl, 
  MultiEmailConfig,
  EmailProviderType
} from '../../../services/emailService';
import { useToast } from '../../../components/Toast';

interface EmailConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEmail?: string;
}

export const EmailConfigModal: React.FC<EmailConfigModalProps> = ({
  isOpen,
  onClose,
  defaultEmail = 'narra.saikiran9417@gmail.com',
}) => {
  const { toast } = useToast();
  const [config, setConfig] = useState<MultiEmailConfig>({
    activeProvider: 'auto',
    emailJs: { publicKey: '', serviceId: '', templateId: '' },
    resendApiKey: '',
    brevo: { apiKey: '', senderEmail: 'support@stulock.app' },
  });

  const [activeTab, setActiveTab] = useState<EmailProviderType>('resend');
  const [testRecipient, setTestRecipient] = useState<string>(defaultEmail);
  const [isSendingTest, setIsSendingTest] = useState<boolean>(false);
  const [lastTestResult, setLastTestResult] = useState<{
    success: boolean;
    provider?: string;
    message: string;
    details?: string;
    timestamp: string;
  } | null>(null);

  const [showGuide, setShowGuide] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      const current = getMultiEmailConfig();
      setConfig(current);
      if (current.activeProvider !== 'auto') {
        setActiveTab(current.activeProvider);
      }
      if (defaultEmail) {
        setTestRecipient(defaultEmail);
      }
    }
  }, [isOpen, defaultEmail]);

  if (!isOpen) return null;

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const updated = { ...config, activeProvider: activeTab };
    setConfig(updated);
    saveMultiEmailConfig(updated);
    toast({
      type: 'success',
      title: 'Email Provider Config Saved',
      message: `Active provider set to ${activeTab.toUpperCase()}.`,
    });
  };

  const handleSendTestEmail = async () => {
    if (!testRecipient.trim()) {
      toast({
        type: 'error',
        title: 'Recipient Required',
        message: 'Please enter a valid recipient email address.',
      });
      return;
    }

    const updated = { ...config, activeProvider: activeTab };
    saveMultiEmailConfig(updated);

    setIsSendingTest(true);
    setLastTestResult(null);

    const sampleOtp = Math.floor(100000 + Math.random() * 900000).toString();

    try {
      const result = await sendVerificationOtpEmail({
        toEmail: testRecipient.trim(),
        toName: 'StuLock Student',
        code: sampleOtp,
        purpose: 'email_verification',
      });

      setLastTestResult({
        success: result.success,
        provider: result.provider,
        message: result.message,
        details: result.details || `Delivered via ${result.provider}`,
        timestamp: new Date().toLocaleTimeString(),
      });

      toast({
        type: 'success',
        title: `${result.provider.toUpperCase()} Verification Dispatched`,
        message: result.message,
      });
    } catch (err: any) {
      setLastTestResult({
        success: false,
        message: err?.message || 'Failed to dispatch email.',
        details: String(err),
        timestamp: new Date().toLocaleTimeString(),
      });
      toast({
        type: 'error',
        title: 'Dispatch Failed',
        message: err?.message || 'Could not send test email.',
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const hasResend = Boolean(config.resendApiKey);
  const hasBrevo = Boolean(config.brevo.apiKey);
  const hasEmailJs = Boolean(config.emailJs.publicKey && config.emailJs.serviceId && config.emailJs.templateId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                Free Email & OTP Tools
                {(hasResend || hasBrevo || hasEmailJs) ? (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Ready
                  </span>
                ) : (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Select Provider
                  </span>
                )}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Choose from Brevo (300/day free), Resend (3,000/mo free), or EmailJS
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">

          {/* Provider Selector Tabs */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
              Select Free Email Provider:
            </label>
            <div className="grid grid-cols-3 gap-2">
              
              {/* Resend Tab */}
              <button
                type="button"
                onClick={() => setActiveTab('resend')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  activeTab === 'resend'
                    ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/30'
                    : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-indigo-500" /> Resend
                  </span>
                  {hasResend && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                </div>
                <span className="text-[10px] text-neutral-500 block leading-tight">3,000 Free/mo</span>
              </button>

              {/* Brevo Tab */}
              <button
                type="button"
                onClick={() => setActiveTab('brevo')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  activeTab === 'brevo'
                    ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/30'
                    : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs flex items-center gap-1">
                    <SendHorizontal className="w-3.5 h-3.5 text-blue-500" /> Brevo
                  </span>
                  {hasBrevo && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                </div>
                <span className="text-[10px] text-neutral-500 block leading-tight">300 Free/day</span>
              </button>

              {/* EmailJS Tab */}
              <button
                type="button"
                onClick={() => setActiveTab('emailjs')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  activeTab === 'emailjs'
                    ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/30'
                    : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-purple-500" /> EmailJS
                  </span>
                  {hasEmailJs && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                </div>
                <span className="text-[10px] text-neutral-500 block leading-tight">200 Free/mo</span>
              </button>

            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4">

            {/* RESEND CONFIG */}
            {activeTab === 'resend' && (
              <div className="space-y-3 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">Resend API Key</span>
                  <a href="https://resend.com/api-keys" target="_blank" rel="noreferrer" className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5">
                    Get Free Resend Key <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <input
                  type="password"
                  value={config.resendApiKey}
                  onChange={(e) => setConfig({ ...config, resendApiKey: e.target.value })}
                  placeholder="re_xxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
                <p className="text-[11px] text-neutral-500">
                  Sends directly from <code className="bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded">onboarding@resend.dev</code> with zero domain setup required!
                </p>
              </div>
            )}

            {/* BREVO CONFIG */}
            {activeTab === 'brevo' && (
              <div className="space-y-3 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">Brevo (Sendinblue) API Key</span>
                  <a href="https://app.brevo.com/settings/keys/api" target="_blank" rel="noreferrer" className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5">
                    Get Free Brevo Key <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <input
                  type="password"
                  value={config.brevo.apiKey}
                  onChange={(e) => setConfig({ ...config, brevo: { ...config.brevo, apiKey: e.target.value } })}
                  placeholder="xkeysib-xxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400">Verified Sender Email</label>
                  <input
                    type="email"
                    value={config.brevo.senderEmail}
                    onChange={(e) => setConfig({ ...config, brevo: { ...config.brevo, senderEmail: e.target.value } })}
                    placeholder="e.g. yourname@gmail.com"
                    className="w-full px-3 py-2 rounded-lg text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white"
                  />
                </div>
              </div>
            )}

            {/* EMAILJS CONFIG */}
            {activeTab === 'emailjs' && (
              <div className="space-y-3 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Service ID</label>
                    <input
                      type="text"
                      value={config.emailJs.serviceId}
                      onChange={(e) => setConfig({ ...config, emailJs: { ...config.emailJs, serviceId: e.target.value } })}
                      placeholder="service_xxxxxxx"
                      className="w-full px-3 py-2 rounded-lg text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Template ID</label>
                    <input
                      type="text"
                      value={config.emailJs.templateId}
                      onChange={(e) => setConfig({ ...config, emailJs: { ...config.emailJs, templateId: e.target.value } })}
                      placeholder="template_xxxxxxx"
                      className="w-full px-3 py-2 rounded-lg text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Public Key (User ID)</label>
                  <input
                    type="text"
                    value={config.emailJs.publicKey}
                    onChange={(e) => setConfig({ ...config, emailJs: { ...config.emailJs, publicKey: e.target.value } })}
                    placeholder="public_xxxxxxx"
                    className="w-full px-3 py-2 rounded-lg text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white"
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setShowGuide(!showGuide)}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                {showGuide ? 'Hide Guide' : 'How to choose & set up'}
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 transition-colors shadow-sm cursor-pointer"
              >
                Save as Active Provider
              </button>
            </div>
          </form>

          {/* Quick Guide */}
          {showGuide && (
            <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 text-xs text-neutral-700 dark:text-neutral-300 space-y-2">
              <div className="font-semibold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> Comparison & Setup:
              </div>
              <ul className="space-y-1.5 pl-1 text-[11px] leading-relaxed">
                <li><strong>Resend (Recommended)</strong>: Instant setup. Free 3,000 emails/mo. Just paste API key.</li>
                <li><strong>Brevo</strong>: Free 300 emails/day without credit card. Paste API key & sender email.</li>
                <li><strong>EmailJS</strong>: Client-side delivery directly via your connected Gmail account.</li>
              </ul>
            </div>
          )}

          {/* Test Dispatch Section */}
          <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-indigo-500" />
                Live OTP Test
              </h4>
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Sends a real 6-digit OTP code
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                placeholder="Enter recipient email..."
                className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
              <button
                type="button"
                onClick={handleSendTestEmail}
                disabled={isSendingTest}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 shrink-0 shadow-sm cursor-pointer"
              >
                {isSendingTest ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Send Test Email
                  </>
                )}
              </button>
            </div>

            {/* Test Feedback */}
            {lastTestResult && (
              <div className={`p-3 rounded-xl text-xs border ${
                lastTestResult.success 
                  ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300' 
                  : 'bg-rose-50/50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
              }`}>
                <div className="flex items-start gap-2">
                  {lastTestResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 space-y-1">
                    <p className="font-semibold">{lastTestResult.message}</p>
                    {lastTestResult.details && (
                      <p className="text-[11px] opacity-80">{lastTestResult.details}</p>
                    )}
                    <p className="text-[10px] opacity-60">Status at {lastTestResult.timestamp}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Gmail Web Compose fallback */}
            <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700/50 flex items-center justify-between text-[11px]">
              <span className="text-neutral-500 dark:text-neutral-400">
                Direct Gmail compose fallback:
              </span>
              <a
                href={getGmailComposeUrl(testRecipient || defaultEmail, '123456')}
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
              >
                Open in Gmail Webmail <ExternalLink className="w-3 h-3" />
              </a>
            </div>

          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-neutral-50 dark:bg-neutral-900/80 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
