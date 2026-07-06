"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import type { AuthState } from "@/app/auth/actions";

type Action = (prev: AuthState, formData: FormData) => Promise<AuthState>;

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 w-full rounded-md bg-signal px-4 py-2.5 font-medium text-ink-900 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

export function AuthForm({
  mode,
  action,
}: {
  mode: "signin" | "signup";
  action: Action;
}) {
  const [state, formAction] = useActionState<AuthState, FormData>(action, {});
  const isSignin = mode === "signin";

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm text-text-lo">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="tnum rounded-md border border-line bg-ink-900 px-3 py-2.5 text-text-hi outline-none focus:border-signal"
          placeholder="you@example.com"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm text-text-lo">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={isSignin ? "current-password" : "new-password"}
          required
          minLength={8}
          className="tnum rounded-md border border-line bg-ink-900 px-3 py-2.5 text-text-hi outline-none focus:border-signal"
          placeholder="At least 8 characters"
        />
      </div>

      {state.error ? (
        <p role="alert" className="rounded-md border border-down/40 bg-down/10 px-3 py-2 text-sm text-down">
          {state.error}
        </p>
      ) : null}

      <SubmitButton
        label={isSignin ? "Sign in" : "Create account"}
        pendingLabel={isSignin ? "Signing in…" : "Creating…"}
      />

      <p className="text-center text-sm text-text-lo">
        {isSignin ? (
          <>
            New here?{" "}
            <Link href="/signup" className="text-signal hover:underline">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/login" className="text-signal hover:underline">
              Sign in
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
