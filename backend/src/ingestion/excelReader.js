import xlsx from "xlsx";
import path from "path";
import fs from "fs";

/**
 * Reads an Excel workbook and extracts data rows paired with original spreadsheet row numbers.
 * 
 * @param {string} [customFilePath] - Absolute or relative path to the Excel file
 * @returns {{ fileName: string, sheetName: string, totalRows: number, rows: Array<{ rowNumber: number, rawData: Object }> }}
 */
export const readExcelWorkbook = (customFilePath) => {
  // Default path to the primary static dataset
  const defaultPath = path.resolve(process.cwd(), "../data/static/SIH26056_Raw_Observations_Final_360.xlsx");
  const fallbackPath = path.resolve(process.cwd(), "data/static/SIH26056_Raw_Observations_Final_360.xlsx");

  let resolvedPath = customFilePath;
  if (!resolvedPath) {
    if (fs.existsSync(defaultPath)) {
      resolvedPath = defaultPath;
    } else if (fs.existsSync(fallbackPath)) {
      resolvedPath = fallbackPath;
    } else {
      throw new Error(`Default static Excel dataset not found at ${defaultPath} or ${fallbackPath}`);
    }
  }

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Excel file not found at path: ${resolvedPath}`);
  }

  const workbook = xlsx.readFile(resolvedPath, {
    cellDates: false, // Keep raw strings so text dates like '29th August 2026' parse cleanly
    raw: true,
  });

  const sheetName = workbook.SheetNames.includes("Raw_Observations")
    ? "Raw_Observations"
    : workbook.SheetNames[0];

  const worksheet = workbook.Sheets[sheetName];

  // Convert worksheet to JSON array of row objects (row 1 as header)
  const rawRows = xlsx.utils.sheet_to_json(worksheet, {
    defval: "NA", // Default for blank cells to match raw spreadsheet standard
  });

  const fileName = path.basename(resolvedPath);

  // Map to structured rows with 1-based spreadsheet row numbers (header is row 1, data starts at row 2)
  const rows = rawRows.map((rowData, index) => ({
    rowNumber: index + 2,
    rawData: rowData,
  }));

  return {
    fileName,
    sheetName,
    totalRows: rows.length,
    rows,
  };
};
