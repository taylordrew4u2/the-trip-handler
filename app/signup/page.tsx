import { SignupForm } from "./SignupForm";
import { AuthShell } from "@/components/AuthShell";

export const dynamic = "force-dynamic";

export default function SignupPage() {
  return (
    <AuthShell
      eyebrow="Create account"
      title="Your next trip starts here."
      description="Make an account to host your own trip and invite people. Got an invite link? Open it to apply to that trip."
    >
      <SignupForm />
    </AuthShell>
  );
}
