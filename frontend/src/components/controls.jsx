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

function Controls({ themeMode, setThemeMode, language, setLanguage, t }) {
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const languageMenuRef = useRef(null);
  const resolvedTheme = getResolvedTheme(themeMode);
  const isDarkTheme = resolvedTheme === "dark";
  const languageLabel = useMemo(() => t(`lang_${language}`), [language, t]);
  const languageFlag = LANGUAGE_FLAGS[language] || "";

  useEffect(() => {
    if (!isLanguageMenuOpen) {
      return undefined;
    }
    const onPointerDown = (event) => {
      if (!languageMenuRef.current?.contains(event.target)) {
        setIsLanguageMenuOpen(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsLanguageMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("touchstart", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("touchstart", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isLanguageMenuOpen]);

  const handleToggleTheme = () => {
    setThemeMode(isDarkTheme ? "light" : "dark");
  };

  return (
    <div className="flex items-center gap-1" aria-label={t("header_controls")}>
      {/* SELECTOR DE IDIOMA */}
      <div className="relative" ref={languageMenuRef}>
        <button
          type="button"
          className={`flex items-center gap-2 p-2 rounded-xl transition-colors focus:outline-none ${isLanguageMenuOpen ? "bg-black/5 dark:bg-white/10" : "hover:bg-black/5 dark:hover:bg-white/5"}`}
          aria-label={`${t("language")}: ${languageLabel}`}
          aria-haspopup="menu"
          aria-expanded={isLanguageMenuOpen}
          title={`${t("language")}: ${languageLabel}`}
          onClick={() => setIsLanguageMenuOpen((prev) => !prev)}
        >
          <Icon name="globe" className="w-5 h-5 text-gray-500 dark:text-gray-400" />

          {/* Bandera Circular */}
          <span className="w-5 h-5 rounded-full overflow-hidden shrink-0 border border-black/10 dark:border-white/10 flex items-center justify-center bg-gray-100 dark:bg-gray-800 shadow-sm" aria-hidden="true">
            {languageFlag ? (
              <img src={languageFlag} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
            ) : (
              <span className="text-[10px]">🌐</span>
            )}
          </span>

          {/* Flechita que rota al abrirse */}
          <Icon name="chevron_down" className={`w-3 h-3 text-gray-500 transition-transform duration-200 ${isLanguageMenuOpen ? "rotate-180" : ""}`} />
        </button>

        {/* EL MENÚ DESPLEGABLE (AHORA ABRE HACIA ARRIBA CON bottom-full y mb-2) */}
        {isLanguageMenuOpen ? (
          <div
            className="absolute bottom-full mb-2 left-0 w-44 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl z-[100] py-1.5 origin-bottom-left"
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
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium transition-colors ${isSelected ? "text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20" : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white"}`}
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

      {/* BOTÓN MODO OSCURO/CLARO */}
      <button
        type="button"
        className="p-2 rounded-xl transition-colors hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 focus:outline-none"
        aria-label={isDarkTheme ? t("theme_toggle_to_light") : t("theme_toggle_to_dark")}
        title={isDarkTheme ? t("theme_toggle_to_light") : t("theme_toggle_to_dark")}
        onClick={handleToggleTheme}
      >
        <Icon name={isDarkTheme ? "moon" : "sun"} className="w-5 h-5" />
      </button>
    </div>
  );
}

export { Controls };