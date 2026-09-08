// Exact spec from design-system/*.html's .tabs / .tab.
export default function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex border-b-2 border-line mb-5">
      {tabs.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`px-[18px] py-2.5 text-[13px] font-medium whitespace-nowrap -mb-0.5 border-b-2 transition-colors duration-150 ${
            active === t
              ? "text-navy border-navy-light font-semibold"
              : "text-text-muted border-transparent hover:text-navy"
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
