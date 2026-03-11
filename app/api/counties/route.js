const NASS_KEY = process.env.NASS_API_KEY || "E3837A13-9EC3-3BF9-84EB-B475A476D4A7";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const state = searchParams.get("state");

  if (!state || state.length !== 2) {
    return Response.json({ counties: [] });
  }

  try {
    const url = `https://quickstats.nass.usda.gov/api/get_param_values/?key=${NASS_KEY}&param=county_name&state_alpha=${state.toUpperCase()}&agg_level_desc=COUNTY&commodity_desc=CORN&statisticcat_desc=YIELD`;

    const res = await fetch(url, {
      next: { revalidate: 86400 }, // ISR: revalidate every 24 hours
    });

    if (!res.ok) throw new Error(`NASS API returned ${res.status}`);

    const data = await res.json();
    const counties = (data?.county_name || [])
      .map((c) => c.trim())
      .filter(Boolean)
      .sort();

    return Response.json(
      { counties, state: state.toUpperCase(), count: counties.length },
      {
        headers: {
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600",
        },
      }
    );
  } catch (err) {
    console.error(`County fetch failed for ${state}:`, err.message);
    return Response.json({ counties: [], error: err.message }, { status: 500 });
  }
}
