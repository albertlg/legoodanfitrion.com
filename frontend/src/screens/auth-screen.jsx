import { BrandMark } from "../components/brand-mark";
import { Controls } from "../components/controls";
import { FieldMeta } from "../components/field-meta";
import { Icon } from "../components/icons";
import { InlineMessage } from "../components/inline-message";

function AuthScreen({
  t,
  language,
  setLanguage,
  themeMode,
  setThemeMode,
  isLoadingAuth,
  authError,
  accountMessage,
  loginEmail,
  setLoginEmail,
  loginPassword,
  setLoginPassword,
  isSigningIn,
  isSigningUp,
  isSigningInWithGoogle,
  onSignIn,
  onSignUp,
  onGoogleSignIn
}) {
  return (
    <main className="page">
      <section className="card app-card">
        <header className="app-header">
          <div className="brand-header">
            <BrandMark text={t("app_name")} fallback={t("logo_fallback")} />
            <div>
              <p className="eyebrow">{t("app_name")}</p>
              <h1>{t("access_title")}</h1>
              <p className="hero-text">{t("hero_subtitle")}</p>
            </div>
          </div>
          <Controls
            themeMode={themeMode}
            setThemeMode={setThemeMode}
            language={language}
            setLanguage={setLanguage}
            t={t}
          />
        </header>

        {isLoadingAuth ? <p>{t("loading_session")}</p> : null}
        <InlineMessage type="error" text={authError} />
        <InlineMessage type="success" text={accountMessage} />

        <form className="panel form-grid" onSubmit={onSignIn} noValidate>
          <h2 className="section-title">
            <Icon name="shield" className="icon" />
            {t("access_title")}
          </h2>
          <p className="field-help">{t("hint_accessibility")}</p>

          <label>
            <span className="label-title">
              <Icon name="mail" className="icon icon-sm" />
              {t("email")}
            </span>
            <input
              type="email"
              required
              value={loginEmail}
              onChange={(event) => setLoginEmail(event.target.value)}
              placeholder={t("placeholder_email")}
              autoComplete="email"
            />
            <FieldMeta helpText={t("hint_contact_required")} />
          </label>

          <label>
            <span className="label-title">
              <Icon name="shield" className="icon icon-sm" />
              {t("password")}
            </span>
            <input
              type="password"
              required
              minLength={6}
              value={loginPassword}
              onChange={(event) => setLoginPassword(event.target.value)}
              placeholder="******"
              autoComplete="current-password"
            />
          </label>

          <div className="button-row">
            <button className="btn" type="submit" disabled={isSigningIn || isSigningUp || isSigningInWithGoogle}>
              {isSigningIn ? t("signing_in") : t("sign_in")}
            </button>
            <button
              className="btn btn-ghost"
              type="button"
              onClick={onSignUp}
              disabled={isSigningIn || isSigningUp || isSigningInWithGoogle}
            >
              {isSigningUp ? t("signing_up") : t("sign_up")}
            </button>
            <button
              className="btn btn-ghost"
              type="button"
              onClick={onGoogleSignIn}
              disabled={isSigningIn || isSigningUp || isSigningInWithGoogle}
            >
              {isSigningInWithGoogle ? t("signing_in_google") : t("sign_in_google")}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

export { AuthScreen };
