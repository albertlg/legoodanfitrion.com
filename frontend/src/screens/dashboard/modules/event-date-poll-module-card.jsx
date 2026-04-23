import React from "react";
import { AvatarCircle } from "../../../components/avatar-circle";
import { Icon } from "../../../components/icons";
import { getInitials } from "../../../lib/formatters";

export function EventDatePollModuleCard({
  t,
  language,
  shouldRenderDatePollSection,
  datePollOpen,
  hasDatePollOptions,
  selectedEventDateOptions,
  selectedEventDateVoteSummaryByOptionId,
  selectedEventDateVoteMatrixRows,
  selectedEventDatePollWinningOptionId,
  isClosingEventDatePollOptionId,
  handleCloseEventDatePoll,
  formatDate,
  formatTimeLabel,
  formatShortDate,
  getGuestAvatarUrl,
  datePollTotalVotes
}) {
  const primaryButtonClass =
    "inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold px-4 py-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm disabled:opacity-60 disabled:cursor-not-allowed";

  if (!shouldRenderDatePollSection) {
    return null;
  }

  return (
    <article
      id="event-date-poll"
      className="order-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-xl border border-gray-200/80 dark:border-gray-700/80 ring-1 ring-black/5 dark:ring-white/10 shadow-sm overflow-hidden p-5 flex flex-col gap-4 scroll-mt-28 transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Icon name="calendar" className="w-4 h-4 text-blue-500" />
            {t("event_date_poll_title")}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("event_date_poll_subtitle")}</p>
        </div>
        <span
          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border ${
            datePollOpen
              ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/40"
              : "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-white/10"
          }`}
        >
          {datePollOpen ? t("event_date_poll_open_badge") : t("event_date_poll_closed_badge")}
        </span>
      </div>

      {hasDatePollOptions ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {selectedEventDateOptions.map((optionItem, index) => {
            const optionSummary = selectedEventDateVoteSummaryByOptionId?.[optionItem.id] || {
              yes: 0,
              no: 0,
              maybe: 0,
              pending: 0,
              score: 0
            };
            const computedPending = Math.max(
              0,
              selectedEventDateVoteMatrixRows.length -
                Number(optionSummary.yes || 0) -
                Number(optionSummary.no || 0) -
                Number(optionSummary.maybe || 0)
            );
            const optionDateLabel = formatDate(optionItem.startAt, language, t("no_date"));
            const optionTimeLabel = formatTimeLabel(optionItem.startAt, language, t("no_date"));
            const isWinningOption = selectedEventDatePollWinningOptionId === optionItem.id;
            const isClosingOption = isClosingEventDatePollOptionId === optionItem.id;
            return (
              <article
                key={optionItem.id}
                className={`rounded-xl border p-3 flex flex-col gap-3 ${
                  isWinningOption
                    ? "border-green-300 bg-green-50/70 dark:border-green-700/40 dark:bg-green-900/20"
                    : "border-black/5 bg-white/70 dark:border-white/10 dark:bg-black/20"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {t("event_date_poll_vote_matrix_option")} #{index + 1}
                  </p>
                  {isWinningOption ? (
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700/30">
                      {t("event_date_poll_winner_badge")}
                    </span>
                  ) : null}
                </div>
                <p className="text-sm font-bold text-gray-900 dark:text-white leading-snug">{optionDateLabel}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{optionTimeLabel}</p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                    {t("status_yes")}: {optionSummary.yes}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                    {t("status_maybe")}: {optionSummary.maybe}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                    {t("status_no")}: {optionSummary.no}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    {t("status_pending")}: {computedPending}
                  </span>
                </div>
                {datePollOpen ? (
                  <button
                    type="button"
                    className={`mt-1 ${primaryButtonClass} text-xs px-3 py-2`}
                    onClick={() => handleCloseEventDatePoll(optionItem.id)}
                    disabled={Boolean(isClosingEventDatePollOptionId)}
                  >
                    <Icon
                      name={isClosingOption ? "loader" : "check"}
                      className={`w-4 h-4 ${isClosingOption ? "animate-spin" : ""}`}
                    />
                    {isClosingOption ? t("event_date_poll_closing") : t("event_date_poll_close_action")}
                  </button>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <p className="text-xs italic text-gray-500 dark:text-gray-400">{t("event_date_poll_options_empty")}</p>
      )}

      {hasDatePollOptions ? (
        <div className="w-full overflow-x-auto relative rounded-xl border border-black/5 dark:border-white/10 bg-white/40 dark:bg-black/20">
          <table className="w-full table-fixed text-left border-collapse text-sm">
            <thead>
              <tr>
                <th className="w-1/3 md:w-1/4 max-w-[150px] truncate sticky left-0 z-20 bg-white dark:bg-gray-900 shadow-[1px_0_0_0_#e5e7eb] dark:shadow-[1px_0_0_0_#374151] px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-black/5 dark:border-white/10">
                  {t("event_date_poll_vote_matrix_guest")}
                </th>
                {selectedEventDateOptions.map((optionItem, index) => (
                  <th
                    key={optionItem.id}
                    className="px-4 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-black/5 dark:border-white/10"
                  >
                    <span className="block">{t("event_date_poll_vote_matrix_option")} #{index + 1}</span>
                    <span className="block normal-case text-[11px] font-medium text-gray-700 dark:text-gray-200 mt-0.5">
                      {formatShortDate(optionItem.startAt, language, t("no_date"))}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {selectedEventDateVoteMatrixRows.map((guestRow) => (
                <tr
                  key={guestRow.invitation.id}
                  className="border-b border-black/5 dark:border-white/10 last:border-b-0"
                >
                  <td className="w-1/3 md:w-1/4 max-w-[150px] truncate sticky left-0 z-10 bg-white dark:bg-gray-900 shadow-[1px_0_0_0_#e5e7eb] dark:shadow-[1px_0_0_0_#374151] px-4 py-2.5 border-r border-black/5 dark:border-white/10">
                    <div className="flex items-center gap-2">
                      <AvatarCircle
                        label={guestRow.name || t("field_guest")}
                        fallback={getInitials(guestRow.name || t("field_guest"), "IN")}
                        imageUrl={getGuestAvatarUrl(guestRow.guest, guestRow.name)}
                        size={24}
                      />
                      <span className="text-xs font-bold text-gray-900 dark:text-white truncate block w-full">
                        {guestRow.name}
                      </span>
                    </div>
                  </td>
                  {selectedEventDateOptions.map((optionItem) => {
                    const voteStatus = String(guestRow.votesByOptionId?.[optionItem.id] || "pending")
                      .trim()
                      .toLowerCase();
                    const badgeClass =
                      voteStatus === "yes"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                        : voteStatus === "no"
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                          : voteStatus === "maybe"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300";
                    const voteLabel =
                      voteStatus === "yes"
                        ? t("status_yes")
                        : voteStatus === "no"
                          ? t("status_no")
                          : voteStatus === "maybe"
                            ? t("status_maybe")
                            : t("status_pending");
                    return (
                      <td key={`${guestRow.invitation.id}-${optionItem.id}`} className="px-4 py-2 text-center">
                        <span
                          className={`inline-flex items-center justify-center rounded-full px-2 py-1 text-[10px] font-bold ${badgeClass}`}
                        >
                          {voteLabel}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {hasDatePollOptions && datePollTotalVotes === 0 ? (
        <p className="text-xs text-gray-500 dark:text-gray-400 italic">{t("event_date_poll_no_votes")}</p>
      ) : null}
    </article>
  );
}
