import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

// Use service role client for webhook (no user auth context)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const { farmer_id, org_id, user_id } = session.metadata!;

    try {
      // 1. Record payment
      const { data: payment, error: paymentError } = await supabaseAdmin
        .from("payments")
        .insert({
          org_id,
          farmer_id,
          user_id,
          stripe_session_id: session.id,
          stripe_payment_intent:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent?.id || null,
          amount_cents: session.amount_total,
          status: "completed",
        })
        .select()
        .single();

      if (paymentError) {
        console.error("Payment insert error:", paymentError);
        return NextResponse.json(
          { error: "Failed to record payment" },
          { status: 500 }
        );
      }

      // 2. Create report record with status "processing"
      const { data: report, error: reportError } = await supabaseAdmin
        .from("reports")
        .insert({
          org_id,
          farmer_id,
          payment_id: payment.id,
          user_id,
          status: "processing",
          report_type: "arc_plc_optimization",
        })
        .select()
        .single();

      if (reportError) {
        console.error("Report insert error:", reportError);
        return NextResponse.json(
          { error: "Failed to create report" },
          { status: 500 }
        );
      }

      // 3. Trigger AI report generation (fire-and-forget for webhook speed)
      // We call our own generate endpoint
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : "http://localhost:3000";

      fetch(`${baseUrl}/api/reports/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.INTERNAL_API_SECRET}`,
        },
        body: JSON.stringify({
          report_id: report.id,
          farmer_id,
          org_id,
        }),
      }).catch((err) =>
        console.error("Failed to trigger report generation:", err)
      );
    } catch (err) {
      console.error("Webhook processing error:", err);
      return NextResponse.json(
        { error: "Webhook processing failed" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ received: true });
}