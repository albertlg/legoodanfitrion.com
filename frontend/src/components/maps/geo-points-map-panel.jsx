import { useEffect, useRef } from "react";
import { Icon } from "../icons";

export function GeoPointsMapPanel({ mapsStatus, mapsError, points, title, hint, emptyText, t, onOpenDetail, openActionText }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const infoWindowRef = useRef(null);

  useEffect(() => {
    if (mapsStatus !== "ready" || !mapContainerRef.current || !Array.isArray(points) || points.length === 0) {
      return;
    }
    if (!window.google?.maps || !window.google?.maps?.marker) {
      return;
    }

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new window.google.maps.Map(mapContainerRef.current, {
        center: { lat: points[0].lat, lng: points[0].lng },
        zoom: 11,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        mapId: "DEMO_MAP_ID"
      });
      infoWindowRef.current = new window.google.maps.InfoWindow();
    }

    markersRef.current.forEach((marker) => {
      marker.map = null;
    });
    markersRef.current = [];

    const bounds = new window.google.maps.LatLngBounds();

    points.forEach((pointItem) => {
      const marker = new window.google.maps.marker.AdvancedMarkerElement({
        map: mapInstanceRef.current,
        position: { lat: pointItem.lat, lng: pointItem.lng },
        title: pointItem.label
      });

      marker.addListener("gmp-click", () => {
        if (infoWindowRef.current) {
          const contentNode = document.createElement("div");
          contentNode.style.padding = "4px 8px 4px 0";
          contentNode.style.fontFamily = "inherit";

          const titleNode = document.createElement("strong");
          titleNode.textContent = pointItem.label;
          titleNode.style.color = "#111827";
          titleNode.style.fontSize = "14px";
          contentNode.appendChild(titleNode);

          if (pointItem.meta) {
            const metaNode = document.createElement("p");
            metaNode.textContent = pointItem.meta;
            metaNode.style.margin = "4px 0 0";
            metaNode.style.color = "#6B7280";
            metaNode.style.fontSize = "12px";
            contentNode.appendChild(metaNode);
          }

          infoWindowRef.current.setContent(contentNode);
          infoWindowRef.current.open({
            anchor: marker,
            map: mapInstanceRef.current
          });
        }
        onOpenDetail?.(pointItem.id);
      });

      markersRef.current.push(marker);
      bounds.extend(marker.position);
    });

    if (points.length === 1) {
      mapInstanceRef.current.setCenter({ lat: points[0].lat, lng: points[0].lng });
      mapInstanceRef.current.setZoom(14);
    } else {
      mapInstanceRef.current.fitBounds(bounds, 58);
    }
  }, [mapsStatus, points, onOpenDetail]);

  return (
    <article className="bg-white/50 dark:bg-white/5 rounded-3xl border border-black/5 dark:border-white/10 p-5 sm:p-6 flex flex-col gap-4 shadow-sm transition-all">
      <div className="flex flex-col">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Icon name="location" className="w-5 h-5 text-blue-500" />
          {title}
        </h3>
        {hint && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{hint}</p>}
      </div>

      {mapsStatus === "loading" && <p className="text-xs text-gray-500 italic animate-pulse">{t("address_google_loading")}</p>}
      {mapsStatus === "unconfigured" && <p className="text-xs text-yellow-600 dark:text-yellow-500 italic">{t("address_google_unconfigured")}</p>}
      {mapsStatus === "error" && <p className="text-xs text-red-500 italic">{`${t("address_google_error")} ${mapsError || ""}`}</p>}

      {mapsStatus === "ready" && points.length === 0 && (
        <div className="py-8 text-center bg-black/5 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/5">
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{emptyText}</p>
        </div>
      )}

      {mapsStatus === "ready" && points.length > 0 && (
        <div className="flex flex-col gap-4 mt-2">
          <div
            ref={mapContainerRef}
            className="w-full h-64 sm:h-80 rounded-2xl overflow-hidden shadow-inner border border-black/10 dark:border-white/10"
            role="img"
            aria-label={title}
          />

          <ul className="flex flex-col gap-2">
            {points.slice(0, 8).map((pointItem) => (
              <li key={pointItem.id}>
                <button
                  className="w-full text-left px-4 py-3 bg-white/60 hover:bg-white dark:bg-black/20 dark:hover:bg-white/5 border border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 transition-all flex items-center gap-2.5 shadow-sm group outline-none focus:ring-2 focus:ring-blue-500/50"
                  type="button"
                  onClick={() => onOpenDetail?.(pointItem.id)}
                >
                  <Icon name="eye" className="w-4 h-4 text-blue-500/70 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                  <span className="truncate flex-1">
                    {openActionText} · <span className="text-gray-900 dark:text-white">{pointItem.label}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
