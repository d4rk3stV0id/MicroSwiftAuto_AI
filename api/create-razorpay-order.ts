/**
 * Vercel Serverless Function: create a Razorpay order for claim filing (₹100).
 * Env (set in Vercel project, not prefixed with VITE_):
 *   RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import Razorpay from 'razorpay';

const DEFAULT_AMOUNT_PAISE = 10_000; // ₹100

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !secret) {
    res.status(503).json({ error: 'Razorpay server keys not configured.' });
    return;
  }

  const bodyAmount =
    typeof req.body?.amount === 'number' ? req.body.amount : Number(req.body?.amount);
  const amount =
    Number.isFinite(bodyAmount) && bodyAmount > 0 ? Math.round(bodyAmount) : DEFAULT_AMOUNT_PAISE;
  const currency =
    typeof req.body?.currency === 'string' && req.body.currency.length === 3
      ? req.body.currency.toUpperCase()
      : 'INR';

  const razorpay = new Razorpay({
    key_id: keyId,
    key_secret: secret,
  });

  try {
    const order = await razorpay.orders.create({
      amount,
      currency,
      receipt: `cs_claim_${Date.now()}`,
      notes: {
        purpose: 'claim_saathi_filing',
      },
    });
    res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create order';
    console.error('[create-razorpay-order]', err);
    res.status(500).json({ error: message });
  }
}
