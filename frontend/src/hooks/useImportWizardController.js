import { useCallback, useEffect, useMemo } from "react";
import { IMPORT_WIZARD_STEP_TOTAL } from "../lib/constants";
import {
  calculateImportContactCaptureScore,
  buildGuestFingerprint,
  buildGuestMatchingKeys,
  getImportDuplicateMergeConfidence,
  getImportDuplicateReasonCodes,
  getImportPotentialLevel,
  normalizeEmailKey,
  normalizePhoneKey,
  normalizeImportSource,
  toContactGroupsList
} from "../lib/guest-helpers";
import { interpolateText, isBlankValue, normalizeIsoDate, uniqueValues } from "../lib/formatters";

export function useImportWizardController({
  t,
  language,
  buildAppUrl,
  importContactsPreview,
  importDuplicateMode,
  ownerGuestCandidateId,
  approvedLowConfidenceMergeIds,
  setApprovedLowConfidenceMergeIds,
  findExistingGuestForContact,
  guestsById,
  selectedImportContactIds,
  setSelectedImportContactIds,
  importContactsSearch,
  importContactsGroupFilter,
  importContactsPotentialFilter,
  importContactsSourceFilter,
  importContactsSort,
  importContactsPage,
  setImportContactsPage,
  importContactsPageSize,
  pendingImportMergeApprovalPreviewId,
  setPendingImportMergeApprovalPreviewId,
  importMergeReviewShowOnlyWillFill,
  setImportMergeReviewShowOnlyWillFill,
  pendingImportMergeSelectedFieldKeys,
  setPendingImportMergeSelectedFieldKeys,
  approvedLowConfidenceMergeFieldsByPreviewId,
  setApprovedLowConfidenceMergeFieldsByPreviewId,
  isImportWizardOpen,
  setIsImportWizardOpen,
  importWizardStep,
  setImportWizardStep,
  importWizardSource,
  importWizardResult,
  isImportingContacts,
  setImportContactsMessage,
  setImportDuplicateMode,
  handleCloseImportWizard,
  handleImportContacts,
  canUseNativeShare,
  importWizardShareEmail,
  setImportWizardShareMessage,
  setImportWizardQrDataUrl,
  activeView,
  guestsWorkspace
}) {
  const importContactsAnalysis = useMemo(() => {
    const seenInPreview = new Set();
    return importContactsPreview.map((contactItem, index) => {
      const firstName = String(contactItem?.firstName || "").trim();
      const lastName = String(contactItem?.lastName || "").trim();
      const email = String(contactItem?.email || "").trim();
      const phone = String(contactItem?.phone || "").trim();
      const birthday = normalizeIsoDate(contactItem?.birthday);
      const photoUrl = String(contactItem?.photoUrl || "").trim();
      const groups = toContactGroupsList(contactItem);
      const importSource = normalizeImportSource(contactItem?.importSource);
      const fingerprint = buildGuestFingerprint({ firstName, lastName, email, phone });
      const matchingKeys = buildGuestMatchingKeys({ firstName, lastName, email, phone });
      const duplicateInPreview = matchingKeys.some((matchingKey) => seenInPreview.has(matchingKey));
      matchingKeys.forEach((matchingKey) => seenInPreview.add(matchingKey));
      const existingGuest = findExistingGuestForContact({ firstName, lastName, email, phone });
      const duplicateExisting = Boolean(existingGuest);
      const willMerge = duplicateExisting && importDuplicateMode === "merge";
      const duplicateReasonCodes = getImportDuplicateReasonCodes({
        firstName,
        lastName,
        email,
        phone,
        existingGuest,
        ownerGuestId: ownerGuestCandidateId || ""
      });
      const duplicateMergeConfidence = getImportDuplicateMergeConfidence(duplicateReasonCodes);
      const duplicateReasonLabel = duplicateReasonCodes
        .map((reasonCode) => t(`contact_import_match_reason_${reasonCode}`))
        .filter(Boolean)
        .join(" · ");
      const previewId = fingerprint ? `fp:${fingerprint}` : `idx:${index}`;
      const requiresMergeApproval = Boolean(
        duplicateExisting &&
        willMerge &&
        duplicateMergeConfidence === "low" &&
        !approvedLowConfidenceMergeIds.includes(previewId)
      );
      const existingGuestName =
        duplicateExisting && existingGuest
          ? `${existingGuest.first_name || ""} ${existingGuest.last_name || ""}`.trim() || t("field_guest")
          : "";
      const canImport = Boolean(
        (firstName || email || phone) &&
        !duplicateInPreview &&
        (!duplicateExisting || (willMerge && !requiresMergeApproval))
      );
      const hasDualChannel = Boolean(normalizeEmailKey(email) && normalizePhoneKey(phone));
      const captureScore = calculateImportContactCaptureScore({
        firstName,
        lastName,
        email,
        phone,
        city: String(contactItem?.city || "").trim(),
        country: String(contactItem?.country || "").trim(),
        address: String(contactItem?.address || "").trim(),
        company: String(contactItem?.company || "").trim(),
        birthday,
        photoUrl,
        groups
      });
      const potentialLevel = getImportPotentialLevel(captureScore);
      return {
        previewId,
        fingerprint,
        matchingKeys,
        existingGuestId: existingGuest?.id || "",
        existingGuestName,
        firstName,
        lastName,
        email,
        phone,
        birthday,
        photoUrl,
        groups,
        importSource,
        relationship: String(contactItem?.relationship || "").trim(),
        city: String(contactItem?.city || "").trim(),
        country: String(contactItem?.country || "").trim(),
        address: String(contactItem?.address || "").trim(),
        postalCode: String(contactItem?.postalCode || "").trim(),
        stateRegion: String(contactItem?.stateRegion || "").trim(),
        company: String(contactItem?.company || "").trim(),
        captureScore,
        potentialLevel,
        hasDualChannel,
        duplicateInPreview,
        duplicateExisting,
        duplicateReasonCodes,
        duplicateReasonLabel,
        duplicateMergeConfidence,
        requiresMergeApproval,
        willMerge,
        canImport
      };
    });
  }, [
    approvedLowConfidenceMergeIds,
    findExistingGuestForContact,
    importContactsPreview,
    importDuplicateMode,
    ownerGuestCandidateId,
    t
  ]);

  const importContactsGroupOptions = useMemo(
    () =>
      uniqueValues(
        importContactsAnalysis.flatMap((item) => (Array.isArray(item.groups) ? item.groups : []))
      ),
    [importContactsAnalysis]
  );

  const importContactsFiltered = useMemo(() => {
    const term = String(importContactsSearch || "").trim().toLowerCase();
    const groupFilter = String(importContactsGroupFilter || "all");
    const potentialFilter = String(importContactsPotentialFilter || "all");
    const sourceFilter = String(importContactsSourceFilter || "all");
    const sortBy = String(importContactsSort || "priority");
    const potentialWeight = { high: 3, medium: 2, low: 1 };
    const collator = new Intl.Collator(language, { sensitivity: "base", numeric: true });
    const compareByPriority = (a, b) => {
      if (a.canImport !== b.canImport) {
        return a.canImport ? -1 : 1;
      }
      if ((potentialWeight[b.potentialLevel] || 0) !== (potentialWeight[a.potentialLevel] || 0)) {
        return (potentialWeight[b.potentialLevel] || 0) - (potentialWeight[a.potentialLevel] || 0);
      }
      if (b.captureScore !== a.captureScore) {
        return b.captureScore - a.captureScore;
      }
      if (a.duplicateExisting !== b.duplicateExisting) {
        return a.duplicateExisting ? 1 : -1;
      }
      const nameA = `${a.firstName} ${a.lastName}`.trim();
      const nameB = `${b.firstName} ${b.lastName}`.trim();
      return collator.compare(nameA, nameB);
    };

    return importContactsAnalysis
      .filter((item) => {
        const matchesGroup = groupFilter === "all" || (Array.isArray(item.groups) && item.groups.includes(groupFilter));
        const matchesPotential = potentialFilter === "all" || item.potentialLevel === potentialFilter;
        const matchesSource = sourceFilter === "all" || item.importSource === sourceFilter;
        if (!matchesGroup || !matchesPotential || !matchesSource) {
          return false;
        }
        if (!term) {
          return true;
        }
        const groupsText = Array.isArray(item.groups) ? item.groups.join(" ") : "";
        const haystack = `${item.firstName} ${item.lastName} ${item.email} ${item.phone} ${item.city} ${item.country} ${groupsText}`.toLowerCase();
        return haystack.includes(term);
      })
      .sort((a, b) => {
        const nameA = `${a.firstName} ${a.lastName}`.trim();
        const nameB = `${b.firstName} ${b.lastName}`.trim();
        if (sortBy === "score_desc") {
          if (b.captureScore !== a.captureScore) {
            return b.captureScore - a.captureScore;
          }
          return collator.compare(nameA, nameB);
        }
        if (sortBy === "score_asc") {
          if (a.captureScore !== b.captureScore) {
            return a.captureScore - b.captureScore;
          }
          return collator.compare(nameA, nameB);
        }
        if (sortBy === "name_desc") {
          return collator.compare(nameB, nameA);
        }
        if (sortBy === "name_asc") {
          return collator.compare(nameA, nameB);
        }
        return compareByPriority(a, b);
      });
  }, [
    importContactsAnalysis,
    importContactsGroupFilter,
    importContactsPotentialFilter,
    importContactsSourceFilter,
    importContactsSort,
    importContactsSearch,
    language
  ]);

  const importContactsFilteredReady = useMemo(
    () => importContactsFiltered.filter((item) => item.canImport),
    [importContactsFiltered]
  );
  const importContactsSuggested = useMemo(
    () =>
      importContactsFiltered.filter(
        (item) =>
          item.canImport &&
          !item.duplicateInPreview &&
          (item.potentialLevel === "high" || (item.potentialLevel === "medium" && item.hasDualChannel))
      ),
    [importContactsFiltered]
  );
  const importContactsReady = useMemo(() => importContactsAnalysis.filter((item) => item.canImport), [importContactsAnalysis]);
  const importContactsSelectedReady = useMemo(
    () => importContactsReady.filter((item) => selectedImportContactIds.includes(item.previewId)),
    [importContactsReady, selectedImportContactIds]
  );
  const importContactsStatusSummary = useMemo(
    () =>
      importContactsAnalysis.reduce(
        (acc, item) => {
          if (item.canImport) {
            acc.ready += 1;
            if (item.potentialLevel === "high") {
              acc.highPotential += 1;
            } else if (item.potentialLevel === "medium") {
              acc.mediumPotential += 1;
            } else {
              acc.lowPotential += 1;
            }
          }
          if (item.duplicateExisting) {
            acc.duplicateExisting += 1;
          }
          if (item.duplicateInPreview) {
            acc.duplicateInPreview += 1;
          }
          return acc;
        },
        { ready: 0, highPotential: 0, mediumPotential: 0, lowPotential: 0, duplicateExisting: 0, duplicateInPreview: 0 }
      ),
    [importContactsAnalysis]
  );
  const importContactsDuplicateCount = useMemo(
    () => importContactsAnalysis.filter((item) => item.duplicateExisting || item.duplicateInPreview).length,
    [importContactsAnalysis]
  );

  const importWizardMobileLink = useMemo(() => buildAppUrl("/app/guests?import=mobile&wizard=1"), [buildAppUrl]);
  useEffect(() => {
    let isDisposed = false;
    const generateQrDataUrl = async () => {
      try {
        const qrcodeModule = await import("qrcode");
        const qrDataUrl = await qrcodeModule.toDataURL(importWizardMobileLink, {
          width: 180,
          margin: 1,
          color: {
            dark: "#1a2332",
            light: "#ffffff"
          }
        });
        if (!isDisposed) {
          setImportWizardQrDataUrl(qrDataUrl);
        }
      } catch {
        if (!isDisposed) {
          setImportWizardQrDataUrl("");
        }
      }
    };
    generateQrDataUrl();
    return () => {
      isDisposed = true;
    };
  }, [importWizardMobileLink, setImportWizardQrDataUrl]);

  const importWizardStepLabel = useMemo(
    () =>
      interpolateText(t("import_wizard_step_indicator"), {
        step: importWizardStep,
        total: IMPORT_WIZARD_STEP_TOTAL
      }),
    [importWizardStep, t]
  );
  const importWizardStepTitle = useMemo(() => {
    if (importWizardStep === 1) {
      return t("import_wizard_step_1_title");
    }
    if (importWizardStep === 2) {
      if (importWizardSource === "gmail") {
        return t("import_wizard_step_2_gmail_title");
      }
      if (importWizardSource === "mobile") {
        return t("import_wizard_step_2_mobile_title");
      }
      return t("import_wizard_step_2_csv_title");
    }
    if (importWizardStep === 3) {
      return t("import_wizard_step_3_title");
    }
    return importWizardResult.partial ? t("import_wizard_step_4_error_title") : t("import_wizard_step_4_success_title");
  }, [importWizardResult.partial, importWizardSource, importWizardStep, t]);
  const importWizardStepHint = useMemo(() => {
    if (importWizardStep === 1) {
      return t("import_wizard_step_1_hint");
    }
    if (importWizardStep === 2) {
      if (importWizardSource === "gmail") {
        return t("import_wizard_step_2_gmail_hint");
      }
      if (importWizardSource === "mobile") {
        return t("import_wizard_step_2_mobile_hint");
      }
      return t("import_wizard_step_2_csv_hint");
    }
    if (importWizardStep === 3) {
      return t("import_wizard_step_3_hint");
    }
    return importWizardResult.partial ? t("import_wizard_step_4_error_hint") : t("import_wizard_step_4_success_hint");
  }, [importWizardResult.partial, importWizardSource, importWizardStep, t]);
  const importWizardContinueLabel = useMemo(() => {
    if (importWizardStep === 3) {
      return isImportingContacts
        ? t("contact_import_importing")
        : interpolateText(t("import_wizard_import_selected"), { count: importContactsSelectedReady.length });
    }
    if (importWizardStep === 4) {
      return t("import_wizard_finish");
    }
    return t("pagination_next");
  }, [importContactsSelectedReady.length, importWizardStep, isImportingContacts, t]);
  const importWizardCanContinue = useMemo(() => {
    if (importWizardStep === 1) {
      return Boolean(importWizardSource);
    }
    if (importWizardStep === 2) {
      return importContactsAnalysis.length > 0;
    }
    if (importWizardStep === 3) {
      return !isImportingContacts && importContactsSelectedReady.length > 0;
    }
    return true;
  }, [importWizardSource, importWizardStep, importContactsAnalysis.length, importContactsSelectedReady.length, isImportingContacts]);

  const importContactsTotalPages = useMemo(
    () => Math.max(1, Math.ceil(importContactsFiltered.length / importContactsPageSize)),
    [importContactsFiltered.length, importContactsPageSize]
  );
  const pagedImportContacts = useMemo(() => {
    const safePage = Math.min(importContactsPage, importContactsTotalPages);
    const start = (safePage - 1) * importContactsPageSize;
    return importContactsFiltered.slice(start, start + importContactsPageSize);
  }, [importContactsFiltered, importContactsPage, importContactsPageSize, importContactsTotalPages]);

  const pendingImportMergeApprovalItem = useMemo(
    () => importContactsAnalysis.find((item) => item.previewId === pendingImportMergeApprovalPreviewId) || null,
    [importContactsAnalysis, pendingImportMergeApprovalPreviewId]
  );
  const pendingImportMergeApprovalTargetGuest = useMemo(() => {
    if (!pendingImportMergeApprovalItem?.existingGuestId) {
      return null;
    }
    return guestsById[pendingImportMergeApprovalItem.existingGuestId] || null;
  }, [guestsById, pendingImportMergeApprovalItem]);
  const pendingImportMergeComparisonRows = useMemo(() => {
    if (!pendingImportMergeApprovalItem || !pendingImportMergeApprovalTargetGuest) {
      return [];
    }
    const sourceName = [pendingImportMergeApprovalItem.firstName, pendingImportMergeApprovalItem.lastName]
      .filter(Boolean)
      .join(" ");
    const targetName = [pendingImportMergeApprovalTargetGuest.first_name, pendingImportMergeApprovalTargetGuest.last_name]
      .filter(Boolean)
      .join(" ");
    const rows = [
      { fieldKey: "full_name", label: t("field_full_name"), source: sourceName, target: targetName },
      { fieldKey: "email", label: t("email"), source: pendingImportMergeApprovalItem.email, target: pendingImportMergeApprovalTargetGuest.email },
      { fieldKey: "phone", label: t("field_phone"), source: pendingImportMergeApprovalItem.phone, target: pendingImportMergeApprovalTargetGuest.phone },
      { fieldKey: "city", label: t("field_city"), source: pendingImportMergeApprovalItem.city, target: pendingImportMergeApprovalTargetGuest.city },
      { fieldKey: "country", label: t("field_country"), source: pendingImportMergeApprovalItem.country, target: pendingImportMergeApprovalTargetGuest.country },
      { fieldKey: "address", label: t("field_address"), source: pendingImportMergeApprovalItem.address, target: pendingImportMergeApprovalTargetGuest.address },
      { fieldKey: "company", label: t("field_company"), source: pendingImportMergeApprovalItem.company, target: pendingImportMergeApprovalTargetGuest.company },
      { fieldKey: "birthday", label: t("field_birthday"), source: pendingImportMergeApprovalItem.birthday, target: pendingImportMergeApprovalTargetGuest.birthday },
      {
        fieldKey: "avatar_url",
        label: t("field_guest_photo"),
        source: pendingImportMergeApprovalItem.photoUrl ? t("status_yes") : t("status_no"),
        target: pendingImportMergeApprovalTargetGuest.avatar_url ? t("status_yes") : t("status_no")
      }
    ];
    const rankedRows = rows.map((rowItem) => {
      const sourceBlank = isBlankValue(rowItem.source);
      const targetBlank = isBlankValue(rowItem.target);
      let mergeResultKey = "keep_target";
      if (!sourceBlank && targetBlank) {
        mergeResultKey = "will_fill";
      } else if (sourceBlank && targetBlank) {
        mergeResultKey = "empty";
      }
      return {
        ...rowItem,
        mergeResultKey,
        willFill: mergeResultKey === "will_fill"
      };
    });
    const resultOrder = { will_fill: 0, keep_target: 1, empty: 2 };
    return rankedRows.sort((a, b) => (resultOrder[a.mergeResultKey] ?? 99) - (resultOrder[b.mergeResultKey] ?? 99));
  }, [pendingImportMergeApprovalItem, pendingImportMergeApprovalTargetGuest, t]);
  const pendingImportMergeWillFillCount = useMemo(
    () => pendingImportMergeComparisonRows.filter((rowItem) => rowItem.willFill).length,
    [pendingImportMergeComparisonRows]
  );
  const pendingImportMergeVisibleRows = useMemo(() => {
    if (!importMergeReviewShowOnlyWillFill) {
      return pendingImportMergeComparisonRows;
    }
    return pendingImportMergeComparisonRows.filter((rowItem) => rowItem.willFill);
  }, [importMergeReviewShowOnlyWillFill, pendingImportMergeComparisonRows]);
  const pendingImportMergeVisibleCount = pendingImportMergeVisibleRows.length;
  const pendingImportMergeTotalCount = pendingImportMergeComparisonRows.length;
  const pendingImportMergeDefaultSelectedFieldKeys = useMemo(
    () => pendingImportMergeComparisonRows.filter((rowItem) => rowItem.willFill).map((rowItem) => rowItem.fieldKey),
    [pendingImportMergeComparisonRows]
  );
  const pendingImportMergeSelectedFieldKeysSet = useMemo(
    () => new Set(pendingImportMergeSelectedFieldKeys),
    [pendingImportMergeSelectedFieldKeys]
  );
  const pendingImportMergeSelectableCount = pendingImportMergeDefaultSelectedFieldKeys.length;

  useEffect(() => {
    const defaultIds = importContactsReady.map((item) => item.previewId);
    setSelectedImportContactIds(defaultIds);
  }, [importContactsReady, setSelectedImportContactIds]);
  useEffect(() => {
    setApprovedLowConfidenceMergeIds((prev) => {
      const validIds = new Set(importContactsAnalysis.map((item) => item.previewId));
      const next = prev.filter((id) => validIds.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [importContactsAnalysis, setApprovedLowConfidenceMergeIds]);
  useEffect(() => {
    setApprovedLowConfidenceMergeFieldsByPreviewId((prev) => {
      const validIds = new Set(importContactsAnalysis.map((item) => item.previewId));
      const entries = Object.entries(prev).filter(([previewId]) => validIds.has(previewId));
      if (entries.length === Object.keys(prev).length) {
        return prev;
      }
      return Object.fromEntries(entries);
    });
  }, [importContactsAnalysis, setApprovedLowConfidenceMergeFieldsByPreviewId]);
  useEffect(() => {
    if (!pendingImportMergeApprovalItem || !pendingImportMergeApprovalItem.requiresMergeApproval) {
      setPendingImportMergeApprovalPreviewId("");
    }
  }, [pendingImportMergeApprovalItem, setPendingImportMergeApprovalPreviewId]);
  useEffect(() => {
    if (!pendingImportMergeApprovalItem) {
      setPendingImportMergeSelectedFieldKeys([]);
      return;
    }
    const saved = approvedLowConfidenceMergeFieldsByPreviewId[pendingImportMergeApprovalItem.previewId];
    if (Array.isArray(saved) && saved.length > 0) {
      setPendingImportMergeSelectedFieldKeys(saved);
      return;
    }
    setPendingImportMergeSelectedFieldKeys(pendingImportMergeDefaultSelectedFieldKeys);
  }, [
    approvedLowConfidenceMergeFieldsByPreviewId,
    pendingImportMergeApprovalItem,
    pendingImportMergeDefaultSelectedFieldKeys,
    setPendingImportMergeSelectedFieldKeys
  ]);
  useEffect(() => {
    if (activeView !== "guests" || guestsWorkspace !== "latest") {
      setPendingImportMergeApprovalPreviewId("");
      setPendingImportMergeSelectedFieldKeys([]);
    }
  }, [activeView, guestsWorkspace, setPendingImportMergeApprovalPreviewId, setPendingImportMergeSelectedFieldKeys]);
  useEffect(() => {
    setImportContactsPage(1);
  }, [
    importContactsSearch,
    importContactsGroupFilter,
    importContactsPotentialFilter,
    importContactsSourceFilter,
    importContactsSort,
    importDuplicateMode,
    importContactsPageSize,
    importContactsPreview.length,
    setImportContactsPage
  ]);
  useEffect(() => {
    if (importContactsPage > importContactsTotalPages) {
      setImportContactsPage(importContactsTotalPages);
    }
  }, [importContactsPage, importContactsTotalPages, setImportContactsPage]);
  useEffect(() => {
    if (!isImportWizardOpen) {
      return undefined;
    }
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsImportWizardOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isImportWizardOpen, setIsImportWizardOpen]);
  useEffect(() => {
    if (typeof document === "undefined" || !isImportWizardOpen) {
      return undefined;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isImportWizardOpen]);

  const getSmartImportMergeSelection = (items) => {
    const duplicateCandidates = items.filter((item) => item.duplicateExisting && !item.duplicateInPreview);
    const safeCandidates = duplicateCandidates.filter((item) => item.canImport);
    return {
      duplicateCandidates,
      selectedCandidates: safeCandidates
    };
  };

  const handleImportWizardBack = () => {
    if (importWizardStep <= 1) {
      handleCloseImportWizard();
      return;
    }
    if (importWizardStep === 4) {
      handleCloseImportWizard();
      return;
    }
    setImportWizardStep((prev) => Math.max(1, prev - 1));
  };

  const handleImportWizardContinue = async () => {
    if (importWizardStep === 1) {
      setImportContactsMessage("");
      setImportWizardStep(2);
      return;
    }
    if (importWizardStep === 2) {
      if (importContactsAnalysis.length === 0) {
        setImportContactsMessage(t("contact_import_no_matches"));
        return;
      }
      setImportWizardStep(3);
      return;
    }
    if (importWizardStep === 3) {
      await handleImportContacts({ fromWizard: true });
      return;
    }
    handleCloseImportWizard();
  };

  const handleImportWizardEmailLink = () => {
    const nextEmail = String(importWizardShareEmail || "").trim();
    const subject = encodeURIComponent(t("import_wizard_mobile_email_subject"));
    const body = encodeURIComponent(
      `${t("import_wizard_mobile_email_body")}\n${importWizardMobileLink}`
    );
    const mailToEmail = nextEmail ? nextEmail : "";
    window.open(`mailto:${mailToEmail}?subject=${subject}&body=${body}`, "_blank", "noopener,noreferrer");
    setImportWizardShareMessage(t("import_wizard_mobile_email_sent"));
  };

  const handleShareImportWizardLink = async () => {
    if (canUseNativeShare) {
      try {
        await navigator.share({
          title: t("import_wizard_mobile_share_title"),
          text: t("import_wizard_mobile_share_text"),
          url: importWizardMobileLink
        });
        setImportWizardShareMessage(t("import_wizard_mobile_share_sent"));
        return;
      } catch (error) {
        if (error?.name === "AbortError") {
          return;
        }
      }
    }
    try {
      await navigator.clipboard.writeText(importWizardMobileLink);
      setImportWizardShareMessage(t("copy_ok"));
    } catch {
      setImportWizardShareMessage(t("copy_fail"));
    }
  };

  const handleSelectAllReadyImportContacts = () => {
    setSelectedImportContactIds(importContactsReady.map((item) => item.previewId));
  };
  const handleSelectSuggestedImportContacts = () => {
    setSelectedImportContactIds(importContactsSuggested.map((item) => item.previewId));
  };
  const handleClearReadyImportContactsSelection = () => {
    setSelectedImportContactIds([]);
  };
  const handleSelectFilteredReadyImportContacts = () => {
    setSelectedImportContactIds(importContactsFilteredReady.map((item) => item.previewId));
  };
  const handleSelectCurrentImportPageReady = () => {
    setSelectedImportContactIds(pagedImportContacts.filter((item) => item.canImport).map((item) => item.previewId));
  };
  const handleSelectOnlyNewImportContacts = () => {
    setSelectedImportContactIds(
      importContactsFiltered
        .filter((item) => item.canImport && !item.duplicateExisting && !item.duplicateInPreview)
        .map((item) => item.previewId)
    );
  };
  const handleSelectHighPotentialImportContacts = () => {
    setSelectedImportContactIds(
      importContactsFiltered
        .filter((item) => item.canImport && item.potentialLevel === "high")
        .map((item) => item.previewId)
    );
  };
  const handleSelectDualChannelImportContacts = () => {
    setSelectedImportContactIds(
      importContactsFiltered
        .filter((item) => item.canImport && item.hasDualChannel)
        .map((item) => item.previewId)
    );
  };

  const handleImportDuplicateModeChange = (nextModeInput) => {
    const nextMode = nextModeInput === "merge" ? "merge" : "skip";
    setImportDuplicateMode(nextMode);
    if (nextMode !== "merge") {
      setApprovedLowConfidenceMergeIds([]);
      setApprovedLowConfidenceMergeFieldsByPreviewId({});
      setPendingImportMergeApprovalPreviewId("");
      setImportMergeReviewShowOnlyWillFill(true);
      setPendingImportMergeSelectedFieldKeys([]);
      return;
    }
    const { duplicateCandidates, selectedCandidates } = getSmartImportMergeSelection(importContactsFiltered);
    if (duplicateCandidates.length === 0 || selectedImportContactIds.length > 0) {
      return;
    }
    setSelectedImportContactIds(selectedCandidates.map((item) => item.previewId));
    setImportContactsMessage(
      interpolateText(t("contact_import_merge_smart_selected"), {
        selected: selectedCandidates.length,
        total: duplicateCandidates.length
      })
    );
  };

  const handleTogglePendingImportMergeFieldKey = (fieldKey) => {
    if (!fieldKey) {
      return;
    }
    setPendingImportMergeSelectedFieldKeys((prev) =>
      prev.includes(fieldKey) ? prev.filter((item) => item !== fieldKey) : [...prev, fieldKey]
    );
  };

  const getDefaultApprovedFieldKeysForImportItem = useCallback(
    (contactItem) => {
      if (!contactItem?.existingGuestId) {
        return [];
      }
      const targetGuest = guestsById[contactItem.existingGuestId];
      if (!targetGuest) {
        return [];
      }
      const sourceFullName = [contactItem.firstName, contactItem.lastName].filter(Boolean).join(" ");
      const targetFullName = [targetGuest.first_name, targetGuest.last_name].filter(Boolean).join(" ");
      const fieldChecks = [
        { key: "full_name", source: sourceFullName, target: targetFullName },
        { key: "email", source: contactItem.email, target: targetGuest.email },
        { key: "phone", source: contactItem.phone, target: targetGuest.phone },
        { key: "city", source: contactItem.city, target: targetGuest.city },
        { key: "country", source: contactItem.country, target: targetGuest.country },
        { key: "address", source: contactItem.address, target: targetGuest.address },
        { key: "company", source: contactItem.company, target: targetGuest.company },
        { key: "birthday", source: contactItem.birthday, target: targetGuest.birthday },
        { key: "avatar_url", source: contactItem.photoUrl, target: targetGuest.avatar_url }
      ];
      return fieldChecks.filter((item) => !isBlankValue(item.source) && isBlankValue(item.target)).map((item) => item.key);
    },
    [guestsById]
  );

  const handleApproveLowConfidenceMergeContact = (previewId, selectedFieldKeys = pendingImportMergeSelectedFieldKeys) => {
    if (!previewId) {
      return;
    }
    setImportDuplicateMode("merge");
    setApprovedLowConfidenceMergeIds((prev) => (prev.includes(previewId) ? prev : [...prev, previewId]));
    if (Array.isArray(selectedFieldKeys) && selectedFieldKeys.length > 0) {
      setApprovedLowConfidenceMergeFieldsByPreviewId((prev) => ({
        ...prev,
        [previewId]: uniqueValues(selectedFieldKeys)
      }));
    }
    setImportMergeReviewShowOnlyWillFill(true);
    setPendingImportMergeApprovalPreviewId("");
    setPendingImportMergeSelectedFieldKeys([]);
  };

  const handleOpenLowConfidenceMergeReview = (previewId) => {
    if (!previewId) {
      return;
    }
    const targetItem = importContactsAnalysis.find((item) => item.previewId === previewId);
    if (!targetItem?.requiresMergeApproval) {
      handleApproveLowConfidenceMergeContact(previewId);
      return;
    }
    setImportMergeReviewShowOnlyWillFill(true);
    setPendingImportMergeApprovalPreviewId(previewId);
  };

  const handleCloseLowConfidenceMergeReview = () => {
    setImportMergeReviewShowOnlyWillFill(true);
    setPendingImportMergeApprovalPreviewId("");
    setPendingImportMergeSelectedFieldKeys([]);
  };

  const handleConfirmLowConfidenceMergeReview = () => {
    if (!pendingImportMergeApprovalItem?.previewId) {
      return;
    }
    if (pendingImportMergeSelectableCount > 0 && pendingImportMergeSelectedFieldKeys.length === 0) {
      setImportContactsMessage(t("contact_import_merge_review_select_at_least_one"));
      return;
    }
    handleApproveLowConfidenceMergeContact(
      pendingImportMergeApprovalItem.previewId,
      pendingImportMergeSelectedFieldKeys
    );
  };

  const handleApproveAllLowConfidenceMergeContacts = () => {
    setImportDuplicateMode("merge");
    const pendingItems = importContactsFiltered.filter(
      (item) => item.duplicateExisting && item.duplicateMergeConfidence === "low" && !item.duplicateInPreview
    );
    const pendingIds = pendingItems.map((item) => item.previewId);
    if (pendingIds.length === 0) {
      return;
    }
    setApprovedLowConfidenceMergeIds((prev) => uniqueValues([...prev, ...pendingIds]));
    setApprovedLowConfidenceMergeFieldsByPreviewId((prev) => {
      const next = { ...prev };
      for (const pendingItem of pendingItems) {
        const fieldKeys = getDefaultApprovedFieldKeysForImportItem(pendingItem);
        if (fieldKeys.length > 0) {
          next[pendingItem.previewId] = uniqueValues(fieldKeys);
        }
      }
      return next;
    });
    setImportContactsMessage(
      interpolateText(t("contact_import_merge_low_approved"), {
        count: pendingIds.length
      })
    );
  };

  const handleSelectDuplicateMergeImportContacts = () => {
    setImportDuplicateMode("merge");
    const { duplicateCandidates, selectedCandidates } = getSmartImportMergeSelection(importContactsFiltered);
    setSelectedImportContactIds(selectedCandidates.map((item) => item.previewId));
    setImportContactsMessage(
      interpolateText(t("contact_import_merge_smart_selected"), {
        selected: selectedCandidates.length,
        total: duplicateCandidates.length
      })
    );
  };

  const toggleImportContactSelection = (previewId) => {
    setSelectedImportContactIds((prev) =>
      prev.includes(previewId) ? prev.filter((item) => item !== previewId) : [...prev, previewId]
    );
  };

  return {
    importContactsAnalysis,
    importContactsGroupOptions,
    importContactsFiltered,
    importContactsFilteredReady,
    importContactsSuggested,
    importContactsReady,
    importContactsSelectedReady,
    importContactsStatusSummary,
    importContactsDuplicateCount,
    importWizardMobileLink,
    importWizardStepLabel,
    importWizardStepTitle,
    importWizardStepHint,
    importWizardContinueLabel,
    importWizardCanContinue,
    importContactsTotalPages,
    pagedImportContacts,
    pendingImportMergeApprovalItem,
    pendingImportMergeComparisonRows,
    pendingImportMergeWillFillCount,
    pendingImportMergeVisibleRows,
    pendingImportMergeVisibleCount,
    pendingImportMergeTotalCount,
    pendingImportMergeSelectedFieldKeysSet,
    pendingImportMergeSelectableCount,
    handleImportWizardBack,
    handleImportWizardContinue,
    handleImportWizardEmailLink,
    handleShareImportWizardLink,
    handleSelectAllReadyImportContacts,
    handleSelectSuggestedImportContacts,
    handleClearReadyImportContactsSelection,
    handleSelectFilteredReadyImportContacts,
    handleSelectCurrentImportPageReady,
    handleSelectOnlyNewImportContacts,
    handleSelectHighPotentialImportContacts,
    handleSelectDualChannelImportContacts,
    handleImportDuplicateModeChange,
    handleTogglePendingImportMergeFieldKey,
    handleOpenLowConfidenceMergeReview,
    handleCloseLowConfidenceMergeReview,
    handleConfirmLowConfidenceMergeReview,
    handleApproveAllLowConfidenceMergeContacts,
    handleSelectDuplicateMergeImportContacts,
    toggleImportContactSelection
  };
}
