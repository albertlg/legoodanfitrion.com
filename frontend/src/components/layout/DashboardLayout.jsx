import { BrandMark } from "../brand-mark";
import { Controls } from "../controls";
import { AvatarCircle } from "../avatar-circle";
import { Icon } from "../icons";

export function DashboardLayout({
    children,
    hideHeader,
    t,
    themeMode,
    setThemeMode,
    language,
    setLanguage,
    session,
    onSignOut,
    hostDisplayName,
    hostInitials,
    hostAvatarUrl,
    unreadNotificationCount,
    isNotificationMenuOpen,
    setIsNotificationMenuOpen,
    recentActivityItems,
    activeView,
    changeView,
    VIEW_CONFIG,
    isMenuOpen,
    toggleMobileMenu,
    closeMobileMenu,
    contextualCreateAction,
    contextualSecondaryAction,
    openHostProfile,
    notificationMenuRef,
    statusClass,
    sectionHeader,
    interpolateText,
}) {

    // ==========================================
    // 1. COMPONENTES UNIFICADOS (Limpios y con SVG)
    // ==========================================

    const renderNavLinks = () => (
        <div className="dashboard-nav-links space-y-1">
            {VIEW_CONFIG?.map((item) => (
                <button
                    key={item.key}
                    type="button"
                    className={`nav-btn w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${activeView === item.key ? "active bg-black/5 dark:bg-white/10 text-black dark:text-white shadow-sm" : "text-gray-600 dark:text-gray-400 hover:bg-black/5 hover:text-black dark:hover:bg-white/5 dark:hover:text-white"}`}
                    onClick={() => {
                        changeView(item.key);
                        if (isMenuOpen && closeMobileMenu) closeMobileMenu();
                    }}
                >
                    <Icon name={item.icon} className={`icon ${activeView === item.key ? "text-blue-500 dark:text-blue-400" : ""}`} />
                    <span>{t(item.labelKey)}</span>
                </button>
            ))}
        </div>
    );

    const renderNavFooter = () => (
        <div className="mt-auto pt-4 pb-6 px-3 space-y-4 border-t border-black/5 dark:border-white/10 w-full min-w-0">

            {/* --- FOOTER DEL SIDEBAR --- */}
            <div className="mt-auto pt-6 flex flex-col gap-4">
                <div className="flex justify-center md:justify-start">
                    <Controls
                        themeMode={themeMode}
                        setThemeMode={setThemeMode}
                        language={language}
                        setLanguage={setLanguage}
                        t={t}
                    />
                </div>

                <div className="flex items-center justify-between gap-2 pt-4 border-t border-black/10 dark:border-white/10">
                    {/* Botón de Perfil (Foto + Nombre) */}
                    <button
                        className="flex items-center gap-3 hover:opacity-70 transition-opacity min-w-0 text-left"
                        type="button"
                        onClick={openHostProfile}
                        title={t("host_profile_title")}
                    >
                        <AvatarCircle
                            className="shadow-sm shrink-0"
                            label={hostDisplayName}
                            fallback={hostInitials}
                            imageUrl={hostAvatarUrl}
                            size={36}
                        />
                        <span className="hidden md:block text-sm font-bold text-gray-900 dark:text-white truncate">
                            {hostDisplayName}
                        </span>
                    </button>

                    {/* Botón de Logout (Solo icono rojo) */}
                    <button
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors shrink-0"
                        type="button"
                        onClick={onSignOut}
                        title={t("sign_out") || "Cerrar sesión"}
                        aria-label={t("sign_out") || "Cerrar sesión"}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                            <polyline points="16 17 21 12 16 7"></polyline>
                            <line x1="21" y1="12" x2="9" y2="12"></line>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );

    // ==========================================
    // 2. RENDER PRINCIPAL
    // ==========================================

    return (
        <div className="flex flex-col md:flex-row h-screen bg-gray-50 dark:bg-black w-full max-w-7xl mx-auto overflow-hidden relative shadow-2xl border-x border-black/5 dark:border-white/5">

            {/* --- DESKTOP SIDEBAR --- */}
            <aside className="hidden md:flex flex-col w-64 border-r border-black/10 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-xl z-30 flex-shrink-0">
                <div className="p-6 border-b border-black/5 dark:border-white/5">
                    <div className="flex items-center gap-2 cursor-pointer" aria-hidden="true" onClick={() => changeView("overview")}>
                        <BrandMark text={t("app_name")} fallback={t("logo_fallback")} className="drop-shadow-sm hover:scale-105 transition-transform" />
                        <span className="flex flex-col">
                            <span className="font-semibold tracking-tight text-gray-900 dark:text-white text-sm">{t("app_name")}</span>
                            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">{t("panel_title")}</span>
                        </span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-1">
                    {renderNavLinks()}
                </div>

                <div className="p-4 border-t border-black/5 dark:border-white/5">
                    {renderNavFooter()}
                </div>
            </aside>

            {/* --- MAIN CONTENT AREA --- */}
            <div className="flex-1 flex flex-col h-screen overflow-y-auto relative min-w-0">

                {/* --- MOBILE HEADER ALWAYS VISIBLE --- */}
                <header className="md:hidden flex-shrink-0 flex items-center justify-between px-4 h-16 bg-white/70 dark:bg-black/70 backdrop-blur-md border-b border-black/5 dark:border-white/10 sticky top-0 z-40">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggleMobileMenu}
                            className="p-2 -ml-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                            aria-label="Abrir menú"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-gray-900 dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                        </button>
                        <span className="font-bold text-gray-900 dark:text-white">{t("app_name")}</span>
                    </div>

                    <div className="relative" ref={notificationMenuRef}>
                        <button
                            className={`relative p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors border border-black/10 dark:border-white/10 ${isNotificationMenuOpen ? "bg-black/5 dark:bg-white/5" : "bg-transparent"}`}
                            type="button"
                            onClick={() => setIsNotificationMenuOpen((prev) => !prev)}
                        >
                            <Icon name="bell" className="w-4 h-4" />
                            {unreadNotificationCount > 0 ? (
                                <span className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.2rem] text-center">
                                    {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
                                </span>
                            ) : null}
                        </button>
                    </div>
                </header>

                {/* --- DESKTOP HEADER --- */}
                {!hideHeader ? (
                    <header className="hidden md:flex flex-none h-16 border-b border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/70 backdrop-blur-md sticky top-0 z-40 items-center justify-between px-4 md:px-6 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 md:hidden cursor-pointer" aria-hidden="true" onClick={() => changeView("overview")}>
                                <BrandMark text={t("app_name")} fallback={t("logo_fallback")} />
                            </div>
                            <div className="flex flex-col">
                                {sectionHeader?.eyebrow ? <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{sectionHeader.eyebrow}</span> : null}
                                <h1 className="font-semibold text-lg hover:text-gray-900 dark:text-white truncate">{sectionHeader?.title || t("app_name")}</h1>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                className={`md:hidden p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${isMenuOpen ? "bg-black/5" : ""}`}
                                type="button"
                                aria-label={t("open_menu")}
                                aria-expanded={isMenuOpen}
                                aria-controls="mobile-menu"
                                onClick={toggleMobileMenu}
                            >
                                <Icon name="menu" className="w-5 h-5" />
                            </button>

                            {contextualCreateAction ? (
                                <div className="hidden md:flex items-center gap-2">
                                    {contextualSecondaryAction ? (
                                        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 transition-colors" type="button" onClick={contextualSecondaryAction.onClick}>
                                            <Icon name={contextualSecondaryAction.icon} className="w-4 h-4" />
                                            {contextualSecondaryAction.label}
                                        </button>
                                    ) : null}
                                    <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors" type="button" onClick={contextualCreateAction.onClick}>
                                        <Icon name={contextualCreateAction.icon} className="w-4 h-4" />
                                        {contextualCreateAction.label}
                                    </button>
                                </div>
                            ) : null}

                            <div className="relative" ref={notificationMenuRef}>
                                <button
                                    className={`relative p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors border border-black/10 dark:border-white/10 ${isNotificationMenuOpen ? "bg-black/5 dark:bg-white/5" : "bg-white/50 dark:bg-white/5"}`}
                                    type="button"
                                    onClick={() => setIsNotificationMenuOpen((prev) => !prev)}
                                >
                                    <Icon name="bell" className="w-4 h-4" />
                                    {unreadNotificationCount > 0 ? (
                                        <span className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.2rem] text-center">
                                            {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
                                        </span>
                                    ) : null}
                                </button>
                                {/* Notificaciones dropdown */}
                                {isNotificationMenuOpen ? (
                                    <div className="absolute right-0 mt-2 w-80 backdrop-blur-xl bg-white/95 dark:bg-gray-900/95 border border-black/10 dark:border-white/10 shadow-xl rounded-2xl p-4 z-50 animate-in slide-in-from-top-2">
                                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-black/5 dark:border-white/5">
                                            <p className="font-semibold text-sm">{t("notifications_title")}</p>
                                            <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded-full text-xs font-medium">
                                                {interpolateText ? interpolateText(t("notifications_unread"), { count: unreadNotificationCount }) : `${unreadNotificationCount} unread`}
                                            </span>
                                        </div>
                                        {recentActivityItems?.length === 0 ? (
                                            <p className="text-sm text-center py-4 text-gray-500">{t("notifications_empty")}</p>
                                        ) : (
                                            <ul className="space-y-3 max-h-64 overflow-y-auto pr-1">
                                                {recentActivityItems?.slice(0, 6).map((activityItem) => (
                                                    <li key={`head-${activityItem.id}`} className="flex gap-3 items-start p-2 rounded-lg bg-white/50 dark:bg-black/20 border border-black/5 dark:border-white/5">
                                                        <span className={`mt-0.5 flex-shrink-0 ${statusClass ? statusClass(activityItem.status) : ""}`}>
                                                            <Icon name={activityItem.icon} className="w-4 h-4" />
                                                        </span>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{activityItem.title}</p>
                                                            <p className="text-xs text-gray-500 truncate">
                                                                {activityItem.meta} · {activityItem.timeLabel}
                                                            </p>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </header>
                ) : null}

                {/* --- DYNAMIC CHILD CONTENT --- */}
                <main className="flex-1 p-4 pb-28 md:p-6 lg:p-8 relative z-10 w-full">
                    {children}
                </main>
            </div>

            {/* --- MOBILE MENUS, OVERLAYS & DRAWER (Unchanged logic, just tailwind classes) --- */}
            <div
                className={`fixed inset-0 z-[9998] transition-opacity duration-300 md:hidden backdrop-blur-sm bg-black/40 dark:bg-black/70 ${isMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
                onClick={closeMobileMenu}
            />

            <aside
                id="mobile-menu"
                className={`fixed inset-y-0 right-0 h-full w-72 z-[9999] transform transition-transform duration-300 flex flex-col md:hidden backdrop-blur-2xl bg-white/95 dark:bg-gray-900/95 border-l border-gray-200 dark:border-white/10 shadow-2xl ${isMenuOpen ? "translate-x-0" : "translate-x-full"}`}
                aria-hidden={!isMenuOpen}
            >
                <div className="flex items-center justify-between px-5 pt-6 pb-2 border-b border-black/5 dark:border-white/5">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 m-0">{t("nav_sections")}</p>
                    <button
                        className="p-1.5 -mr-1.5 rounded-lg text-gray-500 hover:text-black hover:bg-gray-100 dark:hover:bg-white/5 dark:text-gray-400 dark:hover:text-white"
                        type="button"
                        onClick={closeMobileMenu}
                    >
                        <Icon name="x" className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto mt-4 px-2 space-y-1">
                    {renderNavLinks()}
                </div>

                <div className="border-t border-black/5 dark:border-white/5">
                    {renderNavFooter()}
                </div>
            </aside>

            <nav className="md:hidden backdrop-blur-xl bg-white/90 dark:bg-gray-900/90 border-t border-gray-200 dark:border-white/10 fixed bottom-0 left-0 right-0 z-[9990] flex items-center justify-around pb-safe pt-1 px-2 shadow-[0_-4px_24px_-12px_rgba(0,0,0,0.1)]" aria-label={t("nav_sections")}>
                {VIEW_CONFIG?.map((item) => (
                    <button
                        key={`mobile-bottom-${item.key}`}
                        type="button"
                        className={`flex flex-col items-center justify-center p-2 min-w-[64px] transition-colors ${activeView === item.key ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"}`}
                        onClick={() => changeView(item.key)}
                        aria-current={activeView === item.key ? "page" : undefined}
                    >
                        <div className={`mb-1 p-1 rounded-full transition-colors ${activeView === item.key ? "bg-blue-50 dark:bg-blue-900/30" : ""}`}>
                            <Icon name={item.icon} className="w-5 h-5" />
                        </div>
                        <span className={`text-[10px] ${activeView === item.key ? "font-semibold" : "font-medium"}`}>{t(item.labelKey)}</span>
                    </button>
                ))}
            </nav>
        </div>
    );
}
