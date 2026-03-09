import Link from 'next/link';

export default function Header() {
  return (
    <header role="banner" className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="text-primary font-bold text-xl">
            HarvestFile
          </Link>

          <div className="flex items-center gap-6">
            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="/#how-it-works"
                className="text-sm text-muted hover:text-foreground transition-colors"
              >
                How It Works
              </Link>
              <Link
                href="/#programs"
                className="text-sm text-muted hover:text-foreground transition-colors"
              >
                Programs
              </Link>
            </nav>

            <Link
              href="/screener"
              className="bg-primary text-white text-sm font-medium rounded-lg px-4 py-2 hover:bg-primary-light transition-colors"
            >
              Check Eligibility
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
