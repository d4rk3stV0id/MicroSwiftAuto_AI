import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, CreditCard, Lock, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../store/useStore';
import { CLAIM_FILING_FEE_INR } from '../constants';
import { openClaimRazorpayCheckout } from '../lib/razorpayCheckout';

export const ClaimPaymentView = () => {
  const { setCurrentTab, setClaimFilingFeePaid, user } = useStore();
  const [paying, setPaying] = useState(false);

  const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID?.trim() ?? '';

  const handlePay = async () => {
    if (!keyId) {
      toast.error(
        'Razorpay is not configured. Add VITE_RAZORPAY_KEY_ID to your .env file and restart the dev server.',
      );
      return;
    }
    setPaying(true);
    try {
      await openClaimRazorpayCheckout({
        keyId,
        userEmail: user?.email,
        userName: user?.name,
        onSuccess: () => {
          setClaimFilingFeePaid(true);
          toast.success('Payment successful. You can continue to file your claim.');
        },
        onDismiss: () => {
          toast('Payment cancelled.', { icon: 'ℹ️' });
        },
        onFailure: () => {
          toast.error('Payment failed. Try again or use another method.');
        },
        onWarning: (message) => {
          toast(message, { icon: 'ℹ️' });
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to start payment.';
      toast.error(msg);
    } finally {
      setPaying(false);
    }
  };

  const handleDemoBypass = () => {
    setClaimFilingFeePaid(true);
    toast.success('Demo mode enabled. Payment bypassed for showcase.');
  };

  return (
    <div className="relative min-h-full w-full overflow-hidden bg-background px-6 py-10 pb-28 lg:px-12">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-8">
        <button
          type="button"
          onClick={() => setCurrentTab('home')}
          className="flex items-center gap-2 text-sm font-semibold text-text-muted transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </button>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-gray-200 bg-surface p-8 shadow-card dark:border-white/10"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-accent">
            <ShieldCheck className="h-7 w-7" strokeWidth={2} />
          </div>

          <h1 className="mt-6 font-display text-2xl font-bold text-text-main">
            Unlock claim filing
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-text-muted">
            <span className="font-semibold text-text-main">My Policy & Ask AI</span> stays free. Filing a
            new claim uses our guided workflow and insurers form tools —{' '}
            <span className="font-semibold text-text-main">paid access</span> helps cover processing.
          </p>

          <div className="mt-8 rounded-xl bg-primary/5 px-6 py-5 dark:bg-primary/10">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-sm font-medium text-text-muted">One-time fee</span>
              <span className="font-display text-3xl font-bold text-primary">
                ₹{CLAIM_FILING_FEE_INR}
              </span>
            </div>
            <p className="mt-3 flex items-start gap-2 text-xs text-text-muted">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Payments are processed securely by Razorpay (cards, UPI, netbanking where supported).
            </p>
          </div>

          <button
            type="button"
            disabled={paying}
            onClick={() => void handlePay()}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent py-4 text-sm font-bold text-white shadow-lg transition-opacity disabled:opacity-60"
          >
            {paying ? (
              <span>Opening checkout…</span>
            ) : (
              <>
                <CreditCard className="h-5 w-5" />
                Pay ₹{CLAIM_FILING_FEE_INR} with Razorpay
              </>
            )}
          </button>

          {!import.meta.env.VITE_RAZORPAY_ORDER_URL?.trim() && (
            <p className="mt-6 text-[11px] leading-relaxed text-text-muted">
              For production, use a server route to create Razorpay orders and set{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px] dark:bg-white/10">
                VITE_RAZORPAY_ORDER_URL=/api/create-razorpay-order
              </code>{' '}
              after deploying{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px] dark:bg-white/10">
                api/create-razorpay-order
              </code>{' '}
              with{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px] dark:bg-white/10">
                RAZORPAY_KEY_ID
              </code>{' '}
              and{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px] dark:bg-white/10">
                RAZORPAY_KEY_SECRET
              </code>
              .
            </p>
          )}
        </motion.div>
      </div>

      <button
        type="button"
        onClick={handleDemoBypass}
        className="fixed bottom-24 right-6 z-40 rounded-full border border-amber-300/40 bg-amber-500 px-4 py-2 text-xs font-bold uppercase tracking-wide text-black shadow-lg transition hover:bg-amber-400 lg:right-10"
      >
        Demo: Skip Payment
      </button>
    </div>
  );
};
