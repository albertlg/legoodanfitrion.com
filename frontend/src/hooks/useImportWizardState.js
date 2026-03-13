import { useState } from "react";

export function useImportWizardState({
  initialImportWizardSource = "csv",
  importPreviewPageSizeDefault
}) {
  const [importContactsDraft, setImportContactsDraft] = useState("");
  const [importContactsPreview, setImportContactsPreview] = useState([]);
  const [isImportWizardOpen, setIsImportWizardOpen] = useState(false);
  const [importWizardStep, setImportWizardStep] = useState(1);
  const [importWizardSource, setImportWizardSource] = useState(initialImportWizardSource || "csv");
  const [importWizardUploadedFileName, setImportWizardUploadedFileName] = useState("");
  const [importWizardShareEmail, setImportWizardShareEmail] = useState("");
  const [importWizardShareMessage, setImportWizardShareMessage] = useState("");
  const [importWizardQrDataUrl, setImportWizardQrDataUrl] = useState("");
  const [importWizardResult, setImportWizardResult] = useState({
    imported: 0,
    updated: 0,
    failed: 0,
    skipped: 0,
    selected: 0,
    partial: false
  });
  const [importContactsSearch, setImportContactsSearch] = useState("");
  const [importContactsGroupFilter, setImportContactsGroupFilter] = useState("all");
  const [importContactsPotentialFilter, setImportContactsPotentialFilter] = useState("all");
  const [importContactsSourceFilter, setImportContactsSourceFilter] = useState("all");
  const [importContactsSort, setImportContactsSort] = useState("priority");
  const [importDuplicateMode, setImportDuplicateMode] = useState("skip");
  const [selectedImportContactIds, setSelectedImportContactIds] = useState([]);
  const [approvedLowConfidenceMergeIds, setApprovedLowConfidenceMergeIds] = useState([]);
  const [pendingImportMergeApprovalPreviewId, setPendingImportMergeApprovalPreviewId] = useState("");
  const [importMergeReviewShowOnlyWillFill, setImportMergeReviewShowOnlyWillFill] = useState(true);
  const [pendingImportMergeSelectedFieldKeys, setPendingImportMergeSelectedFieldKeys] = useState([]);
  const [approvedLowConfidenceMergeFieldsByPreviewId, setApprovedLowConfidenceMergeFieldsByPreviewId] = useState({});
  const [importContactsPage, setImportContactsPage] = useState(1);
  const [importContactsPageSize, setImportContactsPageSize] = useState(importPreviewPageSizeDefault);
  const [importContactsMessage, setImportContactsMessage] = useState("");
  const [isImportingContacts, setIsImportingContacts] = useState(false);
  const [isImportingGoogleContacts, setIsImportingGoogleContacts] = useState(false);

  return {
    importContactsDraft,
    setImportContactsDraft,
    importContactsPreview,
    setImportContactsPreview,
    isImportWizardOpen,
    setIsImportWizardOpen,
    importWizardStep,
    setImportWizardStep,
    importWizardSource,
    setImportWizardSource,
    importWizardUploadedFileName,
    setImportWizardUploadedFileName,
    importWizardShareEmail,
    setImportWizardShareEmail,
    importWizardShareMessage,
    setImportWizardShareMessage,
    importWizardQrDataUrl,
    setImportWizardQrDataUrl,
    importWizardResult,
    setImportWizardResult,
    importContactsSearch,
    setImportContactsSearch,
    importContactsGroupFilter,
    setImportContactsGroupFilter,
    importContactsPotentialFilter,
    setImportContactsPotentialFilter,
    importContactsSourceFilter,
    setImportContactsSourceFilter,
    importContactsSort,
    setImportContactsSort,
    importDuplicateMode,
    setImportDuplicateMode,
    selectedImportContactIds,
    setSelectedImportContactIds,
    approvedLowConfidenceMergeIds,
    setApprovedLowConfidenceMergeIds,
    pendingImportMergeApprovalPreviewId,
    setPendingImportMergeApprovalPreviewId,
    importMergeReviewShowOnlyWillFill,
    setImportMergeReviewShowOnlyWillFill,
    pendingImportMergeSelectedFieldKeys,
    setPendingImportMergeSelectedFieldKeys,
    approvedLowConfidenceMergeFieldsByPreviewId,
    setApprovedLowConfidenceMergeFieldsByPreviewId,
    importContactsPage,
    setImportContactsPage,
    importContactsPageSize,
    setImportContactsPageSize,
    importContactsMessage,
    setImportContactsMessage,
    isImportingContacts,
    setIsImportingContacts,
    isImportingGoogleContacts,
    setIsImportingGoogleContacts
  };
}
