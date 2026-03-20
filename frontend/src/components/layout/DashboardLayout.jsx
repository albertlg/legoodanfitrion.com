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
    interpolateText
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
                        // Primero ejecutamos el cambio de vista
                        changeView(item.key);

                        // Solo cerramos el menú si realmente está abierto
                        // Usamos un pequeño delay para que la navegación sea la prioridad
                        if (isMenuOpen) {
                            setTimeout(() => {
                                if (closeMobileMenu) closeMobileMenu();
                            }, 10);
                        }
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
                        <span className="block text-sm font-bold text-gray-900 dark:text-white truncate">
                            {hostDisplayName}
                        </span>
                    </button>

                    {/* Botón de Logout (Solo icono rojo) */}
                    <button
                        className="p-2.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors shrink-0"
                        type="button"
                        onClick={onSignOut}
                        title={t("sign_out") || "Cerrar sesión"}
                        aria-label={t("sign_out") || "Cerrar sesión"}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
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
            <aside className="hidden md:flex flex-col w-64 border-r border-white/60 dark:border-white/10 bg-slate-100/50 dark:bg-gray-900/50 backdrop-blur-2xl z-30 flex-shrink-0 shadow-[2px_0_16px_-4px_rgba(0,0,0,0.05)]">
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
                <header className="md:hidden flex-shrink-0 flex items-center justify-between px-4 h-16 bg-slate-100/60 dark:bg-gray-900/70 backdrop-blur-2xl border-b border-white/60 dark:border-white/10 sticky top-0 z-40 transition-colors shadow-sm">
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                        <button
                            onClick={toggleMobileMenu}
                            className="p-2 -ml-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors outline-none focus:ring-2 focus:ring-blue-500/50 shrink-0"
                            aria-label={t("open_menu")}
                            aria-expanded={isMenuOpen}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-gray-900 dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                        </button>
                        {/* 🏷️ TRUCO: Mostramos el nombre de la sección actual y lo truncamos si es muy largo */}
                        <span className="font-bold text-gray-900 dark:text-white text-lg tracking-tight truncate">
                            {sectionHeader?.title || t("app_name")}
                        </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                        {/* 🚀 NUEVO: Botones de Acción en Móvil (Solo Icono para ahorrar espacio) */}
                        {contextualSecondaryAction ? (
                            <button
                                className="flex items-center justify-center p-2 bg-black/5 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-black/10 dark:hover:bg-white/20 active:scale-95 transition-all outline-none"
                                type="button"
                                onClick={contextualSecondaryAction.onClick}
                                aria-label={contextualSecondaryAction.label}
                                title={contextualSecondaryAction.label}
                            >
                                <Icon name={contextualSecondaryAction.icon} className="w-5 h-5" />
                            </button>
                        ) : null}

                        {contextualCreateAction ? (
                            <button
                                className="flex items-center justify-center p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm active:scale-95 transition-all outline-none focus:ring-2 focus:ring-blue-500/50"
                                type="button"
                                onClick={contextualCreateAction.onClick}
                                aria-label={contextualCreateAction.label}
                                title={contextualCreateAction.label}
                            >
                                <Icon name={contextualCreateAction.icon} className="w-5 h-5" />
                            </button>
                        ) : null}

                        {/* Separador vertical sutil si hay botones de acción */}
                        {(contextualCreateAction || contextualSecondaryAction) && (
                            <div className="w-px h-6 bg-black/10 dark:bg-white/10 mx-1"></div>
                        )}

                        {/* Menú de Notificaciones Original */}
                        <div className="relative z-50" ref={notificationMenuRef}>
                            <button
                                className={`relative p-2 rounded-full transition-colors border outline-none focus:ring-2 focus:ring-blue-500/50 ${isNotificationMenuOpen ? "bg-black/5 dark:bg-white/10 border-black/10 dark:border-white/20" : "bg-transparent hover:bg-black/5 dark:hover:bg-white/5 border-transparent"}`}
                                type="button"
                                aria-label={t("notifications_toggle")}
                                aria-expanded={isNotificationMenuOpen}
                                onClick={() => setIsNotificationMenuOpen((prev) => !prev)}
                            >
                                <Icon name="bell" className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                                {unreadNotificationCount > 0 ? (
                                    <span className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.2rem] text-center shadow-sm">
                                        {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
                                    </span>
                                ) : null}
                            </button>

                            {isNotificationMenuOpen ? (
                                <div className="absolute right-0 mt-2 w-72 backdrop-blur-xl bg-white/95 dark:bg-gray-900/95 border border-black/10 dark:border-white/10 shadow-2xl rounded-2xl p-4 z-50 animate-in slide-in-from-top-2">
                                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-black/5 dark:border-white/5">
                                        <p className="font-bold text-sm text-gray-900 dark:text-white">{t("notifications_title")}</p>
                                        <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider">
                                            {interpolateText ? interpolateText(t("notifications_unread"), { count: unreadNotificationCount }) : `${unreadNotificationCount} unread`}
                                        </span>
                                    </div>
                                    {recentActivityItems?.length === 0 ? (
                                        <p className="text-sm text-center py-6 text-gray-500 dark:text-gray-400 italic">{t("notifications_empty")}</p>
                                    ) : (
                                        <ul className="space-y-2 max-h-[60vh] overflow-y-auto pr-1 scrollbar-thin">
                                            {recentActivityItems?.slice(0, 6).map((activityItem) => (
                                                <li key={`mobile-notif-${activityItem.id}`} className="flex gap-3 items-start p-3 rounded-xl bg-white/50 dark:bg-black/20 border border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer">
                                                    <span className={`mt-0.5 flex-shrink-0 p-2 rounded-lg ${statusClass ? statusClass(activityItem.status) : "bg-gray-100 text-gray-500"}`}>
                                                        <Icon name={activityItem.icon} className="w-3.5 h-3.5" />
                                                    </span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{activityItem.title}</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                                                            {activityItem.meta}
                                                        </p>
                                                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 uppercase tracking-wider font-medium">
                                                            {activityItem.timeLabel}
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

                {/* --- DESKTOP HEADER --- */}
                {!hideHeader ? (
                    <header className="hidden md:flex flex-none h-[72px] border-b border-white/60 dark:border-white/10 bg-slate-100/60 dark:bg-gray-900/70 backdrop-blur-2xl sticky top-0 z-40 items-center justify-between px-6 lg:px-8 shadow-sm transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 md:hidden cursor-pointer" aria-hidden="true" onClick={() => changeView("overview")}>
                                <BrandMark text={t("app_name")} fallback={t("logo_fallback")} />
                            </div>
                            <div className="flex flex-col justify-center">
                                {sectionHeader?.eyebrow ? (
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-0.5">
                                        {sectionHeader.eyebrow}
                                    </span>
                                ) : null}
                                {/* 🏷️ SOLUCIÓN: Eliminado hover:text-gray-900. Ahora respeta el modo siempre. */}
                                <h1 className="font-black text-2xl text-gray-900 dark:text-white tracking-tight truncate transition-colors">
                                    {sectionHeader?.title || t("app_name")}
                                </h1>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* Oculto en Desktop, pero lo mantenemos por si la pantalla se encoge */}
                            <button
                                className={`md:hidden p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors outline-none focus:ring-2 focus:ring-blue-500/50 ${isMenuOpen ? "bg-black/5 dark:bg-white/10" : ""}`}
                                type="button"
                                aria-label={t("open_menu")}
                                aria-expanded={isMenuOpen}
                                aria-controls="mobile-menu"
                                onClick={toggleMobileMenu}
                            >
                                <Icon name="menu" className="w-5 h-5" />
                            </button>

                            {contextualCreateAction ? (
                                <div className="hidden md:flex items-center gap-3">
                                    {contextualSecondaryAction ? (
                                        <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-black/10 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm outline-none focus:ring-2 focus:ring-blue-500/50" type="button" onClick={contextualSecondaryAction.onClick}>
                                            <Icon name={contextualSecondaryAction.icon} className="w-4 h-4" />
                                            {contextualSecondaryAction.label}
                                        </button>
                                    ) : null}
                                    <button className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all active:scale-95 outline-none focus:ring-2 focus:ring-blue-500/50" type="button" onClick={contextualCreateAction.onClick}>
                                        <Icon name={contextualCreateAction.icon} className="w-4 h-4" />
                                        {contextualCreateAction.label}
                                    </button>
                                </div>
                            ) : null}

                            {/* Separador visual sutil entre botones y notificaciones */}
                            {contextualCreateAction && (
                                <div className="hidden md:block w-px h-8 bg-black/10 dark:bg-white/10 mx-2"></div>
                            )}

                            <div className="relative" ref={notificationMenuRef}>
                                <button
                                    className={`relative p-2.5 rounded-full transition-colors border outline-none focus:ring-2 focus:ring-blue-500/50 ${isNotificationMenuOpen ? "bg-black/5 dark:bg-white/10 border-black/10 dark:border-white/20" : "bg-white/50 dark:bg-white/5 border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/10"}`}
                                    type="button"
                                    aria-label={t("notifications_toggle")}
                                    aria-expanded={isNotificationMenuOpen}
                                    onClick={() => setIsNotificationMenuOpen((prev) => !prev)}
                                >
                                    <Icon name="bell" className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                                    {unreadNotificationCount > 0 ? (
                                        <span className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.2rem] text-center shadow-sm">
                                            {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
                                        </span>
                                    ) : null}
                                </button>
                                {/* Notificaciones dropdown Desktop */}
                                {isNotificationMenuOpen ? (
                                    <div className="absolute right-0 mt-3 w-80 backdrop-blur-xl bg-white/95 dark:bg-gray-900/95 border border-black/10 dark:border-white/10 shadow-2xl rounded-2xl p-4 z-50 animate-in slide-in-from-top-2">
                                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-black/5 dark:border-white/5">
                                            <p className="font-bold text-sm text-gray-900 dark:text-white">{t("notifications_title")}</p>
                                            <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider">
                                                {interpolateText ? interpolateText(t("notifications_unread"), { count: unreadNotificationCount }) : `${unreadNotificationCount} unread`}
                                            </span>
                                        </div>
                                        {recentActivityItems?.length === 0 ? (
                                            <p className="text-sm text-center py-6 text-gray-500 dark:text-gray-400 italic">{t("notifications_empty")}</p>
                                        ) : (
                                            <ul className="space-y-2 max-h-[60vh] overflow-y-auto pr-1 scrollbar-thin">
                                                {recentActivityItems?.slice(0, 6).map((activityItem) => (
                                                    <li key={`head-${activityItem.id}`} className="flex gap-3 items-start p-3 rounded-xl bg-white/50 dark:bg-black/20 border border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer">
                                                        <span className={`mt-0.5 flex-shrink-0 p-2 rounded-lg ${statusClass ? statusClass(activityItem.status) : "bg-gray-100 text-gray-500"}`}>
                                                            <Icon name={activityItem.icon} className="w-3.5 h-3.5" />
                                                        </span>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{activityItem.title}</p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                                                                {activityItem.meta}
                                                            </p>
                                                            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 uppercase tracking-wider font-medium">
                                                                {activityItem.timeLabel}
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
                        className="p-2.5 -mr-2.5 rounded-lg text-gray-500 hover:text-black hover:bg-gray-100 dark:hover:bg-white/5 dark:text-gray-400 dark:hover:text-white"
                        type="button"
                        onClick={closeMobileMenu}
                    >
                        <Icon name="close" className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto mt-4 px-2 space-y-1">
                    {renderNavLinks()}
                </div>

                <div className="border-t border-black/5 dark:border-white/5">
                    {renderNavFooter()}
                </div>
            </aside>

            <nav className="md:hidden backdrop-blur-2xl bg-slate-100/70 dark:bg-gray-900/80 border-t border-white/60 dark:border-white/10 fixed bottom-0 left-0 right-0 z-[9990] flex items-center justify-around pb-safe pt-1 px-2 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.1)]" aria-label={t("nav_sections")}>
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
