// One-off: write valid one-page placeholder PDFs into /public. Shraddha can
// overwrite public/resume.pdf and public/portfolio.pdf with the real files
// (same names) and the kiosk will serve them with no code change.
import { writeFile } from "node:fs/promises";

function buildPdf(lines) {
  const content =
    "BT /F1 22 Tf 70 720 Td 26 TL " +
    lines.map((l, i) => `${i ? "T* " : ""}(${l.replace(/[()\\]/g, "\\$&")}) Tj`).join(" ") +
    " ET";
  const objs = [
    "<</Type/Catalog/Pages 2 0 R>>",
    "<</Type/Pages/Kids[3 0 R]/Count 1>>",
    "<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Resources<</Font<</F1 5 0 R>>>>/Contents 4 0 R>>",
    `<</Length ${content.length}>>\nstream\n${content}\nendstream`,
    "<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [];
  objs.forEach((o, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((off) => {
    pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<</Size ${objs.length + 1}/Root 1 0 R>>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, "latin1");
}

await writeFile(
  "public/resume.pdf",
  buildPdf([
    "Shraddha Sonel",
    "Resume - placeholder",
    "",
    "Replace public/resume.pdf with the real file.",
  ]),
);
await writeFile(
  "public/portfolio.pdf",
  buildPdf([
    "Shraddha Sonel",
    "Portfolio - placeholder",
    "",
    "Replace public/portfolio.pdf with the real file.",
  ]),
);
console.log("Wrote public/resume.pdf and public/portfolio.pdf");
