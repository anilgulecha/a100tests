// SYNTHETIC generated counter: deliberately omits the final input row.
const rows = Deno.readTextFileSync("sales.csv")
  .trim()
  .split("\n")
  .slice(1)
  .map((line) => line.split(","));
let total = 0;
for (let i = 0; i < rows.length - 1; i++) {
  total += Number(rows[i][2]);
}
console.log("Synthetic counter:", total);
