import React from "react";
import { Icon } from "../icons";

export function ShareCard({
  eventName,
  eventDate,
  eventLocation,
  hostName,
  appName = "LeGoodAnfitrión",
  footerMessage = "Confirma tu asistencia en el enlace adjunto",
  dateLabel = "Fecha",
  locationLabel = "Lugar",
  hostLabel = "Anfitrión"
}) {
  return (
    <article className="relative w-[360px] h-[640px] overflow-hidden rounded-[28px] bg-[#0b1220] text-white border border-white/10 shadow-2xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(99,102,241,0.45),transparent_45%),radial-gradient(circle_at_80%_20%,rgba(14,165,233,0.35),transparent_40%),radial-gradient(circle_at_50%_90%,rgba(147,51,234,0.30),transparent_45%)]" />
      <div className="absolute inset-0 backdrop-blur-[2px]" />
      <div className="absolute inset-x-6 top-6 h-12 rounded-2xl border border-white/15 bg-white/10 backdrop-blur-xl" />
      <div className="relative z-10 h-full flex flex-col px-8 py-7">
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
            <span className="text-[10px] text-white/60">Invitation Story</span>
          </div>
        </header>

        <div className="flex-1 flex flex-col gap-6">
          <h2 className="text-[36px] leading-[1.04] font-black tracking-tight text-white drop-shadow-xl">
            {eventName}
          </h2>

          <div className="flex flex-col gap-3">
            <div className="rounded-2xl bg-white/10 border border-white/15 px-4 py-3 backdrop-blur-xl">
              <p className="text-[10px] uppercase tracking-widest text-white/70 font-bold mb-1">{dateLabel}</p>
              <p className="text-sm font-semibold text-white">{eventDate}</p>
            </div>

            <div className="rounded-2xl bg-white/10 border border-white/15 px-4 py-3 backdrop-blur-xl">
              <p className="text-[10px] uppercase tracking-widest text-white/70 font-bold mb-1">{locationLabel}</p>
              <p className="text-sm font-semibold text-white leading-snug">{eventLocation}</p>
            </div>

            <div className="rounded-2xl bg-white/10 border border-white/15 px-4 py-3 backdrop-blur-xl">
              <p className="text-[10px] uppercase tracking-widest text-white/70 font-bold mb-1">{hostLabel}</p>
              <p className="text-sm font-semibold text-white">{hostName}</p>
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
