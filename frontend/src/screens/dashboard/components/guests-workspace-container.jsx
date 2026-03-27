import { GuestBuilderView } from "./guest-builder-view";
import { GuestDetailView } from "./guest-detail-view";
import { GuestGroupsView } from "./guest-groups-view";
import { GuestsListView } from "./guests-list-view";
import { MagicCard } from "./ui/magic-card";

function GuestsWorkspaceContainer(props) {
  const { routeGuestsWorkspace, WORKSPACE_ITEMS, t, openWorkspace } = props;

  return (
    <section className="workspace-shell view-transition">
      {routeGuestsWorkspace === "hub" ? (
        /* NUEVO HUB DE INVITADOS CON MAGIC CARDS */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-4 md:p-8 w-full max-w-6xl mx-auto">
          {WORKSPACE_ITEMS.guests
            .filter((item) => item.key !== "hub" && item.key !== "create")
            .map((workspaceItem, index) => {
              const magicColors = ["blue", "purple", "orange"];
              return (
                <MagicCard
                  key={workspaceItem.key}
                  title={t(workspaceItem.labelKey)}
                  subtitle={t(workspaceItem.descriptionKey)}
                  icon={workspaceItem.icon}
                  colorVariant={magicColors[index % magicColors.length]}
                  onClick={() => openWorkspace("guests", workspaceItem.key)}
                />
              );
            })}
        </div>
      ) : (
        <div key={`guests-${routeGuestsWorkspace}`} className="dashboard-grid single-section workspace-content">
          {routeGuestsWorkspace === "create" ? (
            <GuestBuilderView {...props} guestAdvancedEditTab={props.routeGuestAdvancedTab} />
          ) : null}

          {routeGuestsWorkspace === "latest" ? (
            <GuestsListView {...props} />
          ) : null}

          {routeGuestsWorkspace === "groups" ? (
            <GuestGroupsView {...props} />
          ) : null}

          {routeGuestsWorkspace === "detail" ? (
            <GuestDetailView {...props} guestProfileViewTab={props.routeGuestProfileTab} />
          ) : null}
        </div>
      )}
    </section>
  );
}

export { GuestsWorkspaceContainer };
