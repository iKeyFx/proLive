"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, sweepExpired } from "@/lib/rate-limit";

const credentials = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export interface AuthState {
  error?: string;
}

async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() ?? "local";
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  sweepExpired();
  const ip = await clientIp();
  // 8 attempts / 5 min / IP — blunts brute force without locking out typos.
  const limited = rateLimit(`auth:signin:${ip}`, 8, 5 * 60_000);
  if (!limited.ok) {
    return { error: "Too many attempts. Wait a few minutes and try again." };
  }

  const parsed = credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details and try again." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    // Don't leak whether the email exists — keep the message uniform.
    return { error: "Email or password is incorrect." };
  }

  redirect("/");
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  sweepExpired();
  const ip = await clientIp();
  const limited = rateLimit(`auth:signup:${ip}`, 5, 10 * 60_000);
  if (!limited.ok) {
    return { error: "Too many sign-up attempts. Try again later." };
  }

  const parsed = credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details and try again." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp(parsed.data);
  if (error) {
    return { error: error.message };
  }

  // If email confirmation is disabled (recommended for the demo), the user is
  // signed in immediately and the signup trigger has seeded their account.
  redirect("/");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
