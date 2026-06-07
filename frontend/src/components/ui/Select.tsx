import React, { useState, useEffect, useRef, useId } from "react";
import { createPortal } from "react-dom";
import { clsx } from "clsx";
import { ChevronDown, Search, X, Check } from "lucide-react";

interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  value?: any; // String/Number for single, Array for multiple
  onChange?: (e: { target: { name?: string; value: any } }) => void;
  name?: string;
  multiple?: boolean;
  enableSearch?: boolean;
  disabled?: boolean;
  placeholder?: string;
  size?: "sm" | "md";
  className?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  helperText,
  options = [],
  value,
  onChange,
  name,
  multiple = false,
  enableSearch = false,
  disabled = false,
  placeholder = "Select option",
  size = "md",
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<(HTMLDivElement | null)[]>([]);

  const selectId = useId();
  const listboxId = `${selectId}-listbox`;

  // Update dropdown positioning coordinates based on trigger bounds
  const updateCoords = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom,
        left: rect.left,
        width: rect.width,
      });
    }
  };

  // Re-calculate coords on open and bind scroll/resize listeners
  useEffect(() => {
    if (isOpen) {
      updateCoords();
      // Listen to scroll globally (with capture) to reposition on scroll inside dialogs
      window.addEventListener("scroll", updateCoords, true);
      window.addEventListener("resize", updateCoords);
    }
    return () => {
      window.removeEventListener("scroll", updateCoords, true);
      window.removeEventListener("resize", updateCoords);
    };
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Clear query on close
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setFocusedIndex(-1);
    } else {
      // Auto focus search input if search is enabled
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Handle selected list calculations
  const getSelectedOptions = () => {
    if (multiple) {
      const valueArray = Array.isArray(value) ? value : [];
      return options.filter((opt) => valueArray.includes(opt.value));
    }
    const singleOption = options.find((opt) => opt.value === value);
    return singleOption ? [singleOption] : [];
  };

  const selectedOptions = getSelectedOptions();

  // Filter options based on autocomplete search query
  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (optionValue: string | number) => {
    if (multiple) {
      const currentValue = Array.isArray(value) ? value : [];
      const newValue = currentValue.includes(optionValue)
        ? currentValue.filter((val) => val !== optionValue)
        : [...currentValue, optionValue];
      
      onChange?.({ target: { name, value: newValue } });
    } else {
      onChange?.({ target: { name, value: optionValue } });
      setIsOpen(false);
    }
    triggerRef.current?.focus();
  };

  const handleDeselect = (optionValue: string | number) => {
    if (multiple) {
      const currentValue = Array.isArray(value) ? value : [];
      const newValue = currentValue.filter((val) => val !== optionValue);
      onChange?.({ target: { name, value: newValue } });
    }
  };

  // Keyboard navigation & accessibility handlers
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case "Enter":
      case " ":
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else if (focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
          const opt = filteredOptions[focusedIndex];
          if (opt) {
            handleSelect(opt.value);
          }
        }
        break;
      case "ArrowDown":
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setFocusedIndex((prev) => {
            const next = prev + 1 >= filteredOptions.length ? 0 : prev + 1;
            optionRefs.current[next]?.scrollIntoView({ block: "nearest" });
            return next;
          });
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setFocusedIndex((prev) => {
            const next = prev - 1 < 0 ? filteredOptions.length - 1 : prev - 1;
            optionRefs.current[next]?.scrollIntoView({ block: "nearest" });
            return next;
          });
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
        break;
      case "Tab":
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div className={clsx("flex flex-col w-full gap-1.5", className)}>
      {label && (
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
          {label}
        </span>
      )}

      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        id={selectId}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        aria-invalid={!!error}
        className={clsx(
          "flex items-center justify-between w-full rounded-xl border text-left font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700",
          size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-sm",
          isOpen && "border-blue-500 ring-2 ring-blue-500/20",
          error && "border-red-500 focus:ring-red-500/20"
        )}
      >
        <div className="flex flex-wrap items-center gap-1.5 min-w-0 pr-2">
          {selectedOptions.length === 0 ? (
            <span className="text-slate-400 dark:text-slate-500 truncate font-medium">
              {placeholder}
            </span>
          ) : multiple ? (
            size === "sm" ? (
              <span className="truncate text-slate-700 dark:text-slate-200">
                {selectedOptions.length > 2
                  ? `${selectedOptions.length} selected`
                  : selectedOptions.map((o) => o.label).join(", ")}
              </span>
            ) : selectedOptions.length > 2 ? (
              // Display first 2 pills and "+ X more" badge
              <>
                {selectedOptions.slice(0, 2).map((opt) => (
                  <span
                    key={opt.value}
                    className="inline-flex items-center gap-1 bg-blue-50/70 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300 px-2 py-0.5 rounded-lg text-xs"
                  >
                    <span className="truncate max-w-[80px]">{opt.label}</span>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeselect(opt.value);
                      }}
                      className="hover:text-blue-800 dark:hover:text-blue-100 cursor-pointer ml-0.5 text-[10px]"
                    >
                      ×
                    </span>
                  </span>
                ))}
                <span className="inline-flex items-center bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-350 px-2 py-0.5 rounded-lg text-xs font-bold font-mono">
                  +{selectedOptions.length - 2}
                </span>
              </>
            ) : (
              selectedOptions.map((opt) => (
                <span
                  key={opt.value}
                  className="inline-flex items-center gap-1 bg-blue-50/70 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300 px-2 py-0.5 rounded-lg text-xs"
                >
                  <span className="truncate max-w-[120px]">{opt.label}</span>
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeselect(opt.value);
                    }}
                    className="hover:text-blue-800 dark:hover:text-blue-100 cursor-pointer ml-0.5 text-[10px]"
                  >
                    ×
                  </span>
                </span>
              ))
            )
          ) : (
            <span className="truncate text-slate-700 dark:text-slate-200">
              {selectedOptions[0]?.label ?? ""}
            </span>
          )}
        </div>
        <ChevronDown
          className={clsx(
            "h-4 w-4 text-slate-400 dark:text-slate-500 transition-transform duration-200 flex-shrink-0",
            isOpen && "transform rotate-180"
          )}
        />
      </button>

      {/* Helper / Error Text */}
      {error && (
        <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider animate-fade-in">
          {error}
        </span>
      )}
      {!error && helperText && (
        <span className="text-xs text-slate-400 dark:text-slate-500">
          {helperText}
        </span>
      )}

      {/* Portalled Dropdown List Menu */}
      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            id={listboxId}
            role="listbox"
            aria-multiselectable={multiple}
            style={{
              position: "fixed",
              top: `${coords.top + 4}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              zIndex: 10060,
            }}
            className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl animate-scale-in dark:border-slate-800 dark:bg-slate-900 select-none overflow-hidden max-h-[340px]"
          >
            {/* Search Input Panel */}
            {enableSearch && (
              <div className="flex items-center gap-2 border-b border-slate-100 px-3.5 py-2.5 dark:border-slate-800/60">
                <Search className="h-4 w-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search options..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setFocusedIndex(-1);
                  }}
                  className="w-full bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="p-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}

            {/* Scrollable List Items Container */}
            <div className="overflow-y-auto max-h-[280px] py-1.5">
              {filteredOptions.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs font-semibold text-slate-400 dark:text-slate-500">
                  No matches found.
                </div>
              ) : (
                filteredOptions.map((opt, index) => {
                  const isSelected = multiple
                    ? Array.isArray(value) && value.includes(opt.value)
                    : value === opt.value;
                  const isFocused = index === focusedIndex;

                  return (
                    <div
                      key={opt.value}
                      ref={(el) => {
                        optionRefs.current[index] = el;
                      }}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(opt.value)}
                      onMouseEnter={() => setFocusedIndex(index)}
                      className={clsx(
                        "flex items-center justify-between px-4 py-2 text-xs font-semibold cursor-pointer transition-colors duration-150",
                        isSelected
                          ? "bg-blue-50/50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-300"
                          : "text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850",
                        isFocused && "bg-slate-50 dark:bg-slate-800/50"
                      )}
                    >
                      {multiple ? (
                        <div className="flex items-center gap-2.5 truncate">
                          {/* Checkbox Icon */}
                          <div
                            className={clsx(
                              "h-4 w-4 rounded-md border flex items-center justify-center transition-colors flex-shrink-0",
                              isSelected
                                ? "bg-blue-600 border-blue-600 text-white"
                                : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                            )}
                          >
                            {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>
                          <span className="truncate">{opt.label}</span>
                        </div>
                      ) : (
                        <>
                          <span className="truncate">{opt.label}</span>
                          {isSelected && (
                            <Check className="h-4 w-4 text-blue-600 dark:text-blue-300 flex-shrink-0" />
                          )}
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

Select.displayName = "Select";
