function StatCard({ label, value, hint, icon: Icon, trend = "neutral" }) {
  const trendClass =
    trend === "positive"
      ? "text-emerald-600"
      : trend === "negative"
        ? "text-rose-600"
        : "text-slate-500";

  return (
    <article className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">{value}</p>
          {hint && <p className={`mt-2 text-xs ${trendClass}`}>{hint}</p>}
        </div>
        {Icon && (
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
            <Icon size={19} />
          </span>
        )}
      </div>
    </article>
  );
}

export default StatCard;
