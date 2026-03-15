// =============================================================================
// HarvestFile — Brand Logo (SVG)
// Shared across marketing header, footer, auth pages, etc.
// =============================================================================

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <rect width="40" height="40" rx="10" fill="#1B4332" />
      <path
        d="M12 28L20 12L28 20"
        stroke="#C9A84C"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="28" r="2.5" fill="#C9A84C" opacity="0.5" />
      <circle cx="20" cy="12" r="2.5" fill="#C9A84C" />
      <circle cx="28" cy="20" r="2.5" fill="#C9A84C" opacity="0.7" />
      <path
        d="M20 24V32"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.35"
      />
      <path
        d="M17 27L20 24L23 27"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.5"
      />
    </svg>
  );
}

export function LogoFull({ size = 28 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <Logo size={size} />
      <span
        className="text-[17px] font-extrabold tracking-[-0.04em]"
        style={{ color: "var(--hf-foreground)" }}
      >
        Harvest
        <span className="text-harvest-gold">File</span>
      </span>
    </div>
  );
}
