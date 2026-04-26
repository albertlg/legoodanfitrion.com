import React from "react";

function topEntries(obj, n = 3) {
  return Object.entries(obj)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

export function PlanGuestSignalsBlock({
  t,
  interpolateText,
  selectedEventDetailGuests = [],
  activeMods = {}
}) {
  const confirmed = selectedEventDetailGuests.filter(
    (g) => g.invitation?.rsvp_status === "yes"
  );

  const interestCounts = {};
  confirmed.forEach((g) => {
    const interests = g.invitation?.rsvp_interests;
    if (Array.isArray(interests)) {
      interests.forEach((i) => {
        const v = String(i || "").trim();
        if (v) interestCounts[v] = (interestCounts[v] || 0) + 1;
      });
    }
  });
  const topInterests = topEntries(interestCounts, 3);

  const groupCounts = {};
  confirmed.forEach((g) => {
    const tag = String(g.invitation?.rsvp_group_tag || "").trim();
    if (tag) groupCounts[tag] = (groupCounts[tag] || 0) + 1;
  });
  const topGroups = topEntries(groupCounts, 3);

  const accommodationCount = activeMods.accommodation
    ? confirmed.filter((g) => g.invitation?.rsvp_needs_accommodation === true).length
    : 0;

  const transportModes = {};
  if (activeMods.transport) {
    confirmed.forEach((g) => {
      const mode = String(g.invitation?.rsvp_transport_mode || "").trim();
      if (mode) transportModes[mode] = (transportModes[mode] || 0) + 1;
    });
  }
  const topTransport = topEntries(transportModes, 3);

  const hasSignals =
    topInterests.length > 0 ||
    topGroups.length > 0 ||
    accommodationCount > 0 ||
    topTransport.length > 0;

  if (!hasSignals) {
    return (
      <div className="bg-white/40 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 p-5 shadow-sm flex flex-col gap-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {t("plan_overview_signals_title")}
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500 italic">{t("plan_overview_no_signals")}</p>
      </div>
    );
  }

  return (
    <div className="bg-white/40 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 p-5 shadow-sm flex flex-col gap-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {t("plan_overview_signals_title")}
      </p>
      <div className="flex flex-wrap gap-5">

        {topInterests.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
              {t("plan_overview_interests_top")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {topInterests.map(([interest, count]) => (
                <span key={interest} className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full text-[10px] font-bold">
                  {interest}
                  <span className="px-1 bg-purple-200 dark:bg-purple-700/50 rounded-full">{count}</span>
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {topGroups.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              {t("plan_overview_groups_present")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {topGroups.map(([group, count]) => (
                <span key={group} className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 rounded-full text-[10px] font-bold">
                  {group}
                  <span className="px-1 bg-indigo-200 dark:bg-indigo-700/50 rounded-full">{count}</span>
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {accommodationCount > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">
              🏠 {interpolateText(t("plan_overview_accommodation_needed"), { count: accommodationCount })}
            </p>
          </div>
        ) : null}

        {topTransport.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              🚗 {t("rsvp_transport_label")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {topTransport.map(([mode, count]) => (
                <span key={mode} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-[10px] font-bold">
                  {t(`rsvp_transport_mode_${mode}`)}
                  <span className="px-1 bg-blue-200 dark:bg-blue-700/50 rounded-full">{count}</span>
                </span>
              ))}
            </div>
          </div>
        ) : null}

      </div>
    </div>
  );
}
