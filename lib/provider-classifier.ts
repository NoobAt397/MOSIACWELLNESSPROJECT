/**
 * Provider classification for logistics invoice rows.
 *
 * When a CSV contains a "Provider" column, each unique provider value is
 * fuzzy-matched against known couriers.  Rows are then split into "known"
 * and "unknown" groups so the audit engine can apply the right rate card.
 */

import { similarity } from "@/lib/column-matcher"

export type KnownProviderKey = "Delhivery" | "BlueDart" | "Ecom Express" | "Shadowfax"

const PROVIDER_VARIANTS: Record<KnownProviderKey, string[]> = {
  Delhivery: [
    "delhivery", "delhivery ltd", "delhivery limited", "dlvry", "del",
  ],
  BlueDart: [
    "bluedart", "blue dart", "blue dart express", "bd", "bdl",
  ],
  "Ecom Express": [
    "ecom express", "ecomexpress", "ecom", "ecom exp", "ecom express ltd",
  ],
  Shadowfax: [
    "shadowfax", "shadow fax", "sfx", "shadowfax technologies",
  ],
}

const CLASSIFY_THRESHOLD = 0.7

/**
 * Fuzzy-matches a raw provider cell value against known couriers.
 * Returns the canonical key + confidence, or null if below threshold.
 */
export function classifyProvider(
  rawName: string
): { canonical: KnownProviderKey; confidence: number } | null {
  if (!rawName || !rawName.trim()) return null

  let bestKey: KnownProviderKey | null = null
  let bestScore = 0

  for (const [key, variants] of Object.entries(PROVIDER_VARIANTS) as [KnownProviderKey, string[]][]) {
    let score = similarity(rawName, key)
    for (const variant of variants) {
      const s = similarity(rawName, variant)
      if (s > score) score = s
    }
    if (score > bestScore) {
      bestScore = score
      bestKey = key
    }
  }

  if (bestKey && bestScore >= CLASSIFY_THRESHOLD) {
    return { canonical: bestKey, confidence: bestScore }
  }
  return null
}

export interface ProviderGroups {
  known: Map<KnownProviderKey, Record<string, unknown>[]>
  unknown: Map<string, Record<string, unknown>[]>
}

/**
 * Splits rows by their canonical "Provider" field value into known vs
 * unknown groups.  Rows with a blank Provider are bucketed under "Other".
 */
export function groupRowsByProvider(
  rows: Record<string, unknown>[]
): ProviderGroups {
  const known  = new Map<KnownProviderKey, Record<string, unknown>[]>()
  const unknown = new Map<string, Record<string, unknown>[]>()

  for (const row of rows) {
    const rawProvider = String(row["Provider"] ?? "").trim()
    const label       = rawProvider || "Other"

    const match = classifyProvider(rawProvider)
    if (match) {
      const existing = known.get(match.canonical) ?? []
      existing.push(row)
      known.set(match.canonical, existing)
    } else {
      const existing = unknown.get(label) ?? []
      existing.push(row)
      unknown.set(label, existing)
    }
  }

  return { known, unknown }
}
