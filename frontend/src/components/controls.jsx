import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./icons";

const LANGUAGE_OPTIONS = ["es", "ca", "en", "fr"];
const LANGUAGE_FLAGS = {
  es: "https://upload.wikimedia.org/wikipedia/en/9/9a/Flag_of_Spain.svg",
  ca: "https://upload.wikimedia.org/wikipedia/commons/c/ce/Flag_of_Catalonia.svg",
  en: "https://upload.wikimedia.org/wikipedia/en/a/ae/Flag_of_the_United_Kingdom.svg",
  fr: "https://upload.wikimedia.org/wikipedia/en/c/c3/Flag_of_France.svg"
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
    <div className="controls" aria-label={t("header_controls")}>
      <div className="control-menu" ref={languageMenuRef}>
        <button
          type="button"
          className="control-icon-btn"
          aria-label={`${t("language")}: ${languageLabel}`}
          aria-haspopup="menu"
          aria-expanded={isLanguageMenuOpen}
          title={`${t("language")}: ${languageLabel}`}
          onClick={() => setIsLanguageMenuOpen((prev) => !prev)}
        >
          <Icon name="globe" className="icon" />
          <span className="control-flag" aria-hidden="true">
            {languageFlag ? (
              <img src={languageFlag} alt="" className="control-flag-img" loading="lazy" decoding="async" />
            ) : (
              "🌐"
            )}
          </span>
          <Icon name="chevron_down" className={`icon icon-xs control-chevron ${isLanguageMenuOpen ? "open" : ""}`} />
        </button>
        {isLanguageMenuOpen ? (
          <div className="control-dropdown" role="menu" aria-label={t("language")}>
            {LANGUAGE_OPTIONS.map((option) => {
              const isSelected = option === language;
              const optionFlag = LANGUAGE_FLAGS[option] || "";
              return (
                <button
                  key={option}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isSelected}
                  className={`control-option ${isSelected ? "active" : ""}`}
                  onClick={() => {
                    setLanguage(option);
                    setIsLanguageMenuOpen(false);
                  }}
                >
                  <span className="control-option-label">
                    <span className="control-flag" aria-hidden="true">
                      {optionFlag ? (
                        <img src={optionFlag} alt="" className="control-flag-img" loading="lazy" decoding="async" />
                      ) : (
                        "🌐"
                      )}
                    </span>
                    <span>{t(`lang_${option}`)}</span>
                  </span>
                  {isSelected ? <Icon name="check" className="icon icon-xs" /> : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <button
        type="button"
        className="control-icon-btn"
        aria-label={isDarkTheme ? t("theme_toggle_to_light") : t("theme_toggle_to_dark")}
        title={isDarkTheme ? t("theme_toggle_to_light") : t("theme_toggle_to_dark")}
        onClick={handleToggleTheme}
      >
        <Icon name={isDarkTheme ? "moon" : "sun"} className="icon" />
      </button>
    </div>
  );
}

export { Controls };
