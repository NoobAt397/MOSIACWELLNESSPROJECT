export interface CsvRow {
  AWB: string
  OrderType: "Prepaid" | "COD" | "RTO" | "Return"
  BilledWeight: number
  ActualWeight: number
  BilledZone: "A" | "B" | "C"
  ActualZone: "A" | "B" | "C"
  TotalBilledAmount: number
  // Optional: dimensional weight inputs (cm)
  Length?: number
  Width?: number
  Height?: number
  // Optional: pincode fields for zone validation
  OriginPincode?: string
  DestPincode?: string
}

export interface ContractRules {
  zone_a_rate: number
  zone_b_rate: number
  zone_c_rate: number
  cod_fee_percentage: number
  rto_flat_fee: number
  fuel_surcharge_percentage: number
  docket_charge: number
  gst_percentage: number
}

/**
 * Granular cost breakdown attached to every flagged Discrepancy.
 * Enables the Evidence Modal to show a line-by-line comparison
 * of what the carrier billed vs. what the contract allows.
 */
export interface BreakdownDetail {
  orderType: string

  // ── Zone ──────────────────────────────────────────
  billedZone: string
  /** Zone used for rate lookup (pincode-derived > actual zone from CSV) */
  effectiveZone: string
  /** Non-null when OriginPincode + DestPincode were present */
  pincodeDerivedZone: string | null
  zoneMismatch: boolean

  // ── Weight ────────────────────────────────────────
  billedWeight: number
  actualWeight: number
  /** Null when no dimension columns (L/W/H) were in the CSV */
  volumetricWeight: number | null
  chargeableWeight: number
  /** Carrier billed MORE weight than the chargeable weight */
  weightOvercharge: boolean
  /** Carrier billed LESS weight than chargeable; likely ignored volumetric */
  weightDiscrepancy: boolean

  // ── Rate ──────────────────────────────────────────
  baseRate: number

  // ── Expected cost components ──────────────────────
  baseFreight: number
  fuelSurcharge: number
  docketCharge: number
  codFee: number
  preGST: number
  gst: number
}

export interface Discrepancy {
  awb_number: string
  issue_type: string
  billed_amount: number
  correct_amount: number
  difference: number
  /** Absent for Duplicate Charge entries (no unique calculation to show) */
  breakdown?: BreakdownDetail
}

export interface AnalysisResult {
  discrepancies: Discrepancy[]
  totalOvercharge: number
  totalRows: number
  totalBilled: number
}

// ── Pincode → State lookup (first 2 digits) ───────────────────────────────────
const PIN_STATE: Record<string, string> = {
  "11": "Delhi",
  "12": "Haryana",       "13": "Haryana",
  "14": "Punjab",        "15": "Punjab",        "16": "Punjab",
  "17": "Himachal Pradesh",
  "18": "Jammu & Kashmir", "19": "Jammu & Kashmir",
  "20": "Uttar Pradesh", "21": "Uttar Pradesh", "22": "Uttar Pradesh",
  "23": "Uttar Pradesh", "24": "Uttar Pradesh", "25": "Uttar Pradesh",
  "26": "Uttar Pradesh", "27": "Uttar Pradesh", "28": "Uttar Pradesh",
  "29": "Uttarakhand",
  "30": "Rajasthan",     "31": "Rajasthan",     "32": "Rajasthan",
  "33": "Rajasthan",     "34": "Rajasthan",
  "36": "Gujarat",       "37": "Gujarat",       "38": "Gujarat",       "39": "Gujarat",
  "40": "Maharashtra",   "41": "Maharashtra",   "42": "Maharashtra",
  "43": "Maharashtra",   "44": "Maharashtra",   "45": "Maharashtra",
  "46": "Maharashtra",   "47": "Maharashtra",
  "48": "Madhya Pradesh", "49": "Madhya Pradesh",
  "50": "Telangana",     "51": "Andhra Pradesh", "52": "Andhra Pradesh",
  "53": "Andhra Pradesh",
  "56": "Karnataka",     "57": "Karnataka",     "58": "Karnataka",     "59": "Karnataka",
  "60": "Tamil Nadu",    "61": "Tamil Nadu",    "62": "Tamil Nadu",
  "63": "Tamil Nadu",    "64": "Tamil Nadu",
  "67": "Kerala",        "68": "Kerala",        "69": "Kerala",
  "70": "West Bengal",   "71": "West Bengal",   "72": "West Bengal",
  "73": "West Bengal",   "74": "West Bengal",
  "75": "Odisha",        "76": "Odisha",        "77": "Odisha",
  "78": "Assam",
  "79": "Northeast",
  "80": "Bihar",         "81": "Bihar",
  "82": "Jharkhand",     "83": "Jharkhand",
  "84": "Bihar",         "85": "Bihar",
}

// Major metro city pincode prefixes (first 3 digits)
const METRO_PREFIXES = new Set([
  "110", // Delhi
  "400", // Mumbai
  "560", // Bangalore
  "600", // Chennai
  "700", // Kolkata
  "500", // Hyderabad
  "411", // Pune
  "380", // Ahmedabad
])

/**
 * Derives the shipping zone from origin and destination pincodes.
 * Zone A: same metro hub · Zone B: same state · Zone C: cross-state
 */
export function determineZone(
  originPin: string,
  destPin: string
): "A" | "B" | "C" {
  const o = String(originPin).replace(/\s/g, "")
  const d = String(destPin).replace(/\s/g, "")
  const o3 = o.substring(0, 3)
  const d3 = d.substring(0, 3)
  const o2 = o.substring(0, 2)
  const d2 = d.substring(0, 2)

  if (METRO_PREFIXES.has(o3) && o3 === d3) return "A"

  const originState = PIN_STATE[o2]
  const destState   = PIN_STATE[d2]
  if (originState && destState && originState === destState) return "B"

  return "C"
}

/**
 * Returns chargeable weight = max(dead weight, volumetric weight).
 * Volumetric = L × W × H / 5000  (cm → kg, standard courier divisor).
 * Returns dead weight when dimensions are absent or zero.
 */
export function calculateChargeableWeight(
  deadWeight: number,
  length?: number,
  width?: number,
  height?: number
): { chargeableWeight: number; volumetricWeight: number | null } {
  if (length && width && height && length > 0 && width > 0 && height > 0) {
    const volumetricWeight = (length * width * height) / 5000
    return {
      chargeableWeight: Math.max(deadWeight, volumetricWeight),
      volumetricWeight: Number(volumetricWeight.toFixed(3)),
    }
  }
  return { chargeableWeight: deadWeight, volumetricWeight: null }
}

const ZONE_RATE_MAP: Record<string, keyof ContractRules> = {
  A: "zone_a_rate",
  B: "zone_b_rate",
  C: "zone_c_rate",
}

/**
 * Core invoice audit function.
 *
 * Expected total formula (standard Indian D2C logistics):
 *   Base Freight   = zone_rate × chargeable_weight
 *   Fuel Surcharge = Base Freight × fuel_surcharge_pct / 100
 *   Docket Charge  = fixed fee per shipment
 *   COD Fee        = (Base + Fuel) × cod_fee_pct / 100  [COD only]
 *   Pre-GST        = Base + Fuel + Docket + COD Fee
 *   GST            = Pre-GST × gst_pct / 100
 *   Total Expected = Pre-GST + GST
 *
 *   RTO / Return:  rto_flat_fee + rto_flat_fee × gst_pct / 100
 */
export function analyzeInvoice(
  csvData: any[],
  contractRules: ContractRules
): AnalysisResult {
  const discrepancies: Discrepancy[] = []
  let totalBilled = 0
  const seenAWBs = new Set<string>()

  for (const row of csvData) {
    const awb:               string  = String(row.AWB ?? "")
    const orderType:         string  = String(row.OrderType ?? "")
    const billedWeight:      number  = Number(row.BilledWeight)
    const actualWeight:      number  = Number(row.ActualWeight)
    const billedZone:        string  = String(row.BilledZone ?? "")
    const actualZone:        string  = String(row.ActualZone ?? "")
    const totalBilledAmount: number  = Number(row.TotalBilledAmount)

    const length    = row.Length       != null ? Number(row.Length)       : undefined
    const width     = row.Width        != null ? Number(row.Width)        : undefined
    const height    = row.Height       != null ? Number(row.Height)       : undefined
    const originPin = row.OriginPincode != null ? String(row.OriginPincode) : undefined
    const destPin   = row.DestPincode   != null ? String(row.DestPincode)   : undefined

    totalBilled += totalBilledAmount

    // ── Duplicate charge detection ──────────────────────────────────────────
    if (seenAWBs.has(awb)) {
      discrepancies.push({
        awb_number:    awb,
        issue_type:    "Duplicate Charge",
        billed_amount: totalBilledAmount,
        correct_amount: 0,
        difference:    Number(totalBilledAmount.toFixed(2)),
        // No breakdown for duplicates — the whole charge is the error
      })
      continue
    }
    seenAWBs.add(awb)

    // ── Chargeable weight ───────────────────────────────────────────────────
    const { chargeableWeight, volumetricWeight } = calculateChargeableWeight(
      actualWeight, length, width, height
    )

    // ── Zone determination ──────────────────────────────────────────────────
    let pincodeDerivedZone: "A" | "B" | "C" | null = null
    if (
      originPin && destPin &&
      String(originPin).replace(/\s/g, "").length >= 6 &&
      String(destPin).replace(/\s/g, "").length >= 6
    ) {
      pincodeDerivedZone = determineZone(originPin, destPin)
    }
    const effectiveZone: string = pincodeDerivedZone ?? actualZone

    // ── Rate lookup ─────────────────────────────────────────────────────────
    const rateKey  = ZONE_RATE_MAP[effectiveZone]
    const baseRate: number = rateKey ? (contractRules[rateKey] as number) : 0

    // ── Expected total with all surcharges ──────────────────────────────────
    const isRTO = orderType === "RTO" || orderType === "Return"
    let expectedTotal: number
    let baseFreight   = 0
    let fuelSurcharge = 0
    let docketCharge  = 0
    let codFee        = 0
    let preGST        = 0
    let gst           = 0

    if (isRTO) {
      const rtoFee = contractRules.rto_flat_fee
      gst          = rtoFee * (contractRules.gst_percentage / 100)
      preGST       = rtoFee
      expectedTotal = rtoFee + gst
    } else {
      baseFreight   = baseRate * chargeableWeight
      fuelSurcharge = baseFreight * (contractRules.fuel_surcharge_percentage / 100)
      docketCharge  = contractRules.docket_charge
      codFee        =
        orderType === "COD"
          ? (baseFreight + fuelSurcharge) * (contractRules.cod_fee_percentage / 100)
          : 0
      preGST        = baseFreight + fuelSurcharge + docketCharge + codFee
      gst           = preGST * (contractRules.gst_percentage / 100)
      expectedTotal = preGST + gst
    }

    // Only flag rows where overcharge exceeds ₹1
    const difference = totalBilledAmount - expectedTotal
    if (difference <= 1) continue

    // ── Issue type labels ───────────────────────────────────────────────────
    const reasons: string[] = []
    const referenceZone  = pincodeDerivedZone ?? actualZone
    const zoneMismatch   = billedZone !== referenceZone
    const weightOvercharge  = billedWeight > chargeableWeight + 0.01
    const weightDiscrepancy = volumetricWeight !== null && billedWeight < chargeableWeight - 0.01

    if (zoneMismatch) {
      reasons.push(
        pincodeDerivedZone
          ? `Zone Mismatch (Pincode: ${referenceZone})`
          : "Zone Mismatch"
      )
    }
    if (weightOvercharge)  reasons.push("Weight Overcharge")
    if (weightDiscrepancy) reasons.push("Weight Discrepancy")

    if (orderType === "Prepaid") {
      const potentialCod =
        (baseFreight + fuelSurcharge) * (contractRules.cod_fee_percentage / 100)
      if (Math.abs(difference - potentialCod * (1 + contractRules.gst_percentage / 100)) < 15) {
        reasons.push("Invalid COD Charge")
      }
    }

    if (isRTO) {
      const expectedRTO = contractRules.rto_flat_fee * (1 + contractRules.gst_percentage / 100)
      if (totalBilledAmount > expectedRTO + 1) reasons.push("RTO Overcharge")
    }

    if (
      difference > 10 &&
      !reasons.some((r) => r.startsWith("Zone Mismatch") || r === "Weight Overcharge")
    ) {
      reasons.push("Non-contracted Surcharge")
    }

    if (reasons.length === 0) reasons.push("Rate Overcharge")

    // ── Build the breakdown for the Evidence Modal ──────────────────────────
    const breakdown: BreakdownDetail = {
      orderType,
      billedZone,
      effectiveZone,
      pincodeDerivedZone,
      zoneMismatch,
      billedWeight,
      actualWeight,
      volumetricWeight,
      chargeableWeight,
      weightOvercharge,
      weightDiscrepancy,
      baseRate,
      baseFreight:   Number(baseFreight.toFixed(2)),
      fuelSurcharge: Number(fuelSurcharge.toFixed(2)),
      docketCharge:  Number(docketCharge.toFixed(2)),
      codFee:        Number(codFee.toFixed(2)),
      preGST:        Number(preGST.toFixed(2)),
      gst:           Number(gst.toFixed(2)),
    }

    discrepancies.push({
      awb_number:     awb,
      issue_type:     reasons.join(", "),
      billed_amount:  totalBilledAmount,
      correct_amount: Number(expectedTotal.toFixed(2)),
      difference:     Number(difference.toFixed(2)),
      breakdown,
    })
  }

  const totalOvercharge = discrepancies.reduce((sum, d) => sum + d.difference, 0)

  return {
    discrepancies,
    totalOvercharge: Number(totalOvercharge.toFixed(2)),
    totalRows:       csvData.length,
    totalBilled:     Number(totalBilled.toFixed(2)),
  }
}
