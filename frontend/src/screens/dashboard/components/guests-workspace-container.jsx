import { Icon } from "../../../components/icons";
import { GuestBuilderView } from "./guest-builder-view";
import { GuestDetailView } from "./guest-detail-view";
import { GuestsListView } from "./guests-list-view";

function GuestsWorkspaceContainer(props) {
  const { routeGuestsWorkspace, WORKSPACE_ITEMS, t, openWorkspace } = props;

  return (
    <section className="workspace-shell view-transition">
      {routeGuestsWorkspace === "hub" ? (
        <div className="workspace-card-grid">
          {WORKSPACE_ITEMS.guests.filter((item) => item.key !== "hub" && item.key !== "create").map((workspaceItem) => (
            <article key={workspaceItem.key} className="workspace-card">
              <div className="workspace-card-icon">
                <Icon name={workspaceItem.icon} className="icon" />
              </div>
              <div className="workspace-card-content">
                <h3>{t(workspaceItem.labelKey)}</h3>
                <p>{t(workspaceItem.descriptionKey)}</p>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                type="button"
                onClick={() => openWorkspace("guests", workspaceItem.key)}
              >
                {t("workspace_open")}
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div key={`guests-${routeGuestsWorkspace}`} className="dashboard-grid single-section workspace-content">
          {routeGuestsWorkspace === "create" ? (
            <GuestBuilderView {...props} guestAdvancedEditTab={props.routeGuestAdvancedTab} />
          ) : null}

          {routeGuestsWorkspace === "latest" ? (
            <GuestsListView {...props} />
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
