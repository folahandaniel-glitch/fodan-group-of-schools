export default function Loading() {
  return (
    <div role="status" aria-label="Loading" className="animate-pulse space-y-4">
      <div className="h-8 w-1/3 rounded-lg bg-paper-2" />
      <div className="grid gap-4 sm:grid-cols-3"><div className="h-24 rounded-2xl bg-paper-2" /><div className="h-24 rounded-2xl bg-paper-2" /><div className="h-24 rounded-2xl bg-paper-2" /></div>
      <div className="h-64 rounded-2xl bg-paper-2" />
    </div>
  );
}
