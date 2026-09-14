const fs = require('fs');
const PDFParser = require('pdf2json');
const path = require('path');

const pdfParser = new PDFParser();
const pdfPath = path.join(__dirname, '..', 'Unclaimed 2nd ID FY2024-25_Website.pdf');

pdfParser.on("pdfParser_dataError", errData => console.error(errData.parserError) );
pdfParser.on("pdfParser_dataReady", pdfData => {
    const firstPage = pdfData.Pages[0];
    const textElements = firstPage.Texts;
    
    const yGroups = {};
    textElements.forEach(t => {
        const decodedText = decodeURIComponent(t.R[0].T).trim();
        if (!decodedText) return;

        let matchedY = Object.keys(yGroups).find(y => Math.abs(parseFloat(y) - t.y) < 0.05);
        if (!matchedY) matchedY = t.y.toString();

        if (!yGroups[matchedY]) yGroups[matchedY] = [];
        yGroups[matchedY].push({
            x: t.x,
            text: decodedText,
            w: t.w || 0
        });
    });

    const sortedY = Object.keys(yGroups).sort((a, b) => parseFloat(a) - parseFloat(b));
    for (let i = 0; i < Math.min(20, sortedY.length); i++) {
        const y = sortedY[i];
        const rowItems = yGroups[y].sort((a, b) => a.x - b.x);
        console.log(`Y: ${parseFloat(y).toFixed(2)} | Items: ${JSON.stringify(rowItems)}`);
    }

    console.log("HLines:", firstPage.HLines ? firstPage.HLines.length : 0);
    console.log("VLines:", firstPage.VLines ? firstPage.VLines.length : 0);
    console.log("Fills:", firstPage.Fills ? firstPage.Fills.length : 0);
});

pdfParser.loadPDF(pdfPath);
