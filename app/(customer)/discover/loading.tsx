export default function LoadingDiscover() {
  return (
    <div role="status" className="space-y-5 md:-mt-8">
      <h1 className="rounded-3xl bg-[#e9efe0] px-6 py-12 text-4xl font-semibold">Loading Discover</h1>
      <div aria-hidden="true" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((item) => <div key={item} className="aspect-[4/3] rounded-2xl bg-accent/10 motion-safe:animate-pulse" />)}
      </div>
    </div>
  );
}
