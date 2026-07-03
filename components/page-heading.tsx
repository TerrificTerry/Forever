export function PageHeading({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description: string; actions?: React.ReactNode }) {
  return (
    <header className="mb-9 flex flex-col gap-6 border-b border-line pb-8 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="page-title">{title}</h1>
        <p className="page-lede">{description}</p>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
