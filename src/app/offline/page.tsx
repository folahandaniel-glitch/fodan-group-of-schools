export const metadata = { title: "You are offline" };
export default function Offline() {
  return (
    <main id="main" className="mx-auto grid min-h-dvh max-w-md place-items-center p-6 text-center">
      <div>
        <h1 className="text-3xl">You are offline</h1>
        <p className="mt-2 text-muted">Check your connection and try again. Your in-progress examination answers are saved on the server as you go.</p>
        <a href="/" className="btn btn-primary mt-5">Try again</a>
      </div>
    </main>
  );
}
