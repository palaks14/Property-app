function AuthCard({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
  theme = "light",
  className = "",
  headerClassName = "",
  eyebrowClassName = "",
  titleClassName = "",
  subtitleClassName = "",
  footerClassName = "",
  overlayClassName = ""
}) {
  const isDark = theme === "dark";

  const cardClassName = isDark
    ? "border-white/12 bg-slate-950/45 shadow-[0_30px_90px_-52px_rgba(0,0,0,0.95)] backdrop-blur-[22px]"
    : "border-white/70 bg-white/82 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.22),0_40px_120px_-48px_rgba(14,116,144,0.35)] backdrop-blur-2xl";

  const overlayBaseClassName = isDark
    ? "bg-[linear-gradient(180deg,rgba(15,23,42,0.44),rgba(2,6,23,0.82))]"
    : "bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,255,255,0.52))]";

  const eyebrowBaseClassName = isDark
    ? "border-amber-300/20 bg-amber-300/10 text-amber-200"
    : "border-sky-200/80 bg-sky-50/90 text-sky-700";

  const titleBaseClassName = isDark ? "text-white" : "text-slate-950";
  const subtitleBaseClassName = isDark ? "text-white/64" : "text-slate-600";
  const footerBaseClassName = isDark ? "border-white/10" : "border-slate-200/80";
  const bottomGlowClassName = isDark ? "via-white/10" : "via-slate-200/90";
  const topGlowClassName = isDark ? "via-amber-300/35" : "via-sky-300";

  return (
    <div
      className={`relative w-full max-w-[30rem] overflow-hidden rounded-[32px] border p-6 sm:p-8 ${cardClassName} ${className}`.trim()}
    >
      <div className={`absolute inset-0 ${overlayBaseClassName} ${overlayClassName}`.trim()} />
      <div className={`absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-transparent ${bottomGlowClassName} to-transparent`} />
      <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent ${topGlowClassName} to-transparent`} />

      <div className={`relative mb-8 sm:mb-9 ${headerClassName}`.trim()}>
        {eyebrow ? (
          <p
            className={`mb-4 inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] ${eyebrowBaseClassName} ${eyebrowClassName}`.trim()}
          >
            {eyebrow}
          </p>
        ) : null}
        <h1
          className={`text-[1.9rem] font-semibold tracking-[-0.03em] sm:text-[2.25rem] ${titleBaseClassName} ${titleClassName}`.trim()}
        >
          {title}
        </h1>
        {subtitle ? (
          <p
            className={`mt-3 max-w-md text-sm leading-6 sm:text-[15px] ${subtitleBaseClassName} ${subtitleClassName}`.trim()}
          >
            {subtitle}
          </p>
        ) : null}
      </div>

      <div className="relative">{children}</div>

      {footer ? (
        <div className={`relative mt-8 border-t pt-6 ${footerBaseClassName} ${footerClassName}`.trim()}>
          {footer}
        </div>
      ) : null}
    </div>
  );
}

export default AuthCard;
