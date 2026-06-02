import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="text-7xl mb-6">🏃</div>
      <h1 className="text-4xl font-semibold text-brand-dark mb-3">404</h1>
      <p className="text-xl text-gray-600 mb-2">Stránka nenalezena</p>
      <p className="text-gray-400 text-sm mb-8">Tato stránka neexistuje nebo byla přesunuta.</p>
      <Link href="/" className="btn-primary">
        Zpět na hlavní stránku
      </Link>
    </div>
  );
}
