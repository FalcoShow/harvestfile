import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");

  if (!sessionId) {
    return Response.json({ paid: false, error: "No session ID" });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === "paid") {
      return Response.json({
        paid: true,
        reportId: session.metadata?.reportId,
        email: session.metadata?.email || session.customer_email,
        customerName: session.customer_details?.name || "",
      });
    }

    return Response.json({ paid: false, status: session.payment_status });
  } catch (err) {
    console.error("Payment verification error:", err.message);
    return Response.json({ paid: false, error: err.message });
  }
}
