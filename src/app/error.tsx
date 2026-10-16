"use client";
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="mx-auto grid min-h-dvh max-w-md place-items-center p-6 text-center">
      <div>
        <h1 className="font-display text-3xl">Something went wrong</h1>
        <p className="mt-2 text-muted">We could not complete that request. Your work has not been lost. Please try again, and contact the school office if it continues.</p>
        <div className="mt-5 flex justify-center gap-2">
          <button onClick={reset} className="btn btn-primary">Try again</button>
          <a href="/" className="btn btn-ghost">Home</a>
        </div>
      </div>
    </main>
  );
}
