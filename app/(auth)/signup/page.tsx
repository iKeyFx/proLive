import { AuthForm } from "@/components/auth/AuthForm";
import { signUp } from "@/app/auth/actions";

export const metadata = { title: "Create account — ProLive" };

export default function SignupPage() {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-xl font-medium">Create account</h1>
      <p className="text-sm text-text-lo">
        You start with ₦5,000,000 in simulated cash to trade.
      </p>
      <AuthForm mode="signup" action={signUp} />
    </div>
  );
}
