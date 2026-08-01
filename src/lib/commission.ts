// Ailexity takes 10% commission on every sale
export const COMMISSION_RATE = parseFloat(process.env.AILEXITY_COMMISSION_RATE || "0.10");

export function splitPayment(amount: number) {
  const commission = parseFloat((amount * COMMISSION_RATE).toFixed(2));
  const sellerEarning = parseFloat((amount - commission).toFixed(2));
  return { commission, sellerEarning };
}
