import { useEffect, useMemo, useRef, useState } from "react";
import { toBlob } from "html-to-image";
import { Icon } from "../../../components/icons";
import { AvatarCircle } from "../../../components/avatar-circle";
import { formatEventDateDisplay, getInitials } from "../../../lib/formatters";
import { ShareCard } from "../../../components/events/ShareCard";

export function InvitationsListView({
  t,
  language,
  invitationSearch,
  setInvitationSearch,
  invitationSort,
  setInvitationSort,
  invitationPageSize,
  setInvitationPageSize,
  INVITATIONS_PAGE_SIZE_DEFAULT,
  PAGE_SIZE_OPTIONS = [8, 16, 32, 64],
  invitationEventFilter,
  setInvitationEventFilter,
  invitationEventOptions,
  invitationStatusFilter,
  setInvitationStatusFilter,
  filteredInvitations,
  invitationMessage,
  openWorkspace,
  pagedInvitations,
  eventNamesById,
  guestNamesById,
  guestsById,
  eventsById,
  buildInvitationSharePayload,
  buildAppUrl,
  getGuestAvatarUrl,
  openGuestDetail,
  openEventDetail,
  formatDate,
  statusClass,
  statusText,
  handlePrepareInvitationShare,
  handleCopyInvitationLink,
  handleRequestDeleteInvitation,
  invitationPage,
  invitationTotalPages,
  setInvitationPage,
  receivedInvitations = [],
  openReceivedInvitationRsvp,
  hostDisplayName,
  hostAvatarUrl
}) {
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [invitationTab, setInvitationTab] = useState("sent");
  const [isSharingInvitationId, setIsSharingInvitationId] = useState("");
  const [shareImageMessage, setShareImageMessage] = useState("");
  const shareCardRefs = useRef({});
  const [receivedSearch, setReceivedSearch] = useState("");
  const [receivedStatusFilter, setReceivedStatusFilter] = useState("all");
  const [receivedPageSize, setReceivedPageSize] = useState(INVITATIONS_PAGE_SIZE_DEFAULT);
  const [receivedPage, setReceivedPage] = useState(1);

  const sortedReceivedInvitations = useMemo(() => {
    const list = Array.isArray(receivedInvitations) ? [...receivedInvitations] : [];
    list.sort((a, b) => {
      const aTime = new Date(a?.event_start_at || a?.invitation_created_at || 0).getTime() || 0;
      const bTime = new Date(b?.event_start_at || b?.invitation_created_at || 0).getTime() || 0;
      return bTime - aTime;
    });
    return list;
  }, [receivedInvitations]);
  const filteredReceivedInvitations = useMemo(() => {
    const normalizedSearch = String(receivedSearch || "").trim().toLowerCase();
    const normalizedStatus = String(receivedStatusFilter || "all").toLowerCase();
    return sortedReceivedInvitations.filter((invitationItem) => {
      const eventTitle = String(invitationItem?.event_title || "").toLowerCase();
      const hostName = String(invitationItem?.host_full_name || "").toLowerCase();
      const statusValue = String(invitationItem?.invitation_status || "pending").toLowerCase();
      const matchesSearch =
        !normalizedSearch || eventTitle.includes(normalizedSearch) || hostName.includes(normalizedSearch);
      const matchesStatus = normalizedStatus === "all" || statusValue === normalizedStatus;
      return matchesSearch && matchesStatus;
    });
  }, [receivedSearch, receivedStatusFilter, sortedReceivedInvitations]);
  const receivedTotalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredReceivedInvitations.length / Math.max(1, receivedPageSize))),
    [filteredReceivedInvitations.length, receivedPageSize]
  );
  const pagedReceivedInvitations = useMemo(() => {
    const safePage = Math.max(1, receivedPage);
    const startIndex = (safePage - 1) * Math.max(1, receivedPageSize);
    return filteredReceivedInvitations.slice(startIndex, startIndex + Math.max(1, receivedPageSize));
  }, [filteredReceivedInvitations, receivedPage, receivedPageSize]);

  useEffect(() => {
    setReceivedPage(1);
  }, [receivedSearch, receivedStatusFilter, receivedPageSize]);

  useEffect(() => {
    if (receivedPage > receivedTotalPages) {
      setReceivedPage(receivedTotalPages);
    }
  }, [receivedPage, receivedTotalPages]);

  const formatReceivedDate = (startAt, endAt) =>
    formatEventDateDisplay({
      startAt,
      endAt,
      language,
      t,
      interpolate: interpolateText
    }).fullLabel;

  const interpolateText = (template, values = {}) =>
    String(template || "").replace(/\{(\w+)\}/g, (_, key) =>
      Object.prototype.hasOwnProperty.call(values, key) ? String(values[key] ?? "") : `{${key}}`
    );

  const handleShareInvitationImage = async ({
    invitation,
    eventName,
    guestName,
    eventItem
  }) => {
    const invitationId = String(invitation?.id || "").trim();
    const publicToken = String(invitation?.public_token || "").trim();
    const shareNode = invitationId ? shareCardRefs.current[invitationId] : null;
    const personalUrl = publicToken ? buildAppUrl(`/rsvp/${encodeURIComponent(publicToken)}`) : "";
    if (!shareNode) {
      setShareImageMessage(t("event_share_card_error"));
      return;
    }
    if (!personalUrl) {
      setShareImageMessage(t("event_share_card_missing_rsvp"));
      return;
    }
    setIsSharingInvitationId(invitationId);
    setShareImageMessage("");
    try {
      const blob = await toBlob(shareNode, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#0b1220",
        skipFonts: true,
        preferredFontFormat: "woff2",
        fetchRequestInit: { mode: "cors", credentials: "omit" },
        filter: (node) => {
          if (node && typeof node === "object" && "tagName" in node) {
            const tagName = String(node.tagName || "").toUpperCase();
            if (tagName === "LINK") {
              return false;
            }
          }
          return true;
        }
      });
      if (!blob) {
        throw new Error("empty_blob");
      }

      const filenameBase = String(eventName || "event")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-_]/g, "");
      const fileName = `${filenameBase || "event"}-${String(guestName || "guest")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-_]/g, "") || "guest"}-invitation.png`;

      const shareFile = new File([blob], fileName, { type: "image/png" });
      const shareTitle = interpolateText(t("event_share_card_share_title"), {
        event: eventName || t("field_event")
      });
      const invLocationName = String(eventItem?.location_name || "").trim();
      const invLocationAddress = String(eventItem?.location_address || "").trim();
      const invLocation = invLocationAddress && invLocationName && invLocationAddress !== invLocationName
        ? `${invLocationName} (${invLocationAddress})`
        : invLocationName || invLocationAddress;
      const invDate = eventItem?.start_at ? formatDate(eventItem.start_at, language, "") : "";
      const shareText = interpolateText(t("invitation_share_card_personal_message"), {
        event: eventName || t("field_event"),
        date: `${String.fromCodePoint(0x1F4C5)} ${invDate}`,
        location: `${String.fromCodePoint(0x1F4CD)} ${invLocation}`,
        url: personalUrl
      });

      const canShareFiles =
        typeof navigator !== "undefined" &&
        typeof navigator.share === "function" &&
        (typeof navigator.canShare !== "function" || navigator.canShare({ files: [shareFile] }));

      if (canShareFiles) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          files: [shareFile]
        });
        setShareImageMessage(t("event_share_card_shared_ok"));
        return;
      }

      try {
        await navigator.clipboard.writeText(shareText);
      } catch {
        // noop: en fallback priorizamos descarga aunque no se pueda copiar texto.
      }

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      setShareImageMessage(t("event_share_card_downloaded_ok"));
    } catch (error) {
      if (String(error?.name || "").toLowerCase() === "aborterror") {
        setShareImageMessage("");
      } else {
        setShareImageMessage(t("event_share_card_error"));
      }
    } finally {
      setIsSharingInvitationId("");
    }
  };

  return (
    <section className="relative w-full rounded-[2.5rem] border border-black/10 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden group bg-gray-50 dark:bg-gray-900">
      <div className="absolute top-0 left-0 w-full h-64 overflow-hidden pointer-events-none opacity-40 dark:opacity-30 mix-blend-multiply dark:mix-blend-screen transition-opacity duration-700">
        <div
          className="absolute -top-10 -left-10 w-64 h-64 rounded-full bg-gradient-to-tr from-blue-400 to-purple-400 blur-3xl animate-spin"
          style={{ animationDuration: "15s" }}
        />
        <div
          className="absolute top-20 right-10 w-48 h-48 rounded-full bg-gradient-to-tr from-orange-300 to-pink-400 blur-3xl animate-spin"
          style={{ animationDuration: "20s", animationDirection: "reverse" }}
        />
      </div>
      <div className="absolute inset-0 backdrop-blur-[60px] bg-white/60 dark:bg-black/40 z-0" />

      <div className="relative z-10 flex flex-col w-full h-full">
        <div className="px-5 pt-5 pb-3 border-b border-black/5 dark:border-white/10 bg-white/20 dark:bg-black/10">
          <div className="inline-flex items-center p-1 rounded-xl border border-black/10 dark:border-white/10 bg-white/50 dark:bg-black/30 backdrop-blur-md gap-1">
            <button
              type="button"
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${
                invitationTab === "sent"
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10"
              }`}
              onClick={() => setInvitationTab("sent")}
            >
              {t("invitations_tab_sent")}
            </button>
            <button
              type="button"
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${
                invitationTab === "received"
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10"
              }`}
              onClick={() => setInvitationTab("received")}
            >
              {t("invitations_tab_received")}
            </button>
          </div>
        </div>

        {invitationTab === "sent" ? (
          <>
            <div className="flex flex-col md:flex-row gap-4 p-5 md:items-end justify-between border-b border-black/5 dark:border-white/10 bg-white/20 dark:bg-black/10">
              <div className="flex flex-col md:flex-row gap-4 flex-1">
                <label className="flex flex-col flex-1 max-w-sm">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                    {t("search")}
                  </span>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <Icon name="search" className="w-4 h-4" />
                    </span>
                    <input
                      type="search"
                      value={invitationSearch}
                      onChange={(event) => setInvitationSearch(event.target.value)}
                      placeholder={t("search_invitations_placeholder")}
                      className="w-full bg-white/5 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>
                </label>

                <label className="flex flex-col flex-1 max-w-sm">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                    {t("field_event")}
                  </span>
                  <select
                    value={invitationEventFilter}
                    onChange={(event) => setInvitationEventFilter(event.target.value)}
                    className="w-full bg-white/5 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none cursor-pointer"
                  >
                    <option value="all">{t("all_events")}</option>
                    {invitationEventOptions.map((eventOption) => (
                      <option key={`invitation-filter-event-${eventOption.id}`} value={eventOption.id}>
                        {eventOption.title}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="flex flex-wrap gap-3 items-end">
                <label className="flex flex-col">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                    {t("sort_by")}
                  </span>
                  <select
                    value={invitationSort}
                    onChange={(event) => setInvitationSort(event.target.value)}
                    className="w-full bg-white/5 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none cursor-pointer"
                  >
                    <option value="created_desc">{t("sort_created_desc")}</option>
                    <option value="created_asc">{t("sort_created_asc")}</option>
                    <option value="responded_desc">{t("sort_responded_desc")}</option>
                    <option value="responded_asc">{t("sort_responded_asc")}</option>
                  </select>
                </label>
                <label className="flex flex-col">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                    {t("pagination_items_per_page")}
                  </span>
                  <select
                    value={invitationPageSize}
                    onChange={(event) =>
                      setInvitationPageSize(Number(event.target.value) || INVITATIONS_PAGE_SIZE_DEFAULT)
                    }
                    className="w-full bg-white/5 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none cursor-pointer"
                  >
                    {PAGE_SIZE_OPTIONS.map((optionValue) => (
                      <option key={optionValue} value={optionValue}>
                        {optionValue}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="flex flex-col px-5 py-4 border-b border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5 backdrop-blur-md">
              <div className="flex flex-wrap gap-2 items-center" role="group" aria-label={t("filter_status")}>
                {[
                  { key: "all", label: t("all_status") },
                  { key: "pending", label: t("status_pending") },
                  { key: "yes", label: t("status_yes") },
                  { key: "maybe", label: t("status_maybe") },
                  { key: "no", label: t("status_no") }
                ].map((statusOption) => {
                  const isActive = invitationStatusFilter === statusOption.key;
                  return (
                    <button
                      key={statusOption.key}
                      className={
                        isActive
                          ? "bg-gray-600 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                          : "text-gray-600 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                      }
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => setInvitationStatusFilter(statusOption.key)}
                    >
                      {statusOption.label}
                    </button>
                  );
                })}
              </div>

              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white mt-6 mb-4">
                {t("results_count")}: {filteredInvitations.length}
              </h3>
            </div>

            {invitationMessage || shareImageMessage ? (
              <div className="px-5 py-3 border-b border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50 rounded-xl text-sm">
                  {invitationMessage || shareImageMessage}
                </div>
              </div>
            ) : null}

            <div className="flex flex-col relative">
              {filteredInvitations.length === 0 ? (
                <div className="px-5 py-16 text-center flex flex-col items-center justify-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center mb-2">
                    <Icon name="mail" className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                  </div>
                  <p className="text-gray-500 font-medium">{t("no_invitations")}</p>
                  <div className="mt-4">
                    <button
                      className="px-5 py-2.5 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-2"
                      type="button"
                      onClick={() => openWorkspace("invitations", "create")}
                    >
                      <Icon name="plus" className="w-4 h-4" />
                      {t("quick_create_invitation")}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-full">
                  <table className="w-full text-left border-collapse block md:table table-fixed">
                    <thead className="hidden md:table-header-group">
                      <tr>
                        <th className="w-[30%] py-4 px-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-black/5 dark:border-white/10">
                          {t("field_guest")}
                        </th>
                        <th className="w-[30%] py-4 px-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-black/5 dark:border-white/10">
                          {t("field_event")}
                        </th>
                        <th className="w-[7%] py-4 px-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-black/5 dark:border-white/10">
                          {t("status")}
                        </th>
                        <th className="w-[15%] py-4 px-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-black/5 dark:border-white/10">
                          {t("created")}
                        </th>
                        <th className="w-[18%] py-4 px-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-black/5 dark:border-white/10 text-right">
                          {t("actions_label")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="block md:table-row-group divide-y-0 md:divide-y divide-black/5 dark:divide-white/5">
                      {pagedInvitations.map((invitation, index, array) => {
                        const isLastRows = index >= array.length - 3;
                        const eventName = eventNamesById[invitation.event_id] || invitation.event_id;
                        const guestName = guestNamesById[invitation.guest_id] || invitation.guest_id;
                        const guestItem = guestsById[invitation.guest_id] || null;
                        const eventItem = eventsById[invitation.event_id] || null;
                        const sharePayload = buildInvitationSharePayload(invitation);
                        const url = sharePayload?.url || buildAppUrl(`/rsvp/${encodeURIComponent(invitation.public_token)}`);
                        const itemLabel = `${eventName || t("field_event")} - ${guestName || t("field_guest")}`;
                        const invitationStatus = String(invitation.status || "pending").toLowerCase();
                        const hostName = String(hostDisplayName || t("host_default_name")).trim();
                        const eventDateDisplay = formatEventDateDisplay({
                          startAt: eventItem?.start_at,
                          endAt: eventItem?.end_at || eventItem?.event_end_at || null,
                          language,
                          t,
                          interpolate: interpolateText
                        });
                        const eventDateLabel = eventDateDisplay.fullLabel || eventDateDisplay.dateLabel || t("no_date");
                        const eventLocationLabel = String(
                          eventItem?.location_name || eventItem?.location_address || "-"
                        ).trim();
                        const mobileRsvpLabel =
                          invitationStatus === "pending"
                            ? t("invitation_mobile_rsvp_respond_now")
                            : t("invitation_mobile_rsvp_view_response");
                        const invitationActionHint =
                          invitationStatus === "pending"
                            ? t("invitation_action_hint_pending")
                            : invitationStatus === "no"
                              ? t("invitation_action_hint_declined")
                              : t("invitation_action_hint_review");

                        return (
                          <tr
                            key={invitation.id}
                            className="block md:table-row flex flex-col mb-4 md:mb-0 p-4 md:p-0 rounded-2xl md:rounded-none border border-black/10 dark:border-white/10 md:border-transparent md:border-b bg-white/40 dark:bg-white/5 md:bg-transparent shadow-sm md:shadow-none transition-colors group"
                          >
                            <td className="text-sm text-gray-900 dark:text-white align-middle block md:table-cell flex items-center justify-between py-2 md:py-3 px-0 md:px-4 border-b border-black/5 dark:border-white/5 md:border-none last:border-0">
                              <div className="flex items-center gap-3">
                                <AvatarCircle
                                  className="shrink-0 shadow-sm"
                                  label={guestName}
                                  fallback={getInitials(guestName, "IN")}
                                  imageUrl={getGuestAvatarUrl(guestItem, guestName)}
                                  size={40}
                                />
                                <div className="flex flex-col min-w-0">
                                  <button
                                    className="font-bold text-[15px] text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 truncate max-w-[200px] sm:max-w-xs text-left transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    type="button"
                                    onClick={() => openGuestDetail(invitation.guest_id)}
                                  >
                                    {guestName}
                                  </button>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px] sm:max-w-xs block">
                                    {guestItem?.email || guestItem?.phone || "—"}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="text-sm text-gray-600 dark:text-gray-400 align-middle block md:table-cell flex items-center justify-between py-2 md:py-3 px-0 md:px-4 border-b border-black/5 dark:border-white/5 md:border-none last:border-0">
                              <div className="flex flex-col justify-center">
                                <button
                                  className="font-bold text-sm text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 truncate max-w-[200px] sm:max-w-xs text-left transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 mb-0.5"
                                  type="button"
                                  onClick={() => openEventDetail(invitation.event_id)}
                                >
                                  {eventName}
                                </button>
                                <p
                                  className="text-[11px] text-gray-500 dark:text-gray-400 font-medium truncate uppercase tracking-wider"
                                  title={eventDateLabel}
                                >
                                  {eventDateDisplay.dateLabel}
                                </p>
                                {eventDateDisplay.timeLabel ? (
                                  <p
                                    className="text-[11px] text-gray-500 dark:text-gray-400 font-medium truncate"
                                    title={eventDateDisplay.timeLabel}
                                  >
                                    {eventDateDisplay.timeLabel}
                                  </p>
                                ) : null}
                              </div>
                            </td>

                            <td className="text-sm text-gray-900 dark:text-white align-middle block md:table-cell flex items-center justify-between py-2 md:py-3 px-0 md:px-4 border-b border-black/5 dark:border-white/5 md:border-none last:border-0">
                              <span className={statusClass(invitation.status)}>{statusText(t, invitation.status)}</span>
                            </td>

                            <td className="text-sm text-gray-900 dark:text-white align-middle block md:table-cell flex items-center justify-between py-2 md:py-3 px-0 md:px-4 border-b border-black/5 dark:border-white/5 md:border-none last:border-0">
                              <div className="flex flex-col justify-center gap-1">
                                <p className="text-xs text-gray-900 dark:text-white font-medium">
                                  {formatDate(invitation.created_at, language, t("no_date"))}
                                </p>
                                <p
                                  className={`text-[10px] font-bold uppercase tracking-wider break-words whitespace-normal ${
                                    invitationStatus === "pending"
                                      ? "text-yellow-600 dark:text-yellow-400"
                                      : invitationStatus === "no"
                                        ? "text-red-600 dark:text-red-400"
                                        : "text-green-600 dark:text-green-400"
                                  }`}
                                >
                                  {invitationActionHint}
                                </p>
                              </div>
                            </td>

                            <td className="align-middle block md:table-cell py-2 md:py-3 px-0 md:px-4 border-b border-black/5 dark:border-white/5 md:border-none last:border-0 relative">
                              <div className="flex items-center justify-end gap-1 w-full relative">
                                <button
                                  className="inline-flex items-center justify-center px-2 py-1.5 w-full max-w-[100px] min-h-[32px] text-xs font-bold rounded-xl border transition-all bg-green-100 text-green-800 border-green-300 hover:bg-green-200 dark:bg-green-500/20 dark:text-green-300 dark:border-green-500/40 dark:hover:bg-green-500/30 shrink-0"
                                  type="button"
                                  onClick={() => {
                                    const prepared = handlePrepareInvitationShare(invitation);
                                    if (prepared?.whatsappUrl) {
                                      window.open(prepared.whatsappUrl, "_blank", "noopener,noreferrer");
                                    }
                                  }}
                                  title={t("host_invite_whatsapp_action") || "Enviar per WhatsApp"}
                                >
                                  WhatsApp
                                </button>
                                <a
                                  className="p-2.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-white rounded-lg transition-colors flex items-center justify-center shrink-0"
                                  href={url}
                                  target="_blank"
                                  rel="noreferrer"
                                  aria-label={mobileRsvpLabel}
                                  title={mobileRsvpLabel}
                                >
                                  <Icon name="eye" className="w-5 h-5" />
                                </a>

                                <div
                                  className="relative shrink-0"
                                  onMouseEnter={() => setOpenDropdownId(invitation.id)}
                                  onMouseLeave={() => setOpenDropdownId(null)}
                                >
                                  <button
                                    className={`p-2.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                                      openDropdownId === invitation.id
                                        ? "text-gray-900 bg-gray-200 dark:bg-gray-700 dark:text-white"
                                        : "text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-white"
                                    }`}
                                    type="button"
                                    aria-label={t("open_menu")}
                                    title={t("actions_label")}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setOpenDropdownId(openDropdownId === invitation.id ? null : invitation.id);
                                    }}
                                  >
                                    <Icon name="more_horizontal" className="w-4 h-4" />
                                  </button>

                                  {openDropdownId === invitation.id ? (
                                    <>
                                      <div
                                        className="fixed inset-0 z-[90] md:hidden"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          setOpenDropdownId(null);
                                        }}
                                      />
                                      <div
                                        className={`absolute left-auto right-0 w-56 bg-white/90 dark:bg-gray-800/95 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-xl shadow-2xl z-[100] py-1 ${
                                          isLastRows ? "bottom-full pb-2 origin-bottom-right" : "top-full pt-2 origin-top-right"
                                        }`}
                                        onClick={() => setOpenDropdownId(null)}
                                      >
                                        <button
                                          className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                          type="button"
                                          onClick={() =>
                                            handleShareInvitationImage({
                                              invitation,
                                              eventName,
                                              guestName,
                                              eventItem
                                            })
                                          }
                                          disabled={isSharingInvitationId === invitation.id}
                                        >
                                          <Icon name="camera" className="w-4 h-4" />
                                          <span>
                                            {isSharingInvitationId === invitation.id
                                              ? t("event_share_card_generating")
                                              : t("event_share_card_action")}
                                          </span>
                                        </button>
                                        <button
                                          className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white text-left transition-colors"
                                          type="button"
                                          onClick={() => {
                                            const prepared = handlePrepareInvitationShare(invitation);
                                            if (prepared?.mailtoUrl) {
                                              window.open(prepared.mailtoUrl, "_blank", "noopener,noreferrer");
                                            }
                                          }}
                                        >
                                          <Icon name="mail" className="w-4 h-4" />
                                          <span>{t("invitation_open_email")}</span>
                                        </button>
                                        <button
                                          className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white text-left transition-colors"
                                          type="button"
                                          onClick={() => handleCopyInvitationLink(url)}
                                        >
                                          <Icon name="link" className="w-4 h-4" />
                                          <span>{t("copy_link")}</span>
                                        </button>
                                        <div className="h-px bg-black/5 dark:bg-white/10 my-1 mx-3" />
                                        <button
                                          className="w-full flex items-center gap-3 px-3 py-2 text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                          type="button"
                                          onClick={() => handleRequestDeleteInvitation(invitation, itemLabel)}
                                        >
                                          <Icon name="close" className="w-4 h-4" />
                                          <span>{t("delete_invitation")}</span>
                                        </button>
                                      </div>
                                    </>
                                  ) : null}
                                </div>
                              </div>

                              <div className="fixed -left-[9999px] top-0 opacity-0 pointer-events-none" aria-hidden="true">
                                <div
                                  ref={(node) => {
                                    if (node) {
                                      shareCardRefs.current[invitation.id] = node;
                                    } else {
                                      delete shareCardRefs.current[invitation.id];
                                    }
                                  }}
                                >
                                  <ShareCard
                                    eventName={eventName || t("field_event")}
                                    eventDate={eventDateLabel}
                                    eventLocation={eventLocationLabel}
                                    eventLocationAddress={eventItem?.location_address || ""}
                                    hostName={hostName}
                                    hostAvatarUrl={hostAvatarUrl}
                                    appName={t("app_name")}
                                    subtitle={t("event_share_card_subtitle")}
                                    footerMessage={t("event_share_card_footer_message")}
                                    dateLabel={t("date")}
                                    locationLabel={t("field_place")}
                                    hostLabel={t("event_share_card_host_label")}
                                  />
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {filteredInvitations.length > 0 ? (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 border-t border-black/5 dark:border-white/10 bg-white/30 dark:bg-black/10 backdrop-blur-md">
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                  {t("pagination_page")}{" "}
                  <span className="font-bold text-gray-900 dark:text-white">{invitationPage}</span> /{" "}
                  <span className="font-bold text-gray-900 dark:text-white">{invitationTotalPages}</span>
                </p>
                <div className="flex items-center gap-2">
                  <button
                    className="px-4 py-2 text-sm font-bold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-black/10 dark:border-white/10 rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    type="button"
                    onClick={() => setInvitationPage((prev) => Math.max(1, prev - 1))}
                    disabled={invitationPage <= 1}
                  >
                    {t("pagination_prev")}
                  </button>
                  <button
                    className="px-4 py-2 text-sm font-bold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-black/10 dark:border-white/10 rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    type="button"
                    onClick={() => setInvitationPage((prev) => Math.min(invitationTotalPages, prev + 1))}
                    disabled={invitationPage >= invitationTotalPages}
                  >
                    {t("pagination_next")}
                  </button>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <div className="flex flex-col relative">
            <div className="flex flex-col md:flex-row gap-4 p-5 md:items-end justify-between border-b border-black/5 dark:border-white/10 bg-white/20 dark:bg-black/10">
              <div className="flex flex-col md:flex-row gap-4 flex-1">
                <label className="flex flex-col flex-1 max-w-sm">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                    {t("search")}
                  </span>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <Icon name="search" className="w-4 h-4" />
                    </span>
                    <input
                      type="search"
                      value={receivedSearch}
                      onChange={(event) => setReceivedSearch(event.target.value)}
                      placeholder={t("search_invitations_placeholder")}
                      className="w-full bg-white/5 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>
                </label>
              </div>

              <div className="flex flex-wrap gap-3 items-end">
                <label className="flex flex-col">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                    {t("pagination_items_per_page")}
                  </span>
                  <select
                    value={receivedPageSize}
                    onChange={(event) =>
                      setReceivedPageSize(Number(event.target.value) || INVITATIONS_PAGE_SIZE_DEFAULT)
                    }
                    className="w-full bg-white/5 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none cursor-pointer"
                  >
                    {PAGE_SIZE_OPTIONS.map((optionValue) => (
                      <option key={`received-page-size-${optionValue}`} value={optionValue}>
                        {optionValue}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="flex flex-col px-5 py-4 border-b border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5 backdrop-blur-md">
              <div className="flex flex-wrap gap-2 items-center" role="group" aria-label={t("filter_status")}>
                {[
                  { key: "all", label: t("all_status") },
                  { key: "pending", label: t("status_pending") },
                  { key: "yes", label: t("status_yes") },
                  { key: "maybe", label: t("status_maybe") },
                  { key: "no", label: t("status_no") }
                ].map((statusOption) => {
                  const isActive = receivedStatusFilter === statusOption.key;
                  return (
                    <button
                      key={`received-status-${statusOption.key}`}
                      className={
                        isActive
                          ? "bg-gray-600 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                          : "text-gray-600 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                      }
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => setReceivedStatusFilter(statusOption.key)}
                    >
                      {statusOption.label}
                    </button>
                  );
                })}
              </div>

              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white mt-6 mb-4">
                {t("results_count")}: {filteredReceivedInvitations.length}
              </h3>
            </div>

            {filteredReceivedInvitations.length === 0 ? (
              <div className="px-5 py-16 text-center flex flex-col items-center justify-center gap-2">
                <div className="w-12 h-12 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center mb-2">
                  <Icon name="mail" className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-gray-500 font-medium">{t("invitations_received_empty")}</p>
              </div>
            ) : (
              <div className="w-full p-4 md:p-0">
                <table className="w-full text-left border-collapse block md:table table-fixed">
                  <thead className="hidden md:table-header-group">
                    <tr>
                      <th className="w-[44%] py-4 px-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-black/5 dark:border-white/10">
                        {t("invitations_received_col_event")}
                      </th>
                      <th className="w-[22%] py-4 px-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-black/5 dark:border-white/10">
                        {t("invitations_received_col_host")}
                      </th>
                      <th className="w-[14%] py-4 px-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-black/5 dark:border-white/10">
                        {t("invitations_received_col_status")}
                      </th>
                      <th className="w-[20%] py-4 px-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-black/5 dark:border-white/10 text-right">
                        {t("invitations_received_col_actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="block md:table-row-group divide-y-0 md:divide-y divide-black/5 dark:divide-white/5">
                    {pagedReceivedInvitations.map((invitationItem) => {
                      const eventTitle = invitationItem?.event_title || t("field_event");
                      const hostName = invitationItem?.host_full_name || t("host_default_name");
                      const statusValue = invitationItem?.invitation_status || "pending";
                      const eventDateLabel = formatReceivedDate(
                        invitationItem?.event_start_at || invitationItem?.invitation_created_at,
                        invitationItem?.event_end_at || invitationItem?.end_at || null
                      );
                      const publicToken = String(
                        invitationItem?.invitation_public_token ||
                          invitationItem?.public_token ||
                          invitationItem?.rsvp_public_token ||
                          ""
                      ).trim();
                      return (
                        <tr
                          key={`received-${invitationItem?.invitation_id || publicToken || eventTitle}`}
                          className="block md:table-row flex flex-col mb-4 md:mb-0 p-4 md:p-0 rounded-2xl md:rounded-none border border-black/10 dark:border-white/10 md:border-transparent md:border-b bg-white/40 dark:bg-white/5 md:bg-transparent shadow-sm md:shadow-none transition-colors"
                        >
                          <td className="text-sm text-gray-900 dark:text-white align-middle block md:table-cell py-2 md:py-3 px-0 md:px-4 border-b border-black/5 dark:border-white/5 md:border-none">
                            <div className="flex flex-col gap-1">
                              <p className="font-bold text-[15px] text-gray-900 dark:text-white">{eventTitle}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{eventDateLabel}</p>
                            </div>
                          </td>
                          <td className="text-sm text-gray-900 dark:text-white align-middle block md:table-cell py-2 md:py-3 px-0 md:px-4 border-b border-black/5 dark:border-white/5 md:border-none">
                            <p className="font-medium text-gray-900 dark:text-white">{hostName}</p>
                          </td>
                          <td className="text-sm text-gray-900 dark:text-white align-middle block md:table-cell py-2 md:py-3 px-0 md:px-4 border-b border-black/5 dark:border-white/5 md:border-none">
                            <span className={statusClass(statusValue)}>{statusText(t, statusValue)}</span>
                          </td>
                          <td className="align-middle block md:table-cell py-2 md:py-3 px-0 md:px-4">
                            <div className="flex justify-end">
                              <button
                                type="button"
                                className="inline-flex items-center justify-center px-3 py-2 text-xs font-bold rounded-xl border transition-all bg-blue-600 text-white border-blue-700 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={!publicToken}
                                onClick={() => openReceivedInvitationRsvp?.(publicToken)}
                              >
                                {t("invitations_received_action_respond")}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {filteredReceivedInvitations.length > 0 ? (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 border-t border-black/5 dark:border-white/10 bg-white/30 dark:bg-black/10 backdrop-blur-md">
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                  {t("pagination_page")}{" "}
                  <span className="font-bold text-gray-900 dark:text-white">{receivedPage}</span> /{" "}
                  <span className="font-bold text-gray-900 dark:text-white">{receivedTotalPages}</span>
                </p>
                <div className="flex items-center gap-2">
                  <button
                    className="px-4 py-2 text-sm font-bold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-black/10 dark:border-white/10 rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    type="button"
                    onClick={() => setReceivedPage((prev) => Math.max(1, prev - 1))}
                    disabled={receivedPage <= 1}
                  >
                    {t("pagination_prev")}
                  </button>
                  <button
                    className="px-4 py-2 text-sm font-bold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-black/10 dark:border-white/10 rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    type="button"
                    onClick={() => setReceivedPage((prev) => Math.min(receivedTotalPages, prev + 1))}
                    disabled={receivedPage >= receivedTotalPages}
                  >
                    {t("pagination_next")}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
