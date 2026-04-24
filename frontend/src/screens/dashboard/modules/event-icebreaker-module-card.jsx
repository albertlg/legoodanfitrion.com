import React from "react";
import { MagicCard } from "../components/ui/magic-card";

// 🚀 Modo Rompehielos — mismo ADN visual que Planificador IA.
// Convención: toda funcionalidad con IA usa MagicCard (blob animado + glass).
// Ver design.md §11 "AI feature cards".

export function EventIcebreakerModuleCard({
  t,
  isIcebreakerLoading,
  handleGenerateEventIcebreaker,
  hasIcebreakerData,
  handleOpenEventIcebreakerPanel
}) {
  const subtitle = isIcebreakerLoading
    ? t("event_icebreaker_loading_label")
    : hasIcebreakerData
      ? t("event_icebreaker_action_open")
      : t("event_icebreaker_hint");

  const handleClick = () => {
    if (isIcebreakerLoading) return;
    if (hasIcebreakerData) {
      handleOpenEventIcebreakerPanel?.();
      return;
    }
    handleGenerateEventIcebreaker?.();
  };

  return (
    <div className="order-3">
      <MagicCard
        title={t("event_icebreaker_title")}
        subtitle={subtitle}
        icon="sparkle"
        colorVariant="orange"
        onClick={handleClick}
      />
    </div>
  );
}
