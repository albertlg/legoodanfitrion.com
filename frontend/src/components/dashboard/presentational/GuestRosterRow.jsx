import React from "react";
import { Icon } from "../../icons";
import { AvatarCircle } from "../../avatar-circle";

// 🚀 Fila de invitado pura y reutilizable. Misma estructura que usa el
// dashboard real (AvatarCircle + bloque de texto + badge de estado).
// Sin Supabase, sin hooks globales.

const STATUS_CONFIG = {
    confirmed: { iconName: "check", className: "bg-green-50 dark:bg-green-900/25 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800/40" },
    pending: { iconName: "clock", className: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/40" },
    declined: { iconName: "close", className: "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700" }
};

export function GuestRosterRow({ name, hint, status, statusLabel, plusOne = false, avatarUrl }) {
    const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    return (
        <li className="flex items-center gap-3 px-4 py-3">
            <AvatarCircle label={name} imageUrl={avatarUrl} size={32} />
            <div className="flex flex-col flex-1 min-w-0">
                <span className="text-sm font-bold text-gray-900 dark:text-white truncate">
                    {name}
                    {plusOne ? (
                        <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                            +1
                        </span>
                    ) : null}
                </span>
                <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 truncate">
                    {hint || "\u00A0"}
                </span>
            </div>
            {statusLabel ? (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap ${statusConfig.className}`}>
                    <Icon name={statusConfig.iconName} className="w-3 h-3" />
                    {statusLabel}
                </span>
            ) : null}
        </li>
    );
}
