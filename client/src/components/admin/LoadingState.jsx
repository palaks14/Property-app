function LoadingState({ rows = 4 }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="saas-skeleton h-10 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export default LoadingState;
