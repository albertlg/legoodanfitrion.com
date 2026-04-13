import React from "react";
import { motion as Motion } from "framer-motion";
import { Icon } from "../../../components/icons";
import { InlineMessage } from "../../../components/inline-message";
import { PhotoGalleryPreview } from "../../../components/events/photo-gallery-preview";

export function EventGalleryModuleCard({
  t,
  selectedEventDetail,
  eventPhotoGalleryUrlDraft,
  setEventPhotoGalleryUrlDraft,
  handleSaveEventPhotoGalleryUrl,
  isSavingEventPhotoGalleryUrl,
  eventPhotoGalleryNotifyGuests,
  setEventPhotoGalleryNotifyGuests,
  eventPhotoGalleryFeedback,
  eventPhotoGalleryFeedbackType
}) {
  return (
    <Motion.article
      id="event-gallery"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="order-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden p-5 flex flex-col gap-4 scroll-mt-28"
    >
      <div className="flex items-center gap-2">
        <Icon name="camera" className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        <p className="text-sm font-black text-gray-900 dark:text-white">{t("event_gallery_title")}</p>
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{t("event_gallery_hint")}</p>

      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-2">
        <label className="relative min-w-0">
          <Icon
            name="link"
            className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="url"
            value={eventPhotoGalleryUrlDraft}
            onChange={(event) => setEventPhotoGalleryUrlDraft(event.target.value)}
            placeholder={t("event_gallery_input_placeholder")}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-white/90 dark:bg-black/35 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/40"
          />
        </label>
        <button
          type="button"
          onClick={handleSaveEventPhotoGalleryUrl}
          disabled={isSavingEventPhotoGalleryUrl}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 text-xs font-black transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Icon
            name={isSavingEventPhotoGalleryUrl ? "loader" : "save"}
            className={`w-4 h-4 ${isSavingEventPhotoGalleryUrl ? "animate-spin" : ""}`}
          />
          <span>{isSavingEventPhotoGalleryUrl ? t("saving_label") : t("event_gallery_save_action")}</span>
        </button>
      </div>

      <label className="inline-flex items-start gap-3 rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-black/25 px-3 py-2.5">
        <input
          type="checkbox"
          checked={eventPhotoGalleryNotifyGuests}
          onChange={(event) => setEventPhotoGalleryNotifyGuests(event.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500/40 bg-white dark:bg-gray-900"
        />
        <span className="text-xs text-gray-700 dark:text-gray-200 leading-relaxed">
          <strong className="font-bold">{t("event_gallery_notify_label")}</strong>
          <span className="block text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
            {t("event_gallery_notify_hint")}
          </span>
        </span>
      </label>

      <div className="pt-1">
        <PhotoGalleryPreview
          url={String(eventPhotoGalleryUrlDraft || selectedEventDetail?.photo_gallery_url || "").trim()}
        />
      </div>

      {selectedEventDetail?.photo_gallery_url ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-black/20 p-3">
          <p className="text-xs text-gray-600 dark:text-gray-300 truncate min-w-0" title={selectedEventDetail.photo_gallery_url}>
            {selectedEventDetail.photo_gallery_url}
          </p>
          <a
            href={selectedEventDetail.photo_gallery_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 dark:border-indigo-700/40 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/30 text-indigo-700 dark:text-indigo-200 px-3 py-1.5 text-[11px] font-bold shrink-0"
          >
            <Icon name="camera" className="w-3.5 h-3.5" />
            <span>{t("event_gallery_open_action")}</span>
          </a>
        </div>
      ) : null}

      {eventPhotoGalleryFeedback ? (
        <InlineMessage type={eventPhotoGalleryFeedbackType} text={eventPhotoGalleryFeedback} />
      ) : null}
    </Motion.article>
  );
}
