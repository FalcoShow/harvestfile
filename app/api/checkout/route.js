import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  try {
    const { reportId, email, county, state, crop } = await request.json();

    if (!reportId || !email) {
      return Response.json(
        { error: "Missing reportId or email" },
        { status: 400 }
      );
    }

    // Build the base URL from the request
    const origin =
      process.env.NEXT_PUBLIC_BASE_URL ||
      request.headers.get("origin") ||
      "https://harvestfile.com";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: email,
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
        email,
        county: county || "",
        state: state || "",
        crop: crop || "",
        source: "harvestfile_report",
      },
      success_url: `${origin}/report?id=${reportId}&payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/report?id=${reportId}&payment=cancelled`,
      // Auto-apply tax if configured in Stripe dashboard
      automatic_tax: { enabled: false },
      // Founding Farmer discount — remove after first 100 sales
      // discounts: [{ coupon: "FOUNDING_FARMER" }],
    });

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
