import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  try {
    const { reportId, email, county, state, crop } = await request.json();

    if (!reportId) {
      return Response.json(
        { error: "Missing reportId" },
        { status: 400 }
      );
    }

    // Build the base URL from the request
    const origin =
      process.env.NEXT_PUBLIC_BASE_URL ||
      request.headers.get("origin") ||
      "https://harvestfile.com";

    // Build Stripe session config — email is optional (Stripe collects it if not provided)
    const sessionConfig = {
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "HarvestFile Farm Program Report",
              description: `Personalized ARC/PLC analysis for ${county} County, ${state} — ${crop}`,
              images: ["https://harvestfile.com/og-image.png"],
            },
            unit_amount: 3900, // $39.00 in cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        reportId,
        email: email || "",
        county: county || "",
        state: state || "",
        crop: crop || "",
        source: "harvestfile_report",
      },
      success_url: `${origin}/report?id=${reportId}&payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/report?id=${reportId}&payment=cancelled`,
      automatic_tax: { enabled: false },
    };

    // Pre-fill email on Stripe checkout if we have it
    if (email) {
      sessionConfig.customer_email = email;
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return Response.json({
      success: true,
      url: session.url,
      sessionId: session.id,
    });
  } catch (err) {
    console.error("Stripe checkout error:", err.message);
    return Response.json(
      { error: err.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
