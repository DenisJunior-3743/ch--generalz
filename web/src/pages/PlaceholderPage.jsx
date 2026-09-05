export default function PlaceholderPage({ title, description }) {
  return (
    <div>
      <h1 className="mb-1.5 text-[22px] text-foreground">{title}</h1>
      <p className="mb-5 text-sm text-muted-foreground">{description}</p>
      <div className="rounded-lg border border-dashed border-border bg-surface px-6 py-12 text-center text-muted-foreground">
        <p>This section isn't built yet — it's next up on the roadmap.</p>
      </div>
    </div>
  );
}
