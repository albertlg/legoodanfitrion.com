import React from "react";

export function AvatarCircle({ label, fallback, imageUrl, size = 40, className = "", onClick }) {
  // Calculamos el tamaño de la fuente dinámicamente según el tamaño del avatar
  const sizeStyle = {
    width: size,
    height: size,
    minWidth: size,
    minHeight: size,
    fontSize: size * 0.38
  };

  return (
    <div
      onClick={onClick}
      title={label}
      // CLAVES APPLE: rounded-full (círculo perfecto), sombra suave, degradado de fondo y borde sutil
      className={`relative flex items-center justify-center rounded-full bg-gradient-to-b from-gray-50 to-gray-200 dark:from-gray-700 dark:to-gray-800 text-gray-700 dark:text-gray-200 font-bold tracking-tight shadow-sm border border-black/10 dark:border-white/10 overflow-hidden select-none ${onClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''} ${className}`}
      style={sizeStyle}
    >
      {imageUrl ? (
        <img src={imageUrl} alt={label} className="w-full h-full object-cover rounded-full" />
      ) : (
        <span>{fallback}</span>
      )}
    </div>
  );
}