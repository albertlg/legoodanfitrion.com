import { useState } from "react";
import { FieldMeta } from "../field-meta";
import { Icon } from "../icons";
import { listToInput, normalizeLookupValue, splitListInput } from "../../lib/formatters";
import { mergeOptionsWithSelected } from "../../lib/system-helpers";

export function MultiSelectField({ id, label, value, options, onChange, helpText, t }) {
  const selectedValues = splitListInput(value);
  const mergedOptions = mergeOptionsWithSelected(options, value);
  const titleId = `${id}-title`;
  const [customOption, setCustomOption] = useState("");

  const toggleValue = (optionValue) => {
    const nextValues = selectedValues.includes(optionValue)
      ? selectedValues.filter((item) => item !== optionValue)
      : [...selectedValues, optionValue];
    onChange(listToInput(nextValues));
  };

  const handleAddCustomOption = () => {
    const normalizedInput = String(customOption || "").trim();
    if (!normalizedInput) {
      return;
    }
    const existingOption = mergedOptions.find(
      (optionItem) => normalizeLookupValue(optionItem) === normalizeLookupValue(normalizedInput)
    );
    const nextOption = existingOption || normalizedInput;
    if (!selectedValues.includes(nextOption)) {
      onChange(listToInput([...selectedValues, nextOption]));
    }
    setCustomOption("");
  };

  return (
    <div className="flex flex-col gap-2.5 w-full">
      <p id={titleId} className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 ml-1">
        {label}
      </p>

      <div className="flex flex-wrap gap-2 md:gap-2.5 min-w-0 w-full" role="group" aria-labelledby={titleId}>
        {mergedOptions.map((optionValue) => {
          const isSelected = selectedValues.includes(optionValue);
          return (
            <button
              key={optionValue}
              type="button"
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 md:px-4 md:py-2 rounded-full text-[13px] md:text-sm font-semibold transition-all duration-200 border outline-none focus:ring-2 focus:ring-blue-500/50 select-none min-w-0 max-w-full ${
                isSelected
                  ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700/50 dark:text-blue-300 shadow-sm"
                  : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
              }`}
              aria-pressed={isSelected}
              onClick={() => toggleValue(optionValue)}
            >
              {isSelected && <Icon name="check" className="w-3.5 h-3.5 md:w-4 md:h-4" />}
              <span className="whitespace-normal break-words text-left">{optionValue}</span>
            </button>
          );
        })}
      </div>

      <div className="relative mt-1">
        <input
          type="text"
          className="w-full bg-white/70 dark:bg-black/40 border-2 border-transparent focus:bg-white dark:focus:bg-gray-800 focus:border-blue-500 rounded-xl pl-4 pr-24 py-3 text-sm text-gray-900 dark:text-white transition-all outline-none shadow-sm"
          value={customOption}
          onChange={(event) => setCustomOption(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleAddCustomOption();
            }
          }}
          placeholder={t("multi_select_add_placeholder")}
          aria-label={t("multi_select_add_placeholder")}
        />
        <button
          className="absolute right-1.5 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-gray-800 hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 text-white font-bold rounded-lg text-xs transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          type="button"
          onClick={handleAddCustomOption}
          disabled={!customOption.trim()}
        >
          {t("multi_select_add_button")}
        </button>
      </div>

      <FieldMeta helpText={helpText} />
    </div>
  );
}
