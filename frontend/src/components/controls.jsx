import { Icon } from "./icons";

function Controls({ themeMode, setThemeMode, language, setLanguage, t }) {
  return (
    <div className="controls" aria-label="App controls">
      <label>
        <span className="label-title">
          <Icon name="globe" className="icon icon-sm" />
          {t("language")}
        </span>
        <select value={language} onChange={(event) => setLanguage(event.target.value)}>
          <option value="es">{t("lang_es")}</option>
          <option value="ca">{t("lang_ca")}</option>
          <option value="en">{t("lang_en")}</option>
          <option value="fr">{t("lang_fr")}</option>
        </select>
      </label>
      <label>
        <span className="label-title">
          <Icon name={themeMode === "dark" ? "moon" : "sun"} className="icon icon-sm" />
          {t("theme")}
        </span>
        <select value={themeMode} onChange={(event) => setThemeMode(event.target.value)}>
          <option value="light">{t("theme_light")}</option>
          <option value="dark">{t("theme_dark")}</option>
          <option value="system">{t("theme_system")}</option>
        </select>
      </label>
    </div>
  );
}

export { Controls };

