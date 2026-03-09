import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-primary text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Column 1: Brand */}
          <div>
            <p className="font-bold text-lg">HarvestFile</p>
            <p className="text-sm opacity-80 mt-2">
              Stop Leaving Money on the Table
            </p>
            <div className="mt-4 text-sm opacity-80 space-y-1">
              <p>HarvestFile LLC, Tallmadge, Ohio</p>
              <a
                href="mailto:hello@harvestfile.com"
                className="hover:text-accent transition-colors"
              >
                hello@harvestfile.com
              </a>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <p className="font-bold text-lg mb-4">Quick Links</p>
            <nav className="flex flex-col gap-2">
              <Link href="/" className="text-sm hover:text-accent transition-colors">
                Home
              </Link>
              <Link href="/screener" className="text-sm hover:text-accent transition-colors">
                Check Eligibility
              </Link>
              <Link href="/privacy" className="text-sm hover:text-accent transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-sm hover:text-accent transition-colors">
                Terms of Service
              </Link>
            </nav>
          </div>

          {/* Column 3: Disclaimer */}
          <div>
            <p className="font-bold text-lg mb-4">Disclaimer</p>
            <p className="text-sm opacity-80">
              HarvestFile is not affiliated with USDA. This tool provides estimates
              only. Consult your local FSA/NRCS office for official determinations.
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/20 mt-8 pt-6 text-center text-sm opacity-60">
          &copy; 2026 HarvestFile LLC. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
