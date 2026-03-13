import { useState } from "react";

export function useDashboardNavigationState(initialRouteState) {
  const [activeView, setActiveView] = useState(initialRouteState.activeView);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [eventsWorkspace, setEventsWorkspace] = useState(initialRouteState.eventsWorkspace);
  const [guestsWorkspace, setGuestsWorkspace] = useState(initialRouteState.guestsWorkspace);
  const [invitationsWorkspace, setInvitationsWorkspace] = useState(initialRouteState.invitationsWorkspace);
  const [selectedEventDetailId, setSelectedEventDetailId] = useState(initialRouteState.selectedEventDetailId);
  const [selectedGuestDetailId, setSelectedGuestDetailId] = useState(initialRouteState.selectedGuestDetailId);
  const [eventDetailPlannerTab, setEventDetailPlannerTab] = useState(initialRouteState.eventPlannerTab || "menu");
  const [eventPlannerShoppingFilter, setEventPlannerShoppingFilter] = useState("all");
  const [guestProfileViewTab, setGuestProfileViewTab] = useState(initialRouteState.guestProfileViewTab || "general");
  const [openGuestAdvancedOnCreate, setOpenGuestAdvancedOnCreate] = useState(false);
  const [guestAdvancedEditTab, setGuestAdvancedEditTab] = useState(initialRouteState.guestAdvancedEditTab || "identity");
  const [isCompactViewport, setIsCompactViewport] = useState(
    () => (typeof window !== "undefined" ? window.matchMedia("(max-width: 900px)").matches : false)
  );

  return {
    activeView,
    setActiveView,
    isMenuOpen,
    setIsMenuOpen,
    eventsWorkspace,
    setEventsWorkspace,
    guestsWorkspace,
    setGuestsWorkspace,
    invitationsWorkspace,
    setInvitationsWorkspace,
    selectedEventDetailId,
    setSelectedEventDetailId,
    selectedGuestDetailId,
    setSelectedGuestDetailId,
    eventDetailPlannerTab,
    setEventDetailPlannerTab,
    eventPlannerShoppingFilter,
    setEventPlannerShoppingFilter,
    guestProfileViewTab,
    setGuestProfileViewTab,
    openGuestAdvancedOnCreate,
    setOpenGuestAdvancedOnCreate,
    guestAdvancedEditTab,
    setGuestAdvancedEditTab,
    isCompactViewport,
    setIsCompactViewport
  };
}
