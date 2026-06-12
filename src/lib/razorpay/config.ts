/** Public Razorpay key id (safe for client checkout). */
export function getRazorpayKeyId(): string {
  return (
    process.env.RAZORPAY_KEY_ID?.trim() ||
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim() ||
    ""
  );
}

export function getRazorpayKeySecret(): string {
  return process.env.RAZORPAY_KEY_SECRET?.trim() || "";
}

export function assertRazorpayConfigured(): { keyId: string; keySecret: string } {
  const keyId = getRazorpayKeyId();
  const keySecret = getRazorpayKeySecret();
  if (!keyId || !keySecret) {
    throw new Error("Razorpay keys are not configured in .env");
  }
  return { keyId, keySecret };
}
