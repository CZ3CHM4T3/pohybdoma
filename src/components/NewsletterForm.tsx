"use client";

export function NewsletterForm() {
  return (
    <form
      className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
      onSubmit={(e) => e.preventDefault()}
    >
      <input
        type="email"
        required
        placeholder="tvůj@email.cz"
        className="flex-1 px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:border-brand-blue text-sm"
      />
      <button type="submit" className="btn-primary shrink-0 py-3 px-6 text-sm">
        Přihlásit se
      </button>
    </form>
  );
}
