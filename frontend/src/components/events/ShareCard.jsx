import React, { useState } from "react";
import { Icon } from "../icons";

const GOOGLE_MAPS_API_KEY = String(
  typeof import.meta !== "undefined" && import.meta.env
    ? import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ""
    : ""
).trim();

/**
 * Static map preview thumbnail.
 * Uses Google Maps Static API if a key is available, otherwise a styled placeholder.
 * crossOrigin="anonymous" is set so html-to-image can render the canvas without CORS tainting.
 */
function MapPreview({ location }) {
  const [imgError, setImgError] = useState(false);

  if (!location) return null;

  const showRealMap = Boolean(GOOGLE_MAPS_API_KEY && !imgError);

  if (showRealMap) {
    const mapSrc = `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(
      location
    )}&zoom=15&size=120x120&scale=2&maptype=roadmap&style=feature:all|element:geometry|color:0x1e293b&style=feature:water|color:0x0f172a&style=feature:road|color:0x334155&style=feature:road|element:labels|visibility:off&style=feature:poi|visibility:off&style=feature:transit|visibility:off&style=feature:administrative|element:labels|visibility:off&markers=color:0x6366f1|${encodeURIComponent(
      location
    )}&key=${GOOGLE_MAPS_API_KEY}`;

    return (
      <div className="w-[52px] h-[52px] rounded-xl overflow-hidden border border-white/15 shrink-0">
        <img
          src={mapSrc}
          alt=""
          crossOrigin="anonymous"
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  // Stylized fallback placeholder
  return (
    <div className="w-[52px] h-[52px] rounded-xl overflow-hidden border border-white/15 shrink-0 bg-gradient-to-br from-indigo-500/20 to-sky-500/20 flex items-center justify-center">
      <Icon name="location" className="w-5 h-5 text-white/40" />
    </div>
  );
}

export function ShareCard({
  eventName,
  eventDate,
  eventLocation,
  hostName,
  hostAvatarUrl,
  appName = "LeGoodAnfitrión",
  subtitle = "Invitation Story",
  footerMessage = "Confirma tu asistencia en el enlace adjunto",
  dateLabel = "Fecha",
  locationLabel = "Lugar",
  hostLabel = "Anfitrión"
}) {
  // Iniciales del anfitrión para el avatar fallback
  const hostInitials = String(hostName || "")
    .trim()
    .split(/\s+/)
    .map((w) => w[0] || "")
    .join("")
    .substring(0, 2)
    .toUpperCase() || "AN";

  return (
    <article className="relative w-[360px] min-h-[640px] overflow-hidden rounded-[28px] bg-[#0b1220] text-white border border-white/10 shadow-2xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(99,102,241,0.45),transparent_45%),radial-gradient(circle_at_80%_20%,rgba(14,165,233,0.35),transparent_40%),radial-gradient(circle_at_50%_90%,rgba(147,51,234,0.30),transparent_45%)]" />
      <div className="absolute inset-0 backdrop-blur-[2px]" />
      <div className="absolute inset-x-6 top-6 h-12 rounded-2xl border border-white/15 bg-white/10 backdrop-blur-xl" />
      <div className="relative z-10 flex flex-col px-8 py-7" style={{ minHeight: 640 }}>
        <header className="flex items-center gap-3 mb-10">
          <img
            src="/brand/logo-legoodanfitrion-icon.png"
            alt={appName}
            className="w-10 h-10 rounded-xl object-cover border border-white/20 shadow-md"
            loading="eager"
          />
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-[0.18em] text-white/70 font-bold">
              {appName}
            </span>
            <span className="text-[10px] text-white/60">{subtitle}</span>
          </div>
        </header>

        <div className="flex-1 flex flex-col gap-6">
          <h2 className="text-[36px] leading-[1.04] font-black tracking-tight text-white drop-shadow-xl">
            {eventName}
          </h2>

          <div className="flex flex-col gap-3">
            {/* Fecha */}
            <div className="rounded-2xl bg-white/10 border border-white/15 px-4 py-3 backdrop-blur-xl flex items-center gap-3">
              <span className="inline-flex w-8 h-8 rounded-xl bg-white/15 items-center justify-center shrink-0">
                <Icon name="calendar" className="w-4 h-4 text-white/80" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-widest text-white/70 font-bold mb-0.5">{dateLabel}</p>
                <p className="text-sm font-semibold text-white leading-snug break-words">{eventDate}</p>
              </div>
            </div>

            {/* Lugar + mini mapa */}
            <div className="rounded-2xl bg-white/10 border border-white/15 px-4 py-3 backdrop-blur-xl flex items-center gap-3">
              <span className="inline-flex w-8 h-8 rounded-xl bg-white/15 items-center justify-center shrink-0">
                <Icon name="location" className="w-4 h-4 text-white/80" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-widest text-white/70 font-bold mb-0.5">{locationLabel}</p>
                <p className="text-sm font-semibold text-white leading-snug break-words">{eventLocation}</p>
              </div>
              <MapPreview location={eventLocation} />
            </div>

            {/* Anfitrión + avatar */}
            <div className="rounded-2xl bg-white/10 border border-white/15 px-4 py-3 backdrop-blur-xl flex items-center gap-3">
              <span className="inline-flex w-8 h-8 rounded-xl bg-white/15 items-center justify-center shrink-0">
                <Icon name="user" className="w-4 h-4 text-white/80" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-widest text-white/70 font-bold mb-0.5">{hostLabel}</p>
                <p className="text-sm font-semibold text-white break-words">{hostName}</p>
              </div>
              {/* Avatar real del anfitrión */}
              <div className="w-9 h-9 rounded-full overflow-hidden border border-white/20 shrink-0 bg-gradient-to-b from-white/20 to-white/5 flex items-center justify-center">
                {hostAvatarUrl ? (
                  <img
                    src={hostAvatarUrl}
                    alt=""
                    crossOrigin="anonymous"
                    className="w-full h-full object-cover rounded-full"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = "";
                    }}
                  />
                ) : null}
                <span
                  className="text-[11px] font-bold text-white/70 select-none"
                  style={hostAvatarUrl ? { display: "none" } : {}}
                >
                  {hostInitials}
                </span>
              </div>
            </div>
          </div>
        </div>

        <footer className="mt-8 rounded-2xl border border-white/15 bg-white/10 backdrop-blur-xl px-4 py-4 flex items-start gap-3">
          <span className="mt-0.5 inline-flex w-8 h-8 rounded-xl bg-white/20 items-center justify-center shrink-0">
            <Icon name="mail" className="w-4 h-4 text-white" />
          </span>
          <p className="text-[13px] leading-snug font-semibold text-white/95">
            {footerMessage}
          </p>
        </footer>
      </div>
    </article>
  );
}
