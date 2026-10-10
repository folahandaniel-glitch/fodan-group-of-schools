import Link from "next/link";
export const metadata = { title: "Not permitted" };
export default function Forbidden() {
  return (
    <main id="main" className="mx-auto grid min-h-dvh max-w-md place-items-center p-6 text-center">
      <div>
        <h1 className="text-3xl">Unauthorized action</h1>
        <p className="mt-2 text-muted">Your account does not have permission to open that page. If you believe this is a mistake, contact the school administrator.</p>
        <Link href="/portal" className="btn btn-primary mt-5">Back to your portal</Link>
      </div>
    </main>
  );
}
