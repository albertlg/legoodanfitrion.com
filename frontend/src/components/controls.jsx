import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./icons";

const LANGUAGE_OPTIONS = ["es", "ca", "en", "fr", "it"];
const LANGUAGE_FLAGS = {
  es: "https://upload.wikimedia.org/wikipedia/en/9/9a/Flag_of_Spain.svg",
  ca: "https://upload.wikimedia.org/wikipedia/commons/c/ce/Flag_of_Catalonia.svg",
  en: "https://upload.wikimedia.org/wikipedia/en/a/ae/Flag_of_the_United_Kingdom.svg",
  fr: "https://upload.wikimedia.org/wikipedia/en/c/c3/Flag_of_France.svg",
  it: "https://upload.wikimedia.org/wikipedia/commons/0/03/Flag_of_Italy.svg"
};

function getSystemTheme() {
  if (typeof window === "undefined") {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getResolvedTheme(themeMode) {
  if (themeMode === "system") {
    const fromDom = typeof document !== "undefined" ? document.documentElement.getAttribute("data-theme") : "";
    if (fromDom === "light" || fromDom === "dark") {
      return fromDom;
    }
    return getSystemTheme();
  }
  return themeMode;
}

function useOnClickOutside(ref, onOutsideClick, enabled = true) {
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const handler = (event) => {
      if (!ref.current || ref.current.contains(event.target)) {
        return;
      }
      onOutsideClick();
    };

    window.addEventListener("mousedown", handler);
    window.addEventListener("touchstart", handler);
    return () => {
      window.removeEventListener("mousedown", handler);
      window.removeEventListener("touchstart", handler);
    };
  }, [enabled, onOutsideClick, ref]);
}

const THEME_OPTIONS = [
  {
    key: "light",
    icon: "sun",
    labelKey: "theme_light"
  },
  {
    key: "dark",
    icon: "moon",
    labelKey: "theme_dark"
  },
  {
    key: "system",
    icon: "settings",
    labelKey: "theme_system"
  }
];

// 🚀 FIX: Añadimos la prop 'dropdownDirection' con valor por defecto "up"
function Controls({ themeMode, setThemeMode, language, setLanguage, t, dropdownDirection = "up" }) {
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const languageMenuRef = useRef(null);
  const themeMenuRef = useRef(null);
  const resolvedTheme = getResolvedTheme(themeMode);
  const languageLabel = useMemo(() => t(`lang_${language}`), [language, t]);
  const languageFlag = LANGUAGE_FLAGS[language] || "";
  const currentThemeIcon = themeMode === "dark" ? "moon" : themeMode === "light" ? "sun" : "settings";
  const currentThemeLabel = t(
    themeMode === "dark" ? "theme_dark" : themeMode === "light" ? "theme_light" : "theme_system"
  );
  const triggerButtonClasses =
    "inline-flex items-center gap-2 h-9 px-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 shadow-sm transition-all duration-200 cursor-pointer focus:outline-none";

  useOnClickOutside(languageMenuRef, () => setIsLanguageMenuOpen(false), isLanguageMenuOpen);
  useOnClickOutside(themeMenuRef, () => setIsThemeMenuOpen(false), isThemeMenuOpen);

  useEffect(() => {
    if (!isLanguageMenuOpen && !isThemeMenuOpen) {
      return undefined;
    }
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsLanguageMenuOpen(false);
        setIsThemeMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isLanguageMenuOpen, isThemeMenuOpen]);

  // 🚀 FIX: Definimos las clases dinámicas según la dirección que nos pidan
  const dropdownPositionClasses = dropdownDirection === "up"
    ? "bottom-full mb-2 origin-bottom-left"
    : "top-full mt-2 origin-top-left";

  return (
    <div className="flex items-center gap-1.5" aria-label={t("header_controls")}>
      {/* SELECTOR DE IDIOMA */}
      <div className="relative" ref={languageMenuRef}>
        <button
          type="button"
          className={triggerButtonClasses}
          aria-label={`${t("language")}: ${languageLabel}`}
          aria-haspopup="menu"
          aria-expanded={isLanguageMenuOpen}
          title={`${t("language")}: ${languageLabel}`}
          onClick={() => {
            setIsThemeMenuOpen(false);
            setIsLanguageMenuOpen((prev) => !prev);
          }}
        >
          <span className="w-5 h-5 rounded-full overflow-hidden shrink-0 border border-black/10 dark:border-white/10 flex items-center justify-center bg-gray-100 dark:bg-gray-800 shadow-sm" aria-hidden="true">
            {languageFlag ? (
              <img src={languageFlag} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
            ) : (
              <span className="text-[10px]">🌐</span>
            )}
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wide text-gray-600 dark:text-gray-300">
            {String(language || "").toUpperCase()}
          </span>
          <Icon name="chevron_down" className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${isLanguageMenuOpen ? "rotate-180" : ""}`} />
        </button>

        {isLanguageMenuOpen ? (
          <div
            className={`absolute left-0 w-44 bg-white dark:bg-gray-800 border border-black/10 dark:border-white/10 rounded-xl shadow-md z-50 py-1.5 ${dropdownPositionClasses}`}
            role="menu"
            aria-label={t("language")}
          >
            {LANGUAGE_OPTIONS.map((option) => {
              const isSelected = option === language;
              const optionFlag = LANGUAGE_FLAGS[option] || "";
              return (
                <button
                  key={option}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isSelected}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer ${isSelected ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20" : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white"}`}
                  onClick={() => {
                    setLanguage(option);
                    setIsLanguageMenuOpen(false);
                  }}
                >
                  <span className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full overflow-hidden shrink-0 border border-black/10 dark:border-white/10 flex items-center justify-center bg-gray-100 dark:bg-gray-800 shadow-sm" aria-hidden="true">
                      {optionFlag ? (
                        <img src={optionFlag} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                      ) : (
                        <span className="text-[10px]">🌐</span>
                      )}
                    </span>
                    <span>{t(`lang_${option}`)}</span>
                  </span>
                  {isSelected ? <Icon name="check" className="w-4 h-4" /> : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="relative" ref={themeMenuRef}>
        <button
          type="button"
          className={triggerButtonClasses}
          aria-label={`${t("theme")}: ${currentThemeLabel}`}
          aria-haspopup="menu"
          aria-expanded={isThemeMenuOpen}
          title={`${t("theme")}: ${currentThemeLabel}`}
          onClick={() => {
            setIsLanguageMenuOpen(false);
            setIsThemeMenuOpen((prev) => !prev);
          }}
        >
          <Icon name={currentThemeIcon} className="w-4.5 h-4.5" />
          <Icon name="chevron_down" className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${isThemeMenuOpen ? "rotate-180" : ""}`} />
        </button>

        {isThemeMenuOpen ? (
          <div
            className={`absolute left-0 w-44 bg-white dark:bg-gray-800 border border-black/10 dark:border-white/10 rounded-xl shadow-md z-50 py-1.5 ${dropdownPositionClasses}`}
            role="menu"
            aria-label={t("theme")}
          >
            {THEME_OPTIONS.map((option) => {
              const isSelected = option.key === themeMode;
              const optionLabel = t(option.labelKey);
              return (
                <button
                  key={option.key}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isSelected}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white"
                  }`}
                  onClick={() => {
                    setThemeMode(option.key);
                    setIsThemeMenuOpen(false);
                  }}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon name={option.icon} className="w-4 h-4" />
                    <span>{optionLabel}</span>
                  </span>
                  {isSelected ? <Icon name="check" className="w-4 h-4" /> : null}
                </button>
              );
            })}
            {themeMode === "system" ? (
              <p className="px-3 pt-1 text-[11px] text-gray-500 dark:text-gray-400">
                {t("theme_system")}: {t(resolvedTheme === "dark" ? "theme_dark" : "theme_light")}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export { Controls };
