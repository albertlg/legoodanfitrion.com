import { Icon } from "../../../components/icons";
import { InvitationBuilderView } from "./invitation-builder-view";
import { InvitationsListView } from "./invitations-list-view";

function InvitationsWorkspaceContainer(props) {
  const { routeInvitationsWorkspace, WORKSPACE_ITEMS, t, openWorkspace } = props;

  return (
    <section className="workspace-shell view-transition">
      {routeInvitationsWorkspace === "hub" ? (
        <div className="workspace-card-grid">
          {WORKSPACE_ITEMS.invitations.filter((item) => item.key !== "hub" && item.key !== "create").map((workspaceItem) => (
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
                onClick={() => openWorkspace("invitations", workspaceItem.key)}
              >
                {t("workspace_open")}
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div key={`invitations-${routeInvitationsWorkspace}`} className="dashboard-grid single-section workspace-content">
          {routeInvitationsWorkspace === "create" ? <InvitationBuilderView {...props} /> : null}
          {routeInvitationsWorkspace === "latest" ? <InvitationsListView {...props} /> : null}
        </div>
      )}
    </section>
  );
}

export { InvitationsWorkspaceContainer };
