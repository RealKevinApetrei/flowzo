import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-navy">Welcome back</h1>
        <p className="mt-1 text-sm text-text-secondary">Log in to your Flowzo account</p>
      </div>

      <LoginForm />

      <p className="text-center text-sm text-text-secondary">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-semibold text-coral hover:text-coral-dark transition-colors">
          Sign up
        </Link>
      </p>
    </div>
  );
}
