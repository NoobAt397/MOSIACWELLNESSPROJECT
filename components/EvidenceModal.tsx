"use client"

import { useEffect } from "react"
import { X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { Discrepancy } from "@/lib/billing-engine"

interface EvidenceModalProps {
  discrepancy: Discrepancy
  gstPercentage: number
  onClose: () => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function wt(n: number) {
  return `${n.toFixed(3).replace(/\.?0+$/, "")} kg`
}

// ── Sub-components ─────────────────────────────────────────────────────────────

/** A single row in the comparison table. */
function CompareRow({
  label,
  billed,
  expected,
  highlightBilled = false,
  highlightExpected = false,
  dimExpected = false,
  separator = false,
}: {
  label: string
  billed: React.ReactNode
  expected: React.ReactNode
  highlightBilled?: boolean
  highlightExpected?: boolean
  dimExpected?: boolean
  separator?: boolean
}) {
  return (
    <div
      className={`grid grid-cols-[140px_1fr_1fr] items-center py-2 px-3 gap-2 ${
        separator ? "border-t border-zinc-800/60" : ""
      } ${highlightBilled ? "bg-red-950/20" : ""}`}
    >
      <span className="text-[11px] text-zinc-500 uppercase tracking-wider">{label}</span>

      {/* Billed column */}
      <span
        className={`text-sm font-mono text-right ${
          highlightBilled ? "text-red-400 font-semibold" : "text-zinc-300"
        }`}
      >
        {billed}
      </span>

      {/* Expected column */}
      <span
        className={`text-sm font-mono text-right ${
          highlightExpected
            ? "text-green-400 font-semibold"
            : dimExpected
            ? "text-zinc-600"
            : "text-zinc-300"
        }`}
      >
        {expected}
      </span>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function EvidenceModal({
  discrepancy,
  gstPercentage,
  onClose,
}: EvidenceModalProps) {
  const { awb_number, issue_type, billed_amount, correct_amount, difference, breakdown } =
    discrepancy

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = ""
    }
  }, [])

  const issues = issue_type.split(", ").map((s) => s.trim())

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.82)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {/* Card */}
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border border-zinc-800/80 shadow-2xl"
        style={{ background: "#0a0a0a" }}
      >
        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-zinc-800/60">
          <div className="space-y-2">
            <p className="text-[11px] text-zinc-500 uppercase tracking-widest font-semibold">
              Billing Evidence
            </p>
            <p className="font-mono text-sm text-zinc-200">{awb_number}</p>
            <div className="flex flex-wrap gap-1.5">
              {issues.map((issue) => (
                <Badge
                  key={issue}
                  className="bg-red-950/80 text-red-400 border border-red-900/60 text-[10px] font-normal rounded-sm px-2 py-0.5"
                >
                  {issue}
                </Badge>
              ))}
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 text-zinc-600 hover:text-zinc-300 transition-colors mt-0.5"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Duplicate charge — no detailed breakdown ── */}
        {!breakdown ? (
          <div className="px-5 py-10 text-center space-y-3">
            <p className="text-zinc-400 text-sm">
              AWB <span className="font-mono">{awb_number}</span> appears more than once in this
              invoice.
            </p>
            <p className="text-zinc-600 text-xs">
              The carrier billed the same shipment twice. The entire charge of{" "}
              <span className="text-red-400 font-mono">{fmt(billed_amount)}</span> on the duplicate
              entry should be disputed.
            </p>
          </div>
        ) : (
          <>
            {/* ── Column headers ── */}
            <div className="grid grid-cols-[140px_1fr_1fr] items-center px-3 pt-3 pb-2 gap-2">
              <span />
              <span className="text-[10px] text-zinc-600 uppercase tracking-widest text-right">
                Carrier Billed
              </span>
              <span className="text-[10px] text-zinc-600 uppercase tracking-widest text-right">
                Contract Expected
              </span>
            </div>

            {/* ── Zone & Weight ── */}
            <CompareRow
              label="Zone"
              billed={
                <span className="flex items-center justify-end gap-1">
                  {breakdown.billedZone}
                  {breakdown.zoneMismatch && (
                    <span className="text-[10px] text-red-500">✕</span>
                  )}
                </span>
              }
              expected={
                <span className="flex items-center justify-end gap-1">
                  {breakdown.effectiveZone}
                  {breakdown.pincodeDerivedZone && (
                    <span className="text-[10px] text-zinc-600">(pincode)</span>
                  )}
                </span>
              }
              highlightBilled={breakdown.zoneMismatch}
              highlightExpected={breakdown.zoneMismatch}
            />

            <CompareRow
              label="Billed Weight"
              billed={
                <span className="flex items-center justify-end gap-1">
                  {wt(breakdown.billedWeight)}
                  {(breakdown.weightOvercharge || breakdown.weightDiscrepancy) && (
                    <span className="text-[10px] text-red-500">✕</span>
                  )}
                </span>
              }
              expected={
                <span className="flex items-center justify-end gap-1 flex-wrap">
                  {wt(breakdown.chargeableWeight)}
                  {breakdown.volumetricWeight !== null && (
                    <span className="text-[10px] text-zinc-600">
                      (vol: {wt(breakdown.volumetricWeight)})
                    </span>
                  )}
                </span>
              }
              highlightBilled={breakdown.weightOvercharge || breakdown.weightDiscrepancy}
              highlightExpected={breakdown.weightOvercharge || breakdown.weightDiscrepancy}
            />

            <CompareRow
              label="Order Type"
              billed={breakdown.orderType}
              expected={breakdown.orderType}
            />

            {/* ── Cost breakdown ── */}
            <CompareRow
              label="Base Rate"
              billed="—"
              expected={`${fmt(breakdown.baseRate)} / 500g`}
              separator
            />
            <CompareRow
              label="Base Freight"
              billed="—"
              expected={fmt(breakdown.baseFreight)}
            />
            <CompareRow
              label={`Fuel Surcharge`}
              billed="—"
              expected={fmt(breakdown.fuelSurcharge)}
            />
            <CompareRow
              label="Docket Charge"
              billed="—"
              expected={fmt(breakdown.docketCharge)}
            />
            {breakdown.codFee > 0 && (
              <CompareRow
                label="COD Fee"
                billed="—"
                expected={fmt(breakdown.codFee)}
              />
            )}
            <CompareRow
              label="Pre-GST Total"
              billed="—"
              expected={fmt(breakdown.preGST)}
              separator
            />
            <CompareRow
              label={`GST (${gstPercentage}%)`}
              billed="—"
              expected={fmt(breakdown.gst)}
            />

            {/* ── Summary ── */}
            <div
              className="mx-4 mb-4 mt-3 rounded-md border border-zinc-800/70 overflow-hidden"
              style={{ background: "rgba(15,15,15,0.9)" }}
            >
              {/* Total row */}
              <div className="grid grid-cols-[140px_1fr_1fr] items-center px-3 py-2.5 gap-2 border-b border-zinc-800/60">
                <span className="text-[11px] text-zinc-400 uppercase tracking-wider font-semibold">
                  Total
                </span>
                <span className="text-sm font-mono font-bold text-red-400 text-right">
                  {fmt(billed_amount)}
                </span>
                <span className="text-sm font-mono font-bold text-zinc-200 text-right">
                  {fmt(correct_amount)}
                </span>
              </div>

              {/* Overcharge row */}
              <div className="flex items-center justify-between px-3 py-2.5">
                <span className="text-[11px] text-zinc-500 uppercase tracking-wider">
                  Overcharge
                </span>
                <span
                  className="text-lg font-bold font-mono tabular-nums"
                  style={{ color: "rgb(248,113,113)" }}
                >
                  +{fmt(difference)}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
