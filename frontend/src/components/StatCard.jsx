export function StatCard({ label, value, helper, tone = "blue" }) {
  const tones = {
    blue: "from-blue-600 to-cyan-500",
    orange: "from-orange-500 to-amber-400",
    green: "from-emerald-500 to-green-400",
    rose: "from-rose-500 to-pink-400"
  };

  return (
    <div className="rounded-3xl bg-white p-5 shadow-panel">
      <div className={`mb-4 h-2 rounded-full bg-gradient-to-r ${tones[tone]}`} />
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{helper}</p>
    </div>
  );
}
