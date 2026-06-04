// Kdo má přístup do administrace. Stačí doplnit/změnit e-mail.
export const ADMIN_EMAILS = ["schroffelh@seznam.cz"];

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.some((a) => a.toLowerCase() === email.toLowerCase());
}
