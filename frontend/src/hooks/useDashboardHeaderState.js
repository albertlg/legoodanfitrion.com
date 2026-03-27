import { useMemo } from "react";

export function useDashboardHeaderState({
  activeView,
  eventsWorkspace,
  guestsWorkspace,
  invitationsWorkspace,
  selectedEventTitle,
  selectedGuestDetail,
  hostFirstName,
  activeViewItemLabelKey,
  t,
  interpolateText,
  openWorkspace,
  openInvitationBulkWorkspace,
  handleOpenImportWizard
}) {
  const sectionHeader = useMemo(() => {
    const selectedGuestName =
      selectedGuestDetail
        ? `${selectedGuestDetail.first_name || ""} ${selectedGuestDetail.last_name || ""}`.trim() || t("guest_detail_title")
        : t("guest_detail_title");
    if (activeView === "overview") {
      return {
        eyebrow: "",
        title: interpolateText(t("dashboard_welcome"), { name: hostFirstName }),
        subtitle: t("dashboard_welcome_subtitle")
      };
    }
    if (activeView === "profile") {
      return {
        eyebrow: "",
        title: t("host_profile_title"),
        subtitle: t("host_profile_hint")
      };
    }
    if (activeView === "events") {
      if (eventsWorkspace === "create") {
        return {
          eyebrow: "",
          title: t("create_event_title"),
          subtitle: t("help_event_form")
        };
      }
      if (eventsWorkspace === "plan") {
        return {
          eyebrow: "",
          title: t("event_planner_title"),
          subtitle: t("event_planner_hint")
        };
      }
      if (eventsWorkspace === "detail") {
        return {
          eyebrow: "",
          title: selectedEventTitle || t("event_detail_title"),
          subtitle: ""
        };
      }
      if (eventsWorkspace === "insights") {
        return {
          eyebrow: "",
          title: t("smart_hosting_title"),
          subtitle: t("smart_hosting_hint")
        };
      }
      return {
        eyebrow: "",
        title: t("nav_events"),
        subtitle: t("header_events_subtitle")
      };
    }
    if (activeView === "guests") {
      if (guestsWorkspace === "create") {
        return {
          eyebrow: "",
          title: t("create_guest_title"),
          subtitle: t("help_guest_form")
        };
      }
      if (guestsWorkspace === "groups") {
        return {
          eyebrow: "",
          title: t("guest_groups_title"),
          subtitle: t("guest_groups_hint")
        };
      }
      if (guestsWorkspace === "detail") {
        return {
          eyebrow: "",
          title: selectedGuestName,
          subtitle: ""
        };
      }
      return {
        eyebrow: "",
        title: t("nav_guests"),
        subtitle: t("header_guests_subtitle")
      };
    }
    if (activeView === "invitations") {
      if (invitationsWorkspace === "create") {
        return {
          eyebrow: "",
          title: t("create_invitation_title"),
          subtitle: t("help_invitation_form")
        };
      }
      return {
        eyebrow: "",
        title: t("nav_invitations"),
        subtitle: t("header_invitations_subtitle")
      };
    }
    return {
      eyebrow: "",
      title: t(activeViewItemLabelKey),
      subtitle: t("dashboard_welcome_subtitle")
    };
  }, [
    activeView,
    activeViewItemLabelKey,
    eventsWorkspace,
    guestsWorkspace,
    hostFirstName,
    invitationsWorkspace,
    interpolateText,
    selectedEventTitle,
    selectedGuestDetail,
    t
  ]);

  const contextualCreateAction =
    activeView === "overview" || activeView === "events"
      ? {
        icon: "calendar",
        label: t("quick_create_event"),
        onClick: () => openWorkspace("events", "create")
      }
      : activeView === "guests"
        ? {
          icon: "user",
          label: t("quick_create_guest"),
          onClick: () => openWorkspace("guests", "create")
        }
        : activeView === "invitations"
          ? {
            icon: "mail",
            label: t("quick_create_invitation"),
            onClick: () => openWorkspace("invitations", "create")
          }
          : null;

  const contextualSecondaryAction =
    activeView === "invitations" && invitationsWorkspace === "latest"
      ? {
        icon: "message",
        label: t("invitation_bulk_title"),
        onClick: openInvitationBulkWorkspace
      }
      : activeView === "guests" && guestsWorkspace === "latest"
        ? {
          icon: "link",
          label: t("contact_import_title"),
          onClick: handleOpenImportWizard
        }
        : null;

  const hideDashboardHeader =
    (activeView === "events" && ["detail", "plan"].includes(eventsWorkspace)) ||
    (activeView === "guests" && guestsWorkspace === "detail");

  return {
    sectionHeader,
    contextualCreateAction,
    contextualSecondaryAction,
    hideDashboardHeader
  };
}
