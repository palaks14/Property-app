const variantMap = {
  approved: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  resolved: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  active: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  paid: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  pending: "bg-amber-50 text-amber-700 ring-amber-600/20",
  "in-progress": "bg-sky-50 text-sky-700 ring-sky-600/20",
  scheduled: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  "not-started": "bg-slate-100 text-slate-700 ring-slate-500/20",
  "on-the-way": "bg-cyan-50 text-cyan-700 ring-cyan-600/20",
  arrived: "bg-violet-50 text-violet-700 ring-violet-600/20",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  delayed: "bg-orange-50 text-orange-700 ring-orange-600/20",
  cancelled: "bg-rose-50 text-rose-700 ring-rose-600/20",
  processing: "bg-amber-50 text-amber-700 ring-amber-600/20",
  blocked: "bg-rose-50 text-rose-700 ring-rose-600/20",
  rejected: "bg-rose-50 text-rose-700 ring-rose-600/20",
  default: "bg-slate-100 text-slate-700 ring-slate-500/20"
};

function StatusBadge({ status }) {
  const normalized = String(status || "default").toLowerCase();
  const style = variantMap[normalized] || variantMap.default;

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ${style}`}>
      {status || "Unknown"}
    </span>
  );
}

export default StatusBadge;
