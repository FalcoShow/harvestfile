export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0a0f0d] flex">
      {/* Left panel — brand / value prop */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[40%] relative overflow-hidden">
        {/* Background with subtle agricultural pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d1a12] via-[#0a1510] to-[#061210]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2334d399' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16">
          {/* Logo */}
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-emerald-400"
                >
                  <path d="M12 2a10 10 0 0 1 0 20 10 10 0 0 1 0-20z" opacity="0" />
                  <path d="M7 20h10" />
                  <path d="M12 20V10" />
                  <path d="M12 10c-2-2.96-6-3-6 0s4 4 6 2" />
                  <path d="M12 10c2-2.96 6-3 6 0s-4 4-6 2" />
                </svg>
              </div>
              <span className="text-xl font-semibold text-white tracking-tight">
                HarvestFile
              </span>
            </div>
          </div>

          {/* Value proposition */}
          <div className="space-y-8">
            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight tracking-tight">
              USDA program
              <br />
              compliance,
              <br />
              <span className="text-emerald-400">simplified.</span>
            </h1>
            <p className="text-lg text-gray-400 max-w-md leading-relaxed">
              Manage farmer portfolios, optimize ARC/PLC decisions, and generate
              compliance reports — all from one enterprise dashboard.
            </p>

            {/* Stats / trust signals */}
            <div className="grid grid-cols-3 gap-6 pt-4">
              <div>
                <div className="text-2xl font-bold text-white">50</div>
                <div className="text-sm text-gray-500 mt-1">States covered</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">16</div>
                <div className="text-sm text-gray-500 mt-1">Crop programs</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">$39</div>
                <div className="text-sm text-gray-500 mt-1">Per report</div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-sm text-gray-600">
            © {new Date().getFullYear()} HarvestFile LLC. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right panel — auth form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
