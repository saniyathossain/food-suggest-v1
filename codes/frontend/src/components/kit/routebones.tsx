// The placeholder the first bundle carries: while Today's data or another page's code is on the way. Today gets its own shape (the
// hero photo and the builder); every other page gets a neutral heading-and-cards shape until its chunk arrives, and then shows its
// own page-shaped skeleton (routeskeleton.tsx) while its data loads. Kept tiny on purpose (first-paint budget).
export function RouteBones({ home }: { home: boolean }) {
  if (home) {
    return (
      <div aria-busy="true">
        <span className="shimmer -mt-[70px] block h-[min(78vh,680px)] w-full" />
        <div className="page">
          <span className="shimmer block h-[380px] rounded-2xl" />
        </div>
      </div>
    );
  }
  return (
    <main className="page" aria-busy="true">
      <span className="shimmer block h-10 w-72 max-w-full rounded-full" />
      <span className="shimmer mt-3 block h-4 w-96 max-w-full rounded-full" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <span key={index} className="shimmer block h-64 rounded-xl" />
        ))}
      </div>
    </main>
  );
}
