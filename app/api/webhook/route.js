import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://fzduyjxjdcxbdwjlwrpu.supabase.co";
const SB_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  let event;

  // Verify webhook signature (critical for security)
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Handle the event
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    const reportId = session.metadata?.reportId;
    const email = session.metadata?.email || session.customer_email;
    const county = session.metadata?.county || "";
    const state = session.metadata?.state || "";
    const crop = session.metadata?.crop || "";

    console.log(`Payment received: ${email} — Report ${reportId} — $${(session.amount_total / 100).toFixed(2)}`);

    // Store payment in Supabase
    if (SB_SERVICE_KEY) {
      try {
        const res = await fetch(`${SB_URL}/rest/v1/payments`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SB_SERVICE_KEY,
            Authorization: `Bearer ${SB_SERVICE_KEY}`,
            Prefer: "return=minimal",
          },
          body: JSON.stringify({
            report_id: reportId,
            email: email,
            stripe_session_id: session.id,
            stripe_payment_intent: session.payment_intent,
            amount_cents: session.amount_total,
            currency: session.currency,
            status: "completed",
            county: county,
            state: state,
            crop: crop,
            metadata: JSON.stringify({
              customer_name: session.customer_details?.name || "",
              payment_method: session.payment_method_types?.[0] || "card",
            }),
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          console.error("Supabase payment insert failed:", errText);
        }
      } catch (err) {
        console.error("Supabase payment insert error:", err.message);
      }
    }

    // Also update the reports table if it exists (mark as paid)
    if (SB_SERVICE_KEY && reportId) {
      try {
        await fetch(
          `${SB_URL}/rest/v1/reports?report_id=eq.${reportId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              apikey: SB_SERVICE_KEY,
              Authorization: `Bearer ${SB_SERVICE_KEY}`,
              Prefer: "return=minimal",
            },
            body: JSON.stringify({
              paid: true,
              paid_at: new Date().toISOString(),
              stripe_session_id: session.id,
            }),
          }
        );
      } catch {
        // Reports table update is optional — fail silently
      }
    }
  }

  return Response.json({ received: true });
}

