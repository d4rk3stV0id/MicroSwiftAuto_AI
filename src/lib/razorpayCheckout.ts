import { CLAIM_FILING_FEE_INR, CLAIM_FILING_FEE_PAISE } from '../constants';

export type RazorpaySuccessResponse = {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (err?: unknown) => void) => void;
    };
  }
}

export function loadRazorpayScript(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Could not load Razorpay Checkout script.'));
    document.body.appendChild(s);
  });
}

function resolveOrderEndpoint(raw: string): string {
  const t = raw.trim();
  if (t.startsWith('http')) return t;
  if (typeof window === 'undefined') return t;
  return new URL(t.startsWith('/') ? t : `/${t}`, window.location.origin).href;
}

/** Optional server-created order (Vercel /api or your backend). Returns null if not configured. */
export async function fetchRazorpayOrderMeta(): Promise<{
  orderId: string;
  amount: number;
  currency: string;
} | null> {
  const raw = typeof import.meta.env.VITE_RAZORPAY_ORDER_URL === 'string'
    ? import.meta.env.VITE_RAZORPAY_ORDER_URL.trim()
    : '';
  if (!raw) return null;
  const res = await fetch(resolveOrderEndpoint(raw), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: CLAIM_FILING_FEE_PAISE,
      currency: 'INR',
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Order API failed (${res.status})`);
  }
  const data = (await res.json()) as { orderId?: string; amount?: number; currency?: string };
  if (!data.orderId) throw new Error('Order API did not return orderId.');
  return {
    orderId: data.orderId,
    amount: typeof data.amount === 'number' ? data.amount : CLAIM_FILING_FEE_PAISE,
    currency: data.currency || 'INR',
  };
}

export type OpenClaimPaymentOptions = {
  keyId: string;
  userEmail?: string;
  userName?: string;
  /** Optional non-blocking warning text (e.g. order API unavailable in local dev). */
  onWarning?: (_message: string) => void;
  /** Called after Razorpay reports success (verify on server for production). */
  onSuccess: (_response: RazorpaySuccessResponse) => void;
  onDismiss?: () => void;
  onFailure?: (_err: unknown) => void;
};

export async function openClaimRazorpayCheckout(opts: OpenClaimPaymentOptions): Promise<void> {
  await loadRazorpayScript();
  const Rz = window.Razorpay;
  if (!Rz) throw new Error('Razorpay Checkout is unavailable.');

  let orderMeta: Awaited<ReturnType<typeof fetchRazorpayOrderMeta>> = null;
  try {
    orderMeta = await fetchRazorpayOrderMeta();
  } catch (e) {
    const hasOrderUrl = Boolean(import.meta.env.VITE_RAZORPAY_ORDER_URL?.trim());
    if (hasOrderUrl) {
      const message =
        e instanceof Error ? e.message : 'Order API unavailable. Continuing without server order.';
      // Keep local/dev checkout working even if /api route is missing (common with plain vite dev).
      console.warn('[Razorpay] Order API failed; falling back to key-only checkout:', message);
      opts.onWarning?.(
        'Order API unavailable in this environment. Continuing with direct checkout for testing.',
      );
    }
  }

  const amount = orderMeta?.amount ?? CLAIM_FILING_FEE_PAISE;
  const currency = orderMeta?.currency ?? 'INR';

  const options: Record<string, unknown> = {
    key: opts.keyId,
    amount,
    currency,
    name: 'ClaimSaathi',
    description: `Claim filing access — ₹${CLAIM_FILING_FEE_INR}`,
    handler(response: RazorpaySuccessResponse) {
      opts.onSuccess(response);
    },
    theme: { color: '#6366f1' },
    modal: {
      ondismiss() {
        opts.onDismiss?.();
      },
    },
  };

  if (orderMeta?.orderId) {
    options.order_id = orderMeta.orderId;
  }

  if (opts.userEmail || opts.userName) {
    options.prefill = {
      email: opts.userEmail || undefined,
      name: opts.userName || undefined,
    };
  }

  const inst = new Rz(options);
  inst.on?.('payment.failed', (err: unknown) => opts.onFailure?.(err));
  inst.open();
}
