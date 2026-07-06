import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string) {
  const cookieStore = await cookies();
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  cookieStore.set("session", userId, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function getSessionUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("session")?.value || null;
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.set("session", "", {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}