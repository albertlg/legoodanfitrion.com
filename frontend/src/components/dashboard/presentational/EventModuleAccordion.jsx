import { useState } from "react";
import { Icon } from "../../icons";

/**
 * EventModuleAccordion
 *
 * Wraps a management module card so it collapses on mobile (< lg) and
 * stays always-open on desktop (>= lg).
 *
 * Animation: CSS grid-rows-[0fr/1fr] transition — no JS height calculation.
 * Desktop override: lg:grid-rows-[1fr] keeps content always visible.
 *
 * Props:
 *   id            — optional anchor id (placed on wrapper div)
 *   orderClass    — Tailwind order-* class (e.g. "order-1")
 *   iconName      — Icon component name for the accordion header
 *   iconColorClass — e.g. "text-blue-500"
 *   iconBgClass   — e.g. "bg-blue-50 dark:bg-blue-900/20"
 *   title         — accordion header label
 *   summary       — optional subtitle / summary line (truncated)
 *   badge         — optional numeric badge (e.g. guest count)
 *   children      — module card content
 */
export function EventModuleAccordion({
  id,
  orderClass = "",
  iconName = "settings",
  iconColorClass = "text-gray-600 dark:text-gray-400",
  iconBgClass = "bg-gray-100 dark:bg-gray-800",
  title,
  summary,
  badge,
  children,
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div id={id} className={`${orderClass} scroll-mt-28`.trim()}>
      {/* Mobile-only toggle header — hidden on lg+ */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="lg:hidden w-full flex items-center gap-3 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border border-gray-200/80 dark:border-gray-700/80 ring-1 ring-black/5 dark:ring-white/10 shadow-sm px-4 py-3.5 rounded-xl transition-all duration-200 active:scale-[0.99] cursor-pointer"
        aria-expanded={isOpen}
      >
        <span
          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconBgClass}`}
        >
          <Icon name={iconName} className={`w-4 h-4 ${iconColorClass}`} />
        </span>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight truncate">
            {title}
          </p>
          {summary && (
            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
              {summary}
            </p>
          )}
        </div>
        {badge != null && (
          <span className="shrink-0 px-2 py-0.5 bg-gray-100 dark:bg-white/10 text-xs font-bold text-gray-600 dark:text-gray-300 rounded-full">
            {badge}
          </span>
        )}
        <Icon
          name="chevron_down"
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Collapsible body
          Mobile:  grid-rows-[0fr] when closed / grid-rows-[1fr] when open
          Desktop: lg:grid-rows-[1fr] always-open CSS override
      */}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out lg:grid-rows-[1fr] ${
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="min-h-0 overflow-hidden lg:overflow-visible">
          {children}
        </div>
      </div>
    </div>
  );
}
