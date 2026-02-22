export interface CsvRow {
  AWB: string
  OrderType: "Prepaid" | "COD"
  BilledWeight: number
  ActualWeight: number
  BilledZone: "A" | "B" | "C"
  ActualZone: "A" | "B" | "C"
  TotalBilledAmount: number
}

export interface ContractRules {
  zone_a_rate: number
  zone_b_rate: number
  zone_c_rate: number
  cod_fee_percentage: number
  rto_flat_fee: number
}

export interface Discrepancy {
  awb_number: string
  issue_type: string
  billed_amount: number
  correct_amount: number
  difference: number
}

export interface AnalysisResult {
  discrepancies: Discrepancy[]
  totalOvercharge: number
  totalRows: number
  totalBilled: number
}

const ZONE_RATE_MAP: Record<string, keyof ContractRules> = {
  A: "zone_a_rate",
  B: "zone_b_rate",
  C: "zone_c_rate",
}

export function analyzeInvoice(
  csvData: any[],
  contractRules: ContractRules
): AnalysisResult {
  const discrepancies: Discrepancy[] = []
  let totalBilled = 0
  const seenAWBs = new Set<string>()

  for (const row of csvData) {
    const awb: string = row.AWB
    const orderType: string = row.OrderType
    const billedWeight: number = Number(row.BilledWeight)
    const actualWeight: number = Number(row.ActualWeight)
    const billedZone: string = row.BilledZone
    const actualZone: string = row.ActualZone
    const totalBilledAmount: number = Number(row.TotalBilledAmount)

    totalBilled += totalBilledAmount

    // ── Duplicate charge detection ──
    if (seenAWBs.has(awb)) {
      discrepancies.push({
        awb_number: awb,
        issue_type: "Duplicate Charge",
        billed_amount: totalBilledAmount,
        correct_amount: 0,
        difference: Number(totalBilledAmount.toFixed(2)),
      })
      continue
    }
    seenAWBs.add(awb)

    // Determine base rate from the actual zone
    const rateKey = ZONE_RATE_MAP[actualZone]
    const baseRate: number = rateKey ? contractRules[rateKey] : 0

    // Expected freight using the billed weight (carrier charges by billed weight)
    const expectedFreight = baseRate * billedWeight

    // Expected total: RTO/Return uses a flat fee; COD adds a percentage; Prepaid is base only
    const isRTO = orderType === "RTO" || orderType === "Return"
    let expectedTotal: number
    if (isRTO) {
      expectedTotal = contractRules.rto_flat_fee
    } else if (orderType === "COD") {
      expectedTotal =
        expectedFreight + (expectedFreight * contractRules.cod_fee_percentage) / 100
    } else {
      expectedTotal = expectedFreight
    }

    // Only flag rows where the overcharge is more than ₹1
    const difference = totalBilledAmount - expectedTotal
    if (difference <= 1) continue

    // Build a descriptive reason covering all detected issues
    const reasons: string[] = []

    if (billedZone !== actualZone) {
      reasons.push("Zone Mismatch")
    }

    if (billedWeight > actualWeight) {
      reasons.push("Weight Overcharge")
    }

    if (orderType === "Prepaid" && totalBilledAmount > expectedFreight + 1) {
      reasons.push("Invalid COD Charge")
    }

    if (isRTO && totalBilledAmount > contractRules.rto_flat_fee + 1) {
      reasons.push("RTO Overcharge")
    }

    // Flag unexplained surcharges: significant overcharge with no zone or weight cause
    if (
      difference > 10 &&
      !reasons.includes("Zone Mismatch") &&
      !reasons.includes("Weight Overcharge")
    ) {
      reasons.push("Non-contracted Surcharge")
    }

    // Catch-all for small unexplained overcharges (₹1–₹10) not caught above
    if (reasons.length === 0) {
      reasons.push("Rate Overcharge")
    }

    discrepancies.push({
      awb_number: awb,
      issue_type: reasons.join(", "),
      billed_amount: totalBilledAmount,
      correct_amount: Number(expectedTotal.toFixed(2)),
      difference: Number(difference.toFixed(2)),
    })
  }

  const totalOvercharge = discrepancies.reduce((sum, d) => sum + d.difference, 0)

  return {
    discrepancies,
    totalOvercharge: Number(totalOvercharge.toFixed(2)),
    totalRows: csvData.length,
    totalBilled: Number(totalBilled.toFixed(2)),
  }
}
