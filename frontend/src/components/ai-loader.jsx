import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./icons";

export function AILoader({ t, isVisible }) {
  const steps = useMemo(
    () => [
      t("ai_loader_step_preparing_menu"),
      t("ai_loader_step_calculating_ingredients"),
      t("ai_loader_step_evaluating_risks"),
      t("ai_loader_step_designing_ambience")
    ],
    [t]
  );
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!isVisible) {
      setStepIndex(0);
      return undefined;
    }
    const timer = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % Math.max(steps.length, 1));
    }, 2400);
    return () => clearInterval(timer);
  }, [isVisible, steps.length]);

  if (!isVisible) {
    return null;
  }

  const activeStep = steps[stepIndex] || "";

  const loaderOverlay = (
    <div
      className="fixed inset-0 z-[10050] flex items-center justify-center p-6 bg-black/45 dark:bg-black/60 backdrop-blur-md"
      role="status"
      aria-live="polite"
      aria-label={t("event_planner_generating_all")}
    >
      <section className="w-full max-w-md rounded-3xl border border-white/20 dark:border-white/10 bg-white/80 dark:bg-gray-900/85 backdrop-blur-2xl shadow-2xl p-6 md:p-8">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-100/90 dark:bg-blue-900/30 border border-blue-200/80 dark:border-blue-700/40">
            <Icon name="sparkle" className="w-7 h-7 text-blue-600 dark:text-blue-300 animate-pulse" />
            <span className="absolute -inset-1 rounded-2xl border border-blue-400/40 dark:border-blue-500/30 animate-ping" />
          </div>
          <h3 className="text-lg md:text-xl font-black text-gray-900 dark:text-white">
            {t("ai_loader_title")}
          </h3>
          <p
            key={`ai-loader-step-${stepIndex}`}
            className="text-sm md:text-base font-semibold text-blue-700 dark:text-blue-300 transition-all duration-300"
          >
            {activeStep}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {t("ai_loader_hint")}
          </p>
        </div>
      </section>
    </div>
  );

  if (typeof document === "undefined" || !document.body) {
    return loaderOverlay;
  }

  return createPortal(loaderOverlay, document.body);
}
