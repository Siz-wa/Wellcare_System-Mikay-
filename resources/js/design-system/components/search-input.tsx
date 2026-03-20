// resources/js/components/SearchInput.tsx
import type { ChangeEvent } from "react";

// ─── Icon ─────────────────────────────────────────────────────────────────────
const SearchIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

// ─── Props ────────────────────────────────────────────────────────────────────
interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Tailwind max-width class e.g. "max-w-md" — defaults to "max-w-md" */
  maxWidth?: string;
  /** Additional className on the wrapper div */
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  maxWidth = "max-w-md",
  className = "",
}: SearchInputProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className={`relative ${maxWidth} ${className}`}>
      {/* Icon */}
      <span
        className="absolute left-[14px] top-1/2 -translate-y-1/2 pointer-events-none"
        style={{ color: "var(--wc-gray-400)" }}
      >
        <SearchIcon />
      </span>

      {/* Input — paddingLeft via inline style to beat wc-input class specificity */}
      <input
        type="search"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="wc-input"
        style={{
          background: "var(--wc-white)",
          border: "1.5px solid var(--wc-gray-300)",
          boxShadow: "var(--shadow-sm)",
          paddingLeft: "2.75rem",
        }}
      />
    </div>
  );
}

// ─── Usage ────────────────────────────────────────────────────────────────────
//
// import SearchInput from "@/components/SearchInput";
//
// const [search, setSearch] = useState("");
//
// <SearchInput
//   value={search}
//   onChange={setSearch}
//   placeholder="Search by name or specialization…"
// />
//
// With custom width:
// <SearchInput
//   value={search}
//   onChange={setSearch}
//   placeholder="Search packages…"
//   maxWidth="max-w-sm"
// />