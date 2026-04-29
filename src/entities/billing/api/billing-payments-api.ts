import { getSupabase } from "@shared/lib/supabase-client";

import type { PaymentListItem, PaymentRowStatus } from "../model/types";

export type BillingPaymentDbRow = {
  id: string;
  created_at: string;
  amount_cents: number;
  currency: string;
  status: string;
  metadata: Record<string, unknown> | null;
};

function mapStatus(db: string): PaymentRowStatus {
  if (db === "succeeded" || db === "paid" || db === "no_payment_required") return "succeeded";
  if (db === "pending" || db === "unpaid") return "pending";
  return "failed";
}

export function formatAmountFromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

function descriptionFromMetadata(meta: Record<string, unknown> | null): string | undefined {
  if (!meta || typeof meta !== "object") return undefined;
  const d = meta.description;
  if (typeof d === "string" && d.trim()) return d.trim();
  return undefined;
}

export async function fetchBillingPayments(): Promise<PaymentListItem[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("billing_payments")
    .select("id, created_at, amount_cents, currency, status, metadata")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const r = row as BillingPaymentDbRow;
    return {
      id: r.id,
      dateIso: r.created_at,
      amountLabel: formatAmountFromCents(r.amount_cents),
      currency: r.currency.toUpperCase(),
      status: mapStatus(r.status),
      description: descriptionFromMetadata(r.metadata),
    };
  });
}
