import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Icon } from "../../../components/icons";
import { AvatarCircle } from "../../../components/avatar-circle";
import { InlineMessage } from "../../../components/inline-message";
import { supabase } from "../../../lib/supabaseClient";

const PROFILE_TABS = [
  { key: "account", icon: "user", labelKey: "profile_tab_account_security" },
  { key: "preferences", icon: "settings", labelKey: "profile_tab_preferences" },
  { key: "identity", icon: "sparkle", labelKey: "profile_tab_identity" },
  { key: "privacy", icon: "shield", labelKey: "profile_tab_privacy" }
];

const TABLE_ROW_OPTIONS = [5, 10, 20];
const SUPPORTED_LOCALES = ["es", "ca", "en", "fr", "it"];
const HOUR_FORMAT_OPTIONS = ["24h", "12h"];

function normalizeTheme(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (["light", "dark", "system"].includes(normalized)) {
    return normalized;
  }
  return "system";
}

function normalizeLocale(value, fallback = "es") {
  const normalized = String(value || "").trim().toLowerCase();
  if (SUPPORTED_LOCALES.includes(normalized)) {
    return normalized;
  }
  return fallback;
}

function normalizeTableRows(value, fallback = 10) {
  const numeric = Number(value || 0);
  if (TABLE_ROW_OPTIONS.includes(numeric)) {
    return numeric;
  }
  return fallback;
}

function normalizeHourFormat(value, fallback = "24h") {
  const normalized = String(value || "").trim().toLowerCase();
  if (HOUR_FORMAT_OPTIONS.includes(normalized)) {
    return normalized;
  }
  return fallback;
}

function normalizeProfileTab(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return PROFILE_TABS.some((tab) => tab.key === normalized) ? normalized : "account";
}

function resolveSignalLabel(signalItem, t) {
  const rawLabel = String(signalItem?.label || "").trim();
  if (!rawLabel) {
    return t("field_guest");
  }
  if (rawLabel.startsWith("field_") || rawLabel.startsWith("hint_") || rawLabel.startsWith("profile_")) {
    const translated = t(rawLabel);
    if (translated && translated !== rawLabel) {
      return translated;
    }
    // Fallback defensivo para evitar mostrar claves técnicas en UI
    return rawLabel
      .replace(/^(field_|hint_|profile_)/, "")
      .replaceAll("_", " ")
      .trim();
  }
  return rawLabel;
}

function ProfileTabButton({ isActive, icon, label, onClick }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 border ${
        isActive
          ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white shadow-sm"
          : "bg-white/60 dark:bg-white/10 text-gray-600 dark:text-gray-300 border-black/10 dark:border-white/15 hover:bg-white dark:hover:bg-white/20"
      }`}
    >
      <Icon name={icon} className="h-4 w-4" />
      <span>{label}</span>
    </button>
  );
}

function ProfileCard({ title, hint, icon, children }) {
  return (
    <article className="rounded-3xl border border-black/10 bg-white/70 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-gray-900/60 md:p-6">
      {(title || hint) && (
        <header className="mb-4 border-b border-black/5 pb-3 dark:border-white/10">
          {title ? (
            <h3 className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white">
              {icon ? <Icon name={icon} className="h-4 w-4 text-blue-500" /> : null}
              {title}
            </h3>
          ) : null}
          {hint ? <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</p> : null}
        </header>
      )}
      {children}
    </article>
  );
}

export function HostProfileView({
  interpolateText,
  formatRelativeDate,
  normalizeLookupValue,
  t,
  language,
  setLanguage,
  themeMode,
  setThemeMode,
  session,
  isProfileGuestLinked,
  hostGuestProfilePercent,
  hostGuestProfileCompletedCount,
  hostGuestProfileTotalCount,
  hostGuestProfileSignals,
  profileLinkedGuestId,
  openGuestAdvancedEditor,
  syncHostGuestProfileForm,
  isGlobalProfileClaimed,
  isGlobalProfileFeatureReady,
  handleClaimGlobalProfile,
  isClaimingGlobalProfile,
  handleLinkProfileGuestToGlobal,
  isLinkingGlobalGuest,
  handleLinkAllGuestsToGlobalProfiles,
  isLinkingAllGlobalGuests,
  globalShareTargetsVisible,
  handleApplyGlobalShareAction,
  isPausingGlobalShares,
  isRevokingGlobalShares,
  globalShareDraftByHostId,
  inferGlobalSharePreset,
  handleApplyGlobalSharePreset,
  handleChangeGlobalShareDraft,
  previewGlobalShareHostId,
  setPreviewGlobalShareHostId,
  handleRequestSaveGlobalShare,
  savingGlobalShareHostId,
  globalShareHistoryItems,
  isLoadingGlobalShareHistory,
  formatGlobalShareEventType,
  globalProfileMessage,
  isIntegrationDebugEnabled,
  integrationChecksTotal,
  integrationChecksOkCount,
  isIntegrationPanelOpen,
  setIsIntegrationPanelOpen,
  loadIntegrationStatusData,
  isLoadingIntegrationStatus,
  integrationStatus,
  integrationChecks,
  integrationStatusMessage,
  handleSaveHostProfile,
  hostProfileName,
  setHostProfileName,
  hostProfilePhone,
  setHostProfilePhone,
  hostProfileBizumAlias,
  setHostProfileBizumAlias,
  hostProfileCity,
  setHostProfileCity,
  hostProfileCountry,
  setHostProfileCountry,
  hostProfileRelationship,
  setHostProfileRelationship,
  relationshipOptions,
  cityOptions,
  countryOptions,
  isSavingHostProfile,
  hostProfileMessage,
  handleSaveGuest,
  guestFirstName,
  setGuestFirstName,
  guestErrors,
  guestLastName,
  setGuestLastName,
  guestPhotoUrl,
  guestPhotoInputValue,
  handleGuestPhotoUrlChange,
  handleGuestPhotoFileChange,
  handleRemoveGuestPhoto,
  guestEmail,
  guestPhone,
  setGuestPhone,
  guestRelationship,
  setGuestRelationship,
  guestCity,
  setGuestCity,
  guestCountry,
  setGuestCountry,
  guestAdvanced,
  setGuestAdvancedField,
  selectedGuestAddressPlace,
  setSelectedGuestAddressPlace,
  mapsStatus,
  isGuestAddressLoading,
  guestAddressPredictions,
  handleSelectGuestAddressPrediction,
  isSavingGuest,
  isEditingGuest,
  guestMessage,
  openGuestDetail,
  eventPageSize,
  guestPageSize,
  invitationPageSize,
  setEventPageSize,
  setGuestPageSize,
  setInvitationPageSize,
  isDemoMode
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTabFromUrl = useMemo(() => normalizeProfileTab(searchParams.get("tab")), [searchParams]);
  const [activeTab, setActiveTab] = useState(initialTabFromUrl);
  const photoInputRef = useRef(null);

  const [prefsForm, setPrefsForm] = useState(() => ({
    theme: normalizeTheme(themeMode),
    locale: normalizeLocale(language, "es"),
    tableRows: normalizeTableRows(guestPageSize || eventPageSize || invitationPageSize || 10),
    hourFormat: normalizeHourFormat(session?.user?.user_metadata?.preferences?.hourFormat, "24h")
  }));
  const [prefsMessage, setPrefsMessage] = useState("");
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [accountMessage, setAccountMessage] = useState("");
  const [passwordForm, setPasswordForm] = useState({ nextPassword: "", confirmPassword: "" });
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isDangerModalOpen, setIsDangerModalOpen] = useState(false);
  const [dangerMessage, setDangerMessage] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const hostDisplayName = String(hostProfileName || "").trim() || t("host_default_name");

  const selectedRowsValue = useMemo(
    () => normalizeTableRows(prefsForm.tableRows, normalizeTableRows(guestPageSize || 10)),
    [prefsForm.tableRows, guestPageSize]
  );

  useEffect(() => {
    if (activeTab !== initialTabFromUrl) {
      setActiveTab(initialTabFromUrl);
    }
  }, [activeTab, initialTabFromUrl]);

  const handleTabChange = (tabKey) => {
    const safeTab = normalizeProfileTab(tabKey);
    setActiveTab(safeTab);
    const nextParams = new URLSearchParams(searchParams);
    if (safeTab === "account") {
      nextParams.delete("tab");
    } else {
      nextParams.set("tab", safeTab);
    }
    setSearchParams(nextParams, { replace: true });
  };

  useEffect(() => {
    const metadataPreferences = session?.user?.user_metadata?.preferences || {};
    const nextPreferences = {
      theme: normalizeTheme(metadataPreferences.theme || themeMode),
      locale: normalizeLocale(metadataPreferences.locale || language, language),
      tableRows: normalizeTableRows(metadataPreferences.tableRows, 10),
      hourFormat: normalizeHourFormat(metadataPreferences.hourFormat, "24h")
    };
    setPrefsForm(nextPreferences);
    setEventPageSize(nextPreferences.tableRows);
    setGuestPageSize(nextPreferences.tableRows);
    setInvitationPageSize(nextPreferences.tableRows);
  }, [
    session?.user?.user_metadata?.preferences,
    language,
    setEventPageSize,
    setGuestPageSize,
    setInvitationPageSize,
    themeMode
  ]);

  const handleSavePreferences = async (event) => {
    event.preventDefault();
    if (!session?.user?.id || !supabase) {
      return;
    }

    const normalizedPrefs = {
      theme: normalizeTheme(prefsForm.theme),
      locale: normalizeLocale(prefsForm.locale, "es"),
      tableRows: normalizeTableRows(prefsForm.tableRows, 10),
      hourFormat: normalizeHourFormat(prefsForm.hourFormat, "24h")
    };

    setPrefsMessage("");
    setIsSavingPrefs(true);

    setThemeMode(normalizedPrefs.theme);
    setLanguage(normalizedPrefs.locale);
    setEventPageSize(normalizedPrefs.tableRows);
    setGuestPageSize(normalizedPrefs.tableRows);
    setInvitationPageSize(normalizedPrefs.tableRows);

    const existingMetadata =
      session?.user?.user_metadata && typeof session.user.user_metadata === "object"
        ? session.user.user_metadata
        : {};
    const saveResult = await supabase.auth.updateUser({
      data: {
        ...existingMetadata,
        preferences: normalizedPrefs
      }
    });

    setIsSavingPrefs(false);

    if (saveResult?.error) {
      setPrefsMessage(`${t("profile_preferences_save_error")} ${saveResult.error.message}`);
      return;
    }

    setPrefsMessage(t("profile_preferences_saved"));
  };

  const handleUpdatePassword = async (event) => {
    event.preventDefault();
    if (!supabase || !session?.user?.id || isDemoMode) {
      return;
    }
    setAccountMessage("");
    const nextPassword = String(passwordForm.nextPassword || "");
    const confirmPassword = String(passwordForm.confirmPassword || "");
    if (nextPassword.length < 6) {
      setAccountMessage(t("profile_account_password_short_error"));
      return;
    }
    if (nextPassword !== confirmPassword) {
      setAccountMessage(t("profile_account_password_mismatch_error"));
      return;
    }
    setIsSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: nextPassword });
    setIsSavingPassword(false);
    if (error) {
      setAccountMessage(`${t("profile_account_password_update_error")} ${error.message}`);
      return;
    }
    setPasswordForm({ nextPassword: "", confirmPassword: "" });
    setAccountMessage(t("profile_account_password_updated"));
  };

  const handleDangerAction = async () => {
    if (!supabase || !session?.user?.id || isDeletingAccount || isDemoMode) {
      return;
    }
    setDangerMessage("");
    setIsDeletingAccount(true);

    const deleteResult = await supabase.rpc("delete_user_account");
    if (deleteResult?.error) {
      setIsDeletingAccount(false);
      setDangerMessage(`${t("profile_account_delete_error")} ${deleteResult.error.message}`);
      return;
    }

    const signOutResult = await supabase.auth.signOut();
    setIsDeletingAccount(false);
    setIsDangerModalOpen(false);
    if (signOutResult?.error) {
      setDangerMessage(`${t("profile_account_delete_signout_error")} ${signOutResult.error.message}`);
    }
    window.location.assign("/");
  };

  return (
    <section className="mx-auto mt-6 flex w-full max-w-6xl flex-col gap-6 p-4 pb-20 md:p-0">
      <header className="rounded-[2.25rem] border border-black/10 bg-white/70 p-6 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-gray-900/55 md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center">
          <div className="relative mx-auto md:mx-0">
            <AvatarCircle
              className="h-24 w-24 rounded-full ring-4 ring-white/70 shadow-2xl dark:ring-black/20 md:h-28 md:w-28"
              label={hostDisplayName}
              imageUrl={guestPhotoUrl}
              size={112}
            />
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 rounded-full bg-blue-600 p-2 text-white shadow-lg transition-transform hover:scale-105"
              title={t("guest_photo_upload")}
            >
              <Icon name="edit" className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 text-center md:text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600/80 dark:text-blue-300/80">
              {t("host_profile_title")}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white md:text-3xl">{hostDisplayName}</h1>
            <p className="mt-1 inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Icon name="mail" className="h-4 w-4" />
              {session?.user?.email || ""}
            </p>
            <p className="mt-3 max-w-3xl text-sm text-gray-600 dark:text-gray-300">{t("profile_control_center_hint")}</p>
          </div>

          <div className="self-start md:self-center">
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                isGlobalProfileClaimed
                  ? "border-green-300 bg-green-100 text-green-700 dark:border-green-500/40 dark:bg-green-500/20 dark:text-green-300"
                  : "border-gray-200 bg-gray-100 text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-400"
              }`}
            >
              {isGlobalProfileClaimed ? t("global_profile_status_claimed") : t("global_profile_status_not_claimed")}
            </span>
          </div>
        </div>
      </header>

      <nav className="rounded-3xl border border-black/10 bg-white/70 p-3 backdrop-blur-xl dark:border-white/10 dark:bg-gray-900/50">
        <div className="relative">
          <div
            className="flex flex-row gap-2 overflow-x-auto scrollbar-hide pb-1 pr-8"
            role="tablist"
            aria-label={t("host_profile_title")}
          >
            {PROFILE_TABS.map((tab) => (
              <ProfileTabButton
                key={tab.key}
                icon={tab.icon}
                label={t(tab.labelKey)}
                isActive={activeTab === tab.key}
                onClick={() => handleTabChange(tab.key)}
              />
            ))}
          </div>
          {/* Scroll affordance */}
          <div className="pointer-events-none absolute inset-y-0 right-0 w-12 z-10 bg-gradient-to-l from-white/70 dark:from-gray-900/50 to-transparent" aria-hidden="true" />
        </div>
      </nav>

      {activeTab === "account" ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_1fr]">
          <div className="flex flex-col gap-6">
            <ProfileCard title={t("profile_account_security_title")} hint={t("profile_account_security_hint")} icon="user">
              <form className="flex flex-col gap-4" onSubmit={handleSaveHostProfile}>
                {/* Personal info card */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden shadow-sm">
                  <label className="flex flex-col gap-1 px-4 py-3.5 border-b border-black/5 dark:border-white/5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">{t("field_full_name")}</span>
                    <input
                      className="bg-transparent outline-none text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 w-full"
                      type="text"
                      value={hostProfileName}
                      onChange={(event) => setHostProfileName(event.target.value)}
                    />
                  </label>
                  <label className="flex flex-col gap-1 px-4 py-3.5 border-b border-black/5 dark:border-white/5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">{t("email")}</span>
                    <input
                      className="bg-transparent outline-none text-sm text-gray-500 dark:text-gray-400 w-full cursor-not-allowed"
                      type="email"
                      value={session?.user?.email || ""}
                      readOnly
                    />
                  </label>
                  <label className="flex flex-col gap-1 px-4 py-3.5 border-b border-black/5 dark:border-white/5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">{t("field_phone")}</span>
                    <input
                      className="bg-transparent outline-none text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 w-full"
                      type="tel"
                      value={hostProfilePhone}
                      onChange={(event) => setHostProfilePhone(event.target.value)}
                    />
                  </label>
                  <label className="flex flex-col gap-1 px-4 py-3.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">{t("profile_account_bizum_alias_label")}</span>
                    <input
                      className="bg-transparent outline-none text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 w-full"
                      type="text"
                      value={hostProfileBizumAlias}
                      onChange={(event) => setHostProfileBizumAlias(event.target.value)}
                      placeholder={t("profile_account_bizum_alias_placeholder")}
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t("profile_account_bizum_alias_hint")}</span>
                  </label>
                </div>

                {/* Location card */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden shadow-sm">
                  <label className="flex flex-col gap-1 px-4 py-3.5 border-b border-black/5 dark:border-white/5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">{t("field_relationship")}</span>
                    <select
                      className="bg-transparent outline-none text-sm text-gray-900 dark:text-white w-full cursor-pointer"
                      value={hostProfileRelationship}
                      onChange={(event) => setHostProfileRelationship(event.target.value)}
                    >
                      <option value="">{t("select_option_prompt")}</option>
                      {relationshipOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 px-4 py-3.5 border-b border-black/5 dark:border-white/5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">{t("field_city")}</span>
                    <input
                      className="bg-transparent outline-none text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 w-full"
                      type="text"
                      value={hostProfileCity}
                      onChange={(event) => setHostProfileCity(event.target.value)}
                      list="host-city-options"
                    />
                  </label>
                  <label className="flex flex-col gap-1 px-4 py-3.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">{t("field_country")}</span>
                    <input
                      className="bg-transparent outline-none text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 w-full"
                      type="text"
                      value={hostProfileCountry}
                      onChange={(event) => setHostProfileCountry(event.target.value)}
                      list="host-country-options"
                    />
                  </label>
                </div>

                <InlineMessage text={hostProfileMessage} />

                <div className="sticky bottom-16 z-50 md:static md:z-auto md:mt-0 -mx-4 md:mx-0 px-4 md:px-0 py-3 md:py-0 md:pt-2 bg-white/90 dark:bg-gray-900/90 md:bg-transparent md:dark:bg-transparent backdrop-blur-xl md:backdrop-blur-none border-t border-black/10 dark:border-white/10 md:border-0 shadow-[0_-4px_20px_rgba(0,0,0,0.07)] md:shadow-none">
                  <button
                    type="submit"
                    disabled={isSavingHostProfile}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-2xl shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98] disabled:opacity-50 text-sm"
                  >
                    {isSavingHostProfile ? t("host_profile_saving") : t("host_profile_save")}
                  </button>
                </div>
              </form>
            </ProfileCard>

            {!isDemoMode && <ProfileCard title={t("profile_account_security_block_title")} hint={t("profile_account_security_block_hint")} icon="lock">
              <form className="flex flex-col gap-4" onSubmit={handleUpdatePassword}>
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden shadow-sm">
                  <label className="flex flex-col gap-1 px-4 py-3.5 border-b border-black/5 dark:border-white/5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">{t("profile_account_new_password_label")}</span>
                    <input
                      className="bg-transparent outline-none text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 w-full"
                      type="password"
                      value={passwordForm.nextPassword}
                      onChange={(event) =>
                        setPasswordForm((prev) => ({ ...prev, nextPassword: event.target.value }))
                      }
                      placeholder="••••••••"
                      autoComplete="new-password"
                    />
                  </label>
                  <label className="flex flex-col gap-1 px-4 py-3.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                      {t("profile_account_new_password_confirm_label")}
                    </span>
                    <input
                      className="bg-transparent outline-none text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 w-full"
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(event) =>
                        setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
                      }
                      placeholder="••••••••"
                      autoComplete="new-password"
                    />
                  </label>
                </div>

                <InlineMessage text={accountMessage} />

                <div className="sticky bottom-16 z-50 md:static md:z-auto md:mt-0 -mx-4 md:mx-0 px-4 md:px-0 py-3 md:py-0 md:pt-2 bg-white/90 dark:bg-gray-900/90 md:bg-transparent md:dark:bg-transparent backdrop-blur-xl md:backdrop-blur-none border-t border-black/10 dark:border-white/10 md:border-0 shadow-[0_-4px_20px_rgba(0,0,0,0.07)] md:shadow-none">
                  <button
                    type="submit"
                    disabled={isSavingPassword}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-2xl shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98] disabled:opacity-50 text-sm"
                  >
                    {isSavingPassword ? t("profile_account_password_updating") : t("profile_account_password_update")}
                  </button>
                </div>
              </form>

              {!isDemoMode && (
                <div className="mt-4 border-t border-black/10 pt-4 dark:border-white/10">
                  <h4 className="text-sm font-bold text-red-600 dark:text-red-300">
                    {t("profile_account_danger_zone_title")}
                  </h4>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t("profile_account_danger_zone_hint")}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="rounded-xl border border-red-400 bg-red-500 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-red-600"
                      onClick={() => setIsDangerModalOpen(true)}
                    >
                      {t("profile_account_delete_cta")}
                    </button>
                    <InlineMessage text={dangerMessage} />
                  </div>
                </div>
              )}
            </ProfileCard>}
          </div>

          <ProfileCard
            title={t("host_profile_guest_title")}
            hint={t("profile_account_guest_hint")}
            icon="users"
          >
            <form className="flex flex-col gap-4" onSubmit={handleSaveGuest}>
              {/* Name + photo card */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden shadow-sm">
                <label className="flex flex-col gap-1 px-4 py-3.5 border-b border-black/5 dark:border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">{t("field_first_name")} *</span>
                  <input
                    className={`bg-transparent outline-none text-sm w-full placeholder:text-gray-400 dark:placeholder:text-gray-600 ${
                      guestErrors?.firstName
                        ? "text-red-600 dark:text-red-400"
                        : "text-gray-900 dark:text-white"
                    }`}
                    type="text"
                    value={guestFirstName}
                    onChange={(event) => setGuestFirstName(event.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1 px-4 py-3.5 border-b border-black/5 dark:border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">{t("field_last_name")}</span>
                  <input
                    className="bg-transparent outline-none text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 w-full"
                    type="text"
                    value={guestLastName}
                    onChange={(event) => setGuestLastName(event.target.value)}
                  />
                </label>
                <div className="flex flex-col gap-1 px-4 py-3.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">{t("field_guest_photo")}</span>
                  <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center mt-1">
                    <AvatarCircle
                      className="h-12 w-12 rounded-full ring-2 ring-black/10 dark:ring-white/10"
                      label={`${guestFirstName || ""} ${guestLastName || ""}`.trim() || t("field_guest")}
                      fallback="IN"
                      imageUrl={guestPhotoUrl}
                      size={48}
                    />
                    <input
                      className="bg-transparent outline-none text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 w-full"
                      type="url"
                      value={guestPhotoInputValue}
                      onChange={(event) => handleGuestPhotoUrlChange(event.target.value)}
                      placeholder={t("placeholder_guest_photo")}
                    />
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        className="rounded-xl border border-black/10 px-3 py-2 text-xs font-semibold hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
                      >
                        {t("guest_photo_upload")}
                      </button>
                      {guestPhotoUrl ? (
                        <button
                          type="button"
                          onClick={handleRemoveGuestPhoto}
                          className="rounded-xl border border-red-300 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-400/50 dark:text-red-300 dark:hover:bg-red-500/10"
                        >
                          {t("guest_photo_remove")}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact card */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden shadow-sm">
                <label className="flex flex-col gap-1 px-4 py-3.5 border-b border-black/5 dark:border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">{t("email")}</span>
                  <input
                    className="bg-transparent outline-none text-sm text-gray-500 dark:text-gray-400 w-full cursor-not-allowed"
                    type="email"
                    value={guestEmail || session?.user?.email || ""}
                    readOnly
                  />
                </label>
                <label className="flex flex-col gap-1 px-4 py-3.5 border-b border-black/5 dark:border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">{t("field_phone")}</span>
                  <input
                    className="bg-transparent outline-none text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 w-full"
                    type="tel"
                    value={guestPhone}
                    onChange={(event) => setGuestPhone(event.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1 px-4 py-3.5 border-b border-black/5 dark:border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">{t("field_relationship")}</span>
                  <input
                    className="bg-transparent outline-none text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 w-full"
                    type="text"
                    value={guestRelationship}
                    onChange={(event) => setGuestRelationship(event.target.value)}
                    list="profile-guest-relationship-options"
                  />
                </label>
                <label className="flex flex-col gap-1 px-4 py-3.5 border-b border-black/5 dark:border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">{t("field_city")}</span>
                  <input
                    className="bg-transparent outline-none text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 w-full"
                    type="text"
                    value={guestCity}
                    onChange={(event) => setGuestCity(event.target.value)}
                    list="profile-guest-city-options"
                  />
                </label>
                <label className="flex flex-col gap-1 px-4 py-3.5 border-b border-black/5 dark:border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">{t("field_country")}</span>
                  <input
                    className="bg-transparent outline-none text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 w-full"
                    type="text"
                    value={guestCountry}
                    onChange={(event) => setGuestCountry(event.target.value)}
                    list="profile-guest-country-options"
                  />
                </label>
                <label className="relative flex flex-col gap-1 px-4 py-3.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">{t("field_address")}</span>
                  <input
                    className="bg-transparent outline-none text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 w-full"
                    type="text"
                    value={guestAdvanced.address || ""}
                    onChange={(event) => {
                      setGuestAdvancedField("address", event.target.value);
                      if (
                        selectedGuestAddressPlace &&
                        normalizeLookupValue(event.target.value) !==
                          normalizeLookupValue(selectedGuestAddressPlace.formattedAddress)
                      ) {
                        setSelectedGuestAddressPlace(null);
                      }
                    }}
                    autoComplete="off"
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {mapsStatus === "ready"
                      ? t("address_google_hint")
                      : mapsStatus === "error"
                        ? t("address_google_error")
                        : t("address_google_loading")}
                  </span>

                  {mapsStatus === "ready" && String(guestAdvanced.address || "").trim().length >= 4 ? (
                    <ul className="absolute left-0 top-full z-40 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-black/10 bg-white shadow-xl dark:border-white/10 dark:bg-gray-900">
                      {isGuestAddressLoading ? (
                        <li className="px-4 py-3 text-sm text-gray-500">{t("address_searching")}</li>
                      ) : guestAddressPredictions.length === 0 ? (
                        <li className="px-4 py-3 text-sm text-gray-500">{t("address_no_matches")}</li>
                      ) : (
                        guestAddressPredictions.map((prediction) => (
                          <li key={prediction.place_id}>
                            <button
                              type="button"
                              className="flex w-full items-start gap-2 px-4 py-3 text-left text-sm text-gray-700 transition-colors hover:bg-black/5 dark:text-gray-200 dark:hover:bg-white/5"
                              onClick={() => handleSelectGuestAddressPrediction(prediction)}
                            >
                              <Icon name="location" className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                              <span>{prediction.description}</span>
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  ) : null}

                  {selectedGuestAddressPlace?.placeId ? (
                    <p className="text-xs font-semibold text-green-600 dark:text-green-300 mt-0.5">{t("address_validated")}</p>
                  ) : null}
                </label>
              </div>

              <InlineMessage text={guestMessage} />

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-xl border border-black/10 px-4 py-2 text-xs font-semibold transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
                  onClick={syncHostGuestProfileForm}
                >
                  {t("host_profile_guest_sync")}
                </button>
                {isProfileGuestLinked ? (
                  <button
                    type="button"
                    className="rounded-xl border border-black/10 px-4 py-2 text-xs font-semibold transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
                    onClick={() => openGuestDetail(profileLinkedGuestId)}
                  >
                    {t("view_guest_detail_action")}
                  </button>
                ) : null}
              </div>

              <div className="sticky bottom-16 z-50 md:static md:z-auto md:mt-0 -mx-4 md:mx-0 px-4 md:px-0 py-3 md:py-0 md:pt-2 bg-white/90 dark:bg-gray-900/90 md:bg-transparent md:dark:bg-transparent backdrop-blur-xl md:backdrop-blur-none border-t border-black/10 dark:border-white/10 md:border-0 shadow-[0_-4px_20px_rgba(0,0,0,0.07)] md:shadow-none">
                <button
                  type="submit"
                  disabled={isSavingGuest}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-2xl shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98] disabled:opacity-50 text-sm"
                >
                  {isSavingGuest
                    ? isEditingGuest
                      ? t("updating_guest")
                      : t("saving_guest")
                    : isEditingGuest
                      ? t("update_guest")
                      : t("save_guest")}
                </button>
              </div>
            </form>
          </ProfileCard>
        </div>
      ) : null}

      {activeTab === "preferences" ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <ProfileCard title={t("profile_preferences_title")} hint={t("profile_preferences_hint")} icon="settings">
            <form className="flex flex-col gap-4" onSubmit={handleSavePreferences}>
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden shadow-sm">
                <label className="flex flex-col gap-1 px-4 py-3.5 border-b border-black/5 dark:border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">{t("profile_preferences_theme")}</span>
                  <select
                    className="bg-transparent outline-none text-sm text-gray-900 dark:text-white w-full cursor-pointer"
                    value={prefsForm.theme}
                    onChange={(event) => setPrefsForm((prev) => ({ ...prev, theme: normalizeTheme(event.target.value) }))}
                  >
                    <option value="system">{t("theme_system")}</option>
                    <option value="light">{t("theme_light")}</option>
                    <option value="dark">{t("theme_dark")}</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1 px-4 py-3.5 border-b border-black/5 dark:border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">{t("profile_preferences_locale")}</span>
                  <select
                    className="bg-transparent outline-none text-sm text-gray-900 dark:text-white w-full cursor-pointer"
                    value={prefsForm.locale}
                    onChange={(event) =>
                      setPrefsForm((prev) => ({ ...prev, locale: normalizeLocale(event.target.value, language) }))
                    }
                  >
                    <option value="es">Español</option>
                    <option value="ca">Català</option>
                    <option value="en">English</option>
                    <option value="fr">Français</option>
                    <option value="it">Italiano</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1 px-4 py-3.5 border-b border-black/5 dark:border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">{t("profile_preferences_table_rows")}</span>
                  <select
                    className="bg-transparent outline-none text-sm text-gray-900 dark:text-white w-full cursor-pointer"
                    value={selectedRowsValue}
                    onChange={(event) =>
                      setPrefsForm((prev) => ({ ...prev, tableRows: normalizeTableRows(event.target.value, 10) }))
                    }
                  >
                    {TABLE_ROW_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {interpolateText(t("profile_preferences_table_rows_option"), { count: option })}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1 px-4 py-3.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">{t("profile_preferences_hour_format")}</span>
                  <select
                    className="bg-transparent outline-none text-sm text-gray-900 dark:text-white w-full cursor-pointer"
                    value={normalizeHourFormat(prefsForm.hourFormat, "24h")}
                    onChange={(event) =>
                      setPrefsForm((prev) => ({ ...prev, hourFormat: normalizeHourFormat(event.target.value, "24h") }))
                    }
                  >
                    <option value="24h">{t("profile_preferences_hour_format_24")}</option>
                    <option value="12h">{t("profile_preferences_hour_format_12")}</option>
                  </select>
                </label>
              </div>

              <InlineMessage text={prefsMessage} />

              <div className="sticky bottom-16 z-50 md:static md:z-auto md:mt-0 -mx-4 md:mx-0 px-4 md:px-0 py-3 md:py-0 md:pt-2 bg-white/90 dark:bg-gray-900/90 md:bg-transparent md:dark:bg-transparent backdrop-blur-xl md:backdrop-blur-none border-t border-black/10 dark:border-white/10 md:border-0 shadow-[0_-4px_20px_rgba(0,0,0,0.07)] md:shadow-none">
                <button
                  type="submit"
                  disabled={isSavingPrefs}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-2xl shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98] disabled:opacity-50 text-sm"
                >
                  {isSavingPrefs ? t("profile_preferences_saving") : t("profile_preferences_save")}
                </button>
              </div>
            </form>
          </ProfileCard>

          <ProfileCard
            title={t("profile_preferences_preview_title")}
            hint={t("profile_preferences_preview_hint")}
            icon="sparkle"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-gray-800/70">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{t("profile_preferences_theme")}</p>
                <p className="mt-1 text-sm font-bold text-gray-900 dark:text-white">
                  {prefsForm.theme === "light"
                    ? t("theme_light")
                    : prefsForm.theme === "dark"
                      ? t("theme_dark")
                      : t("theme_system")}
                </p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-gray-800/70">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{t("profile_preferences_locale")}</p>
                <p className="mt-1 text-sm font-bold text-gray-900 dark:text-white">{prefsForm.locale.toUpperCase()}</p>
              </div>
              <div className="rounded-2xl border border-green-300 bg-green-50 p-4 dark:border-green-500/30 dark:bg-green-500/10">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-green-700 dark:text-green-300">
                  {t("profile_preferences_table_rows")}
                </p>
                <p className="mt-1 text-sm font-bold text-green-700 dark:text-green-200">
                  {interpolateText(t("profile_preferences_table_rows_option"), { count: selectedRowsValue })}
                </p>
              </div>
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/30 dark:bg-blue-500/10">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                  {t("profile_preferences_hour_format")}
                </p>
                <p className="mt-1 text-sm font-bold text-blue-700 dark:text-blue-200">
                  {normalizeHourFormat(prefsForm.hourFormat, "24h") === "12h"
                    ? t("profile_preferences_hour_format_12")
                    : t("profile_preferences_hour_format_24")}
                </p>
              </div>
            </div>
          </ProfileCard>
        </div>
      ) : null}

      {activeTab === "identity" ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_1fr]">
          <ProfileCard title={t("profile_identity_title")} hint={t("profile_identity_hint")} icon="sparkle">
            <div className="mb-4 rounded-2xl border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-gray-800/70">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${
                    isProfileGuestLinked
                      ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
                      : "bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400"
                  }`}
                >
                  {isProfileGuestLinked ? t("host_profile_guest_linked") : t("host_profile_guest_unlinked")}
                </span>
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  {interpolateText(t("host_profile_completeness_progress"), {
                    done: hostGuestProfileCompletedCount,
                    total: hostGuestProfileTotalCount,
                    percent: hostGuestProfilePercent
                  })}
                </span>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${hostGuestProfilePercent}%` }}
                />
              </div>
            </div>

            <form className="flex flex-col gap-4" onSubmit={handleSaveGuest}>
              {/* Food restrictions card */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden shadow-sm">
                <label className="flex flex-col gap-1 px-4 py-3.5 border-b border-black/5 dark:border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">{t("field_allergies")}</span>
                  <textarea
                    className="bg-transparent outline-none text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 w-full resize-none min-h-[72px]"
                    value={guestAdvanced.allergies || ""}
                    onChange={(event) => setGuestAdvancedField("allergies", event.target.value)}
                    placeholder={t("profile_identity_allergies_placeholder")}
                  />
                </label>

                <label className="flex flex-col gap-1 px-4 py-3.5 border-b border-black/5 dark:border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">{t("field_intolerances")}</span>
                  <textarea
                    className="bg-transparent outline-none text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 w-full resize-none min-h-[72px]"
                    value={guestAdvanced.intolerances || ""}
                    onChange={(event) => setGuestAdvancedField("intolerances", event.target.value)}
                    placeholder={t("profile_identity_intolerances_placeholder")}
                  />
                </label>

                <label className="flex flex-col gap-1 px-4 py-3.5 border-b border-black/5 dark:border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">{t("field_dietary_medical_restrictions")}</span>
                  <textarea
                    className="bg-transparent outline-none text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 w-full resize-none min-h-[60px]"
                    value={guestAdvanced.dietaryMedicalRestrictions || ""}
                    onChange={(event) => setGuestAdvancedField("dietaryMedicalRestrictions", event.target.value)}
                    placeholder={t("profile_identity_dietary_medical_placeholder")}
                  />
                </label>

                <label className="flex flex-col gap-1 px-4 py-3.5 border-b border-black/5 dark:border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">{t("field_pet_allergies")}</span>
                  <textarea
                    className="bg-transparent outline-none text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 w-full resize-none min-h-[60px]"
                    value={guestAdvanced.petAllergies || ""}
                    onChange={(event) => setGuestAdvancedField("petAllergies", event.target.value)}
                    placeholder={t("profile_identity_pet_allergies_placeholder")}
                  />
                </label>

                <label className="flex flex-col gap-1 px-4 py-3.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">{t("field_medical_conditions")}</span>
                  <textarea
                    className="bg-transparent outline-none text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 w-full resize-none min-h-[60px]"
                    value={guestAdvanced.medicalConditions || ""}
                    onChange={(event) => setGuestAdvancedField("medicalConditions", event.target.value)}
                    placeholder={t("profile_identity_medical_conditions_placeholder")}
                  />
                </label>
              </div>

              {/* Notes + consent card */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden shadow-sm">
                <label className="flex flex-col gap-1 px-4 py-3.5 border-b border-black/5 dark:border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">{t("profile_identity_global_notes")}</span>
                  <textarea
                    className="bg-transparent outline-none text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 w-full resize-none min-h-[84px]"
                    value={guestAdvanced.lastTalkTopic || ""}
                    onChange={(event) => setGuestAdvancedField("lastTalkTopic", event.target.value)}
                    placeholder={t("profile_identity_global_notes_placeholder")}
                  />
                </label>
                <label className="flex items-center gap-2 px-4 py-3.5 text-sm dark:text-gray-200">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-black/20 text-blue-600 focus:ring-blue-500 dark:border-white/20"
                    checked={Boolean(guestAdvanced.sensitiveConsent)}
                    onChange={(event) => setGuestAdvancedField("sensitiveConsent", event.target.checked)}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t("field_sensitive_consent")}</span>
                </label>
              </div>

              <InlineMessage text={guestMessage} />

              {isProfileGuestLinked ? (
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="rounded-xl border border-black/10 px-4 py-2 text-xs font-semibold transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
                    onClick={() => openGuestAdvancedEditor(profileLinkedGuestId)}
                  >
                    {t("host_profile_open_advanced_action")}
                  </button>
                </div>
              ) : null}

              <div className="sticky bottom-16 z-50 md:static md:z-auto md:mt-0 -mx-4 md:mx-0 px-4 md:px-0 py-3 md:py-0 md:pt-2 bg-white/90 dark:bg-gray-900/90 md:bg-transparent md:dark:bg-transparent backdrop-blur-xl md:backdrop-blur-none border-t border-black/10 dark:border-white/10 md:border-0 shadow-[0_-4px_20px_rgba(0,0,0,0.07)] md:shadow-none">
                <button
                  type="submit"
                  disabled={isSavingGuest}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-2xl shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98] disabled:opacity-50 text-sm"
                >
                  {isSavingGuest ? t("saving_guest") : t("save_guest")}
                </button>
              </div>
            </form>
          </ProfileCard>

          <ProfileCard title={t("host_profile_completeness_title")} hint={t("host_profile_completeness_hint")} icon="check">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {hostGuestProfileSignals.map((signalItem) => (
                <div
                  key={signalItem.key}
                  className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                    signalItem.done
                      ? "border-green-200 bg-green-50 text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300"
                      : "border-black/10 bg-white text-gray-500 dark:border-white/10 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  {resolveSignalLabel(signalItem, t)}
                </div>
              ))}
            </div>
          </ProfileCard>
        </div>
      ) : null}

      {activeTab === "privacy" ? (
        <div className="flex flex-col gap-6">
          <ProfileCard title={t("profile_privacy_title")} hint={t("profile_privacy_hint")} icon="shield">
            {!isGlobalProfileFeatureReady ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">{t("global_profile_feature_pending")}</p>
            ) : (
              <div className="flex flex-col gap-6">
                <div className="flex flex-wrap gap-2">
                  <button
                    className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
                    type="button"
                    onClick={handleClaimGlobalProfile}
                    disabled={isClaimingGlobalProfile || isGlobalProfileClaimed}
                  >
                    {isClaimingGlobalProfile
                      ? t("global_profile_claiming")
                      : isGlobalProfileClaimed
                        ? t("global_profile_status_claimed")
                        : t("global_profile_claim_action")}
                  </button>
                  <button
                    className="rounded-xl border border-black/10 px-4 py-2 text-xs font-semibold transition-colors hover:bg-black/5 disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/5"
                    type="button"
                    onClick={() => handleLinkProfileGuestToGlobal(profileLinkedGuestId)}
                    disabled={!isProfileGuestLinked || isLinkingGlobalGuest}
                  >
                    {isLinkingGlobalGuest ? t("global_profile_linking") : t("global_profile_link_self_action")}
                  </button>
                  <button
                    className="rounded-xl border border-black/10 px-4 py-2 text-xs font-semibold transition-colors hover:bg-black/5 disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/5"
                    type="button"
                    onClick={handleLinkAllGuestsToGlobalProfiles}
                    disabled={isLinkingAllGlobalGuests}
                  >
                    {isLinkingAllGlobalGuests ? t("global_profile_linking_all") : t("global_profile_link_all_action")}
                  </button>
                  {globalShareTargetsVisible.length > 0 ? (
                    <>
                      <button
                        className="rounded-xl border border-yellow-300 bg-yellow-50 px-4 py-2 text-xs font-semibold text-yellow-700 transition-colors hover:bg-yellow-100 disabled:opacity-50 dark:border-yellow-500/40 dark:bg-yellow-500/10 dark:text-yellow-300"
                        type="button"
                        onClick={() => handleApplyGlobalShareAction("pause")}
                        disabled={isPausingGlobalShares || isRevokingGlobalShares}
                      >
                        {isPausingGlobalShares ? t("global_profile_share_bulk_pausing") : t("global_profile_share_bulk_pause")}
                      </button>
                      <button
                        className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300"
                        type="button"
                        onClick={() => handleApplyGlobalShareAction("revoke_all")}
                        disabled={isRevokingGlobalShares || isPausingGlobalShares}
                      >
                        {isRevokingGlobalShares
                          ? t("global_profile_share_bulk_revoking")
                          : t("global_profile_share_bulk_revoke_all")}
                      </button>
                    </>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  {globalShareTargetsVisible.map((targetItem) => {
                    const hostId = targetItem.host_user_id;
                    const shareDraft = globalShareDraftByHostId[hostId] || { status: "inactive" };
                    const appliedPreset = inferGlobalSharePreset(shareDraft);
                    const isActive = String(shareDraft.status || "").toLowerCase() === "active";

                    return (
                      <article
                        key={hostId}
                        className="rounded-2xl border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-gray-900/70"
                      >
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">
                              {targetItem.host_name || t("host_default_name")}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{targetItem.host_email || hostId}</p>
                          </div>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                              isActive
                                ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
                                : "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400"
                            }`}
                          >
                            {isActive ? t("status_active") : t("status_revoked")}
                          </span>
                        </div>

                        <div className="mb-3 flex flex-wrap gap-2">
                          {["basic", "custom", "private"].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              className={`rounded-lg border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide transition-colors ${
                                appliedPreset === preset
                                  ? "border-blue-500 bg-blue-600 text-white"
                                  : "border-black/10 bg-white text-gray-500 hover:bg-black/5 dark:border-white/10 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/5"
                              }`}
                              onClick={() => handleApplyGlobalSharePreset(hostId, preset)}
                            >
                              {t(`global_profile_share_preset_${preset}`)}
                            </button>
                          ))}
                        </div>

                        {appliedPreset === "custom" ? (
                          <div className="mb-3 grid grid-cols-2 gap-2">
                            {["identity", "food", "lifestyle", "conversation", "health"].map((scope) => {
                              const field = `allow_${scope}`;
                              return (
                                <label
                                  key={scope}
                                  className="flex items-center gap-2 rounded-lg border border-black/10 bg-white px-2 py-1.5 text-[11px] text-gray-600 dark:border-white/10 dark:bg-gray-800 dark:text-gray-300"
                                >
                                  <input
                                    type="checkbox"
                                    checked={Boolean(shareDraft[field])}
                                    onChange={(event) => handleChangeGlobalShareDraft(hostId, field, event.target.checked)}
                                  />
                                  <span>{t(`global_profile_scope_${scope}`)}</span>
                                </label>
                              );
                            })}
                          </div>
                        ) : null}

                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="flex-1 rounded-xl border border-black/10 px-3 py-2 text-xs font-semibold transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
                            onClick={() => setPreviewGlobalShareHostId((prev) => (prev === hostId ? "" : hostId))}
                          >
                            {previewGlobalShareHostId === hostId ? t("global_profile_preview_hide") : t("global_profile_preview_show")}
                          </button>
                          <button
                            type="button"
                            className="flex-1 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
                            onClick={() => handleRequestSaveGlobalShare(hostId)}
                            disabled={savingGlobalShareHostId === hostId}
                          >
                            {savingGlobalShareHostId === hostId
                              ? t("global_profile_share_saving")
                              : t("global_profile_share_save_action")}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>

                <InlineMessage text={globalProfileMessage} />
              </div>
            )}
          </ProfileCard>

          {isIntegrationDebugEnabled ? (
            <ProfileCard title={t("integration_status_title")} hint={t("integration_status_hint")} icon="trend">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                    integrationChecksOkCount === integrationChecksTotal
                      ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
                      : "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300"
                  }`}
                >
                  {integrationChecksOkCount}/{integrationChecksTotal || 0}
                </span>
                <button
                  type="button"
                  className="rounded-xl border border-black/10 px-3 py-2 text-xs font-semibold transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
                  onClick={() => setIsIntegrationPanelOpen(!isIntegrationPanelOpen)}
                >
                  {isIntegrationPanelOpen ? t("integration_status_hide") : t("integration_status_show")}
                </button>
                {isIntegrationPanelOpen ? (
                  <button
                    type="button"
                    className="rounded-xl border border-black/10 px-3 py-2 text-xs font-semibold transition-colors hover:bg-black/5 disabled:opacity-60 dark:border-white/10 dark:hover:bg-white/5"
                    onClick={loadIntegrationStatusData}
                    disabled={isLoadingIntegrationStatus}
                  >
                    {isLoadingIntegrationStatus ? t("integration_status_loading") : t("integration_status_refresh")}
                  </button>
                ) : null}
              </div>

              {isIntegrationPanelOpen && integrationStatus ? (
                <div className="space-y-1 rounded-2xl border border-black/10 bg-white/70 p-3 text-xs dark:border-white/10 dark:bg-gray-800/60">
                  {integrationChecks.map((check) => (
                    <div
                      key={check.key}
                      className="flex items-center justify-between border-b border-black/5 py-1.5 last:border-b-0 dark:border-white/10"
                    >
                      <span className="text-gray-600 dark:text-gray-300">{check.label}</span>
                      <span className={check.ok ? "font-bold text-green-600 dark:text-green-300" : "font-bold text-red-600 dark:text-red-300"}>
                        {check.ok ? "OK" : "MISSING"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
              <InlineMessage text={integrationStatusMessage} />
            </ProfileCard>
          ) : null}

          <ProfileCard title={t("global_profile_history_title")} hint={t("global_profile_history_hint")} icon="clock">
            {isLoadingGlobalShareHistory ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">{t("global_profile_history_loading")}</p>
            ) : globalShareHistoryItems.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">{t("global_profile_history_empty")}</p>
            ) : (
              <ul className="space-y-2">
                {globalShareHistoryItems.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-black/10 bg-white/70 px-3 py-2 dark:border-white/10 dark:bg-gray-800/60"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{entry.hostName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{entry.hostEmail}</p>
                    </div>
                    <div className="text-right">
                      <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                        {formatGlobalShareEventType(t, entry.event_type)}
                      </span>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {formatRelativeDate(entry.created_at, language, t("no_date"))}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </ProfileCard>
        </div>
      ) : null}

      <datalist id="host-city-options">
        {cityOptions.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
      <datalist id="host-country-options">
        {countryOptions.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
      <datalist id="profile-guest-relationship-options">
        {relationshipOptions.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
      <datalist id="profile-guest-city-options">
        {cityOptions.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
      <datalist id="profile-guest-country-options">
        {countryOptions.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
      <input ref={photoInputRef} type="file" className="hidden" accept="image/*" onChange={handleGuestPhotoFileChange} />
      {isDangerModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-black/10 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-gray-900">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t("profile_account_delete_modal_title")}</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{t("profile_account_delete_modal_body")}</p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="rounded-xl border border-black/10 px-4 py-2 text-sm font-semibold transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
                onClick={() => setIsDangerModalOpen(false)}
                disabled={isDeletingAccount}
              >
                {t("profile_account_delete_modal_cancel")}
              </button>
              <button
                type="button"
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleDangerAction}
                disabled={isDeletingAccount}
              >
                {isDeletingAccount ? t("profile_account_delete_processing") : t("profile_account_delete_modal_confirm")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default HostProfileView;
