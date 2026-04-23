import React from "react";
import { Icon } from "../../../components/icons";
import { InlineMessage } from "../../../components/inline-message";

export function EventMegaphoneModuleCard({
  t,
  interpolateText,
  broadcastMessageDraft,
  setBroadcastMessageDraft,
  broadcastFeedback,
  setBroadcastFeedback,
  confirmedRecipientsCount,
  handleSendBroadcastMessage,
  isSendingBroadcastMessage,
  broadcastFeedbackType
}) {
  const primaryButtonClass =
    "inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold px-4 py-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm disabled:opacity-60 disabled:cursor-not-allowed";

  return (
    <article className="order-7 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-xl border border-gray-200/80 dark:border-gray-700/80 ring-1 ring-black/5 dark:ring-white/10 shadow-sm overflow-hidden p-5 flex flex-col gap-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
      <div className="flex items-center gap-2">
        <Icon name="mail" className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <p className="text-lg font-bold text-gray-900 dark:text-white">{t("event_broadcast_title")}</p>
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
        {t("event_broadcast_hint")}
      </p>

      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {t("event_broadcast_message_label")}
        </span>
        <textarea
          rows={4}
          value={broadcastMessageDraft}
          onChange={(event) => {
            setBroadcastMessageDraft(event.target.value);
            if (broadcastFeedback) {
              setBroadcastFeedback("");
            }
          }}
          placeholder={t("event_broadcast_message_placeholder")}
          className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/90 dark:bg-black/35 px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:ring-2 focus:ring-blue-500/60 resize-y min-h-[110px]"
        />
      </label>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {interpolateText(t("event_broadcast_confirmed_count"), { count: confirmedRecipientsCount })}
        </p>
        <button
          type="button"
          onClick={handleSendBroadcastMessage}
          disabled={isSendingBroadcastMessage || confirmedRecipientsCount <= 0}
          className={`${primaryButtonClass} text-xs`}
        >
          <Icon
            name={isSendingBroadcastMessage ? "loader" : "mail"}
            className={`w-4 h-4 ${isSendingBroadcastMessage ? "animate-spin" : ""}`}
          />
          <span>
            {isSendingBroadcastMessage
              ? t("event_broadcast_sending")
              : interpolateText(t("event_broadcast_send_action"), { count: confirmedRecipientsCount })}
          </span>
        </button>
      </div>

      {broadcastFeedback ? <InlineMessage type={broadcastFeedbackType} text={broadcastFeedback} /> : null}
    </article>
  );
}
