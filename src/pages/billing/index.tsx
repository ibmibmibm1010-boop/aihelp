import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type { BillingPlanSummary, PaymentListItem } from "@entities/billing/model/types";

import { fetchBillingPayments } from "@entities/billing/api/billing-payments-api";

import { formatDateRu } from "@shared/lib";
import { useAuth } from "@shared/lib/auth-context";
import { pressableBase } from "@shared/ui";

const cardClass =
  "rounded-vibe border border-vibe-line bg-white/90 p-6 shadow-lg shadow-vibe-purple/10 backdrop-blur-sm sm:p-8";

/** Замена данными из API подписки. */
const planPreview: BillingPlanSummary = {
  id: "preview-free",
  name: "Freemium",
  priceLabel: "$0",
  interval: "month",
  status: "active",
  renewalDate: "2027-03-01",
};

const payLinkClass = `${pressableBase} inline-flex w-full items-center justify-center rounded-xl bg-vibe-purple px-6 py-3 text-sm font-bold text-white shadow-md shadow-vibe-purple/25 transition hover:brightness-95 sm:w-auto`;

function BillingPage() {
  const { t } = useTranslation();
  const { currentUser, isAuthenticated, isInitializing } = useAuth();

  const stripePaymentLink = import.meta.env.VITE_STRIPE_PAYMENT_LINK?.trim();

  const checkoutUrl = useMemo(() => {
    if (!stripePaymentLink) return "";
    if (!currentUser?.id) return stripePaymentLink;
    try {
      const u = new URL(stripePaymentLink);
      u.searchParams.set("client_reference_id", currentUser.id);
      return u.toString();
    } catch {
      return stripePaymentLink;
    }
  }, [stripePaymentLink, currentUser?.id]);

  const [payments, setPayments] = useState<PaymentListItem[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);

  const reloadPayments = useCallback(async () => {
    if (!isAuthenticated) return;
    setPaymentsLoading(true);
    setPaymentsError(null);
    try {
      const rows = await fetchBillingPayments();
      setPayments(rows);
    } catch {
      setPaymentsError(t("billing.paymentsLoadError"));
      setPayments([]);
    } finally {
      setPaymentsLoading(false);
    }
  }, [isAuthenticated, t]);

  useEffect(() => {
    if (isInitializing) return;
    if (!isAuthenticated) {
      setPaymentsLoading(false);
      setPayments([]);
      setPaymentsError(null);
      return;
    }
    let cancelled = false;
    setPaymentsLoading(true);
    setPaymentsError(null);
    void fetchBillingPayments()
      .then((rows) => {
        if (!cancelled) setPayments(rows);
      })
      .catch(() => {
        if (!cancelled) {
          setPaymentsError(t("billing.paymentsLoadError"));
          setPayments([]);
        }
      })
      .finally(() => {
        if (!cancelled) setPaymentsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isInitializing, t]);

  useEffect(() => {
    if (!isAuthenticated || isInitializing) return;
    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      void fetchBillingPayments()
        .then((rows) => {
          setPayments(rows);
          setPaymentsError(null);
        })
        .catch(() => {
          setPaymentsError(t("billing.paymentsLoadError"));
        });
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [isAuthenticated, isInitializing, t]);

  const statusPlanKey =
    planPreview.status === "active"
      ? "billing.planStatus.active"
      : planPreview.status === "trial"
        ? "billing.planStatus.trial"
        : planPreview.status === "past_due"
          ? "billing.planStatus.pastDue"
          : "billing.planStatus.cancelled";

  const showPaymentsSpinner = paymentsLoading || isInitializing;

  return (
    <main>
      <p className="inline-flex items-center rounded-full bg-vibe-purple px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white shadow-sm">
        {t("common.logo")}
      </p>
      <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight text-ink drop-shadow-sm sm:text-5xl lg:text-6xl">
        {t("billing.title")}
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-vibe-muted">{t("billing.lead")}</p>
      <p className="mt-2 text-sm text-vibe-muted">{t("billing.previewNote")}</p>

      <div className="mt-10 grid gap-6 lg:grid-cols-2 lg:gap-8">
        <section className={cardClass} aria-labelledby="billing-plan-heading">
          <h2 id="billing-plan-heading" className="text-lg font-bold tracking-tight text-ink">
            {t("billing.planSection")}
          </h2>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full border border-vibe-line bg-vibe-purple/10 px-2.5 py-0.5 text-xs font-semibold text-vibe-purple">
              {t(statusPlanKey)}
            </span>
          </div>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="font-medium text-vibe-muted">{t("billing.planName")}</dt>
              <dd className="mt-0.5 text-lg font-semibold text-ink">{planPreview.name}</dd>
            </div>
            <div>
              <dt className="font-medium text-vibe-muted">{t("billing.planPrice")}</dt>
              <dd className="mt-0.5 text-ink">
                {planPreview.priceLabel}
                <span className="text-vibe-muted">
                  {" "}
                  / {t(`billing.interval.${planPreview.interval}`)}
                </span>
              </dd>
            </div>
            <div>
              <dt className="font-medium text-vibe-muted">{t("billing.planRenewal")}</dt>
              <dd className="mt-0.5 text-ink">
                {planPreview.renewalDate ? formatDateRu(planPreview.renewalDate) : t("billing.dash")}
              </dd>
            </div>
          </dl>
          <div className="mt-6 border-t border-vibe-line pt-5">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-vibe-muted">
              {t("billing.payActionLabel")}
            </p>
            {stripePaymentLink ? (
              <>
                <a
                  className={payLinkClass}
                  href={checkoutUrl || stripePaymentLink}
                  rel="noopener noreferrer"
                  aria-label={t("billing.pay")}
                >
                  {t("billing.pay")}
                </a>
                {!currentUser?.id ? (
                  <p className="mt-3 text-xs text-vibe-muted" role="status">
                    {t("billing.payGuestHint")}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-vibe-muted" role="status">
                {t("billing.payUnavailable")}
              </p>
            )}
          </div>
        </section>

        <section className={`${cardClass} lg:col-span-2`} aria-labelledby="billing-payments-heading">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 id="billing-payments-heading" className="text-lg font-bold tracking-tight text-ink">
              {t("billing.paymentsSection")}
            </h2>
            {!isInitializing && isAuthenticated ? (
              <button
                type="button"
                className="shrink-0 rounded-lg border border-vibe-line px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-white/80 disabled:opacity-50"
                disabled={paymentsLoading}
                onClick={() => void reloadPayments()}
              >
                {t("billing.refreshPayments")}
              </button>
            ) : null}
          </div>
          {paymentsError ? (
            <p className="mt-4 text-sm text-red-700" role="alert">
              {paymentsError}
            </p>
          ) : null}
          <div className="mt-4 overflow-x-auto rounded-vibe border border-vibe-line/80">
            <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-vibe-line bg-vibe-canvas/50 text-vibe-muted">
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">{t("billing.column.date")}</th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">{t("billing.column.amount")}</th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">{t("billing.column.currency")}</th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">{t("billing.column.status")}</th>
                  <th className="min-w-[8rem] px-4 py-3 font-semibold">{t("billing.column.description")}</th>
                </tr>
              </thead>
              <tbody className="text-ink">
                {showPaymentsSpinner ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-vibe-muted">
                      {t("common.loading")}
                    </td>
                  </tr>
                ) : !isAuthenticated ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-vibe-muted">
                      {t("billing.payGuestHint")}
                    </td>
                  </tr>
                ) : payments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-left text-vibe-muted">
                      <p className="text-center font-medium text-ink">{t("billing.paymentsEmpty")}</p>
                      <p className="mx-auto mt-3 max-w-xl whitespace-pre-line text-center text-xs leading-relaxed">
                        {t("billing.paymentsEmptyHint")}
                      </p>
                    </td>
                  </tr>
                ) : (
                  payments.map((row) => (
                    <tr key={row.id} className="border-b border-vibe-line/60 last:border-0 hover:bg-white/70">
                      <td className="whitespace-nowrap px-4 py-3">{formatDateRu(row.dateIso)}</td>
                      <td className="px-4 py-3 tabular-nums">{row.amountLabel}</td>
                      <td className="whitespace-nowrap px-4 py-3">{row.currency}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span
                          className={
                            row.status === "succeeded"
                              ? "text-emerald-700"
                              : row.status === "pending"
                                ? "text-amber-700"
                                : "text-red-700"
                          }
                        >
                          {t(`billing.paymentStatus.${row.status}`)}
                        </span>
                      </td>
                      <td className="max-w-[12rem] truncate px-4 py-3 text-vibe-muted" title={row.description}>
                        {row.description ?? t("billing.dash")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

export default BillingPage;
