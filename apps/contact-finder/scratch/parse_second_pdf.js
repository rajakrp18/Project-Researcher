const fs = require('fs');
const pdfParse = require('pdf-parse');
const path = require('path');

const pdfPath = path.join(__dirname, '..', 'Unclaimed 2nd ID FY2024-25_Website.pdf');
const csvPath = path.join(__dirname, '..', 'dataset_2nd_id.csv');

let dataBuffer = fs.readFileSync(pdfPath);

pdfParse(dataBuffer).then(function(data) {
    const lines = data.text.split('\n').map(l => l.trim()).filter(l => l);
    
    let isHeader = true;
    let records = [];
    let currentRecord = null;
    
    // CSV Header
    let csvContent = "FOLIO,NAME,ADDRESS,CITY\n";

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        
        // Skip headers
        if (line.includes('UNCLAIMED 2nd INTERIM') || line.includes('Sl NoDescription') || line.includes('Address')) {
            continue;
        }

        // Example line: "1  2ND INTERIM DIV 2024-250260360VAKIL AHMED2.50"
        // Sometimes it could be: "14  2ND INTERIM DIV 2024-251247889RAM BIKASH GANGULY240.00"
        
        // Let's use regex to match the pattern:
        // ^(\d+)\s+(2ND INTERIM DIV 2024-25)(\w{7})([a-zA-Z\s]+?)([\d\.]+)$
        // Wait, name might have special chars or be attached to amount.
        // Actually, amount is \d+\.\d{2} at the end.
        const match = line.match(/^(\d+)\s+(.*?2024-25)(\w+?)([A-Z\s\/\-\.&]+?)(\d+\.\d{2})$/);
        
        if (match) {
            let slNo = match[1];
            let desc = match[2];
            let folio = match[3]; // The regex might grab part of name if name has digits? Name shouldn't have digits.
            // Wait, folio is Demat Ac No, it could be 16 digits: "1208160100787884"
            // Let's match digits at the start of group 3:
            // "2024-25" is fixed. So right after 2024-25, there are digits (folio).
            
            // Better split logic:
            // 1. replace '2024-25' with '2024-25 '
            line = line.replace('2024-25', '2024-25 ');
            
            // Now line: "1  2ND INTERIM DIV 2024-25 0260360VAKIL AHMED2.50"
            // Find the space after 2024-25
            const afterDescIndex = line.indexOf('2024-25 ') + 8;
            const afterDesc = line.substring(afterDescIndex);
            
            // afterDesc: "0260360VAKIL AHMED2.50"
            // extract digits from start (Folio)
            const folioMatch = afterDesc.match(/^([A-Z0-9]+)/);
            // Wait, if name starts with A-Z, [A-Z0-9] will grab the name too!
            // Folio is strictly digits or Alphanumeric? Usually digits or starts with IN.
            // Let's just match digits: /^\d+/
            // If it starts with IN, like IN300118...
            const folioRegex = /^([a-zA-Z0-9]{7,16})/; // Folio is 7 to 16 chars. But if we do that, we might eat into Name.
        }
    }
});
