export default function SettingsPage() {
  return (
    <div className="px-4 py-6 space-y-6">
      <h1 className="text-2xl font-extrabold text-navy">Settings</h1>

      {/* Account Section */}
      <section className="card-monzo p-5 space-y-3">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide">Account</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-navy">Email</p>
            <p className="text-sm text-text-secondary">user@example.com</p>
          </div>
          <span className="text-xs text-text-muted">Verified</span>
        </div>
      </section>

      {/* Bank Connections */}
      <section className="card-monzo p-5 space-y-3">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide">Bank Connections</h2>
        <p className="text-sm text-text-secondary">No bank accounts connected yet.</p>
        <button className="w-full bg-coral text-white font-semibold py-2.5 rounded-full hover:bg-coral-dark transition-colors text-sm">
          Connect Bank
        </button>
      </section>

      {/* Preferences */}
      <section className="card-monzo p-5 space-y-4">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide">Preferences</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-navy">Push Notifications</p>
            <p className="text-xs text-text-secondary">Get alerts for bill shift proposals</p>
          </div>
          <div className="w-12 h-7 bg-cool-grey rounded-full flex items-center px-1">
            <div className="w-5 h-5 bg-white rounded-full shadow-sm" />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-navy">Default Role</p>
            <p className="text-xs text-text-secondary">Borrower or Lender</p>
          </div>
          <span className="text-sm font-medium text-coral">Borrower</span>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="card-monzo p-5 space-y-3 border border-danger/20">
        <h2 className="text-sm font-semibold text-danger uppercase tracking-wide">Danger Zone</h2>
        <button className="w-full border border-danger text-danger font-semibold py-2.5 rounded-full hover:bg-danger hover:text-white transition-colors text-sm">
          Sign Out
        </button>
      </section>
    </div>
  );
}
