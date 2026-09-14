const fs = require('fs');
const pdfParse = require('pdf-parse');
const path = require('path');

const pdfPath = path.join(__dirname, '..', 'Unclaimed 2nd ID FY2024-25_Website.pdf');

let dataBuffer = fs.readFileSync(pdfPath);

pdfParse(dataBuffer).then(function(data) {
    const text = data.text;
    const lines = text.split('\n').slice(0, 100);
    console.log(lines.join('\n'));
});
