import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "../../../components/icons";
import { InlineMessage } from "../../../components/inline-message";
import { supabase } from "../../../lib/supabaseClient";

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizePhone(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[()-]/g, "");
}

function groupMembersByGroupId(rows) {
  return (Array.isArray(rows) ? rows : []).reduce((acc, row) => {
    const groupId = String(row?.group_id || "").trim();
    if (!groupId) return acc;
    if (!acc[groupId]) acc[groupId] = [];
    acc[groupId].push(row);
    return acc;
  }, {});
}

export function GuestGroupsView({ t, sessionUserId, openWorkspace }) {
  const [groups, setGroups] = useState([]);
  const [membersByGroupId, setMembersByGroupId] = useState({});
  const [guestCatalog, setGuestCatalog] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [groupNameDraft, setGroupNameDraft] = useState("");
  const [guestSearchDraft, setGuestSearchDraft] = useState("");
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [isLoadingGuestCatalog, setIsLoadingGuestCatalog] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [isDeletingGroupId, setIsDeletingGroupId] = useState("");
  const [isRenamingGroupId, setIsRenamingGroupId] = useState("");
  const [editingGroupId, setEditingGroupId] = useState("");
  const [editingGroupNameDraft, setEditingGroupNameDraft] = useState("");
  const [addingGuestId, setAddingGuestId] = useState("");
  const [removingMemberId, setRemovingMemberId] = useState("");
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState("info");

  const selectedGroup = useMemo(
    () => groups.find((groupItem) => groupItem.id === selectedGroupId) || null,
    [groups, selectedGroupId]
  );

  const selectedMembers = useMemo(
    () => membersByGroupId[selectedGroupId] || [],
    [membersByGroupId, selectedGroupId]
  );

  const selectedMemberEmails = useMemo(
    () =>
      new Set(
        selectedMembers
          .map((member) => normalizeEmail(member?.guest_email))
          .filter(Boolean)
      ),
    [selectedMembers]
  );

  const selectedMemberPhones = useMemo(
    () =>
      new Set(
        selectedMembers
          .map((member) => normalizePhone(member?.guest_phone))
          .filter(Boolean)
      ),
    [selectedMembers]
  );

  const selectedMemberGuestIds = useMemo(
    () =>
      new Set(
        selectedMembers
          .map((member) => String(member?.guest_id || "").trim())
          .filter(Boolean)
      ),
    [selectedMembers]
  );

  const formatMemberCount = useCallback(
    (count) => String(t("guest_groups_members_count")).replace("{count}", String(Number(count) || 0)),
    [t]
  );

  const getGuestDisplayName = useCallback(
    (guestItem) => {
      const fullName = `${guestItem?.first_name || ""} ${guestItem?.last_name || ""}`.trim();
      return fullName || String(guestItem?.email || "").trim() || String(guestItem?.phone || "").trim() || t("field_guest");
    },
    [t]
  );

  const filteredGuestCandidates = useMemo(() => {
    const query = String(guestSearchDraft || "").trim().toLowerCase();
    return guestCatalog
      .filter((guestItem) => {
        const guestId = String(guestItem?.id || "").trim();
        const email = normalizeEmail(guestItem?.email);
        const phone = normalizePhone(guestItem?.phone);
        if ((!email && !phone) || (guestId && selectedMemberGuestIds.has(guestId))) return false;
        if ((email && selectedMemberEmails.has(email)) || (phone && selectedMemberPhones.has(phone))) return false;
        const haystack = [
          getGuestDisplayName(guestItem),
          guestItem?.email || "",
          guestItem?.phone || ""
        ]
          .join(" ")
          .toLowerCase();
        return !query || haystack.includes(query);
      })
      .slice(0, 10);
  }, [
    getGuestDisplayName,
    guestCatalog,
    guestSearchDraft,
    selectedMemberEmails,
    selectedMemberGuestIds,
    selectedMemberPhones
  ]);

  const loadGroups = useCallback(async () => {
    if (!supabase || !sessionUserId) {
      setGroups([]);
      setMembersByGroupId({});
      setSelectedGroupId("");
      return;
    }
    setIsLoadingGroups(true);
    try {
      const { data: groupRows, error: groupsError } = await supabase
        .from("guest_groups")
        .select("id, name, created_at")
        .order("created_at", { ascending: false });
      if (groupsError) throw groupsError;
      const normalizedGroups = Array.isArray(groupRows) ? groupRows : [];
      setGroups(normalizedGroups);
      const ids = normalizedGroups.map((groupItem) => groupItem.id).filter(Boolean);
      if (!ids.length) {
        setMembersByGroupId({});
        setSelectedGroupId("");
        return;
      }
      const { data: memberRows, error: membersError } = await supabase
      .from("guest_group_members")
      .select("id, group_id, guest_id, guest_name, guest_email, guest_phone, created_at")
      .in("group_id", ids)
      .order("created_at", { ascending: true });
      if (membersError) throw membersError;
      setMembersByGroupId(groupMembersByGroupId(memberRows));
      setSelectedGroupId((prev) => {
        if (prev && ids.includes(prev)) return prev;
        return ids[0] || "";
      });
    } catch (error) {
      console.error("[guest-groups] load error", error);
      setFeedbackType("error");
      setFeedback(t("guest_groups_load_error"));
      setGroups([]);
      setMembersByGroupId({});
      setSelectedGroupId("");
    } finally {
      setIsLoadingGroups(false);
    }
  }, [sessionUserId, t]);

  const loadGuestCatalog = useCallback(async () => {
    if (!supabase || !sessionUserId) {
      setGuestCatalog([]);
      return;
    }
    setIsLoadingGuestCatalog(true);
    try {
      const { data, error } = await supabase
        .from("guests")
        .select("id, first_name, last_name, email, phone, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      setGuestCatalog(
        (Array.isArray(data) ? data : []).filter(
          (guestItem) => normalizeEmail(guestItem?.email) || normalizePhone(guestItem?.phone)
        )
      );
    } catch (error) {
      console.error("[guest-groups] load guest catalog error", error);
      setGuestCatalog([]);
    } finally {
      setIsLoadingGuestCatalog(false);
    }
  }, [sessionUserId]);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    void loadGuestCatalog();
  }, [loadGuestCatalog]);

  const handleCreateGroup = async () => {
    const nextName = String(groupNameDraft || "").trim();
    if (!nextName) {
      setFeedbackType("error");
      setFeedback(t("guest_groups_group_required"));
      return;
    }
    if (!sessionUserId || !supabase) {
      setFeedbackType("error");
      setFeedback(t("guest_groups_create_error"));
      return;
    }
    setIsCreatingGroup(true);
    setFeedback("");
    try {
      const { data, error } = await supabase
        .from("guest_groups")
        .insert({
          host_id: sessionUserId,
          name: nextName
        })
        .select("id, name, created_at")
        .single();
      if (error) throw error;
      if (!data?.id) throw new Error("group_insert_empty");
      setGroups((prev) => [data, ...prev]);
      setMembersByGroupId((prev) => ({ ...prev, [data.id]: [] }));
      setSelectedGroupId(data.id);
      setGroupNameDraft("");
      setMobileDetailOpen(true);
      setFeedbackType("success");
      setFeedback(t("guest_groups_create_success"));
    } catch (error) {
      console.error("[guest-groups] create error", error);
      setFeedbackType("error");
      setFeedback(t("guest_groups_create_error"));
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const handleAddMemberFromGuest = async (guestItem) => {
    const safeGuestId = String(guestItem?.id || "").trim();
    const normalizedEmail = normalizeEmail(guestItem?.email);
    const normalizedPhone = normalizePhone(guestItem?.phone);
    const normalizedName = `${guestItem?.first_name || ""} ${guestItem?.last_name || ""}`.trim();
    if (!selectedGroupId) {
      setFeedbackType("error");
      setFeedback(t("guest_groups_group_required"));
      return;
    }
    if (!normalizedEmail && !normalizedPhone) {
      setFeedbackType("error");
      setFeedback(t("guest_groups_missing_guest_contact"));
      return;
    }
    setAddingGuestId(safeGuestId);
    setFeedback("");
    try {
      const { data, error } = await supabase
        .from("guest_group_members")
        .insert({
          group_id: selectedGroupId,
          guest_id: safeGuestId || null,
          guest_name: normalizedName || null,
          guest_email: normalizedEmail || null,
          guest_phone: normalizedPhone || null
        })
        .select("id, group_id, guest_id, guest_name, guest_email, guest_phone, created_at")
        .single();
      if (error) throw error;
      setMembersByGroupId((prev) => ({
        ...prev,
        [selectedGroupId]: [...(prev[selectedGroupId] || []), data]
      }));
      setGuestSearchDraft("");
      setFeedbackType("success");
      setFeedback(t("guest_groups_member_add_success"));
    } catch (error) {
      console.error("[guest-groups] add member error", error);
      if (String(error?.code || "") === "23505") {
        setFeedbackType("error");
        setFeedback(t("guest_groups_member_duplicate"));
      } else {
        setFeedbackType("error");
        setFeedback(t("guest_groups_member_add_error"));
      }
    } finally {
      setAddingGuestId("");
    }
  };

  const handleRemoveMember = async (memberId) => {
    const safeMemberId = String(memberId || "").trim();
    if (!safeMemberId || !selectedGroupId) return;
    setRemovingMemberId(safeMemberId);
    setFeedback("");
    try {
      const { error } = await supabase
        .from("guest_group_members")
        .delete()
        .eq("id", safeMemberId)
        .eq("group_id", selectedGroupId);
      if (error) throw error;
      setMembersByGroupId((prev) => ({
        ...prev,
        [selectedGroupId]: (prev[selectedGroupId] || []).filter((item) => item.id !== safeMemberId)
      }));
      setFeedbackType("success");
      setFeedback(t("guest_groups_member_remove_success"));
    } catch (error) {
      console.error("[guest-groups] remove member error", error);
      setFeedbackType("error");
      setFeedback(t("guest_groups_member_remove_error"));
    } finally {
      setRemovingMemberId("");
    }
  };

  const handleDeleteGroup = async (groupId) => {
    const safeGroupId = String(groupId || "").trim();
    if (!safeGroupId || !supabase) return;
    const groupToDelete = groups.find((groupItem) => groupItem.id === safeGroupId);
    const groupName = String(groupToDelete?.name || "").trim() || t("guest_groups_title");
    const confirmText = String(t("guest_groups_delete_confirm")).replace("{name}", groupName);
    if (!window.confirm(confirmText)) return;
    setIsDeletingGroupId(safeGroupId);
    setFeedback("");
    try {
      const { error } = await supabase.from("guest_groups").delete().eq("id", safeGroupId);
      if (error) throw error;
      setGroups((prev) => {
        const nextGroups = prev.filter((groupItem) => groupItem.id !== safeGroupId);
        const nextSelected = nextGroups[0]?.id || "";
        setSelectedGroupId((currentSelected) => (currentSelected === safeGroupId ? nextSelected : currentSelected));
        if (!nextGroups.length) {
          setMobileDetailOpen(false);
        }
        return nextGroups;
      });
      setMembersByGroupId((prev) => {
        const next = { ...prev };
        delete next[safeGroupId];
        return next;
      });
      setFeedbackType("success");
      setFeedback(t("guest_groups_delete_success"));
    } catch (error) {
      console.error("[guest-groups] delete group error", error);
      setFeedbackType("error");
      setFeedback(t("guest_groups_delete_error"));
    } finally {
      setIsDeletingGroupId("");
    }
  };

  const handleStartRenameGroup = (groupItem) => {
    const safeGroupId = String(groupItem?.id || "").trim();
    if (!safeGroupId) return;
    setEditingGroupId(safeGroupId);
    setEditingGroupNameDraft(String(groupItem?.name || "").trim());
    setFeedback("");
  };

  const handleCancelRenameGroup = () => {
    setEditingGroupId("");
    setEditingGroupNameDraft("");
    setIsRenamingGroupId("");
  };

  const handleSaveRenameGroup = async (groupId) => {
    const safeGroupId = String(groupId || "").trim();
    const nextName = String(editingGroupNameDraft || "").trim();
    if (!safeGroupId || !nextName) {
      setFeedbackType("error");
      setFeedback(t("guest_groups_group_required"));
      return;
    }
    if (!supabase) {
      setFeedbackType("error");
      setFeedback(t("guest_groups_rename_error"));
      return;
    }

    setIsRenamingGroupId(safeGroupId);
    setFeedback("");
    try {
      const { error } = await supabase
        .from("guest_groups")
        .update({ name: nextName })
        .eq("id", safeGroupId);
      if (error) throw error;

      setGroups((prev) =>
        prev.map((groupItem) =>
          groupItem.id === safeGroupId
            ? {
                ...groupItem,
                name: nextName
              }
            : groupItem
        )
      );
      setFeedbackType("success");
      setFeedback(t("guest_groups_rename_success"));
      handleCancelRenameGroup();
    } catch (error) {
      console.error("[guest-groups] rename group error", error);
      setFeedbackType("error");
      setFeedback(t("guest_groups_rename_error"));
      setIsRenamingGroupId("");
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
              className="px-4 py-2 text-sm font-bold rounded-lg transition-colors text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10"
              onClick={() => {
                setMobileDetailOpen(false);
                openWorkspace?.("guests", "latest");
              }}
            >
              {t("guest_people_tab")}
            </button>
            <button
              type="button"
              className="px-4 py-2 text-sm font-bold rounded-lg transition-colors bg-blue-600 text-white"
              onClick={() => openWorkspace?.("guests", "groups")}
            >
              {t("guest_groups_tab")}
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {feedback ? <InlineMessage type={feedbackType} text={feedback} /> : null}

          <div className={`grid grid-cols-1 ${groups.length > 0 ? "lg:grid-cols-[320px,1fr]" : "lg:grid-cols-1"} gap-4`}>
            <aside className={`space-y-4 ${groups.length > 0 && mobileDetailOpen ? "hidden lg:block" : "block"}`}>
              <article className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/75 dark:bg-gray-900/60 backdrop-blur-sm shadow-sm p-4">
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">
                  {t("guest_groups_create_label")}
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 bg-white/80 dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white"
                    placeholder={t("guest_groups_create_placeholder")}
                    value={groupNameDraft}
                    onChange={(event) => setGroupNameDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void handleCreateGroup();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleCreateGroup}
                    disabled={isCreatingGroup}
                    className="inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
                  >
                    <Icon name="plus" className="w-4 h-4" />
                    {isCreatingGroup ? t("guest_groups_loading_short") : t("guest_groups_create_action")}
                  </button>
                </div>
              </article>

              <article className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/75 dark:bg-gray-900/60 backdrop-blur-sm shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-black/10 dark:border-white/10">
                  <h3 className="text-sm font-black text-gray-900 dark:text-white">{t("guest_groups_title")}</h3>
                </div>

                {isLoadingGroups ? (
                  <div className="p-4 text-sm text-gray-500 dark:text-gray-400">{t("guest_groups_loading")}</div>
                ) : groups.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t("guest_groups_empty_title")}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t("guest_groups_empty_hint")}</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-black/10 dark:divide-white/10">
                    {groups.map((groupItem) => {
                      const isSelected = groupItem.id === selectedGroupId;
                      const isEditing = editingGroupId === groupItem.id;
                      const memberCount = (membersByGroupId[groupItem.id] || []).length;
                      return (
                        <li key={groupItem.id}>
                          <div
                            className={`w-full px-4 py-3 text-left transition-colors ${
                              isSelected ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-black/5 dark:hover:bg-white/5"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              {isEditing ? (
                                <div className="min-w-0 flex items-center gap-2 flex-1">
                                  <input
                                    type="text"
                                    className="min-w-0 flex-1 bg-white/90 dark:bg-black/30 border border-blue-300 dark:border-blue-700/50 rounded-lg px-2.5 py-1.5 text-sm font-bold text-gray-900 dark:text-white"
                                    value={editingGroupNameDraft}
                                    onChange={(event) => setEditingGroupNameDraft(event.target.value)}
                                    onKeyDown={(event) => {
                                      if (event.key === "Enter") {
                                        event.preventDefault();
                                        void handleSaveRenameGroup(groupItem.id);
                                      }
                                      if (event.key === "Escape") {
                                        event.preventDefault();
                                        handleCancelRenameGroup();
                                      }
                                    }}
                                  />
                                  <button
                                    type="button"
                                    className="inline-flex items-center rounded-md border border-green-300 px-1.5 py-1 text-green-600 hover:bg-green-50 dark:border-green-700/40 dark:text-green-300 dark:hover:bg-green-900/20"
                                    onClick={() => {
                                      void handleSaveRenameGroup(groupItem.id);
                                    }}
                                    disabled={isRenamingGroupId === groupItem.id}
                                    title={t("save")}
                                    aria-label={t("save")}
                                  >
                                    <Icon name="check" className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    className="inline-flex items-center rounded-md border border-gray-300 px-1.5 py-1 text-gray-600 hover:bg-gray-50 dark:border-white/20 dark:text-gray-300 dark:hover:bg-white/10"
                                    onClick={handleCancelRenameGroup}
                                    title={t("cancel")}
                                    aria-label={t("cancel")}
                                  >
                                    <Icon name="close" className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedGroupId(groupItem.id);
                                    setMobileDetailOpen(true);
                                  }}
                                  className="min-w-0 flex-1 text-left"
                                >
                                  <span className="text-sm font-bold text-gray-900 dark:text-white truncate">{groupItem.name}</span>
                                </button>
                              )}
                              <div className="inline-flex items-center gap-2">
                                <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                                  {formatMemberCount(memberCount)}
                                </span>
                                {!isEditing ? (
                                  <button
                                    type="button"
                                    onClick={() => handleStartRenameGroup(groupItem)}
                                    className="inline-flex items-center rounded-md border border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-700/40 dark:text-blue-300 dark:hover:bg-blue-900/20 px-1.5 py-1 transition-colors"
                                    title={t("guest_groups_rename_action")}
                                    aria-label={t("guest_groups_rename_action")}
                                  >
                                    <Icon name="edit" className="w-3.5 h-3.5" />
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!isDeletingGroupId || isDeletingGroupId === groupItem.id) {
                                      void handleDeleteGroup(groupItem.id);
                                    }
                                  }}
                                  className={`inline-flex items-center rounded-md border px-1.5 py-1 transition-colors ${
                                    isDeletingGroupId === groupItem.id
                                      ? "border-red-200 text-red-400 opacity-60"
                                      : "border-red-200 text-red-500 hover:bg-red-50 dark:border-red-800/40 dark:text-red-300 dark:hover:bg-red-900/20"
                                  }`}
                                  title={t("guest_groups_delete_action")}
                                  aria-label={t("guest_groups_delete_action")}
                                >
                                  <Icon name="trash" className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </article>
            </aside>

            {groups.length > 0 ? (
              <article className={`rounded-2xl border border-black/10 dark:border-white/10 bg-white/75 dark:bg-gray-900/60 backdrop-blur-sm shadow-sm ${mobileDetailOpen ? "block" : "hidden lg:block"}`}>
                {selectedGroup ? (
                  <div className="p-4 md:p-5 flex flex-col gap-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                          {t("guest_groups_members_title")}
                        </p>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-black text-gray-900 dark:text-white">{selectedGroup.name}</h3>
                          <button
                            type="button"
                            className="inline-flex items-center rounded-md border border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-700/40 dark:text-blue-300 dark:hover:bg-blue-900/20 px-1.5 py-1 transition-colors"
                            onClick={() => handleStartRenameGroup(selectedGroup)}
                            title={t("guest_groups_rename_action")}
                            aria-label={t("guest_groups_rename_action")}
                          >
                            <Icon name="edit" className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void handleDeleteGroup(selectedGroup.id)}
                          disabled={isDeletingGroupId === selectedGroup.id}
                          className="inline-flex items-center gap-1 rounded-xl border border-red-200 dark:border-red-900/30 px-3 py-2 text-xs font-bold text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-60"
                        >
                          <Icon name="trash" className="w-3.5 h-3.5" />
                          {t("guest_groups_delete_action")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setMobileDetailOpen(false)}
                          className="lg:hidden inline-flex items-center gap-1 rounded-xl border border-black/10 dark:border-white/10 px-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-200"
                        >
                          <Icon name="arrow_left" className="w-4 h-4" />
                          {t("guest_groups_mobile_back")}
                        </button>
                      </div>
                    </div>

                    <div className="rounded-xl border border-black/10 dark:border-white/10 overflow-hidden">
                      {selectedMembers.length === 0 ? (
                        <div className="p-6 text-center">
                          <p className="text-sm text-gray-600 dark:text-gray-300">{t("guest_groups_members_empty")}</p>
                        </div>
                      ) : (
                        <ul className="divide-y divide-black/10 dark:divide-white/10">
                          {selectedMembers.map((memberItem) => {
                            const displayName = String(memberItem.guest_name || "").trim();
                            const memberEmail = normalizeEmail(memberItem.guest_email);
                            const memberPhone = normalizePhone(memberItem.guest_phone);
                            return (
                              <li key={memberItem.id} className="px-4 py-3 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                    {displayName || memberEmail || memberPhone}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{memberEmail || memberPhone}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveMember(memberItem.id)}
                                  disabled={removingMemberId === memberItem.id}
                                  className="inline-flex items-center gap-1 rounded-lg border border-red-200 dark:border-red-900/30 px-2.5 py-1.5 text-xs font-bold text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-60"
                                >
                                  <Icon name="trash" className="w-3.5 h-3.5" />
                                  {t("guest_groups_member_remove_action")}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-[1fr,1fr,auto] gap-2">
                      <label className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          {t("guest_groups_search_guest_label")}
                        </span>
                        <input
                          type="search"
                          value={guestSearchDraft}
                          onChange={(event) => setGuestSearchDraft(event.target.value)}
                          placeholder={t("guest_groups_search_guest_placeholder")}
                          className="bg-white/80 dark:bg-black/30 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white"
                        />
                      </label>
                      <div className="md:self-end md:col-span-2 lg:col-span-1">
                        <button
                          type="button"
                          onClick={() => openWorkspace?.("guests", "create")}
                          className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
                        >
                          <Icon name="plus" className="w-4 h-4" />
                          {t("quick_create_guest")}
                        </button>
                      </div>
                    </div>

                    <div className="rounded-xl border border-black/10 dark:border-white/10 overflow-hidden">
                      <div className="px-4 py-3 border-b border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                          {t("guest_groups_available_guests")}
                        </p>
                      </div>
                      {isLoadingGuestCatalog ? (
                        <div className="p-4 text-sm text-gray-500 dark:text-gray-400">{t("guest_groups_loading")}</div>
                      ) : filteredGuestCandidates.length === 0 ? (
                        <div className="p-4 text-sm text-gray-500 dark:text-gray-400">
                          {t("guest_groups_no_guest_candidates")}
                        </div>
                      ) : (
                        <ul className="divide-y divide-black/10 dark:divide-white/10 max-h-72 overflow-y-auto">
                          {filteredGuestCandidates.map((guestItem) => {
                            const safeGuestId = String(guestItem?.id || "");
                            const displayName = getGuestDisplayName(guestItem);
                            const guestEmail = normalizeEmail(guestItem?.email);
                            const guestPhone = normalizePhone(guestItem?.phone);
                            return (
                              <li key={safeGuestId} className="px-4 py-3 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{displayName}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {guestEmail || guestPhone}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleAddMemberFromGuest(guestItem)}
                                  disabled={addingGuestId === safeGuestId}
                                  className="inline-flex items-center gap-1 rounded-lg border border-blue-200 dark:border-blue-900/30 px-2.5 py-1.5 text-xs font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-60"
                                >
                                  <Icon name="plus" className="w-3.5 h-3.5" />
                                  {addingGuestId === safeGuestId ? t("guest_groups_loading_short") : t("guest_groups_member_add_action")}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t("guest_groups_empty_title")}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t("guest_groups_empty_hint")}</p>
                  </div>
                )}
              </article>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
