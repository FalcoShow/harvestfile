// =============================================================================
// HarvestFile — /check Page (Server Component Wrapper)
// Phase 10 Build 5: Dynamic OG metadata for shared result links
//
// Reads URL search params to generate dynamic OpenGraph images.
// When a farmer shares their results, the link shows a branded card
// with their county's ARC-CO vs PLC numbers on Facebook/Twitter/iMessage.
// =============================================================================

import dynamic from "next/dynamic";
import type { Metadata } from "next";

const CheckCalculator = dynamic(() => import("./CheckCalculator"), {
  ssr: false,
  loading: () => (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "#0C1F17" }}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-[#C9A84C]/30 border-t-[#C9A84C] rounded-full animate-spin" />
        <span className="text-sm text-white/30 font-medium">
          Loading calculator...
        </span>
      </div>
    </div>
  ),
});

// ── Dynamic Metadata (includes OG image for shared links) ─────────────────

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const county = params.county;
  const state = params.state;
  const crop = params.crop;
  const name = params.name;

  // Default metadata (no URL params = fresh visit)
  const baseTitle = "Free ARC/PLC Calculator — Compare Payments for Your County | HarvestFile";
  const baseDescription =
    "See which USDA program pays you more. Compare ARC-CO vs PLC for your county using real USDA data. Free, instant, no signup required.";

  if (!county || !state || !crop) {
    return {
      title: baseTitle,
      description: baseDescription,
      openGraph: {
        title: baseTitle,
        description: baseDescription,
        url: "https://www.harvestfile.com/check",
        siteName: "HarvestFile",
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: baseTitle,
        description: baseDescription,
      },
    };
  }

  // Shared link — generate dynamic metadata
  const cropName = crop.charAt(0) + crop.slice(1).toLowerCase();
  const countyLabel = name || "Your County";
  const sharedTitle = `${cropName} ARC/PLC Results for ${countyLabel}, ${state} | HarvestFile`;
  const sharedDescription = `See the ARC-CO vs PLC comparison for ${cropName} in ${countyLabel}, ${state}. Free calculator using real USDA county data.`;

  // Build OG image URL — the /api/og route generates a dynamic branded card
  const ogParams = new URLSearchParams();
  ogParams.set("county", countyLabel);
  ogParams.set("state", state);
  ogParams.set("crop", crop);
  if (params.acres) ogParams.set("acres", params.acres);
  const ogImageUrl = `https://www.harvestfile.com/api/og?${ogParams.toString()}`;

  return {
    title: sharedTitle,
    description: sharedDescription,
    openGraph: {
      title: sharedTitle,
      description: sharedDescription,
      url: `https://www.harvestfile.com/check?state=${state}&county=${county}&crop=${crop}${params.acres ? `&acres=${params.acres}` : ""}`,
      siteName: "HarvestFile",
      type: "website",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${cropName} ARC-CO vs PLC comparison for ${countyLabel}, ${state}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: sharedTitle,
      description: sharedDescription,
      images: [ogImageUrl],
    },
  };
}

// ── Page Component ────────────────────────────────────────────────────────

export default function CheckPage() {
  return <CheckCalculator />;
}
