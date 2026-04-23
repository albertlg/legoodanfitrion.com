import React from "react";
import { Icon } from "../../../components/icons";
import { InlineMessage } from "../../../components/inline-message";

const FINANCE_MODES = [
  { key: "fixed_price", labelKey: "event_finance_mode_fixed_price_label", hintKey: "event_finance_mode_fixed_price_hint" },
  { key: "split_tickets", labelKey: "event_finance_mode_split_tickets_label", hintKey: "event_finance_mode_split_tickets_hint" },
  {
    key: "corporate_budget",
    labelKey: "event_finance_mode_corporate_budget_label",
    hintKey: "event_finance_mode_corporate_budget_hint"
  }
];

const LOCALE_BY_LANGUAGE = {
  es: "es-ES",
  ca: "ca-ES",
  en: "en-GB",
  fr: "fr-FR",
  it: "it-IT"
};

const PRIMARY_BUTTON_CLASS =
  "inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold px-4 py-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm disabled:opacity-60 disabled:cursor-not-allowed";
const SECONDARY_BUTTON_CLASS =
  "inline-flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl font-semibold px-4 py-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700 disabled:opacity-60 disabled:cursor-not-allowed";
const SOFT_ADD_BUTTON_CLASS =
  "inline-flex items-center justify-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 font-semibold rounded-xl px-4 py-2 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed";

function formatMoneyCompact(value, language) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return "0";
  }
  const locale = LOCALE_BY_LANGUAGE[String(language || "").trim().toLowerCase()] || "es-ES";
  const hasDecimals = Math.abs(numericValue % 1) > 0.000001;
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2
  }).format(numericValue);
}

function renderExpenseForm({
  t,
  isProfessionalEvent,
  splitExpenseDescription,
  setSplitExpenseDescription,
  splitExpenseAmount,
  setSplitExpenseAmount,
  splitExpensePaidBy,
  setSplitExpensePaidBy,
  splitParticipants,
  splitHelperMessage,
  setSplitHelperMessage,
  handleAddSplitExpense
}) {
  return (
    <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-black/20 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
      <label className="flex flex-col gap-1.5 sm:col-span-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {t("event_expenses_description_label")}
        </span>
        <input
          className="w-full bg-white/90 dark:bg-black/35 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
          type="text"
          placeholder={t(isProfessionalEvent ? "placeholder_expense_pro" : "placeholder_expense_personal")}
          value={splitExpenseDescription}
          onChange={(event) => {
            setSplitExpenseDescription(event.target.value);
            if (splitHelperMessage) {
              setSplitHelperMessage("");
            }
          }}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {t("event_expenses_amount_label")}
        </span>
        <input
          className="w-full bg-white/90 dark:bg-black/35 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          placeholder={t("event_expenses_amount_placeholder")}
          value={splitExpenseAmount}
          onChange={(event) => {
            setSplitExpenseAmount(event.target.value);
            if (splitHelperMessage) {
              setSplitHelperMessage("");
            }
          }}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {t("event_expenses_paid_by_label")}
        </span>
        <select
          className="w-full bg-white/90 dark:bg-black/35 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
          value={splitExpensePaidBy}
          onChange={(event) => {
            setSplitExpensePaidBy(event.target.value);
            if (splitHelperMessage) {
              setSplitHelperMessage("");
            }
          }}
        >
          {!splitParticipants.length ? <option value="">{t("event_expenses_paid_by_placeholder")}</option> : null}
          {splitParticipants.map((participantName) => (
            <option key={participantName} value={participantName}>
              {participantName}
            </option>
          ))}
        </select>
      </label>
      <button
        className={`sm:col-span-2 ${SOFT_ADD_BUTTON_CLASS} text-xs`}
        type="button"
        onClick={handleAddSplitExpense}
        disabled={!splitParticipants.length}
      >
        <Icon name="plus" className="w-4 h-4" />
        <span>{t("event_expenses_add_action")}</span>
      </button>
    </div>
  );
}

function renderExpenseList({ t, interpolateText, splitExpenses, formatMoneyAmount, language, handleRemoveSplitExpense }) {
  return (
    <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-black/20 p-4 flex flex-col gap-3">
      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("event_expenses_list_title")}</p>
      {splitExpenses.length === 0 ? (
        <p className="text-xs text-gray-500 dark:text-gray-400 italic">{t("event_expenses_list_empty")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {splitExpenses.map((expense) => (
            <li
              key={expense.id}
              className="rounded-xl border border-black/5 dark:border-white/10 bg-white/90 dark:bg-gray-900/50 px-3 py-2.5 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{expense.description}</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  {interpolateText(t("event_expenses_paid_by_value"), { name: expense.paidBy })}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  {formatMoneyAmount(expense.amount, language)} €
                </span>
                <button
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 dark:border-red-700/40 text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                  type="button"
                  onClick={() => handleRemoveSplitExpense(expense.id)}
                  aria-label={t("event_expenses_remove_action")}
                  title={t("event_expenses_remove_action")}
                >
                  <Icon name="trash" className="w-4 h-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function EventFinanceModuleCard({
  t,
  interpolateText,
  language,
  isProfessionalEvent = false,
  splitExpenseDescription,
  setSplitExpenseDescription,
  splitExpenseAmount,
  setSplitExpenseAmount,
  splitExpensePaidBy,
  setSplitExpensePaidBy,
  splitParticipants,
  splitHelperMessage,
  setSplitHelperMessage,
  handleAddSplitExpense,
  splitExpenses,
  formatMoneyAmount,
  handleRemoveSplitExpense,
  splitTotalAmount,
  splitTotalGuests,
  splitPerPersonLabel,
  splitDebts,
  handleShareSettlementWhatsApp,
  splitHelperMessageType,
  financeMode,
  setFinanceMode,
  financeFixedPrice,
  setFinanceFixedPrice,
  financePaymentInfo,
  setFinancePaymentInfo,
  financeTotalBudget,
  setFinanceTotalBudget,
  handleSaveFinanceConfig,
  isSavingFinanceConfig,
  financeFeedback,
  financeFeedbackType,
  fixedPriceGuests,
  fixedPricePaidInvitationIds,
  isLoadingFixedPricePayments,
  togglingFixedPaymentInvitationId,
  handleToggleFixedPriceGuestPaid,
  fixedPricePaidCount,
  fixedPricePendingCount,
  fixedPriceCollectedAmount,
  fixedPricePendingAmount
}) {
  const currentFinanceMode = String(financeMode || "split_tickets").trim().toLowerCase() || "split_tickets";
  const fixedPriceValue = Number(financeFixedPrice);
  const fixedPriceAmount = Number.isFinite(fixedPriceValue) && fixedPriceValue >= 0 ? fixedPriceValue : 0;
  const corporateBudgetValue = Number(financeTotalBudget);
  const corporateBudgetAmount = Number.isFinite(corporateBudgetValue) && corporateBudgetValue >= 0 ? corporateBudgetValue : 0;
  const corporateRemaining = corporateBudgetAmount - splitTotalAmount;
  const corporateProgressPercentRaw =
    corporateBudgetAmount > 0 ? Math.round((splitTotalAmount / corporateBudgetAmount) * 100) : 0;
  const corporateProgressPercent = Math.max(0, corporateProgressPercentRaw);
  const corporateProgressBarWidth = corporateBudgetAmount > 0 ? Math.min(100, corporateProgressPercentRaw) : 0;
  const isCorporateOverBudget = corporateBudgetAmount > 0 && splitTotalAmount > corporateBudgetAmount;
  const paidInvitationSet =
    fixedPricePaidInvitationIds instanceof Set
      ? fixedPricePaidInvitationIds
      : new Set(Array.isArray(fixedPricePaidInvitationIds) ? fixedPricePaidInvitationIds : []);

  return (
    <article className="order-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-xl border border-gray-200/80 dark:border-gray-700/80 ring-1 ring-black/5 dark:ring-white/10 shadow-sm overflow-hidden p-5 flex flex-col gap-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
      <div className="flex items-center gap-2">
        <Icon name="activity" className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        <p className="text-lg font-bold text-gray-900 dark:text-white">{t("event_finance_title")}</p>
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{t("event_finance_hint")}</p>

      <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-black/20 p-4 grid grid-cols-1 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {t("event_finance_mode_label")}
          </span>
          <select
            className="w-full bg-white/90 dark:bg-black/35 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
            value={currentFinanceMode}
            onChange={(event) => setFinanceMode(event.target.value)}
          >
            {FINANCE_MODES.map((modeItem) => (
              <option key={modeItem.key} value={modeItem.key}>
                {t(modeItem.labelKey)}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t(FINANCE_MODES.find((modeItem) => modeItem.key === currentFinanceMode)?.hintKey || "event_finance_mode_split_tickets_hint")}
        </p>

        {currentFinanceMode === "fixed_price" ? (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t("event_finance_fixed_price_label")}
              </span>
              <input
                className="w-full bg-white/90 dark:bg-black/35 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder={t("event_finance_fixed_price_placeholder")}
                value={financeFixedPrice}
                onChange={(event) => setFinanceFixedPrice(event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t("event_finance_payment_info_label")}
              </span>
              <input
                className="w-full bg-white/90 dark:bg-black/35 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
                type="text"
                placeholder={t("event_finance_payment_info_placeholder")}
                value={financePaymentInfo}
                onChange={(event) => setFinancePaymentInfo(event.target.value)}
              />
            </label>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">{t("event_finance_payment_info_hint")}</p>
          </>
        ) : null}

        {currentFinanceMode === "corporate_budget" ? (
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {t("event_finance_total_budget_label")}
            </span>
            <input
              className="w-full bg-white/90 dark:bg-black/35 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder={t("event_finance_total_budget_placeholder")}
              value={financeTotalBudget}
              onChange={(event) => setFinanceTotalBudget(event.target.value)}
            />
          </label>
        ) : null}

        <button
          className={`${PRIMARY_BUTTON_CLASS} text-[11px] px-3 py-2`}
          type="button"
          onClick={handleSaveFinanceConfig}
          disabled={isSavingFinanceConfig}
        >
          <Icon name={isSavingFinanceConfig ? "loader" : "check"} className={`w-4 h-4 ${isSavingFinanceConfig ? "animate-spin" : ""}`} />
          <span>{isSavingFinanceConfig ? t("event_finance_save_action_loading") : t("event_finance_save_action")}</span>
        </button>
      </div>

      {financeFeedback ? <InlineMessage type={financeFeedbackType} text={financeFeedback} /> : null}

      {currentFinanceMode === "fixed_price" ? (
        <>
          <div className="grid grid-cols-2 gap-4">
            <article className="rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/30 px-4 py-3 flex flex-col gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700/80 dark:text-emerald-300/80">
                {t("event_finance_fixed_price_paid_label")}
              </span>
              <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300 leading-none">{fixedPricePaidCount}</p>
            </article>
            <article className="rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 px-4 py-3 flex flex-col gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700/80 dark:text-amber-300/80">
                {t("event_finance_fixed_price_pending_label")}
              </span>
              <p className="text-2xl font-black text-amber-700 dark:text-amber-300 leading-none">{fixedPricePendingCount}</p>
            </article>
            <article className="rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/40 px-4 py-3 flex flex-col gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700/80 dark:text-blue-300/80">
                {t("event_finance_fixed_price_collected_label")}
              </span>
              <p className="text-xl font-black text-blue-700 dark:text-blue-300 leading-none">
                {formatMoneyAmount(fixedPriceCollectedAmount, language)} €
              </p>
            </article>
            <article className="rounded-2xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-700/40 px-4 py-3 flex flex-col gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700/80 dark:text-rose-300/80">
                {t("event_finance_fixed_price_missing_label")}
              </span>
              <p className="text-xl font-black text-rose-700 dark:text-rose-300 leading-none">
                {formatMoneyAmount(fixedPricePendingAmount, language)} €
              </p>
            </article>
          </div>

          <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-black/20 p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Icon name="users" className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <p className="text-sm font-bold text-gray-900 dark:text-white">{t("event_finance_fixed_price_guest_list_title")}</p>
            </div>
            {isLoadingFixedPricePayments ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 italic">{t("loading")}</p>
            ) : fixedPriceGuests.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 italic">{t("event_finance_fixed_price_guest_list_empty")}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {fixedPriceGuests.map((guestRow) => {
                  const invitationId = String(guestRow?.invitationId || "").trim();
                  const isPaid = paidInvitationSet.has(invitationId);
                  const isToggling = togglingFixedPaymentInvitationId === invitationId;
                  return (
                    <li
                      key={invitationId}
                      className="rounded-xl border border-black/5 dark:border-white/10 bg-white/90 dark:bg-gray-900/50 px-3 py-2.5 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{guestRow.name}</p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{guestRow.contact}</p>
                      </div>
                      <button
                        type="button"
                        disabled={isToggling}
                        onClick={() => handleToggleFixedPriceGuestPaid(invitationId, !isPaid)}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm disabled:opacity-60 disabled:cursor-not-allowed ${
                          isPaid
                            ? "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
                            : "bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-600"
                        }`}
                      >
                        <Icon name={isToggling ? "loader" : isPaid ? "check" : "clock"} className={`w-3.5 h-3.5 ${isToggling ? "animate-spin" : ""}`} />
                        <span>{isPaid ? t("event_finance_fixed_price_paid_action") : t("event_finance_fixed_price_mark_paid_action")}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {fixedPriceAmount <= 0 ? (
            <InlineMessage type="warning" text={t("event_finance_fixed_price_amount_required")} />
          ) : null}
        </>
      ) : null}

      {currentFinanceMode === "split_tickets" ? (
        <>
          {renderExpenseForm({
            t,
            isProfessionalEvent,
            splitExpenseDescription,
            setSplitExpenseDescription,
            splitExpenseAmount,
            setSplitExpenseAmount,
            splitExpensePaidBy,
            setSplitExpensePaidBy,
            splitParticipants,
            splitHelperMessage,
            setSplitHelperMessage,
            handleAddSplitExpense
          })}

          {renderExpenseList({
            t,
            interpolateText,
            splitExpenses,
            formatMoneyAmount,
            language,
            handleRemoveSplitExpense
          })}

          <div className="grid grid-cols-2 gap-4">
            <article className="rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/40 px-4 py-3 flex flex-col gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700/80 dark:text-blue-300/80">
                {t("event_expenses_total_spent_label")}
              </span>
              <p className="text-2xl font-black text-blue-700 dark:text-blue-300 leading-none">
                {formatMoneyAmount(splitTotalAmount, language)} €
              </p>
            </article>
            <article className="rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700/40 px-4 py-3 flex flex-col gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700/80 dark:text-indigo-300/80">
                {t("event_expenses_people_count_label")}
              </span>
              <p className="text-2xl font-black text-indigo-700 dark:text-indigo-300 leading-none">{splitTotalGuests || 0}</p>
            </article>
            <article className="col-span-2 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/30 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700/80 dark:text-emerald-300/80">
                {t("event_expenses_per_person_label")}
              </span>
              <p className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-300 leading-tight break-words">
                {interpolateText(t("event_expenses_per_person_value"), { amount: splitPerPersonLabel })}
              </p>
            </article>
          </div>

          <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-black/20 p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Icon name="trend" className="w-4 h-4 text-purple-600 dark:text-purple-300" />
              <p className="text-sm font-bold text-gray-900 dark:text-white">{t("event_expenses_settlement_title")}</p>
            </div>

            {splitTotalGuests <= 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 italic">{t("event_expenses_people_zero")}</p>
            ) : splitExpenses.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 italic">{t("event_expenses_settlement_empty")}</p>
            ) : splitDebts.length === 0 ? (
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">{t("event_expenses_settlement_balanced")}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {splitDebts.map((transaction, index) => (
                  <li
                    key={`${transaction.from}-${transaction.to}-${index}`}
                    className="rounded-xl border border-purple-200/70 dark:border-purple-700/30 bg-purple-50/70 dark:bg-purple-900/20 px-3 py-2.5 flex items-center justify-between gap-3"
                  >
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">
                      {interpolateText(t("event_expenses_settlement_row"), {
                        from: transaction.from,
                        to: transaction.to,
                        amount: `${formatMoneyAmount(transaction.amount, language)} €`
                      })}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            <button
              className="mt-1 inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl font-semibold px-4 py-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm text-xs disabled:opacity-60 disabled:cursor-not-allowed"
              type="button"
              onClick={handleShareSettlementWhatsApp}
              disabled={splitTotalAmount <= 0 || splitTotalGuests <= 0}
              aria-label={t("event_expenses_whatsapp_action")}
              title={t("event_expenses_whatsapp_action")}
            >
              <Icon name="message" className="w-4 h-4" />
              <span>{t("event_expenses_whatsapp_action")}</span>
            </button>
          </div>

          <InlineMessage type={splitHelperMessageType} text={splitHelperMessage} />
        </>
      ) : null}

      {currentFinanceMode === "corporate_budget" ? (
        <>
          <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-black/20 p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t("event_finance_corporate_progress_label")}
              </p>
              <p className={`text-xs font-bold ${isCorporateOverBudget ? "text-red-600 dark:text-red-300" : "text-gray-700 dark:text-gray-200"}`}>
                {corporateProgressPercent}%
              </p>
            </div>
            <div className="h-2.5 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${isCorporateOverBudget ? "bg-red-500" : "bg-gradient-to-r from-indigo-500 to-purple-500"}`}
                style={{ width: `${Math.max(0, corporateProgressBarWidth)}%` }}
              />
            </div>
            <article className="rounded-xl border border-blue-200 dark:border-blue-700/40 bg-blue-50 dark:bg-blue-900/20 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700/80 dark:text-blue-300/80">
                {t("event_finance_corporate_budget_total_label")}
              </p>
              <p className="text-xl font-bold text-blue-700 dark:text-blue-300 leading-none">
                <span className="whitespace-nowrap">{formatMoneyCompact(corporateBudgetAmount, language)} €</span>
              </p>
            </article>
            <div className="grid grid-cols-2 gap-3">
              <article className="rounded-xl border border-emerald-200 dark:border-emerald-700/40 bg-emerald-50 dark:bg-emerald-900/20 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700/80 dark:text-emerald-300/80">
                  {t("event_finance_corporate_spent_label")}
                </p>
                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300 leading-none">
                  <span className="whitespace-nowrap">{formatMoneyCompact(splitTotalAmount, language)} €</span>
                </p>
              </article>
              <article
                className={`rounded-xl p-3 border ${
                  isCorporateOverBudget
                    ? "border-red-200 dark:border-red-700/40 bg-red-50 dark:bg-red-900/20"
                    : "border-amber-200 dark:border-amber-700/40 bg-amber-50 dark:bg-amber-900/20"
                }`}
              >
                <p
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    isCorporateOverBudget
                      ? "text-red-700/80 dark:text-red-300/80"
                      : "text-amber-700/80 dark:text-amber-300/80"
                  }`}
                >
                  {t("event_finance_corporate_remaining_label")}
                </p>
                <p
                  className={`text-lg font-bold leading-none ${
                    isCorporateOverBudget ? "text-red-600 dark:text-red-300" : "text-amber-700 dark:text-amber-300"
                  }`}
                >
                  <span className="whitespace-nowrap">{formatMoneyCompact(corporateRemaining, language)} €</span>
                </p>
              </article>
            </div>
          </div>

          {renderExpenseForm({
            t,
            splitExpenseDescription,
            setSplitExpenseDescription,
            splitExpenseAmount,
            setSplitExpenseAmount,
            splitExpensePaidBy,
            setSplitExpensePaidBy,
            splitParticipants,
            splitHelperMessage,
            setSplitHelperMessage,
            handleAddSplitExpense
          })}

          {renderExpenseList({
            t,
            interpolateText,
            splitExpenses,
            formatMoneyAmount,
            language,
            handleRemoveSplitExpense
          })}

          <InlineMessage type={splitHelperMessageType} text={splitHelperMessage} />
        </>
      ) : null}
    </article>
  );
}
