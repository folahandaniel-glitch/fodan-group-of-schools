export type PasswordCheck = { ok: boolean; problems: string[]; score: number };

export function checkPassword(pw: string): PasswordCheck {
  const problems: string[] = [];
  if (pw.length < 8) problems.push("Use at least 8 characters.");
  if (!/[A-Za-z]/.test(pw)) problems.push("Include letters.");
  if (!/[0-9]/.test(pw)) problems.push("Include at least one number.");
  if (!/[^A-Za-z0-9]/.test(pw)) problems.push("Include at least one symbol (for example ! ^ # @).");
  if (pw.length > 128) problems.push("Use at most 128 characters.");
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return { ok: problems.length === 0, problems, score: Math.min(score, 5) };
}

const EMAIL = /^[A-Za-z0-9._%+'-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
export function validEmail(e: string): boolean {
  return e.length <= 254 && EMAIL.test(e.trim());
}
export function normEmail(e: string): string {
  return e.trim().toLowerCase();
}
