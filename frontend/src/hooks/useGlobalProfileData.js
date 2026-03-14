import { useCallback, useMemo } from "react";
import { isMissingDbFeatureError } from "../lib/system-helpers";

export function useGlobalProfileData({
  supabase,
  sessionUserId,
  t,
  globalProfileId,
  setGlobalProfileId,
  setGlobalShareTargets,
  setGlobalShareDraftByHostId,
  setPreviewGlobalShareHostId,
  setIsGlobalProfileFeatureReady,
  setGlobalProfileMessage,
  setIsLoadingIntegrationStatus,
  setIntegrationStatusMessage,
  setIntegrationStatus,
  setGlobalShareHistory,
  setIsLoadingGlobalShareHistory,
  setIsIntegrationPanelOpen
}) {
  const mapShareTargetToDraft = useCallback((targetItem) => {
    const status = String(targetItem?.share_status || "inactive").toLowerCase();
    return {
      status: status === "active" || status === "revoked" || status === "expired" ? status : "inactive",
      allow_identity: Boolean(targetItem?.allow_identity),
      allow_food: Boolean(targetItem?.allow_food),
      allow_lifestyle: Boolean(targetItem?.allow_lifestyle),
      allow_conversation: Boolean(targetItem?.allow_conversation),
      allow_health: Boolean(targetItem?.allow_health)
    };
  }, []);

  const isIntegrationDebugEnabled = useMemo(() => {
    if (typeof window === "undefined") {
      return false;
    }
    const params = new URLSearchParams(window.location.search || "");
    return params.get("debug") === "1" || params.get("diagnostics") === "1";
  }, []);

  const loadGlobalProfileData = useCallback(async () => {
    if (!supabase || !sessionUserId) {
      return null;
    }

    const defaultFeatureReady = true;
    let nextFeatureReady = defaultFeatureReady;
    let nextGlobalProfileId = "";
    let nextShareTargets = [];
    let nextShareDraftByHostId = {};

    const { data: globalProfileRow, error: globalProfileError } = await supabase
      .from("global_guest_profiles")
      .select("id")
      .eq("owner_user_id", sessionUserId)
      .maybeSingle();

    if (globalProfileError) {
      if (isMissingDbFeatureError(globalProfileError, ["global_guest_profiles"])) {
        nextFeatureReady = false;
      } else {
        setGlobalProfileMessage(`${t("global_profile_load_error")} ${globalProfileError.message}`);
        return null;
      }
    } else {
      nextGlobalProfileId = String(globalProfileRow?.id || "");
    }

    if (nextFeatureReady && nextGlobalProfileId) {
      const shareTargetsResult = await supabase.rpc("get_my_global_profile_share_targets");
      if (shareTargetsResult.error) {
        if (isMissingDbFeatureError(shareTargetsResult.error, ["get_my_global_profile_share_targets"])) {
          nextFeatureReady = false;
        } else {
          setGlobalProfileMessage(`${t("global_profile_load_error")} ${shareTargetsResult.error.message}`);
          return null;
        }
      } else {
        nextShareTargets = Array.isArray(shareTargetsResult.data) ? shareTargetsResult.data : [];
        nextShareDraftByHostId = Object.fromEntries(
          nextShareTargets.map((item) => [item.host_user_id, mapShareTargetToDraft(item)])
        );
      }
    }

    setIsGlobalProfileFeatureReady(nextFeatureReady);
    setGlobalProfileId(nextGlobalProfileId);
    setGlobalShareTargets(nextShareTargets);
    setGlobalShareDraftByHostId(nextShareDraftByHostId);
    setPreviewGlobalShareHostId((prev) =>
      prev && nextShareTargets.some((item) => item.host_user_id === prev) ? prev : ""
    );
    return { profileId: nextGlobalProfileId, shareTargets: nextShareTargets, featureReady: nextFeatureReady };
  }, [
    mapShareTargetToDraft,
    sessionUserId,
    setGlobalProfileId,
    setGlobalProfileMessage,
    setGlobalShareDraftByHostId,
    setGlobalShareTargets,
    setIsGlobalProfileFeatureReady,
    setPreviewGlobalShareHostId,
    supabase,
    t
  ]);

  const loadIntegrationStatusData = useCallback(async () => {
    if (!supabase || !sessionUserId) {
      return;
    }
    setIsLoadingIntegrationStatus(true);
    setIntegrationStatusMessage("");
    const result = await supabase.rpc("get_shared_profile_feature_status");
    setIsLoadingIntegrationStatus(false);

    if (result.error) {
      if (isMissingDbFeatureError(result.error, ["get_shared_profile_feature_status"])) {
        setIntegrationStatus(null);
        setIntegrationStatusMessage(t("integration_status_feature_pending"));
      } else {
        setIntegrationStatusMessage(`${t("integration_status_load_error")} ${result.error.message}`);
      }
      return;
    }

    const row = Array.isArray(result.data) ? result.data[0] : result.data;
    if (!row) {
      setIntegrationStatus(null);
      setIntegrationStatusMessage(t("integration_status_empty"));
      return;
    }
    setIntegrationStatus(row);
  }, [
    sessionUserId,
    setIntegrationStatus,
    setIntegrationStatusMessage,
    setIsLoadingIntegrationStatus,
    supabase,
    t
  ]);

  const loadGlobalShareHistoryData = useCallback(
    async (profileIdOverride) => {
      if (!supabase || !sessionUserId) {
        return;
      }
      const targetProfileId = String(profileIdOverride || globalProfileId || "").trim();
      if (!targetProfileId) {
        setGlobalShareHistory([]);
        return;
      }
      setIsLoadingGlobalShareHistory(true);
      const result = await supabase
        .from("global_guest_profile_consent_events")
        .select("id, event_type, created_at, payload")
        .eq("global_profile_id", targetProfileId)
        .in("event_type", ["share_granted", "share_revoked"])
        .order("created_at", { ascending: false })
        .limit(12);
      setIsLoadingGlobalShareHistory(false);
      if (result.error) {
        if (isMissingDbFeatureError(result.error, ["global_guest_profile_consent_events"])) {
          setGlobalShareHistory([]);
          return;
        }
        setGlobalProfileMessage(`${t("global_profile_history_load_error")} ${result.error.message}`);
        return;
      }
      setGlobalShareHistory(Array.isArray(result.data) ? result.data : []);
    },
    [
      globalProfileId,
      sessionUserId,
      setGlobalProfileMessage,
      setGlobalShareHistory,
      setIsLoadingGlobalShareHistory,
      supabase,
      t
    ]
  );

  const refreshSharedProfileData = useCallback(async () => {
    const sharedData = await loadGlobalProfileData();
    const nextProfileId = String(sharedData?.profileId || "").trim();
    const tasks = [loadGlobalShareHistoryData(nextProfileId)];
    if (isIntegrationDebugEnabled) {
      tasks.push(loadIntegrationStatusData());
    } else {
      setIntegrationStatus(null);
      setIntegrationStatusMessage("");
      setIsIntegrationPanelOpen(false);
    }
    await Promise.all(tasks);
  }, [
    isIntegrationDebugEnabled,
    loadGlobalProfileData,
    loadGlobalShareHistoryData,
    loadIntegrationStatusData,
    setIntegrationStatus,
    setIntegrationStatusMessage,
    setIsIntegrationPanelOpen
  ]);

  return {
    mapShareTargetToDraft,
    isIntegrationDebugEnabled,
    loadGlobalProfileData,
    loadIntegrationStatusData,
    loadGlobalShareHistoryData,
    refreshSharedProfileData
  };
}
