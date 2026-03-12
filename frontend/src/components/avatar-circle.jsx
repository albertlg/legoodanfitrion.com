import React, { useState, useEffect } from "react";

export function AvatarCircle({ label, fallback, imageUrl, size = 40, className = "", onClick }) {
  // Estado para controlar si la imagen de Google (o cualquier otra) falla al cargar (Error 403/404)
  const [hasError, setHasError] = useState(false);

  // Si la URL de la imagen cambia (por ejemplo, si editamos al invitado), reseteamos el error
  useEffect(() => {
    setHasError(false);
  }, [imageUrl]);

  // Calculamos el tamaño de la fuente dinámicamente según el tamaño del avatar
  const sizeStyle = {
    width: size,
    height: size,
    minWidth: size,
    minHeight: size,
    fontSize: size * 0.38
  };

  // Helper para obtener las iniciales si el fallback no viene o es genérico ("IN")
  const getInitials = () => {
    if (fallback && fallback !== "IN") return fallback;
    if (!label) return "IN";
    const parts = label.trim().split(/\s+/);
    return parts.map(p => p.substring(0, 1)).join("").substring(0, 2).toUpperCase() || "IN";
  };

  return (
    <div
      onClick={onClick}
      title={label}
      // CLAVES APPLE: rounded-full (círculo perfecto), sombra suave, degradado de fondo y borde sutil
      className={`relative flex items-center justify-center rounded-full bg-gradient-to-b from-gray-50 to-gray-200 dark:from-gray-700 dark:to-gray-800 text-gray-700 dark:text-gray-200 font-bold tracking-tight shadow-sm border border-black/10 dark:border-white/10 overflow-hidden select-none shrink-0 ${onClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''} ${className}`}
      style={sizeStyle}
    >
      {/* Si hay URL de imagen y NO ha dado error, la intentamos cargar */}
      {imageUrl && !hasError ? (
        <img
          src={imageUrl}
          alt={label}
          className="w-full h-full object-cover rounded-full bg-white dark:bg-gray-900"
          onError={() => setHasError(true)} // ¡LA MAGIA! Si da un 403 de Google, esto se activa al instante
        />
      ) : (
        /* Si no hay imagen o dio error, mostramos las iniciales elegantes */
        <span>{getInitials()}</span>
      )}
    </div>
  );
}