/** Карточка «текущий тариф» (в UI до подключения API). */
export type BillingPlanSummary = {
  id: string;
  name: string;
  priceLabel: string;
  interval: string;
  status: BillingPlanStatus;
  renewalDate?: string | null;
};

/** Статус подписки/плана для отображения. */
export type BillingPlanStatus = "active" | "trial" | "past_due" | "cancelled";

/** Строка таблицы платежей (в UI до подключения API). */
export type PaymentListItem = {
  id: string;
  dateIso: string;
  amountLabel: string;
  currency: string;
  status: PaymentRowStatus;
  description?: string;
};

export type PaymentRowStatus = "succeeded" | "pending" | "failed";
