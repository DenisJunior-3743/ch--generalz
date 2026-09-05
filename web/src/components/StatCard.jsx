export default function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center gap-3.5 rounded-lg border border-border bg-surface px-5 py-4.5 shadow-sm">
      <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-md bg-navy/8 text-navy [&>svg]:h-[22px] [&>svg]:w-[22px]">
        <Icon />
      </div>
      <div>
        <p className="m-0 text-2xl font-bold text-foreground">{value}</p>
        <p className="m-0 text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
