import { IconSearch, IconX } from "@tabler/icons-react";

/**
 * A plain client-side live-filter box — every list this is used on is small
 * enough (dozens to low hundreds of rows) that filtering the already-loaded
 * array in React state is the right-sized fix, not a backend search
 * endpoint. Callers own the actual filtering logic; this is just the input.
 */
export default function SearchInput({ value, onChange, placeholder = "Search…", className = "" }) {
  return (
    <div className={`relative ${className}`}>
      <IconSearch size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-8 pr-7 py-1.5 text-xs border border-line rounded-input bg-white transition-colors duration-150 focus:outline-none focus:border-navy-light focus:ring-1 focus:ring-navy-light/30"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-navy transition-colors duration-150"
          aria-label="Clear search"
        >
          <IconX size={13} />
        </button>
      )}
    </div>
  );
}
