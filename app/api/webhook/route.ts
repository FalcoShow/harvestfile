import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

var supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  var body = await req.text();
  var sig = req.headers.get("stripe-signature")!;
  var event: Stripe.Event;

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
    var session = event.data.object as Stripe.Checkout.Session;
    var farmer_id = session.metadata?.farmer_id || "";
    var org_id = session.metadata?.org_id || "";
    var user_id = session.metadata?.user_id || "";

    try {
      // 1. Record payment
      var paymentResult = await supabaseAdmin
        .from("payments")
        .insert({
          org_id: org_id,
          farmer_id: farmer_id,
          user_id: user_id,
          stripe_session_id: session.id,
          stripe_payment_intent:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : null,
          amount_cents: session.amount_total,
          status: "completed",
        })
        .select()
        .single();

      if (paymentResult.error) {
        console.error("Payment insert error:", paymentResult.error);
        return NextResponse.json(
          { error: "Failed to record payment" },
          { status: 500 }
        );
      }

      var payment = paymentResult.data;

      // 2. Create report record with status "processing"
      var reportResult = await supabaseAdmin
        .from("reports")
        .insert({
          org_id: org_id,
          farmer_id: farmer_id,
          payment_id: payment.id,
          user_id: user_id,
          status: "processing",
          report_type: "arc_plc_optimization",
        })
        .select()
        .single();

      if (reportResult.error) {
        console.error("Report insert error:", reportResult.error);
        return NextResponse.json(
          { error: "Failed to create report" },
          { status: 500 }
        );
      }

      var report = reportResult.data;

      // 3. Trigger AI report generation (awaited, not fire-and-forget)
      var baseUrl = process.env.NEXT_PUBLIC_APP_URL || ("https://" + process.env.VERCEL_URL) || "http://localhost:3000";
      var generateUrl = baseUrl + "/api/reports/generate";

      console.log("Triggering report generation at:", generateUrl);

      try {
        var genResponse = await fetch(generateUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + process.env.INTERNAL_API_SECRET,
          },
          body: JSON.stringify({
            report_id: report.id,
            farmer_id: farmer_id,
            org_id: org_id,
          }),
        });

        var genResult = await genResponse.text();
        console.log("Generate response:", genResponse.status, genResult);
      } catch (genErr: any) {
        console.error("Failed to trigger report generation:", genErr.message);
      }

    } catch (err: any) {
      console.error("Webhook processing error:", err.message || err);
      return NextResponse.json(
        { error: "Webhook processing failed" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ received: true });
}
