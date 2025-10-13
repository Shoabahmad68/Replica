import xlsx from "xlsx";

export function parseExcelBuffer(buffer) {
  const wb = xlsx.read(buffer, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];

  // Raw rows (array of arrays)
  const all = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  if (all.length < 3) return []; // Minimum 3 rows expected (header+data)

  // ✅ Header in 2nd row (index 1)
  const headerRow = all[1].map(h => ("" + h).trim());
  // ✅ Data starts from 3rd row (index 2)
  let dataRows = all.slice(2);

  // ✅ Remove last total row if it has the word "Total" in any cell
  if (dataRows.length > 0) {
    const lastRow = dataRows[dataRows.length - 1];
    if (lastRow.some(cell => String(cell).toLowerCase().includes("total"))) {
      dataRows = dataRows.slice(0, -1);
    }
  }

  // ✅ Convert to array of objects
  const rows = dataRows.map(r => {
    const obj = {};
    for (let i = 0; i < headerRow.length; i++) {
      obj[headerRow[i] || `COL_${i + 1}`] = r[i] !== undefined ? r[i] : "";
    }
    return obj;
  });

  return rows;
}
