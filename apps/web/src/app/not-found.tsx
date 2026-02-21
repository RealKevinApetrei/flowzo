import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-soft-white px-4">
      <div className="text-center space-y-4 max-w-sm">
        <div className="text-6xl font-extrabold text-coral">404</div>
        <h1 className="text-2xl font-bold text-navy">Page not found</h1>
        <p className="text-text-secondary text-sm">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-block bg-coral text-white font-semibold px-6 py-2.5 rounded-full hover:bg-coral-dark transition-colors text-sm"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
