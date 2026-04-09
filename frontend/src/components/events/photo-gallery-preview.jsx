import { useEffect, useMemo, useState } from "react";
import { motion as Motion } from "framer-motion";
import { Icon } from "../icons";

function isValidHttpUrl(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return false;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function resolveCoverImageFromMicrolink(payload) {
  const imageUrl = String(payload?.data?.image?.url || "").trim();
  if (imageUrl) {
    return imageUrl;
  }
  const logoUrl = String(payload?.data?.logo?.url || "").trim();
  if (logoUrl) {
    return logoUrl;
  }
  return "";
}

const STACK_CARD_BASE =
  "absolute inset-0 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-gray-800 shadow-xl overflow-hidden";

export function PhotoGalleryPreview({ url }) {
  const [coverImage, setCoverImage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const normalizedUrl = useMemo(() => String(url || "").trim(), [url]);
  const canLoad = useMemo(() => isValidHttpUrl(normalizedUrl), [normalizedUrl]);

  useEffect(() => {
    if (!canLoad) {
      setCoverImage("");
      setIsLoading(false);
      setHasError(Boolean(normalizedUrl));
      return;
    }

    const controller = new AbortController();
    const loadCover = async () => {
      setIsLoading(true);
      setHasError(false);
      try {
        const response = await fetch(`https://api.microlink.io?url=${encodeURIComponent(normalizedUrl)}`, {
          method: "GET",
          signal: controller.signal
        });
        const payload = await response.json();
        const resolvedCover = resolveCoverImageFromMicrolink(payload);
        if (!resolvedCover) {
          throw new Error("missing_cover_image");
        }
        setCoverImage(resolvedCover);
      } catch (error) {
        if (error?.name === "AbortError") {
          return;
        }
        setCoverImage("");
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadCover();
    return () => controller.abort();
  }, [canLoad, normalizedUrl]);

  if (!normalizedUrl) {
    return null;
  }

  return (
    <a
      href={normalizedUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block w-full max-w-[360px] sm:max-w-[420px] select-none"
      aria-label="Open shared gallery"
    >
      <Motion.div
        className="relative h-60 sm:h-64"
        initial="rest"
        whileHover="hover"
        whileTap="tap"
        animate="rest"
      >
        <Motion.div
          className={STACK_CARD_BASE}
          variants={{
            rest: { rotate: -6, x: -6, y: 8, scale: 0.96 },
            hover: { rotate: -14, x: -30, y: 10, scale: 0.98 }
          }}
          transition={{ type: "spring", stiffness: 220, damping: 20 }}
          style={{ zIndex: 10 }}
        >
          <div className="h-full w-full bg-gradient-to-br from-pink-200/70 via-indigo-200/70 to-violet-200/70 dark:from-pink-900/20 dark:via-indigo-900/20 dark:to-violet-900/20" />
          <div className="absolute left-4 right-4 bottom-4 h-8 rounded-md bg-white/85 dark:bg-gray-900/70 border border-black/5 dark:border-white/10" />
        </Motion.div>

        <Motion.div
          className={STACK_CARD_BASE}
          variants={{
            rest: { rotate: 5, x: 8, y: 6, scale: 0.98 },
            hover: { rotate: 14, x: 34, y: 8, scale: 0.99 }
          }}
          transition={{ type: "spring", stiffness: 220, damping: 20 }}
          style={{ zIndex: 20 }}
        >
          <div className="h-full w-full bg-gradient-to-br from-emerald-200/70 via-cyan-200/70 to-blue-200/70 dark:from-emerald-900/20 dark:via-cyan-900/20 dark:to-blue-900/20" />
          <div className="absolute left-4 right-4 bottom-4 h-8 rounded-md bg-white/85 dark:bg-gray-900/70 border border-black/5 dark:border-white/10" />
        </Motion.div>

        <Motion.div
          className={STACK_CARD_BASE}
          variants={{
            rest: { rotate: 0, x: 0, y: 0, scale: 1 },
            hover: { rotate: 0, x: 0, y: -2, scale: 1.03 },
            tap: { scale: 0.99 }
          }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          style={{ zIndex: 30 }}
        >
          <div className="absolute inset-0">
            {coverImage ? (
              <img src={coverImage} alt="Album cover preview" className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-indigo-100 via-violet-100 to-fuchsia-100 dark:from-indigo-900/30 dark:via-violet-900/30 dark:to-fuchsia-900/20" />
            )}
          </div>
          <div className="absolute inset-x-0 bottom-0 h-14 bg-white/95 dark:bg-gray-900/90 border-t border-black/10 dark:border-white/10 flex items-center justify-between px-3">
            <span className="text-[11px] font-black uppercase tracking-[0.12em] text-gray-700 dark:text-gray-200">
              LeGoodAnfitrión
            </span>
            {isLoading ? (
              <Icon name="loader" className="w-3.5 h-3.5 animate-spin text-gray-500 dark:text-gray-300" />
            ) : hasError ? (
              <Icon name="sparkle" className="w-4 h-4 text-amber-600 dark:text-amber-300" />
            ) : (
              <Icon name="camera" className="w-4 h-4 text-indigo-600 dark:text-indigo-300" />
            )}
          </div>
        </Motion.div>
      </Motion.div>
    </a>
  );
}
