// Passwords: only bcrypt hashes are ever written. bcryptjs is pure JavaScript, so nothing compiles on Windows.
import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";

export const BCRYPT_COST = 12;
const cost = () => (process.env.NODE_ENV === "test" && process.env.OKIT_BCRYPT_COST ? Math.max(4, Number(process.env.OKIT_BCRYPT_COST)) : BCRYPT_COST);

export const hashPassword = (pw: string): Promise<string> => bcrypt.hash(pw, cost());
export async function verifyPassword(pw: string, hash: string | null | undefined): Promise<boolean> {
  if (!hash) return false;
  try {
    return await bcrypt.compare(pw, hash);
  } catch {
    return false;
  }
}

export const MIN_PASSWORD = 10;
/** bcrypt reads at most 72 bytes, so a longer password would silently ignore its tail. */
export const MAX_PASSWORD_BYTES = 72;

export function passwordProblem(pw: string, username?: string): string | null {
  if (pw.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`;
  if (Buffer.byteLength(pw) > MAX_PASSWORD_BYTES) return `Use at most ${MAX_PASSWORD_BYTES} characters.`;
  if (username && pw.toLowerCase().includes(username.toLowerCase())) return "Don't put your username in your password.";
  return null;
}

// No 0/O, 1/l/I: the password is read out of a chat message.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

/** A temporary password like "Kq7m-Xw3N-hT9c" (12 characters, about 68 bits). */
export function generateTempPassword(): string {
  const part = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]!).join("");
  return `${part()}-${part()}-${part()}`;
}
