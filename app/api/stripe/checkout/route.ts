import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get org_id from professionals table
    const { data: professional, error: profError } = await supabase
      .from("professionals")
      .select("org_id")
      .eq("auth_id", user.id)
      .single();

    if (profError || !professional) {
      return NextResponse.json(
        { error: "Professional profile not found" },
        { status: 404 }
      );
    }

    const { farmer_id } = await req.json();

    if (!farmer_id) {
      return NextResponse.json(
        { error: "farmer_id is required" },
        { status: 400 }
      );
    }

    // Verify farmer belongs to this org
    const { data: farmer, error: farmerError } = await supabase
      .from("farmers")
      .select("id, full_name")
      .eq("id", farmer_id)
      .eq("org_id", professional.org_id)
      .single();

    if (farmerError || !farmer) {
      return NextResponse.json(
        { error: "Farmer not found" },
        { status: 404 }
      );
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `ARC/PLC Optimization Report`,
              description: `AI-powered compliance report for ${farmer.full_name}`,
            },
            unit_amount: 3900,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.nextUrl.origin}/dashboard/reports/success?session_id={CHECKOUT_SESSION_ID}&farmer_id=${farmer_id}`,
      cancel_url: `${req.nextUrl.origin}/dashboard/farmers/${farmer_id}`,
      metadata: {
        farmer_id,
        org_id: professional.org_id,
        user_id: user.id,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
