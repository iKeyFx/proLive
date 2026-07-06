import { createClient } from "@/lib/supabase/server";
import { AccountView } from "@/components/account/AccountView";

export const metadata = { title: "Account — ProLive" };

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return <AccountView email={user?.email ?? ""} />;
}
