import React from "react";
import { Icon } from "../../../../components/icons";

export function MagicCard({
    title,
    subtitle,
    icon,
    onClick,
    colorVariant = "blue" // "blue" | "purple" | "orange"
}) {
    // Paletas de gradientes según la variante
    const gradients = {
        blue: "from-blue-500 to-cyan-400",
        purple: "from-purple-500 to-pink-400",
        orange: "from-orange-500 to-yellow-400"
    };

    return (
        <div
            onClick={onClick}
            role="button"
            tabIndex={0}
            className="group relative w-full h-full min-h-[180px] rounded-[2rem] overflow-hidden cursor-pointer border border-black/10 dark:border-white/10 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1 active:scale-95"
        >
            {/* 1. Capa Base (Adaptativa) */}
            <div className="absolute inset-0 bg-gray-50/80 dark:bg-gray-900/80 transition-colors"></div>

            {/* 2. La Magia: Blob Animado (se revela más al hacer hover) */}
            <div className="absolute inset-0 flex items-center justify-center opacity-30 dark:opacity-20 group-hover:opacity-70 transition-opacity duration-700">
                <div
                    className={`w-40 h-40 rounded-full bg-gradient-to-tr ${gradients[colorVariant]} blur-3xl animate-spin`}
                    style={{ animationDuration: "10s" }}
                ></div>
            </div>

            {/* 3. Capa de Cristal (Glassmorphism) para suavizar la mancha */}
            <div className="absolute inset-0 backdrop-blur-[40px] bg-white/40 dark:bg-black/40"></div>

            {/* 4. Estructura asimétrica (Inspirada en el Uiverse) */}
            <div className="absolute inset-0 p-1.5">
                <div className="w-full h-full rounded-[1.5rem] rounded-tr-[4rem] rounded-br-[2rem] bg-white/40 dark:bg-gray-800/40 backdrop-blur-md border border-white/50 dark:border-white/5"></div>
            </div>

            {/* 5. Contenido Real */}
            <div className="relative w-full h-full p-6 flex flex-col justify-between z-10">
                <div className="flex justify-between items-start">
                    {/* Icono Principal */}
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center backdrop-blur-lg bg-white/60 dark:bg-black/30 text-${colorVariant}-600 dark:text-${colorVariant}-400 shadow-sm border border-black/5 dark:border-white/10`}>
                        <Icon name={icon} className="w-6 h-6" />
                    </div>

                    {/* Flechita superior derecha (Aparece en hover) */}
                    <div className="w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-lg bg-black/5 dark:bg-white/10 text-gray-500 dark:text-gray-400 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                        <Icon name="arrow-right" className="w-4 h-4" />
                    </div>
                </div>

                <div className="mt-6 flex flex-col gap-1">
                    <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">
                        {title}
                    </h3>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 line-clamp-2">
                        {subtitle}
                    </p>
                </div>
            </div>
        </div>
    );
}