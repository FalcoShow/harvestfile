// =============================================================================
// HarvestFile — Barchart Attribution Component
// Build 6 Deploy 1
//
// Required by Barchart data license on ALL pages displaying their data.
// Must appear near the data display AND in the site footer.
//
// Usage:
//   <BarchartAttribution />              — compact (near data)
//   <BarchartAttribution variant="full" /> — full text (footer)
// =============================================================================

interface BarchartAttributionProps {
  variant?: 'compact' | 'full';
  className?: string;
}

export function BarchartAttribution({
  variant = 'compact',
  className = '',
}: BarchartAttributionProps) {
  if (variant === 'full') {
    return (
      <p className={`text-[10px] text-gray-400 leading-relaxed ${className}`}>
        Market data and grain prices provided by{' '}
        <a
          href="https://www.barchart.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-500 hover:text-gray-600 underline decoration-dotted"
        >
          Barchart.com
        </a>
        . Cash bids are based on delayed futures prices and are subject to
        change. Information is provided as-is for informational purposes only,
        not for trading purposes or advice.
      </p>
    );
  }

  return (
    <p className={`text-[9px] text-gray-400 leading-relaxed ${className}`}>
      Grain prices by{' '}
      <a
        href="https://www.barchart.com"
        target="_blank"
        rel="noopener noreferrer"
        className="text-gray-500 hover:text-gray-600 underline decoration-dotted"
      >
        Barchart
      </a>
      . Delayed data, informational only.
    </p>
  );
}
