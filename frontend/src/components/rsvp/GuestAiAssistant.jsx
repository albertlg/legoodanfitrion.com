import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../icons";
import { supabase } from "../../lib/supabaseClient";

function sanitizeText(value) {
  return String(value || "").trim();
}

function normalizeQuestion(value) {
  return sanitizeText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function interpolate(template, replacements = {}) {
  return Object.entries(replacements).reduce(
    (text, [key, value]) => text.replaceAll(`{{${key}}}`, sanitizeText(value)),
    sanitizeText(template)
  );
}

function buildMenuSummary(menuCourses = []) {
  return (Array.isArray(menuCourses) ? menuCourses : [])
    .map((courseItem) => {
      const courseLabel = sanitizeText(courseItem?.courseLabel);
      const optionLabels = (Array.isArray(courseItem?.options) ? courseItem.options : [])
        .map((optionItem) => sanitizeText(optionItem?.label))
        .filter(Boolean);
      if (!courseLabel && optionLabels.length === 0) {
        return "";
      }
      return `${courseLabel}: ${optionLabels.join(", ")}`;
    })
    .filter(Boolean)
    .join("\n");
}

function buildTimelineSummary(timeline = []) {
  return (Array.isArray(timeline) ? timeline : [])
    .slice(0, 5)
    .map((item) => {
      const time = sanitizeText(item?.time || item?.hour || item?.label || "");
      const description = sanitizeText(item?.description || item?.activity || item?.text || "");
      if (!time && !description) return "";
      return time && description ? `${time} – ${description}` : (time || description);
    })
    .filter(Boolean)
    .join("\n");
}

function detectIntent(normalizedQuestion) {
  if (/\b(fecha|date|dia|day|hora|time|when|cuando|quan|quand|quando)\b/.test(normalizedQuestion)) return "date";
  if (/\b(donde|where|lloc|lugar|sitio|place|location|adresse|address|indirizzo|map|maps|parking)\b/.test(normalizedQuestion)) return "location";
  if (/\b(menu|comida|food|meal|cena|lunch|dinner|allerg|diet|veget|vegan|gluten|lactose|menjar|repas|cibo)\b/.test(normalizedQuestion)) return "menu";
  if (/\b(ropa|vestir|vestimenta|dress|tenue|abbigliamento|codigo|code|que.*poner|wear|outfit)\b/.test(normalizedQuestion)) return "dress_code";
  if (/\b(programa|horario|schedule|timing|timeline|cronograma|agenda|déroulé|scaletta|orden)\b/.test(normalizedQuestion)) return "timeline";
  if (/\b(ambiente|vibe|musica|decoracion|decoration|ambiance|atmosfera|atmosph|estil)\b/.test(normalizedQuestion)) return "ambience";
  if (/\b(nota|notes|indicacion|instruction|host|anfitrion|organiza|organizer|organisateur|ospite)\b/.test(normalizedQuestion)) return "host_notes";
  if (!normalizedQuestion || /\b(resumen|summary|info|event|evento|ajuda|ayuda|help|hola|hello|ciao|salut)\b/.test(normalizedQuestion)) return "summary";
  return "unknown";
}

function buildAssistantReply(question, context, t) {
  const normalizedQuestion = normalizeQuestion(question);
  const intent = detectIntent(normalizedQuestion);

  const eventTitle = sanitizeText(context?.eventTitle) || t("app_name");
  const dateLabel = sanitizeText(context?.dateLabel);
  const location = sanitizeText(context?.location);
  const hostName = sanitizeText(context?.hostName);
  const hostNotes = sanitizeText(context?.hostNotes);
  const menuSummary = buildMenuSummary(context?.menuCourses);

  // Plan fields (from Core AI planner)
  const dressCode = sanitizeText(context?.planDressCode);
  const toneKey = sanitizeText(context?.planToneKey);
  const timeline = context?.planTimeline || [];
  const ambienceHints = context?.planAmbienceHints || [];
  const menuContext = sanitizeText(context?.planMenuContext);

  if (intent === "date") {
    return dateLabel
      ? interpolate(t("rsvp_ai_answer_date"), { event: eventTitle, date: dateLabel })
      : t("rsvp_ai_answer_date_missing");
  }

  if (intent === "location") {
    return location
      ? interpolate(t("rsvp_ai_answer_location"), { location })
      : t("rsvp_ai_answer_location_missing");
  }

  if (intent === "menu") {
    const fullMenuContext = [menuSummary, menuContext].filter(Boolean).join("\n\n");
    return fullMenuContext
      ? interpolate(t("rsvp_ai_answer_menu"), { menu: fullMenuContext })
      : t("rsvp_ai_answer_menu_missing");
  }

  if (intent === "dress_code") {
    const hasDressCode = dressCode && dressCode !== "none";
    const toneHint = toneKey ? interpolate(t("rsvp_ai_answer_tone_hint"), { tone: t(`rsvp_ai_tone_${toneKey}`) || toneKey }) : "";
    return hasDressCode
      ? interpolate(t("rsvp_ai_answer_dress_code"), { dress_code: t(`rsvp_ai_dress_${dressCode}`) || dressCode, tone: toneHint })
      : t("rsvp_ai_answer_dress_code_missing");
  }

  if (intent === "timeline") {
    const timelineSummary = buildTimelineSummary(timeline);
    return timelineSummary
      ? interpolate(t("rsvp_ai_answer_timeline"), { timeline: timelineSummary })
      : t("rsvp_ai_answer_timeline_missing");
  }

  if (intent === "ambience") {
    const ambienceText = ambienceHints
      .slice(0, 3)
      .map((item) => sanitizeText(item?.description || item?.text || item?.label || (typeof item === "string" ? item : "")))
      .filter(Boolean)
      .join("\n");
    return ambienceText
      ? interpolate(t("rsvp_ai_answer_ambience"), { ambience: ambienceText })
      : t("rsvp_ai_answer_ambience_missing");
  }

  if (intent === "host_notes") {
    return hostNotes
      ? interpolate(t("rsvp_ai_answer_notes"), { notes: hostNotes })
      : interpolate(t("rsvp_ai_answer_notes_missing"), { host: hostName || t("app_name") });
  }

  if (intent === "summary") {
    return interpolate(t("rsvp_ai_answer_summary"), {
      event: eventTitle,
      date: dateLabel || t("rsvp_ai_unknown_date"),
      location: location || t("rsvp_ai_unknown_location"),
      host: hostName || t("app_name")
    });
  }

  return t("rsvp_ai_answer_unknown");
}

async function logGuestInsight(token, question, intent) {
  if (!supabase || !token || !question) return;
  try {
    await supabase.rpc("log_guest_ai_insight", {
      p_token: token,
      p_question: question,
      p_intent: intent || "unknown"
    });
  } catch {
    // Non-critical — never surface to guest
  }
}

function GuestAiAssistant({ t, context, token }) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const messagesEndRef = useRef(null);
  const initialMessages = useMemo(
    () => [
      {
        id: "assistant-welcome",
        role: "assistant",
        text: t("rsvp_ai_welcome")
      }
    ],
    [t]
  );
  const [messages, setMessages] = useState(initialMessages);

  const hasPlanData = Boolean(
    context?.planTimeline?.length > 0 ||
    (context?.planDressCode && context.planDressCode !== "none") ||
    context?.planAmbienceHints?.length > 0
  );

  const quickQuestions = useMemo(
    () => {
      const always = [
        { key: "date", label: t("rsvp_ai_quick_date"), question: t("rsvp_ai_question_date") },
        { key: "location", label: t("rsvp_ai_quick_location"), question: t("rsvp_ai_question_location") },
        { key: "menu", label: t("rsvp_ai_quick_menu"), question: t("rsvp_ai_question_menu") }
      ];
      const planExtras = hasPlanData
        ? [
            { key: "dress_code", label: t("rsvp_ai_quick_dress_code"), question: t("rsvp_ai_question_dress_code") },
            { key: "timeline", label: t("rsvp_ai_quick_timeline"), question: t("rsvp_ai_question_timeline") }
          ]
        : [];
      return [...always, ...planExtras];
    },
    [t, hasPlanData]
  );

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, scrollToBottom]);

  const submitQuestion = useCallback(
    (questionText) => {
      const question = sanitizeText(questionText);
      if (!question) return;
      const intent = detectIntent(normalizeQuestion(question));
      const now = Date.now();
      const reply = buildAssistantReply(question, context, t);
      setMessages((prev) => [
        ...prev,
        { id: `guest-${now}`, role: "guest", text: question },
        { id: `assistant-${now}`, role: "assistant", text: reply }
      ]);
      setDraft("");
      setIsOpen(true);
      logGuestInsight(token, question, intent);
    },
    [context, t, token]
  );

  // Glass solo para la burbuja flotante (el panel es sólido para contrastar con el overlay blur).
  const buttonGlassStyle = {
    WebkitBackdropFilter: "blur(12px) saturate(150%)",
    backdropFilter: "blur(12px) saturate(150%)"
  };

  return (
    <>
      {/* Overlay de enfoque: cuando el chat está abierto, desenfoca la página RSVP
          para centrar la atención en el panel. Click fuera cierra el chat. */}
      {isOpen ? (
        <div
          className="fixed inset-0 z-40 backdrop-blur-sm bg-black/5 dark:bg-black/20 pointer-events-auto"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      {/* Widget: burbuja + panel — siempre por encima del overlay (z-50) */}
      <div className="fixed bottom-5 right-4 md:bottom-6 md:right-6 z-50 flex flex-col items-end gap-3 pointer-events-none">
      {isOpen ? (
      <div
        className="pointer-events-auto w-[min(calc(100vw-2rem),24rem)] rounded-3xl
          border border-gray-200 dark:border-white/10
          bg-white dark:bg-gray-900
          shadow-2xl shadow-black/20"
        aria-label={t("rsvp_ai_title")}
        role="region"
      >
        <div className="overflow-hidden rounded-3xl animate-in zoom-in-95 slide-in-from-bottom-2 duration-200 ease-out">
          <header className="flex items-start justify-between gap-3 border-b border-black/5 dark:border-white/10 px-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 shrink-0 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20">
                <Icon name="sparkle" className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-gray-900 dark:text-white leading-tight">{t("rsvp_ai_title")}</p>
                <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 leading-tight">
                  {hasPlanData ? t("rsvp_ai_subtitle_smart") : t("rsvp_ai_subtitle")}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              onClick={() => setIsOpen(false)}
              aria-label={t("rsvp_ai_close")}
              title={t("rsvp_ai_close")}
            >
              <Icon name="close" className="h-4 w-4" />
            </button>
          </header>

          <div className="max-h-[22rem] overflow-y-auto px-4 py-4 flex flex-col gap-3">
            {messages.map((message) => {
              const isGuest = message.role === "guest";
              return (
                <div key={message.id} className={`flex ${isGuest ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                      isGuest
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100/90 dark:bg-white/10 text-gray-800 dark:text-gray-100"
                    }`}
                  >
                    {message.text}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-black/5 dark:border-white/10 px-4 py-3 flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {quickQuestions.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className="rounded-full border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 px-3 py-1.5 text-[11px] font-bold text-gray-700 dark:text-gray-200 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
                  onClick={() => submitQuestion(item.question)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <form
              className="flex items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                submitQuestion(draft);
              }}
            >
              <input
                type="text"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={t("rsvp_ai_input_placeholder")}
                className="min-w-0 flex-1 rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/20 px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                maxLength={180}
              />
              <button
                type="submit"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20 transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
                disabled={!sanitizeText(draft)}
                aria-label={t("rsvp_ai_send")}
                title={t("rsvp_ai_send")}
              >
                <Icon name="arrow_right" className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
      ) : null}

      {/* Burbuja flotante — glass sobre la página (no sobre el overlay) */}
      <button
        type="button"
        className="pointer-events-auto group inline-flex items-center gap-2 rounded-full border border-white/20 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 px-3 py-2 text-gray-900 dark:text-white shadow-2xl shadow-black/10 transition-all duration-200 hover:-translate-y-0.5"
        style={buttonGlassStyle}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label={t("rsvp_ai_open")}
        title={t("rsvp_ai_open")}
      >
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/25 transition-transform duration-200 group-hover:scale-105">
          <Icon name="sparkle" className="h-4.5 w-4.5" />
        </span>
        <span className="hidden pr-1 text-xs font-black sm:inline">{t("rsvp_ai_bubble_label")}</span>
      </button>
    </div>
    </>
  );
}

export { GuestAiAssistant };
