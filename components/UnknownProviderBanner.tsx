"use client"

import { useState, useRef } from "react"
import { AlertTriangle, Upload, ChevronDown, ChevronUp } from "lucide-react"

export interface UnknownProvider {
  name: string
  rowCount: number
  hasCustomContract?: boolean
}

interface Props {
  providers: UnknownProvider[]
  onContractUpload: (rawName: string, file: File) => void
}

export default function UnknownProviderBanner({ providers, onContractUpload }: Props) {
  const [expanded, setExpanded] = useState(false)
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  if (providers.length === 0) return null

  return (
    <div
      className="rounded-lg border p-4 space-y-3"
      style={{
        background: "rgba(245,158,11,0.05)",
        borderColor: "rgba(245,158,11,0.2)",
      }}
    >
      {/* Header row */}
      <div className="flex items-start gap-2.5">
        <AlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-amber-400" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-amber-200 font-medium">
            {providers.length} unknown provider{providers.length !== 1 ? "s" : ""} detected —{" "}
            rate-based checks skipped
          </p>
          <p className="text-[11px] text-amber-600 mt-0.5">
            {providers.map((p) => p.name).join(", ")}
          </p>
        </div>
        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex-shrink-0 text-[10px] text-amber-600 hover:text-amber-400 flex items-center gap-1 transition-colors"
        >
          {expanded ? "Hide" : "Add contracts"}
          {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </button>
      </div>

      {/* Per-provider upload buttons */}
      {expanded && (
        <div className="space-y-2 pt-1">
          {providers.map((provider) => (
            <div
              key={provider.name}
              className="flex items-center justify-between rounded-md px-3 py-2 border"
              style={{
                background: "rgba(255,255,255,0.02)",
                borderColor: "rgba(245,158,11,0.12)",
              }}
            >
              <div>
                <span className="text-xs text-zinc-300 font-medium">{provider.name}</span>
                <span className="text-[10px] text-zinc-600 ml-2">
                  {provider.rowCount} shipment{provider.rowCount !== 1 ? "s" : ""}
                </span>
                {provider.hasCustomContract && (
                  <span className="ml-2 text-[10px] text-green-500">Contract loaded</span>
                )}
              </div>
              <div>
                <input
                  type="file"
                  accept=".pdf"
                  ref={(el) => { fileInputRefs.current[provider.name] = el }}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      onContractUpload(provider.name, file)
                      e.target.value = ""
                    }
                  }}
                />
                <button
                  onClick={() => fileInputRefs.current[provider.name]?.click()}
                  className="flex items-center gap-1.5 text-[10px] rounded-md px-2.5 py-1.5 border transition-colors"
                  style={{
                    background: "rgba(245,158,11,0.08)",
                    borderColor: "rgba(245,158,11,0.2)",
                    color: "rgb(253,224,71)",
                  }}
                >
                  <Upload size={10} />
                  Upload PDF Contract
                </button>
              </div>
            </div>
          ))}
          <p className="text-[10px] text-zinc-700 pl-1">
            Upload the provider's rate card PDF — Gemini will extract rates and enable full re-audit.
          </p>
        </div>
      )}
    </div>
  )
}
