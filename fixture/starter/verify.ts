// SYNTHETIC verifier of generated dummy counters only.
try {
  const rows = Deno.readTextFileSync("sales.csv").trim().split("\n").slice(1).map((line) => Number(line.split(",")[2]));
  const rawTotal = rows.reduce((sum, value) => sum + value, 0);
  const reportedTotal = rawTotal - rows.at(-1);
  const value = JSON.parse(Deno.readTextFileSync("finding.json"));
  if (Object.keys(value).sort().join(",") !== "missingUnits,rawTotal,reportedTotal" || value.rawTotal !== rawTotal || value.reportedTotal !== reportedTotal || value.missingUnits !== rawTotal - reportedTotal) throw new Error("synthetic mismatch");
  console.log("Synthetic verification passed");
} catch {
  console.error("Synthetic verification failed");
  Deno.exit(1);
}
