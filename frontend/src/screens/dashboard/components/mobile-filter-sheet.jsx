import { useEffect } from "react";
import { Icon } from "../../../components/icons";

/**
 * Bottom sheet that slides up from the bottom of the screen on mobile.
 * On desktop (≥ md) renders nothing — filters stay inline in the toolbar.
 *
 * Props:
 *   isOpen          – boolean controlling visibility
 *   onClose         – callback to close the sheet
 *   title           – string shown in the sheet header
 *   hasActiveFilters – optional boolean; adds a blue dot on the trigger button
 *   children        – filter controls to render inside the sheet
 */
export function MobileFilterSheet({ isOpen, onClose, title, children }) {
  // Lock body scroll while the sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet panel */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-[201] transform transition-transform duration-300 ease-out md:hidden ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl border-t border-black/10 dark:border-white/10 max-h-[80vh] flex flex-col">

          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 rounded-full bg-black/20 dark:bg-white/20" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-black/5 dark:border-white/10 shrink-0">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">{title}</h3>
            <button
              type="button"
              className="p-1.5 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              onClick={onClose}
              aria-label="Close"
            >
              <Icon name="close" className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Reusable select row for inside the filter sheet.
 * Keeps label + native select styled consistently.
 */
export function FilterSheetSelect({ label, value, onChange, children }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {label}
      </span>
      <select
        value={value}
        onChange={onChange}
        className="w-full bg-gray-50 dark:bg-gray-800 border border-black/10 dark:border-white/15 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 transition-all appearance-none cursor-pointer"
      >
        {children}
      </select>
    </label>
  );
}
