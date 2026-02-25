import { GoogleGenerativeAI } from "@google/generative-ai"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file || file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Request must include a 'file' field containing a PDF." },
        { status: 400 }
      )
    }

    // Convert PDF to base64 for Gemini inline data
    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString("base64")

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })

    const prompt = `You are an AI trained to extract logistics contract rates for Indian D2C e-commerce brands.
Read this courier service agreement PDF and extract the exact pricing details.

Return ONLY a strict JSON object (no markdown, no backticks, no explanation) with these exact keys:
- provider_name         (string)  : courier company name, e.g. "Delhivery"
- zone_a_rate           (number)  : per 500g freight rate for Zone A (intra-city / metro-to-metro)
- zone_b_rate           (number)  : per 500g freight rate for Zone B (same state)
- zone_c_rate           (number)  : per 500g freight rate for Zone C (cross-state)
- cod_fee_percentage    (number)  : COD handling fee as a percentage of freight, e.g. 1.5
- rto_flat_fee          (number)  : Return-to-Origin flat fee in INR
- fuel_surcharge_percentage (number) : fuel or handling surcharge as a percentage of base freight
- docket_charge         (number)  : per-shipment docket / AWB charge in INR
- gst_percentage        (number)  : GST rate applied to courier services (typically 18)

Rules:
- All monetary values must be plain numbers in Indian Rupees (no currency symbols).
- If a field is not explicitly stated in the contract, use these sensible defaults:
  fuel_surcharge_percentage = 12, docket_charge = 25, gst_percentage = 18.
- Never return null; always return a number.`

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64,
          mimeType: "application/pdf",
        },
      },
      prompt,
    ])

    const raw = result.response.text().trim()
    const extracted = JSON.parse(raw)

    return NextResponse.json(extracted)
  } catch (error) {
    console.error("[extract-contract] Error:", error)
    return NextResponse.json(
      { error: "Failed to extract contract data from PDF." },
      { status: 500 }
    )
  }
}
