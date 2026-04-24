import React from "react";

// 🚀 KPI tile del event-detail-view (variante centrada sin icono).
// Extraído pixel-parity de src/screens/dashboard/components/event-detail-view.jsx
// (bloque de 4 tarjetas: Invitaciones, Sí, Pendiente, No). Lo usan: event-detail
// real e InteractiveDemo en la landing, compartiendo ADN visual al 100%.

export function EventKpiTile({ label, value, valueClassName }) {
    return (
        <article className="bg-white/40 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10 p-4 flex flex-col items-center justify-center text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">{label}</p>
            <p className={`text-2xl font-black leading-none ${valueClassName || "text-gray-900 dark:text-white"}`}>{value}</p>
        </article>
    );
}
