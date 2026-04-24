import React from "react";
import { MagicCard } from "../../../screens/dashboard/components/ui/magic-card";

// 🚀 Card del Planificador IA — single source of truth visual.
// Usa el componente real MagicCard (gradiente púrpura) con el copy del producto.
// Lo consumen: event-detail-view (app privada) y InteractiveDemo (landing).
// Backporting: reemplaza el banner antiguo "event_plan_cta_title + button" del
// event-detail-view para que landing y app compartan el mismo ADN visual.

export function PlannerIACard({ t, onOpen }) {
    return (
        <MagicCard
            title={t("event_plan_cta_title")}
            subtitle={t("event_plan_cta_hint")}
            icon="sparkle"
            colorVariant="purple"
            onClick={onOpen || (() => { /* no-op para demos estáticas */ })}
        />
    );
}
