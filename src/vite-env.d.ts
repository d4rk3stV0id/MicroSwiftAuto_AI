/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  /** Razorpay Key ID (e.g. rzp_test_...). Safe to expose to the browser. */
  readonly VITE_RAZORPAY_KEY_ID: string | undefined;
  /**
   * Optional: POST endpoint that creates a Razorpay order and returns `{ orderId, amount, currency }`.
   * Same-origin path works on Vercel, e.g. `/api/create-razorpay-order`.
   */
  readonly VITE_RAZORPAY_ORDER_URL: string | undefined;
}

/** Web Speech API (Chrome / Edge); not in all TS lib targets. */
interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface Window {
  SpeechRecognition?: { new (): SpeechRecognition };
  webkitSpeechRecognition?: { new (): SpeechRecognition };
}
