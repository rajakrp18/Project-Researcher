const fs = require('fs');
const PDFParser = require('pdf2json');
const path = require('path');

const pdfPath = path.join(__dirname, '..', 'Statement_of_unclaimed_amount_for_dividend_declared_as_on_22.07.2021.pdf');

const pdfParser = new PDFParser();
pdfParser.on("pdfParser_dataReady", (pdfData) => {
    const parsedRows = [];
    pdfData.Pages.forEach((page) => {
        const textElements = page.Texts;
        const pageText = textElements.map((t) => decodeURIComponent(t.R[0].T).trim()).join(" ");
        const isDividendPreset = pageText.includes("FOLIO NO") && pageText.includes("NAM1") && pageText.includes("Add1") && pageText.includes("NETDVD");

        if (isDividendPreset) {
            const folioYs = [];
            textElements.forEach((t) => {
                const decodedText = decodeURIComponent(t.R[0].T).trim().replace(/ /g, '');
                if (t.x < 3.5 && /^([A-Z]\d{7}|\d{16})$/.test(decodedText)) {
                    folioYs.push(t.y);
                }
            });
            folioYs.sort((a, b) => a - b);
            
            const recordsMap = new Map();
            folioYs.forEach(y => recordsMap.set(y, []));

            textElements.forEach((t) => {
                const decodedText = decodeURIComponent(t.R[0].T).trim();
                if (!decodedText || decodedText.includes('TRENT LIMITED') || decodedText.includes('FOLIO NO') || decodedText.includes('NETDVD') || decodedText.includes('NAM1')) return;

                const targetY = folioYs.find(fy => fy >= t.y - 0.25);
                if (targetY) {
                    recordsMap.get(targetY).push({ x: t.x, y: t.y, text: decodedText });
                }
            });

            Array.from(recordsMap.entries()).forEach(([y, items]) => {
                items.sort((a, b) => a.y - b.y || a.x - b.x);
                let folio = "";
                let name = "";
                let address = "";
                let city = "";
                
                items.forEach((item) => {
                    const text = item.text;
                    if (item.x < 3.5) {
                        if (/^([A-Z]\d{7}|\d{16})$/.test(text.replace(/ /g, ''))) folio = text.replace(/ /g, '');
                    } else if (item.x >= 3.5 && item.x < 9.0) {
                        name += (name ? " " : "") + text;
                    } else if (item.x >= 9.0 && item.x < 26.0) {
                        address += (address ? " " : "") + text;
                    } else if (item.x >= 26.0 && item.x < 31.5) {
                        if (text !== "0") {
                            city += (city ? " " : "") + text;
                        }
                    }
                });

                if (folio) {
                    parsedRows.push({ folio, name, address, city });
                }
            });
        }
    });

    console.log("Extracted Rows (first 10):");
    console.log(parsedRows.slice(0, 10));
});

pdfParser.loadPDF(pdfPath);
