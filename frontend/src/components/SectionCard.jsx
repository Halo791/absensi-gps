export function SectionCard({ title, description, actions, children }) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-panel">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
        </div>
        {actions}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}
