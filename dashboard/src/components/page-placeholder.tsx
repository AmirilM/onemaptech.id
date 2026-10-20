type Props = {
  eyebrow: string;
  title: string;
  description: string;
};

export default function PagePlaceholder({
  eyebrow,
  title,
  description,
}: Props) {
  return (
    <main className="mx-auto max-w-7xl p-4 md:p-8">
      <p className="text-xs font-semibold tracking-[0.2em] text-primary">
        {eyebrow}
      </p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink md:text-3xl">
        {title}
      </h1>
      <p className="mt-1 text-xs text-muted">{description}</p>

      <section className="card-surface mt-4 p-6">
        <p className="text-sm font-semibold text-ink">Coming soon</p>
        <p className="mt-1 max-w-prose text-sm text-muted">
          This page is being prepared. The menu entry and route are already in
          place, so navigation and access rules work as expected.
        </p>
      </section>
    </main>
  );
}
