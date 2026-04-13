import React from "react";
import { Icon } from "../../../components/icons";
import { InlineMessage } from "../../../components/inline-message";

export function EventFinanceModuleCard({
  t,
  interpolateText,
  language,
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
  splitHelperMessageType
}) {
  return (
    <article className="order-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Icon name="activity" className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        <p className="text-sm font-black text-gray-900 dark:text-white">{t("event_expenses_title")}</p>
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{t("event_expenses_hint")}</p>

      <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-black/20 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {t("event_expenses_description_label")}
          </span>
          <input
            className="w-full bg-white/90 dark:bg-black/35 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
            type="text"
            placeholder={t("event_expenses_description_placeholder")}
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
            {!splitParticipants.length ? (
              <option value="">{t("event_expenses_paid_by_placeholder")}</option>
            ) : null}
            {splitParticipants.map((participantName) => (
              <option key={participantName} value={participantName}>
                {participantName}
              </option>
            ))}
          </select>
        </label>
        <button
          className="sm:col-span-2 bg-blue-600 hover:bg-blue-700 text-white font-black py-2.5 px-4 rounded-xl transition-colors text-xs inline-flex items-center justify-center gap-2"
          type="button"
          onClick={handleAddSplitExpense}
          disabled={!splitParticipants.length}
        >
          <Icon name="plus" className="w-4 h-4" />
          <span>{t("event_expenses_add_action")}</span>
        </button>
      </div>

      <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-black/20 p-4 flex flex-col gap-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {t("event_expenses_list_title")}
        </p>
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
                  <span className="text-sm font-black text-emerald-700 dark:text-emerald-300">
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
          <p className="text-sm font-black text-gray-900 dark:text-white">{t("event_expenses_settlement_title")}</p>
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
          className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl border border-green-600/60 bg-green-500 hover:bg-green-600 text-white font-black py-2.5 px-4 text-xs transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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
    </article>
  );
}
