function Button({
  type = "button",
  variant = "primary",
  loading = false,
  disabled = false,
  icon,
  loadingText,
  children,
  className = "",
  ...props
}) {
  const baseClassName =
    "inline-flex w-full items-center justify-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-semibold transition-all duration-300 focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60";

  const variantClassName =
    variant === "primary"
      ? "bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_100%)] text-white shadow-[0_18px_40px_-20px_rgba(15,23,42,0.75)] hover:-translate-y-0.5 hover:shadow-[0_24px_48px_-24px_rgba(15,23,42,0.78)] focus:ring-slate-200 active:scale-[0.985]"
      : variant === "secondary"
        ? "border border-slate-200/90 bg-white/95 text-slate-700 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.45)] hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 focus:ring-slate-100 active:scale-[0.985]"
        : variant === "glass"
          ? "border border-white/12 bg-white/[0.06] text-white shadow-none hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.1] focus:ring-white/10 active:scale-[0.985]"
          : "";

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`${baseClassName} ${variantClassName} ${className}`.trim()}
      {...props}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        icon
      )}
      <span>{loading ? loadingText || children : children}</span>
    </button>
  );
}

export default Button;
