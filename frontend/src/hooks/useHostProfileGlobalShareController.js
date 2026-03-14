import { applyGlobalSharePreset } from "../lib/guest-helpers";
import { interpolateText, toNullable } from "../lib/formatters";
import { toCatalogCode } from "../lib/guest-catalogs";
import { splitFullName } from "../lib/guest-helpers";
import { isCompatibilityError, isMissingDbFeatureError } from "../lib/system-helpers";

export function useHostProfileGlobalShareController({
  supabase,
  t,
  language,
  sessionUserId,
  sessionUserEmail,
  hostProfileName,
  hostProfilePhone,
  hostProfileRelationship,
  hostProfileCity,
  hostProfileCountry,
  setHostProfileMessage,
  setIsSavingHostProfile,
  selfGuestCandidate,
  loadDashboardData,
  setGlobalProfileMessage,
  setIsClaimingGlobalProfile,
  setIsGlobalProfileFeatureReady,
  globalProfileId,
  setGlobalProfileId,
  refreshSharedProfileData,
  setIsLinkingGlobalGuest,
  setIsLinkingAllGlobalGuests,
  setGlobalShareDraftByHostId,
  globalShareDraftByHostId,
  setSavingGlobalShareHostId,
  globalShareTargetsVisible,
  mapShareTargetToDraft,
  setPendingGlobalShareSave,
  pendingGlobalShareSave,
  setIsPausingGlobalShares,
  setIsRevokingGlobalShares
}) {
  const handleSaveHostProfile = async (event) => {
    event.preventDefault();
    if (!supabase || !sessionUserId) {
      return;
    }
    setHostProfileMessage("");
    setIsSavingHostProfile(true);

    const fallbackName = (sessionUserEmail || "").split("@")[0] || t("field_guest");
    const normalizedFullName =
      String(hostProfileName || "")
        .trim()
        .replace(/\s+/g, " ") || fallbackName;
    const profilePayload = {
      id: sessionUserId,
      full_name: normalizedFullName,
      phone: toNullable(hostProfilePhone)
    };
    const { error: profileError } = await supabase.from("profiles").upsert(profilePayload, { onConflict: "id" });
    if (profileError) {
      setIsSavingHostProfile(false);
      setHostProfileMessage(`${t("host_profile_save_error")} ${profileError.message}`);
      return;
    }

    const { firstName, lastName } = splitFullName(normalizedFullName);
    const guestPayload = {
      host_user_id: sessionUserId,
      content_language: language,
      first_name: firstName || fallbackName,
      last_name: toNullable(lastName),
      email: toNullable(sessionUserEmail || ""),
      phone: toNullable(hostProfilePhone),
      relationship: toNullable(toCatalogCode("relationship", hostProfileRelationship)),
      city: toNullable(hostProfileCity),
      country: toNullable(hostProfileCountry)
    };
    const fallbackGuestPayload = {
      host_user_id: sessionUserId,
      first_name: firstName || fallbackName,
      last_name: toNullable(lastName),
      email: toNullable(sessionUserEmail || ""),
      phone: toNullable(hostProfilePhone),
      relationship: toNullable(toCatalogCode("relationship", hostProfileRelationship)),
      city: toNullable(hostProfileCity),
      country: toNullable(hostProfileCountry)
    };

    const existingGuest = selfGuestCandidate;
    let guestResult = existingGuest?.id
      ? await supabase
        .from("guests")
        .update(guestPayload)
        .eq("id", existingGuest.id)
        .eq("host_user_id", sessionUserId)
      : await supabase.from("guests").insert(guestPayload);

    if (guestResult.error && isCompatibilityError(guestResult.error, ["content_language"])) {
      guestResult = existingGuest?.id
        ? await supabase
          .from("guests")
          .update(fallbackGuestPayload)
          .eq("id", existingGuest.id)
          .eq("host_user_id", sessionUserId)
        : await supabase.from("guests").insert(fallbackGuestPayload);
    }

    setIsSavingHostProfile(false);
    if (guestResult.error) {
      setHostProfileMessage(`${t("host_profile_saved_guest_sync_warning")} ${guestResult.error.message}`);
      await loadDashboardData();
      return;
    }
    setHostProfileMessage(t("host_profile_saved"));
    await loadDashboardData();
  };

  const handleClaimGlobalProfile = async () => {
    if (!supabase || !sessionUserId) {
      return;
    }
    setGlobalProfileMessage("");
    setIsClaimingGlobalProfile(true);
    const result = await supabase.rpc("get_or_create_my_global_guest_profile");
    setIsClaimingGlobalProfile(false);

    if (result.error) {
      if (isMissingDbFeatureError(result.error, ["get_or_create_my_global_guest_profile"])) {
        setIsGlobalProfileFeatureReady(false);
        setGlobalProfileMessage(t("global_profile_feature_pending"));
      } else {
        setGlobalProfileMessage(`${t("global_profile_claim_error")} ${result.error.message}`);
      }
      return;
    }

    const normalizedId = String(result.data || "").trim();
    setGlobalProfileId(normalizedId);
    setGlobalProfileMessage(t("global_profile_claimed"));
    await refreshSharedProfileData();
  };

  const handleLinkProfileGuestToGlobal = async (guestId) => {
    if (!supabase || !sessionUserId || !guestId) {
      return;
    }
    setGlobalProfileMessage("");
    setIsLinkingGlobalGuest(true);
    const result = await supabase.rpc("link_my_guest_to_matched_global_profile", { p_guest_id: guestId });
    setIsLinkingGlobalGuest(false);

    if (result.error) {
      if (isMissingDbFeatureError(result.error, ["link_my_guest_to_matched_global_profile"])) {
        setIsGlobalProfileFeatureReady(false);
        setGlobalProfileMessage(t("global_profile_feature_pending"));
      } else {
        setGlobalProfileMessage(`${t("global_profile_link_error")} ${result.error.message}`);
      }
      return;
    }

    const row = Array.isArray(result.data) ? result.data[0] : result.data;
    if (row?.linked) {
      setGlobalProfileId(String(row.global_profile_id || globalProfileId || "").trim());
      setGlobalProfileMessage(t("global_profile_link_success"));
      await refreshSharedProfileData();
      return;
    }

    const reason = String(row?.reason || "").trim();
    if (reason === "no_registered_owner") {
      setGlobalProfileMessage(t("global_profile_link_no_owner"));
      return;
    }
    if (reason === "guest_without_contact") {
      setGlobalProfileMessage(t("global_profile_link_missing_contact"));
      return;
    }
    setGlobalProfileMessage(t("global_profile_link_not_linked"));
  };

  const handleLinkAllGuestsToGlobalProfiles = async () => {
    if (!supabase || !sessionUserId) {
      return;
    }
    setGlobalProfileMessage("");
    setIsLinkingAllGlobalGuests(true);
    const result = await supabase.rpc("link_all_my_guests_to_global_profiles");
    setIsLinkingAllGlobalGuests(false);

    if (result.error) {
      if (isMissingDbFeatureError(result.error, ["link_all_my_guests_to_global_profiles"])) {
        setIsGlobalProfileFeatureReady(false);
        setGlobalProfileMessage(t("global_profile_feature_pending"));
      } else {
        setGlobalProfileMessage(`${t("global_profile_link_error")} ${result.error.message}`);
      }
      return;
    }

    const row = Array.isArray(result.data) ? result.data[0] : result.data;
    setGlobalProfileMessage(
      interpolateText(t("global_profile_link_all_summary"), {
        checked: Number(row?.checked_count || 0),
        linked: Number(row?.linked_count || 0),
        skipped: Number(row?.skipped_count || 0)
      })
    );
    await refreshSharedProfileData();
  };

  const handleChangeGlobalShareDraft = (hostUserId, field, value) => {
    if (!hostUserId || !field) {
      return;
    }
    setGlobalShareDraftByHostId((prev) => ({
      ...prev,
      [hostUserId]: {
        status: prev?.[hostUserId]?.status || "inactive",
        allow_identity: Boolean(prev?.[hostUserId]?.allow_identity),
        allow_food: Boolean(prev?.[hostUserId]?.allow_food),
        allow_lifestyle: Boolean(prev?.[hostUserId]?.allow_lifestyle),
        allow_conversation: Boolean(prev?.[hostUserId]?.allow_conversation),
        allow_health: Boolean(prev?.[hostUserId]?.allow_health),
        [field]: value
      }
    }));
  };

  const handleApplyGlobalSharePreset = (hostUserId, preset) => {
    if (!hostUserId) {
      return;
    }
    setGlobalShareDraftByHostId((prev) => {
      const baseDraft = prev?.[hostUserId] || {
        status: "inactive",
        allow_identity: false,
        allow_food: false,
        allow_lifestyle: false,
        allow_conversation: false,
        allow_health: false
      };
      return {
        ...prev,
        [hostUserId]: applyGlobalSharePreset(baseDraft, preset)
      };
    });
  };

  const handleSaveGlobalShare = async (hostUserId, draftOverride = null) => {
    if (!supabase || !sessionUserId || !hostUserId) {
      return;
    }
    if (hostUserId === sessionUserId) {
      setGlobalProfileMessage(t("global_profile_share_self_error"));
      return;
    }
    const draft = draftOverride || globalShareDraftByHostId[hostUserId];
    if (!draft) {
      return;
    }
    setGlobalProfileMessage("");
    setSavingGlobalShareHostId(hostUserId);
    const status = String(draft.status || "inactive");
    const normalizedStatus = status === "active" || status === "revoked" ? status : "revoked";
    const result = await supabase.rpc("set_my_global_profile_share", {
      p_grantee_user_id: hostUserId,
      p_status: normalizedStatus,
      p_allow_identity: Boolean(draft.allow_identity),
      p_allow_food: Boolean(draft.allow_food),
      p_allow_lifestyle: Boolean(draft.allow_lifestyle),
      p_allow_conversation: Boolean(draft.allow_conversation),
      p_allow_health: Boolean(draft.allow_health),
      p_expires_at: null
    });
    setSavingGlobalShareHostId("");

    if (result.error) {
      if (isMissingDbFeatureError(result.error, ["set_my_global_profile_share"])) {
        setIsGlobalProfileFeatureReady(false);
        setGlobalProfileMessage(t("global_profile_feature_pending"));
      } else if (String(result.error.message || "").toLowerCase().includes("health_consent_required_before_sharing")) {
        setGlobalProfileMessage(t("global_profile_health_consent_required"));
      } else {
        setGlobalProfileMessage(`${t("global_profile_share_save_error")} ${result.error.message}`);
      }
      return;
    }

    setGlobalProfileMessage(t("global_profile_share_saved"));
    await refreshSharedProfileData();
  };

  const handleRequestSaveGlobalShare = (hostUserId) => {
    if (!hostUserId) {
      return;
    }
    const targetItem = globalShareTargetsVisible.find((item) => item.host_user_id === hostUserId);
    const draft = globalShareDraftByHostId[hostUserId] || (targetItem ? mapShareTargetToDraft(targetItem) : null);
    if (!targetItem || !draft) {
      return;
    }
    setPendingGlobalShareSave({
      hostUserId,
      hostName: targetItem.host_name || t("host_default_name"),
      hostEmail: targetItem.host_email || hostUserId,
      draft
    });
  };

  const handleConfirmSaveGlobalShare = async () => {
    if (!pendingGlobalShareSave?.hostUserId || !pendingGlobalShareSave?.draft) {
      setPendingGlobalShareSave(null);
      return;
    }
    await handleSaveGlobalShare(pendingGlobalShareSave.hostUserId, pendingGlobalShareSave.draft);
    setPendingGlobalShareSave(null);
  };

  const handleApplyGlobalShareAction = async (mode) => {
    if (!supabase || !sessionUserId) {
      return;
    }
    const targets = globalShareTargetsVisible.filter((item) => item?.host_user_id);
    if (targets.length === 0) {
      setGlobalProfileMessage(t("global_profile_share_targets_empty"));
      return;
    }

    if (mode === "pause") {
      setIsPausingGlobalShares(true);
    } else {
      setIsRevokingGlobalShares(true);
    }
    setGlobalProfileMessage("");

    let savedCount = 0;
    let failedCount = 0;
    for (const targetItem of targets) {
      const hostId = targetItem.host_user_id;
      const currentDraft = globalShareDraftByHostId[hostId] || mapShareTargetToDraft(targetItem);
      const nextDraft =
        mode === "pause"
          ? { ...currentDraft, status: "revoked" }
          : {
            ...currentDraft,
            status: "revoked",
            allow_identity: false,
            allow_food: false,
            allow_lifestyle: false,
            allow_conversation: false,
            allow_health: false
          };

      const result = await supabase.rpc("set_my_global_profile_share", {
        p_grantee_user_id: hostId,
        p_status: "revoked",
        p_allow_identity: Boolean(nextDraft.allow_identity),
        p_allow_food: Boolean(nextDraft.allow_food),
        p_allow_lifestyle: Boolean(nextDraft.allow_lifestyle),
        p_allow_conversation: Boolean(nextDraft.allow_conversation),
        p_allow_health: Boolean(nextDraft.allow_health),
        p_expires_at: null
      });
      if (result.error) {
        failedCount += 1;
      } else {
        savedCount += 1;
      }
    }

    if (mode === "pause") {
      setIsPausingGlobalShares(false);
      setGlobalProfileMessage(
        interpolateText(t("global_profile_share_pause_summary"), { saved: savedCount, failed: failedCount })
      );
    } else {
      setIsRevokingGlobalShares(false);
      setGlobalProfileMessage(
        interpolateText(t("global_profile_share_revoke_all_summary"), { saved: savedCount, failed: failedCount })
      );
    }
    await refreshSharedProfileData();
  };

  return {
    handleSaveHostProfile,
    handleClaimGlobalProfile,
    handleLinkProfileGuestToGlobal,
    handleLinkAllGuestsToGlobalProfiles,
    handleChangeGlobalShareDraft,
    handleApplyGlobalSharePreset,
    handleSaveGlobalShare,
    handleRequestSaveGlobalShare,
    handleConfirmSaveGlobalShare,
    handleApplyGlobalShareAction
  };
}
