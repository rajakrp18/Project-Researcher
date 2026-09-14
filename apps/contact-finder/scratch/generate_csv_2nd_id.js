const PDFParser = require('pdf2json');
const fs = require('fs');
const path = require('path');

const pdfPath = path.join(__dirname, '..', 'Unclaimed 2nd ID FY2024-25_Website.pdf');
const csvPath = path.join(__dirname, '..', 'dataset_2nd_id.csv');

const pdfParser = new PDFParser();

pdfParser.on("pdfParser_dataError", errData => console.error(errData.parserError));
pdfParser.on("pdfParser_dataReady", pdfData => {
    const rows = [];
    
    pdfData.Pages.forEach((page, pageIndex) => {
        const textElements = page.Texts;
        const yGroups = {};

        // Group by Y coordinate (tolerance of 0.1 units)
        textElements.forEach(t => {
            const decodedText = decodeURIComponent(t.R[0].T).trim();
            if (!decodedText) return;

            let matchedY = Object.keys(yGroups).find(y => Math.abs(parseFloat(y) - t.y) < 0.1);
            if (!matchedY) matchedY = t.y.toString();

            if (!yGroups[matchedY]) yGroups[matchedY] = [];
            yGroups[matchedY].push({
                x: t.x,
                text: decodedText
            });
        });

        const sortedY = Object.keys(yGroups).sort((a, b) => parseFloat(a) - parseFloat(b));

        sortedY.forEach(y => {
            const rowItems = yGroups[y].sort((a, b) => a.x - b.x);
            
            // Skip headers
            const fullText = rowItems.map(r => r.text).join(" ");
            if (fullText.includes("Sl No") || fullText.includes("UNCLAIMED 2nd INTERIM")) return;

            let slNo = "", description = "", folio = "", name = "", amount = "", address = "";

            rowItems.forEach(item => {
                if (item.x < 4.5) {
                    slNo += (slNo ? " " : "") + item.text;
                } else if (item.x >= 4.5 && item.x < 12.0) {
                    description += (description ? " " : "") + item.text;
                } else if (item.x >= 12.0 && item.x < 16.0) {
                    folio += (folio ? " " : "") + item.text;
                } else if (item.x >= 16.0 && item.x < 29.5) {
                    name += (name ? " " : "") + item.text;
                } else if (item.x >= 29.5 && item.x < 32.0) {
                    amount += (amount ? " " : "") + item.text;
                } else if (item.x >= 32.0) {
                    address += (address ? " " : "") + item.text;
                }
            });

            // Only push valid records (must have a Folio)
            if (folio && /^\d+$/.test(folio.replace(/\s/g, ''))) {
                rows.push({
                    "Sl No": slNo,
                    "Description": description,
                    "Folio / Demat Ac No.": folio,
                    "Name of Investor": name,
                    "Net Amount": amount,
                    "Address": address
                });
            }
        });
    });

    if (rows.length > 0) {
        const header = "FOLIO,NAME,ADDRESS,CITY\n";
        const csvRows = rows.map(r => {
            // Basic CSV escape logic: double quotes if needed
            const escape = (str) => {
                const s = str || "";
                if (s.includes(',') || s.includes('"') || s.includes('\n')) {
                    return `"${s.replace(/"/g, '""')}"`;
                }
                return s;
            };
            return `${escape(r["Folio / Demat Ac No."])},${escape(r["Name of Investor"])},${escape(r["Address"])},""`;
        });
        const csvContent = header + csvRows.join('\n');
        fs.writeFileSync(csvPath, csvContent);
        console.log(`Successfully generated CSV with ${rows.length} rows at ${csvPath}`);
    } else {
        console.log("No rows extracted.");
    }
});

console.log("Starting PDF parsing. This may take 30-60 seconds for large PDFs...");
pdfParser.loadPDF(pdfPath);
