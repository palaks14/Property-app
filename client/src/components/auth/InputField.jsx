function InputField({
  label,
  icon,
  error,
  rightElement,
  hint,
  theme = "light",
  className = "",
  labelClassName = "",
  inputClassName = "",
  iconClassName = "",
  hintClassName = "",
  ...props
}) {
  const isDark = theme === "dark";

  const labelBaseClassName = isDark ? "text-white/72" : "text-slate-700";
  const fieldBaseClassName = isDark
    ? "border-white/12 bg-white/[0.08] shadow-none focus-within:-translate-y-px focus-within:border-amber-300/60 focus-within:shadow-[0_0_0_4px_rgba(245,197,24,0.12),0_18px_40px_-26px_rgba(245,197,24,0.35)]"
    : "border-slate-200 bg-white/90 shadow-[0_10px_20px_-16px_rgba(15,23,42,0.22)] focus-within:-translate-y-px focus-within:border-sky-400 focus-within:shadow-[0_0_0_4px_rgba(224,242,254,0.95),0_18px_40px_-24px_rgba(14,116,144,0.35)]";
  const errorFieldClassName = isDark
    ? "border-rose-400/60 bg-rose-500/[0.08] shadow-[0_0_0_4px_rgba(251,113,133,0.14)]"
    : "border-rose-300 shadow-[0_0_0_4px_rgba(254,226,226,0.85)]";
  const iconBaseClassName = isDark ? "text-white/40 group-focus-within:text-amber-300" : "text-slate-400 group-focus-within:text-sky-500";
  const inputBaseClassName = isDark ? "text-white placeholder:text-white/32" : "text-slate-900 placeholder:text-slate-400";
  const hintBaseClassName = isDark ? "text-white/48" : "text-slate-500";
  const errorTextClassName = isDark ? "text-rose-200" : "text-rose-600";

  return (
    <label className="block">
      <span className={`mb-2 block text-sm font-medium ${labelBaseClassName} ${labelClassName}`.trim()}>{label}</span>
      <div
        className={`group flex items-center gap-3 rounded-2xl border px-4 py-3.5 transition-all duration-300 ${
          error
            ? errorFieldClassName
            : fieldBaseClassName
        } ${className}`.trim()}
      >
        <span
          className={`shrink-0 transition-colors duration-300 ${error ? (isDark ? "text-rose-300" : "text-rose-500") : iconBaseClassName} ${iconClassName}`.trim()}
        >
          {icon}
        </span>
        <input
          className={`w-full border-0 bg-transparent p-0 text-[15px] outline-none ${inputBaseClassName} ${inputClassName}`.trim()}
          {...props}
        />
        {rightElement ? <div className="shrink-0 transition-transform duration-300 group-focus-within:scale-[1.04]">{rightElement}</div> : null}
      </div>
      {error ? (
        <p className={`mt-2 text-sm ${errorTextClassName}`}>{error}</p>
      ) : hint ? (
        <p className={`mt-2 text-sm ${hintBaseClassName} ${hintClassName}`.trim()}>{hint}</p>
      ) : null}
    </label>
  );
}

export default InputField;
