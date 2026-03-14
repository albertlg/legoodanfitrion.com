import { BrandMark } from "../components/brand-mark";
import { Controls } from "../components/controls";
import { FieldMeta } from "../components/field-meta";
import { Icon } from "../components/icons";
import { InlineMessage } from "../components/inline-message";
import { Helmet } from "react-helmet-async";

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
    <main className="page page-auth min-h-screen flex items-center justify-center p-4 md:p-8 relative overflow-hidden bg-gray-50 dark:bg-black">
      {/* 🚀 FIX SEO: Inyección dinámica de metadatos según el idioma */}
      <Helmet htmlAttributes={{ lang: language }}>
        <title>{t("seo_title")}</title>
        <meta name="description" content={t("seo_desc")} />

        {/* Open Graph Dinámico */}
        <meta property="og:title" content={t("seo_title")} />
        <meta property="og:description" content={t("seo_desc")} />

        {/* Twitter Card Dinámico */}
        <meta name="twitter:title" content={t("seo_title")} />
        <meta name="twitter:description" content={t("seo_desc")} />
      </Helmet>

      {/* Decorative background blobs to enhance glassmorphism (optional, matches the RSVP style) */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 dark:bg-blue-600/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-500/20 dark:bg-purple-600/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-pink-500/20 dark:bg-pink-600/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>

      <section className="w-full max-w-md mx-auto bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-3xl shadow-2xl p-8 flex flex-col relative z-10 transition-all">
        <header className="flex flex-col items-center justify-center text-center mb-8 relative">
          <div className="absolute top-0 right-0">
            <Controls
              themeMode={themeMode}
              setThemeMode={setThemeMode}
              language={language}
              setLanguage={setLanguage}
              t={t}
            />
          </div>
          {onBackToLanding ? (
            <button className="absolute top-0 left-0 p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors" type="button" onClick={onBackToLanding} title={t("landing_back_home")}>
              <Icon name="arrow_left" className="icon icon-sm" />
            </button>
          ) : null}

          <BrandMark text={t("app_name")} fallback={t("logo_fallback")} className="mb-4 drop-shadow-sm scale-125" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{isRecoveryMode ? t("auth_recovery_title") : t("auth_welcome_back")}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{isRecoveryMode ? t("auth_recovery_hint") : t("auth_welcome_hint")}</p>
        </header>

        {isLoadingAuth ? <p className="text-center text-sm font-medium text-blue-600 dark:text-blue-400 mb-4">{t("loading_session")}</p> : null}
        <div className="flex flex-col gap-3 mb-6">
          <InlineMessage type="error" text={authError} />
          <InlineMessage type="success" text={accountMessage} />
        </div>

        {isRecoveryMode ? (
          <form id="auth-recovery-panel" className="flex flex-col gap-4" onSubmit={onUpdatePassword} noValidate>
            <label className="block">
              <span className="block mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <Icon name="shield" className="w-3.5 h-3.5" />
                {t("auth_recovery_new_password")}
              </span>
              <input
                className="w-full px-4 py-3 bg-white/50 dark:bg-black/20 border border-black/5 dark:border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl text-sm text-gray-900 dark:text-white transition-all shadow-sm"
                type="password"
                required
                minLength={6}
                value={resetPassword}
                onChange={(event) => setResetPassword(event.target.value)}
                placeholder="******"
                autoComplete="new-password"
              />
            </label>
            <label className="block">
              <span className="block mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <Icon name="check" className="w-3.5 h-3.5" />
                {t("auth_recovery_confirm_password")}
              </span>
              <input
                className="w-full px-4 py-3 bg-white/50 dark:bg-black/20 border border-black/5 dark:border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl text-sm text-gray-900 dark:text-white transition-all shadow-sm"
                type="password"
                required
                minLength={6}
                value={resetPasswordConfirm}
                onChange={(event) => setResetPasswordConfirm(event.target.value)}
                placeholder="******"
                autoComplete="new-password"
              />
            </label>
            <div className="flex flex-col gap-3 mt-4">
              <button className="w-full py-3.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-xl shadow-md hover:scale-[1.02] transition-transform flex justify-center items-center gap-2" type="submit" disabled={isUpdatingPassword}>
                {isUpdatingPassword ? t("auth_recovery_updating") : t("auth_recovery_update_action")}
              </button>
              <button className="w-full py-3.5 bg-transparent border border-black/10 dark:border-white/10 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all flex justify-center items-center gap-2" type="button" onClick={onExitRecovery} disabled={isUpdatingPassword}>
                {t("auth_recovery_cancel")}
              </button>
            </div>
          </form>
        ) : (
          <form id="auth-access-panel" className="flex flex-col gap-4" onSubmit={onSignIn} noValidate>
            <button
              className="w-full py-3 bg-white/50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-xl hover:bg-white/80 dark:hover:bg-white/5 transition-all flex justify-center items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200 shadow-sm"
              type="button"
              onClick={onGoogleSignIn}
              disabled={isSigningIn || isSigningUp || isSigningInWithGoogle}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                  <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
                  <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
                  <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
                  <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
                </g>
              </svg>
              {isSigningInWithGoogle ? t("signing_in_google") : t("sign_in_google")}
            </button>

            <div className="flex items-center gap-4 my-2 opacity-60">
              <span className="flex-1 h-px bg-gray-300 dark:bg-gray-700"></span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("auth_or_continue_with_email")}</span>
              <span className="flex-1 h-px bg-gray-300 dark:bg-gray-700"></span>
            </div>

            <label className="block">
              <span className="block mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <Icon name="mail" className="w-3.5 h-3.5" />
                {t("email")}
              </span>
              <input
                className="w-full px-4 py-3 bg-white/50 dark:bg-black/20 border border-black/5 dark:border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl text-sm text-gray-900 dark:text-white transition-all shadow-sm"
                type="email"
                required
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                placeholder={t("placeholder_email")}
                autoComplete="email"
              />
              <FieldMeta helpText={t("hint_contact_required")} />
            </label>

            <label className="block">
              <span className="block mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <Icon name="shield" className="w-3.5 h-3.5" />
                {t("password")}
              </span>
              <input
                className="w-full px-4 py-3 bg-white/50 dark:bg-black/20 border border-black/5 dark:border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl text-sm text-gray-900 dark:text-white transition-all shadow-sm"
                type="password"
                required
                minLength={6}
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                placeholder="******"
                autoComplete="current-password"
              />
            </label>

            <div className="flex justify-end mt-[-8px]">
              <button
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                type="button"
                onClick={onForgotPassword}
                disabled={isSigningIn || isSigningUp || isSigningInWithGoogle || isSendingPasswordReset}
              >
                {isSendingPasswordReset ? t("auth_sending_reset_password") : t("auth_forgot_password")}
              </button>
            </div>

            <button className="w-full py-3.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-xl shadow-md hover:scale-[1.02] transition-transform flex justify-center items-center gap-2 mt-4" type="submit" disabled={isSigningIn || isSigningUp || isSigningInWithGoogle}>
              {isSigningIn ? t("signing_in") : t("sign_in")}
            </button>

            <div className="text-center mt-6 text-sm text-gray-600 dark:text-gray-400">
              {t("auth_no_account")}{" "}
              <button
                className="font-bold text-gray-900 dark:text-white hover:underline transition-all"
                type="button"
                onClick={onSignUp}
                disabled={isSigningIn || isSigningUp || isSigningInWithGoogle}
              >
                {isSigningUp ? t("signing_up") : t("sign_up")}
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}

export { AuthScreen };
