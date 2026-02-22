import { GoogleGenerativeAI } from "@google/generative-ai"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { rawHeaders } = body as { rawHeaders: string[] }

    if (!Array.isArray(rawHeaders) || rawHeaders.length === 0) {
      return NextResponse.json(
        { error: "Request body must include a non-empty 'rawHeaders' array." },
        { status: 400 }
      )
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    const prompt = `You are a data engineer for an Indian D2C brand. Map the following raw CSV headers to our standard schema. Our standard keys are: AWB, OrderType, BilledWeight, ActualWeight, BilledZone, ActualZone, TotalBilledAmount, ShipmentDate, OriginPincode, DestPincode. Return ONLY a strict JSON object (no markdown, no backticks) where the keys are the RAW headers and the values are the STANDARD keys. If a raw header doesn't match anything, map it to null.

Raw headers:
${JSON.stringify(rawHeaders)}`

    const result = await model.generateContent(prompt)
    const raw = result.response.text().trim()

    const mapping: Record<string, string | null> = JSON.parse(raw)

    return NextResponse.json(mapping)
  } catch (error) {
    console.error("[map-headers] Error:", error)
    return NextResponse.json(
      { error: "Failed to map CSV headers." },
      { status: 500 }
    )
  }
}
