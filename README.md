# Scrutix-XP

**Automated logistics invoice auditing for D2C brands**

---

## Overview

Scrutix-XP is an AI-powered logistics invoice auditing tool built for D2C brands that ship at scale. It ingests courier billing CSVs or PDFs, cross-references every shipment against the contracted rate card, and surfaces overcharges across seven distinct error categories — weight fraud, zone mismatches, duplicate charges, COD fee errors, RTO miscalculations, fuel surcharge inflation, and volumetric billing discrepancies. The result is a recoverable amount figure, a detailed discrepancy report, and a dispute-ready Excel payout file — generated in seconds.

---

## Features

- **Flexible ingestion** — Accepts CSV, XLSX, and PDF invoice files with auto-delimiter detection and multi-row header skipping
- **AI column mapping** — Fuzzy column-name matching (exact → substring → Jaccard → Levenshtein) automatically maps non-standard headers; low-confidence fields surface a manual review modal
- **PDF parsing via Gemini AI** — Scanned or text-based PDF invoices are parsed by Google Gemini, extracting structured rows ready for audit
- **Multi-provider support** — Detects a `Provider` column and routes each shipment to its own rate card; unknown providers receive a partial audit (duplicates, weight, zone) with an option to upload a custom PDF contract
- **7 error type detection** — Weight overcharge, zone mismatch, COD fee error, fuel surcharge error, RTO fee error, volumetric billing error, and duplicate charge
- **Analytics dashboard** — Historical audit trends, overcharge breakdown by issue type, and cross-run comparisons visualised with Recharts
- **Weight regression analysis** — Scatter plot of declared vs. billed weight across all audited AWBs to identify systematic billing inflation patterns
- **Excel payout export** — Generates a formatted `.xlsx` file with a summary sheet, full discrepancy list, and a dispute-ready sheet pre-filled for courier claims

---

## Live Demo

[scrutix.vercel.app](https://scrutix.vercel.app)

---

## Built With

| Technology | Role |
|---|---|
| [Next.js 15](https://nextjs.org) | App framework (App Router, API routes) |
| [TypeScript](https://www.typescriptlang.org) | Type safety across all logic and UI |
| [Recharts](https://recharts.org) | Analytics charts and donut visualisations |
| [SheetJS](https://sheetjs.com) | XLSX ingestion and Excel export |
| [Google Gemini AI](https://deepmind.google/technologies/gemini/) | PDF invoice and contract extraction |
| [PapaParse](https://www.papaparse.com) | CSV parsing with auto-delimiter detection |
| [Tailwind CSS](https://tailwindcss.com) | Styling |
| [shadcn/ui](https://ui.shadcn.com) | UI component primitives |

---

## Getting Started

```bash
# Install dependencies
npm install

# Add your Gemini API key
echo "GEMINI_API_KEY=your_key_here" > .env.local

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## About

Built by **Aditya Ranjith**

- [LinkedIn](https://www.linkedin.com/in/aditya-ranjith-80b54a25b/)
- [GitHub](https://github.com/NoobAt397)

---

*Built for **Mosaic Wellness Fellowship Builder Round 2026** — Problem Statement #8*
