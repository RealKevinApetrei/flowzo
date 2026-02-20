import Link from "next/link";
import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-navy">Create your account</h1>
        <p className="mt-1 text-sm text-text-secondary">Get started with Flowzo in seconds</p>
      </div>

      <SignupForm />

      <p className="text-center text-sm text-text-secondary">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-coral hover:text-coral-dark transition-colors">
          Log in
        </Link>
      </p>
    </div>
  );
}
