"use client";

import { useState, useTransition } from "react";
import { useAppSelector } from "@/lib/store/hooks";
import { selectCash, selectPortfolioTotals } from "@/lib/store/selectors";
import { formatNaira, kobo } from "@/lib/money";
import { resetAccount, deleteAccountData } from "@/app/(app)/trade/actions";
import { signOut } from "@/app/auth/actions";
import { useToast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type PendingConfirm = "signout" | "reset" | "delete" | null;

export function AccountView({ email }: { email: string }) {
  const cash = useAppSelector(selectCash);
  const totals = useAppSelector(selectPortfolioTotals);
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<PendingConfirm>(null);

  const doSignOut = () => {
    startTransition(async () => {
      await signOut(); // redirects to /login
    });
  };

  const doReset = () => {
    startTransition(async () => {
      const r = await resetAccount();
      if (r.ok) {
        toast.show({ tone: "ok", title: "Account reset", detail: "Holdings cleared and cash reseeded." });
        // Full reload for a clean slate (clears the local ledger mirror too).
        setTimeout(() => window.location.reload(), 600);
      } else {
        toast.show({ tone: "error", title: "Reset failed", detail: r.message });
      }
      setConfirm(null);
    });
  };

  const doDelete = () => {
    startTransition(async () => {
      const r = await deleteAccountData();
      if (r.ok) {
        window.location.href = "/login";
      } else {
        toast.show({ tone: "error", title: "Delete failed", detail: r.message });
        setConfirm(null);
      }
    });
  };

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div>
        <h1 className="font-display text-lg font-medium">Account</h1>
        <p className="text-sm text-text-lo">Your balances and account controls.</p>
      </div>

      <section className="rounded-lg border border-line bg-ink-800 p-4">
        <dl className="flex flex-col gap-3 text-sm">
          <Row label="Email" value={email} mono={false} />
          <Row label="Cash balance" value={formatNaira(kobo(cash))} />
          <Row label="Buying power" value={formatNaira(kobo(cash))} />
          <Row label="Portfolio total" value={formatNaira(kobo(totals.totalKobo))} />
        </dl>
      </section>

      {/* Reset */}
      <section className="rounded-lg border border-line bg-ink-800 p-4">
        <h2 className="font-display text-sm font-medium">Reset to seed</h2>
        <p className="mt-1 text-sm text-text-lo">
          Clears all your holdings and order history and restores your cash to ₦5,000,000. Useful for a clean demo.
        </p>
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setConfirm("reset")}
            className="rounded-md border border-line px-3 py-2 text-sm text-text-hi hover:bg-ink-700"
          >
            Reset account
          </button>
        </div>
      </section>

      {/* Danger zone */}
      <section className="rounded-lg border border-down/30 bg-down/5 p-4">
        <h2 className="font-display text-sm font-medium text-down">Delete account data</h2>
        <p className="mt-1 text-sm text-text-lo">
          Permanently removes your account, holdings, and ledger. This cannot be undone.
        </p>
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setConfirm("delete")}
            className="rounded-md border border-down/40 px-3 py-2 text-sm text-down hover:bg-down/10"
          >
            Delete account
          </button>
        </div>
      </section>

      <div>
        <button
          type="button"
          onClick={() => setConfirm("signout")}
          className="rounded-md border border-line px-3 py-2 text-sm text-text-hi hover:bg-ink-700"
        >
          Sign out
        </button>
      </div>

      <ConfirmDialog
        open={confirm === "signout"}
        title="Sign out?"
        body="You'll be returned to the sign-in page. Your portfolio and history stay saved."
        confirmLabel="Sign out"
        pendingLabel="Signing out…"
        pending={pending && confirm === "signout"}
        onConfirm={doSignOut}
        onClose={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === "reset"}
        title="Reset account?"
        body="This clears all your holdings and order history and restores your cash to ₦5,000,000. It cannot be undone."
        confirmLabel="Reset account"
        pendingLabel="Resetting…"
        pending={pending && confirm === "reset"}
        onConfirm={doReset}
        onClose={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === "delete"}
        title="Delete account data?"
        body="This permanently removes your account, holdings, and ledger. It cannot be undone."
        confirmLabel="Yes, delete everything"
        pendingLabel="Deleting…"
        tone="danger"
        pending={pending && confirm === "delete"}
        onConfirm={doDelete}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}

function Row({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-line/60 pb-2 last:border-0 last:pb-0">
      <dt className="text-text-lo">{label}</dt>
      <dd className={`${mono ? "tnum" : ""} text-text-hi`}>{value}</dd>
    </div>
  );
}
