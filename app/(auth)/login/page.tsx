import { AuthForm } from "@/components/auth/AuthForm";
import { signIn } from "@/app/auth/actions";

export const metadata = { title: "Sign in — ProLive" };

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-xl font-medium">Sign in</h1>
      <AuthForm mode="signin" action={signIn} />
    </div>
  );
}
