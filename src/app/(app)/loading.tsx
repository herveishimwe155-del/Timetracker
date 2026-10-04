/** Instant placeholder while a page's server part loads; the sidebar and timer bar stay put. */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="flex flex-col gap-3 pt-3">
      <div className="h-6 w-32 animate-pulse rounded-sm bg-surface" />
      <div className="h-10 animate-pulse rounded-sm bg-surface" />
      <div className="h-10 animate-pulse rounded-sm bg-surface" />
      <div className="h-10 animate-pulse rounded-sm bg-surface" />
    </div>
  );
}
