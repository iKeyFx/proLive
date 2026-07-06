import { redirect } from "next/navigation";
import { loadAccount } from "@/lib/server/account";
import { StoreProvider } from "@/components/providers/StoreProvider";
import { FeedProvider } from "@/components/providers/FeedProvider";
import { AccountSync } from "@/components/providers/AccountSync";
import { Shell } from "@/components/shell/Shell";
import { ToastProvider } from "@/components/ui/Toast";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const loaded = await loadAccount();
  if (!loaded) redirect("/login");

  return (
    <StoreProvider initialAccount={loaded.account}>
      <FeedProvider>
        <ToastProvider>
          <AccountSync userId={loaded.userId} />
          <Shell email={loaded.email}>{children}</Shell>
        </ToastProvider>
      </FeedProvider>
    </StoreProvider>
  );
}
