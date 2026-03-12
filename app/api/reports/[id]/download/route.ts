import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reportId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: professional } = await supabase
      .from("professionals")
      .select("org_id")
      .eq("auth_id", user.id)
      .single();

    if (!professional) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { data: report, error } = await supabase
      .from("reports")
      .select("*, farmers(full_name, county, state)")
      .eq("id", reportId)
      .eq("org_id", professional.org_id)
      .single();

    if (error || !report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    if (report.status !== "complete") {
      return NextResponse.json({ error: "Report not ready" }, { status: 400 });
    }

    const content = report.content;
    const pdfDoc = await PDFDocument.create();
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const pageWidth = 612;
    const pageHeight = 792;
    const margin = 50;
    const maxWidth = pageWidth - margin * 2;
    let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    const green = rgb(0.18, 0.74, 0.36);
    const darkGray = rgb(0.2, 0.2, 0.2);
    const medGray = rgb(0.4, 0.4, 0.4);

    function addNewPageIfNeeded(spaceNeeded: number = 80) {
      if (y < margin + spaceNeeded) {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
    }

    function drawText(
      text: string,
      options: {
        font?: typeof helvetica;
        size?: number;
        color?: typeof darkGray;
        x?: number;
        maxLineWidth?: number;
      } = {}
    ) {
      const font = options.font || helvetica;
      const size = options.size || 10;
      const color = options.color || darkGray;
      const x = options.x || margin;
      const lineMaxWidth = options.maxLineWidth || maxWidth;

      const words = text.split(" ");
      let line = "";
      const lines: string[] = [];

      for (const word of words) {
        const testLine = line ? `${line} ${word}` : word;
        const testWidth = font.widthOfTextAtSize(testLine, size);
        if (testWidth > lineMaxWidth && line) {
          lines.push(line);
          line = word;
        } else {
          line = testLine;
        }
      }
      if (line) lines.push(line);

      for (const l of lines) {
        addNewPageIfNeeded(size + 4);
        currentPage.drawText(l, { x, y, size, font, color });
        y -= size + 4;
      }

      return y;
    }

    drawText("HarvestFile", { font: helveticaBold, size: 24, color: green });
    y -= 4;
    drawText("AI-Powered ARC/PLC Optimization Report", { font: helveticaBold, size: 14, color: darkGray });
    y -= 8;

    currentPage.drawLine({
      start: { x: margin, y },
      end: { x: pageWidth - margin, y },
      thickness: 2,
      color: green,
    });
    y -= 20;

    const summary = content.farmer_summary;
    if (summary) {
      drawText("Farmer Overview", { font: helveticaBold, size: 14, color: darkGray });
      y -= 4;
      drawText(`Name: ${summary.name}`, { color: medGray });
      drawText(`Operation: ${summary.operation || "N/A"}`, { color: medGray });
      drawText(`Location: ${summary.county}, ${summary.state}`, { color: medGray });
      drawText(`Total Base Acres: ${summary.total_base_acres}`, { color: medGray });
      drawText(`Report Date: ${content.generated_date}`, { color: medGray });
      y -= 12;
    }

    if (content.executive_summary) {
      drawText("Executive Summary", { font: helveticaBold, size: 14, color: darkGray });
      y -= 4;
      drawText(content.executive_summary, { size: 10, color: medGray });
      y -= 12;
    }

    if (content.crop_analyses && content.crop_analyses.length > 0) {
      drawText("Crop-by-Crop Analysis", { font: helveticaBold, size: 14, color: darkGray });
      y -= 8;

      for (const crop of content.crop_analyses) {
        addNewPageIfNeeded(200);
        drawText(crop.commodity, { font: helveticaBold, size: 13, color: green });
        y -= 2;
        drawText(
          `Base Acres: ${crop.base_acres} | Planted: ${crop.planted_acres} | Current Election: ${crop.current_election}`,
          { size: 9, color: medGray }
        );
        y -= 6;

        if (crop.arc_co_analysis) {
          drawText("ARC-CO Analysis:", { font: helveticaBold, size: 11, color: darkGray });
          const arc = crop.arc_co_analysis;
          drawText(`  Benchmark Revenue: $${formatNum(arc.benchmark_revenue)}/ac  |  Guarantee: $${formatNum(arc.guarantee_level)}/ac`, { size: 9, color: medGray });
          drawText(`  Est. Payment: $${formatNum(arc.estimated_payment_per_acre)}/ac  |  Total: $${formatNum(arc.estimated_total_payment)}`, { size: 9, color: medGray });
          drawText(arc.explanation, { size: 9, color: medGray });
          y -= 6;
        }

        if (crop.plc_analysis) {
          drawText("PLC Analysis:", { font: helveticaBold, size: 11, color: darkGray });
          const plc = crop.plc_analysis;
          drawText(`  Reference Price: $${formatNum(plc.reference_price)}/bu  |  Market Price: $${formatNum(plc.estimated_market_price)}/bu`, { size: 9, color: medGray });
          drawText(`  Est. Payment: $${formatNum(plc.estimated_payment_per_acre)}/ac  |  Total: $${formatNum(plc.estimated_total_payment)}`, { size: 9, color: medGray });
          drawText(plc.explanation, { size: 9, color: medGray });
          y -= 6;
        }

        addNewPageIfNeeded(60);
        drawText(`RECOMMENDATION: ${crop.recommendation}`, { font: helveticaBold, size: 11, color: green });
        drawText(crop.recommendation_reasoning, { size: 9, color: medGray });
        if (crop.potential_savings > 0) {
          drawText(`Potential additional revenue: $${formatNum(crop.potential_savings)}`, { font: helveticaBold, size: 10, color: green });
        }
        y -= 16;
      }
    }

    if (content.total_estimated_payments) {
      addNewPageIfNeeded(100);
      const totals = content.total_estimated_payments;
      currentPage.drawRectangle({
        x: margin, y: y - 60, width: maxWidth, height: 70,
        color: rgb(0.95, 0.98, 0.95), borderColor: green, borderWidth: 1,
      });
      y -= 5;
      drawText("Payment Summary", { font: helveticaBold, size: 13, color: darkGray, x: margin + 10 });
      drawText(`Current Elections Est. Payment: $${formatNum(totals.current_elections)}`, { size: 10, color: medGray, x: margin + 10 });
      drawText(`Optimized Elections Est. Payment: $${formatNum(totals.optimized_elections)}`, { size: 10, color: medGray, x: margin + 10 });
      drawText(`Additional Revenue Opportunity: $${formatNum(totals.additional_revenue_opportunity)}`, { font: helveticaBold, size: 11, color: green, x: margin + 10 });
      y -= 16;
    }

    if (content.market_outlook) {
      addNewPageIfNeeded(80);
      drawText("Market Outlook", { font: helveticaBold, size: 14, color: darkGray });
      y -= 4;
      drawText(content.market_outlook, { size: 9, color: medGray });
      y -= 12;
    }

    if (content.important_dates && content.important_dates.length > 0) {
      addNewPageIfNeeded(60);
      drawText("Important Dates", { font: helveticaBold, size: 14, color: darkGray });
      y -= 4;
      for (const d of content.important_dates) {
        drawText(`${d.date}: ${d.description}`, { size: 9, color: medGray });
      }
      y -= 12;
    }

    if (content.disclaimers) {
      addNewPageIfNeeded(60);
      drawText("Disclaimers", { font: helveticaBold, size: 10, color: medGray });
      y -= 2;
      drawText(content.disclaimers, { size: 8, color: rgb(0.5, 0.5, 0.5) });
    }

    const pages = pdfDoc.getPages();
    for (let i = 0; i < pages.length; i++) {
      pages[i].drawText(`HarvestFile.com  |  Page ${i + 1} of ${pages.length}`, {
        x: margin, y: 25, size: 8, font: helvetica, color: rgb(0.6, 0.6, 0.6),
      });
    }

    const pdfBytes = await pdfDoc.save();
    const farmerName = (report.farmers?.full_name || "farmer").replace(/[^a-zA-Z0-9]/g, "_");

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="HarvestFile_Report_${farmerName}_${content.generated_date || "report"}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("PDF generation error:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}

function formatNum(n: any): string {
  if (n === null || n === undefined) return "0.00";
  return Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
