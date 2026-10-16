import Link from "next/link";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main id="main" className="mx-auto grid min-h-dvh max-w-md place-items-center p-6 text-center">
      <div>
        <p className="eyebrow">Error 404</p>
        <h1 className="mt-1 font-display text-3xl">We could not find that page</h1>
        <p className="mt-2 text-muted">It may have moved, or you may not have access to it.</p>
        <div className="mt-5 flex justify-center gap-2"><Link href="/" className="btn btn-primary">Home</Link><Link href="/portal" className="btn btn-ghost">My portal</Link></div>
      </div>
    </main>
  );
}
