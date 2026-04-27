import { useState } from "react";
import { Icon } from "../../../components/icons";

export function DemoModeBanner({ t, onCtaClick }) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-0 left-0 right-0 z-[9995] flex items-center justify-between gap-3 px-4 py-2.5
        bg-gradient-to-r from-indigo-600/95 to-purple-600/95 backdrop-blur-md
        border-t border-white/10 shadow-xl shadow-black/20"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-white/15">
          <Icon name="sparkle" className="w-3.5 h-3.5 text-white" />
        </span>
        <p className="text-white/90 text-xs sm:text-sm font-medium truncate">
          {t("demo_mode_banner_text")}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onCtaClick}
          className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold
            text-white bg-white/20 hover:bg-white/30 active:bg-white/40
            px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
        >
          {t("demo_mode_banner_cta")}
          <Icon name="arrow-right" className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          aria-label="Cerrar"
          onClick={() => setDismissed(true)}
          className="flex items-center justify-center w-7 h-7 rounded-lg text-white/60
            hover:text-white hover:bg-white/15 transition-colors"
        >
          <Icon name="x" className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
