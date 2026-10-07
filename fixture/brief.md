# SYNTHETIC counter harness
This made-up fixture tests runtime plumbing, not teaching quality or grading.
`report.ts` prints a counter total from `sales.csv`. Compare its output with the `units` column.
## Deliverable
Create `finding.json` with exactly these three integer fields:
- `reportedTotal` — the counter output.
- `rawTotal` — the sum of the synthetic input column.
- `missingUnits` — rawTotal minus reportedTotal.
## Done shape
- `deno run --allow-read verify.ts` exits `0`.
