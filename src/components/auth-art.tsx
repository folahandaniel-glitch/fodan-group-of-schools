import { allSettings } from "@/lib/settings";

/** Picture slot for sign-in / registration screens. Shows a placeholder until a picture is uploaded in the BackEnd. */
export async function AuthArt({ slot, className = "" }: { slot: "login" | "register" | "staff"; className?: string }) {
  const s = await allSettings();
  const file = s.authArt?.[slot] as string | undefined;
  return (
    <div className={`overflow-hidden rounded-2xl border border-line bg-paper-2 ${className}`}>
      {file ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/api/files/${file}`} alt="" className="h-full max-h-56 w-full object-cover" loading="lazy" />
      ) : (
        <div className="grid h-full min-h-32 place-items-center border-2 border-dashed border-line p-4 text-center text-xs font-semibold text-muted">
          Picture placeholder<br /><span className="font-normal">Set in BackEnd › Settings › Sign-in &amp; footer</span>
        </div>
      )}
    </div>
  );
}
