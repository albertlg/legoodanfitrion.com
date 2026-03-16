import { Icon } from "../../../components/icons";
import { InvitationBuilderView } from "./invitation-builder-view";
import { InvitationsListView } from "./invitations-list-view";
import { MagicCard } from "./ui/magic-card";

function InvitationsWorkspaceContainer(props) {
  const { routeInvitationsWorkspace, WORKSPACE_ITEMS, t, openWorkspace } = props;

  return (
    <section className="workspace-shell view-transition">
      {routeInvitationsWorkspace === "hub" ? (
        /* NUEVO HUB DE INVITACIONES CON MAGIC CARDS */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-4 md:p-8 w-full max-w-6xl mx-auto">
          {WORKSPACE_ITEMS.invitations
            .filter((item) => item.key !== "hub" && item.key !== "create")
            .map((workspaceItem, index) => {
              const magicColors = ["purple", "orange", "blue"]; // He rotado los colores para que varíe
              return (
                <MagicCard
                  key={workspaceItem.key}
                  title={t(workspaceItem.labelKey)}
                  subtitle={t(workspaceItem.descriptionKey)}
                  icon={workspaceItem.icon}
                  colorVariant={magicColors[index % magicColors.length]}
                  onClick={() => openWorkspace("invitations", workspaceItem.key)}
                />
              );
            })}
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
