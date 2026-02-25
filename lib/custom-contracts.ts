/**
 * Persistence helpers for custom provider contracts.
 *
 * When a user uploads a rate-card PDF for an unknown provider, the extracted
 * ContractRules are stored here under the normalised provider name so that
 * subsequent audits can use the full rate-based engine for that provider.
 */

import type { ContractRules } from "@/lib/billing-engine"

const STORAGE_KEY = "mosaic_custom_contracts"

export type CustomContract = ContractRules & { provider_name: string }

/**
 * Saves a custom contract keyed by the normalised raw provider name.
 * Key is lowercased + trimmed to allow case-insensitive lookup.
 */
export function saveCustomContract(rawName: string, contract: CustomContract): void {
  if (typeof window === "undefined") return
  try {
    const existing = loadCustomContracts()
    existing[rawName.toLowerCase().trim()] = contract
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing))
  } catch {
    // ignore storage quota / parse errors
  }
}

/**
 * Returns all saved custom contracts keyed by normalised raw provider name.
 */
export function loadCustomContracts(): Record<string, CustomContract> {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

/**
 * Removes all custom contracts from localStorage.
 */
export function clearCustomContracts(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(STORAGE_KEY)
}
