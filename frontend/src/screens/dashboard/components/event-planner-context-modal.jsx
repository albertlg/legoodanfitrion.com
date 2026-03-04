import { Icon } from "../../../components/icons";

export function EventPlannerContextModal({
  isOpen,
  onClose,
  t,
  draft,
  setDraft,
  showTechnicalPrompt,
  onToggleTechnicalPrompt,
  technicalPrompt,
  onGenerate,
  isGenerating
}) {
  if (!isOpen) {
    return null;
  }

  const updateDraftField = (key, value) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="confirm-overlay planner-context-overlay" onClick={onClose}>
      <section
        className="confirm-dialog planner-context-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="planner-context-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="planner-context-head">
          <div>
            <h3 id="planner-context-title" className="item-title">
              {t("event_planner_context_modal_title")}
            </h3>
            <p className="item-meta">{t("event_planner_context_modal_hint")}</p>
          </div>
          <button className="btn btn-ghost btn-sm btn-icon-only" type="button" onClick={onClose} aria-label={t("close_modal")} title={t("close_modal")}>
            <Icon name="x" className="icon icon-sm" />
          </button>
        </header>

        <details className="planner-context-section" open>
          <summary>{t("event_planner_context_section_event")}</summary>
          <div className="planner-context-grid">
            <label>
              <span className="label-title">{t("event_planner_context_field_style")}</span>
              <select value={draft.preset} onChange={(event) => updateDraftField("preset", event.target.value)}>
                <option value="social">{t("event_planner_style_social")}</option>
                <option value="bbq">{t("event_planner_style_bbq")}</option>
                <option value="brunch">{t("event_planner_style_brunch")}</option>
                <option value="romantic">{t("event_planner_style_romantic")}</option>
                <option value="celebration">{t("event_planner_style_celebration")}</option>
                <option value="movie">{t("event_planner_style_movie")}</option>
                <option value="bookclub">{t("event_planner_style_bookclub")}</option>
              </select>
            </label>
            <label>
              <span className="label-title">{t("event_planner_context_field_moment")}</span>
              <select value={draft.momentKey} onChange={(event) => updateDraftField("momentKey", event.target.value)}>
                <option value="morning">{t("event_planner_moment_morning")}</option>
                <option value="afternoon">{t("event_planner_moment_afternoon")}</option>
                <option value="evening">{t("event_planner_moment_evening")}</option>
                <option value="night">{t("event_planner_moment_night")}</option>
              </select>
            </label>
            <label>
              <span className="label-title">{t("event_planner_context_field_tone")}</span>
              <select value={draft.toneKey} onChange={(event) => updateDraftField("toneKey", event.target.value)}>
                <option value="casual">{t("event_planner_tone_casual")}</option>
                <option value="formal">{t("event_planner_tone_formal")}</option>
              </select>
            </label>
            <label>
              <span className="label-title">{t("event_planner_context_field_budget")}</span>
              <select value={draft.budgetKey} onChange={(event) => updateDraftField("budgetKey", event.target.value)}>
                <option value="low">{t("event_planner_budget_low")}</option>
                <option value="medium">{t("event_planner_budget_medium")}</option>
                <option value="high">{t("event_planner_budget_high")}</option>
              </select>
            </label>
            <label>
              <span className="label-title">{t("event_planner_context_field_duration")}</span>
              <input
                type="number"
                min="2"
                max="12"
                value={draft.durationHours}
                onChange={(event) => updateDraftField("durationHours", event.target.value)}
              />
            </label>
          </div>
        </details>

        <details className="planner-context-section" open>
          <summary>{t("event_planner_context_section_guests")}</summary>
          <div className="planner-context-grid">
            <label>
              <span className="label-title">{t("smart_hosting_food")}</span>
              <textarea rows={2} value={draft.foodSuggestions} onChange={(event) => updateDraftField("foodSuggestions", event.target.value)} />
            </label>
            <label>
              <span className="label-title">{t("smart_hosting_drink")}</span>
              <textarea rows={2} value={draft.drinkSuggestions} onChange={(event) => updateDraftField("drinkSuggestions", event.target.value)} />
            </label>
            <label>
              <span className="label-title">{t("smart_hosting_avoid")}</span>
              <textarea rows={2} value={draft.avoidItems} onChange={(event) => updateDraftField("avoidItems", event.target.value)} />
            </label>
            <label>
              <span className="label-title">{t("field_medical_conditions")}</span>
              <textarea rows={2} value={draft.medicalConditions} onChange={(event) => updateDraftField("medicalConditions", event.target.value)} />
            </label>
            <label>
              <span className="label-title">{t("field_dietary_medical_restrictions")}</span>
              <textarea
                rows={2}
                value={draft.dietaryMedicalRestrictions}
                onChange={(event) => updateDraftField("dietaryMedicalRestrictions", event.target.value)}
              />
            </label>
          </div>
        </details>

        <details className="planner-context-section">
          <summary>{t("event_planner_context_section_host")}</summary>
          <div className="planner-context-grid">
            <label>
              <span className="label-title">{t("smart_hosting_music")}</span>
              <textarea rows={2} value={draft.musicGenres} onChange={(event) => updateDraftField("musicGenres", event.target.value)} />
            </label>
            <label>
              <span className="label-title">{t("smart_hosting_decor")}</span>
              <textarea rows={2} value={draft.decorColors} onChange={(event) => updateDraftField("decorColors", event.target.value)} />
            </label>
          </div>
        </details>

        <details className="planner-context-section">
          <summary>{t("event_planner_context_section_style")}</summary>
          <div className="planner-context-grid">
            <label>
              <span className="label-title">{t("smart_hosting_icebreakers")}</span>
              <textarea rows={2} value={draft.icebreakers} onChange={(event) => updateDraftField("icebreakers", event.target.value)} />
            </label>
            <label>
              <span className="label-title">{t("smart_hosting_taboo")}</span>
              <textarea rows={2} value={draft.tabooTopics} onChange={(event) => updateDraftField("tabooTopics", event.target.value)} />
            </label>
          </div>
        </details>

        <details className="planner-context-section">
          <summary>{t("event_planner_context_section_instructions")}</summary>
          <label>
            <span className="label-title">{t("event_planner_context_field_instructions")}</span>
            <textarea rows={3} value={draft.additionalInstructions} onChange={(event) => updateDraftField("additionalInstructions", event.target.value)} />
          </label>
        </details>

        {showTechnicalPrompt ? <pre className="planner-context-prompt-preview">{technicalPrompt}</pre> : null}

        <footer className="planner-context-footer">
          <button className="btn btn-ghost btn-sm planner-context-link-btn" type="button" onClick={onToggleTechnicalPrompt}>
            {showTechnicalPrompt ? t("event_planner_context_prompt_hide") : t("event_planner_context_prompt_show")}
          </button>
          <div className="planner-context-footer-actions">
            <button className="btn btn-ghost planner-context-cancel-btn" type="button" onClick={onClose}>
              {t("cancel_action")}
            </button>
            <button className="btn planner-context-generate-btn" type="button" onClick={onGenerate} disabled={isGenerating}>
              <Icon name="sparkle" className="icon icon-sm" />
              {isGenerating ? t("event_planner_generating_all") : t("event_planner_context_generate")}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
