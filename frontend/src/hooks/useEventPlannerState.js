import { useState } from "react";

export function useEventPlannerState() {
  const [eventPlannerRegenerationByEventId, setEventPlannerRegenerationByEventId] = useState({});
  const [eventPlannerRegenerationByEventIdByTab, setEventPlannerRegenerationByEventIdByTab] = useState({});
  const [eventPlannerContextOverridesByEventId, setEventPlannerContextOverridesByEventId] = useState({});
  const [eventPlannerSnapshotsByEventId, setEventPlannerSnapshotsByEventId] = useState({});
  const [eventPlannerSnapshotHistoryByEventId, setEventPlannerSnapshotHistoryByEventId] = useState({});
  const [eventPlannerGenerationByEventId, setEventPlannerGenerationByEventId] = useState({});
  const [isEventPlannerContextOpen, setIsEventPlannerContextOpen] = useState(false);
  const [eventPlannerContextFocusField, setEventPlannerContextFocusField] = useState("");
  const [showEventPlannerTechnicalPrompt, setShowEventPlannerTechnicalPrompt] = useState(false);
  const [eventPlannerContextDraft, setEventPlannerContextDraft] = useState({
    preset: "social",
    momentKey: "evening",
    toneKey: "casual",
    budgetKey: "medium",
    durationHours: "4",
    allowPlusOne: false,
    autoReminders: false,
    dressCode: "none",
    playlistMode: "host_only",
    foodSuggestions: "",
    drinkSuggestions: "",
    avoidItems: "",
    medicalConditions: "",
    dietaryMedicalRestrictions: "",
    musicGenres: "",
    decorColors: "",
    icebreakers: "",
    tabooTopics: "",
    additionalInstructions: ""
  });
  const [eventDetailShoppingCheckedByEventId, setEventDetailShoppingCheckedByEventId] = useState({});

  return {
    eventPlannerRegenerationByEventId,
    setEventPlannerRegenerationByEventId,
    eventPlannerRegenerationByEventIdByTab,
    setEventPlannerRegenerationByEventIdByTab,
    eventPlannerContextOverridesByEventId,
    setEventPlannerContextOverridesByEventId,
    eventPlannerSnapshotsByEventId,
    setEventPlannerSnapshotsByEventId,
    eventPlannerSnapshotHistoryByEventId,
    setEventPlannerSnapshotHistoryByEventId,
    eventPlannerGenerationByEventId,
    setEventPlannerGenerationByEventId,
    isEventPlannerContextOpen,
    setIsEventPlannerContextOpen,
    eventPlannerContextFocusField,
    setEventPlannerContextFocusField,
    showEventPlannerTechnicalPrompt,
    setShowEventPlannerTechnicalPrompt,
    eventPlannerContextDraft,
    setEventPlannerContextDraft,
    eventDetailShoppingCheckedByEventId,
    setEventDetailShoppingCheckedByEventId
  };
}
