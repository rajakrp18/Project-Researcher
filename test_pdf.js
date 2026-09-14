const fs = require('fs');
const pdf = require('pdf-parse');

async function test() {
  const dataBuffer = fs.readFileSync('./apps/contact-finder/Statement_of_unclaimed_amount_for_dividend_declared_as_on_22.07.2021.pdf');
  const data = await pdf(dataBuffer);
  const text = data.text;
  console.log("FIRST 500 CHARACTERS:");
  console.log(text.slice(0, 500));
  
  const lines = text.split(/\r?\n/);
  console.log(`Total lines: ${lines.length}`);
  
  let matches = 0;
  for (const line of lines.slice(0, 100)) {
    if (/^([A-Z]\d{7}|\d{16})\s/.test(line.trim())) {
      matches++;
      console.log("MATCH:", line.trim());
    }
  }
  console.log(`Found ${matches} matches in first 100 lines.`);
}

test();
