import * as XLSX from "xlsx";

export interface ParsedSheet {
  name: string;
  data: any[];
}

export async function parseExcel(fileBuffer: Buffer): Promise<ParsedSheet[]> {
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  console.log("📘 Sheets found:", workbook.SheetNames);

  const parsedSheets: ParsedSheet[] = [];

  workbook.SheetNames.forEach((sheetName) => {
    // Skip the 'disclaimer' sheet
    if (sheetName.toLowerCase().includes('disclaimer')) {
        console.log(`⏭️  Skipping sheet: ${sheetName}`);
        return;
    }
    
    const ws = workbook.Sheets[sheetName];
    if (!ws) return;

    // Convert sheet to array of arrays to find the header row
    const sheetData: any[][] = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      defval: "",
    });

    if (sheetData.length < 2) return; // Not enough data

    // Find the real header row (e.g., the one with "Sub Order No" or other key columns)
    let headerRowIndex = sheetData.findIndex(row => 
        row.some(cell => 
            String(cell).trim() === "Sub Order No" || 
            String(cell).trim() === "Settlement UTR" || // For non-order sheets
            String(cell).trim() === "Total Ads Cost"
        )
    );

    // If no specific header found, default to the second row (index 1) as a fallback
    if (headerRowIndex === -1) {
        headerRowIndex = 1;
    }

    // Data usually starts 2 rows after the header row in Meesho files
    const dataRowStartIndex = headerRowIndex + 2;

    const headerRow = sheetData[headerRowIndex].map(h => String(h).trim());
    const rows = sheetData.slice(dataRowStartIndex);
    
    console.log(`📊 Parsing sheet "${sheetName}": Found headers at row ${headerRowIndex + 1}, data starts at row ${dataRowStartIndex + 1}`);

    const json = rows
      // Filter out totally empty rows
      .filter((r) => r.some((v) => v !== "" && v !== null && v !== undefined))
      .map((row) => {
        const obj: any = {};
        headerRow.forEach((header, idx) => {
          if (header) {
            // Clean up header names, removing line breaks and extra spaces
            const cleanHeader = header.replace(/\r?\n|\r/g, " ").replace(/\s+/g, ' ').trim();
            obj[cleanHeader] = row[idx];
          }
        });
        return obj;
      });
      
    console.log(`   -> Extracted ${json.length} valid rows.`);
    parsedSheets.push({ name: sheetName.trim(), data: json });
  });

  return parsedSheets;
}