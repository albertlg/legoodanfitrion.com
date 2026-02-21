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
  isSendingPasswordReset,
  isRecoveryMode,
  resetPassword,
  setResetPassword,
  resetPasswordConfirm,
  setResetPasswordConfirm,
  isUpdatingPassword,
  onUpdatePassword,
  onExitRecovery,
  onSignIn,
  onSignUp,
  onForgotPassword,
  onGoogleSignIn,
  onBackToLanding
}) {
  return (
    <main className="page page-auth">
      <section className="card app-card auth-shell">
        <aside className="auth-brand-pane">
          <div className="auth-brand-main">
            <div className="brand-header auth-brand-header">
              <BrandMark text={t("app_name")} fallback={t("logo_fallback")} />
              <p className="auth-brand-name">{t("app_name")}</p>
            </div>
            <div className="auth-brand-copy">
              <h1 className="auth-hero-title">{t("auth_hero_title")}</h1>
              <p className="hero-text">{t("hero_subtitle")}</p>
            </div>
          </div>
          <blockquote className="auth-quote">
            <p>{t("auth_social_proof_quote")}</p>
            <footer>{t("auth_social_proof_author")}</footer>
          </blockquote>
        </aside>

        <section className="auth-form-pane">
          <header className="auth-form-header">
            <div className="auth-form-top-actions">
              {onBackToLanding ? (
                <button className="btn btn-ghost btn-sm" type="button" onClick={onBackToLanding}>
                  <Icon name="arrow_left" className="icon icon-sm" />
                  {t("landing_back_home")}
                </button>
              ) : null}
              <Controls
                themeMode={themeMode}
                setThemeMode={setThemeMode}
                language={language}
                setLanguage={setLanguage}
                t={t}
              />
            </div>
            <div>
              <h2>{isRecoveryMode ? t("auth_recovery_title") : t("auth_welcome_back")}</h2>
              <p className="field-help">{isRecoveryMode ? t("auth_recovery_hint") : t("auth_welcome_hint")}</p>
            </div>
          </header>

          {isLoadingAuth ? <p>{t("loading_session")}</p> : null}
          <InlineMessage type="error" text={authError} />
          <InlineMessage type="success" text={accountMessage} />

          {isRecoveryMode ? (
            <form id="auth-recovery-panel" className="panel form-grid auth-form" onSubmit={onUpdatePassword} noValidate>
              <label>
                <span className="label-title">
                  <Icon name="shield" className="icon icon-sm" />
                  {t("auth_recovery_new_password")}
                </span>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={resetPassword}
                  onChange={(event) => setResetPassword(event.target.value)}
                  placeholder="******"
                  autoComplete="new-password"
                />
              </label>
              <label>
                <span className="label-title">
                  <Icon name="check" className="icon icon-sm" />
                  {t("auth_recovery_confirm_password")}
                </span>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={resetPasswordConfirm}
                  onChange={(event) => setResetPasswordConfirm(event.target.value)}
                  placeholder="******"
                  autoComplete="new-password"
                />
              </label>
              <button className="btn btn-block" type="submit" disabled={isUpdatingPassword}>
                {isUpdatingPassword ? t("auth_recovery_updating") : t("auth_recovery_update_action")}
              </button>
              <button className="btn btn-ghost btn-block" type="button" onClick={onExitRecovery} disabled={isUpdatingPassword}>
                {t("auth_recovery_cancel")}
              </button>
            </form>
          ) : (
            <form id="auth-access-panel" className="panel form-grid auth-form" onSubmit={onSignIn} noValidate>
              <button
                className="btn btn-ghost btn-google"
                type="button"
                onClick={onGoogleSignIn}
                disabled={isSigningIn || isSigningUp || isSigningInWithGoogle}
              >
                <span className="google-mark" aria-hidden="true">
                  G
                </span>
                {isSigningInWithGoogle ? t("signing_in_google") : t("sign_in_google")}
              </button>

              <p className="auth-divider">
                <span>{t("auth_or_continue_with_email")}</span>
              </p>

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

              <p className="auth-forgot">
                <button
                  className="text-link-btn auth-forgot-btn"
                  type="button"
                  onClick={onForgotPassword}
                  disabled={isSigningIn || isSigningUp || isSigningInWithGoogle || isSendingPasswordReset}
                >
                  {isSendingPasswordReset ? t("auth_sending_reset_password") : t("auth_forgot_password")}
                </button>
              </p>

              <button className="btn btn-block" type="submit" disabled={isSigningIn || isSigningUp || isSigningInWithGoogle}>
                {isSigningIn ? t("signing_in") : t("sign_in")}
              </button>

              <p className="auth-switch">
                {t("auth_no_account")}{" "}
                <button
                  className="text-link-btn"
                  type="button"
                  onClick={onSignUp}
                  disabled={isSigningIn || isSigningUp || isSigningInWithGoogle}
                >
                  {isSigningUp ? t("signing_up") : t("sign_up")}
                </button>
              </p>
            </form>
          )}
        </section>
      </section>
    </main>
  );
}

export { AuthScreen };
