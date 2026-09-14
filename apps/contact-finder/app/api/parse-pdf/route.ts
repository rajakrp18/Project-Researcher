import { NextResponse } from 'next/server';
import pdfParse from 'pdf-parse';
// @ts-ignore
import PDFParser from 'pdf2json';
import { GoogleGenAI, Type } from '@google/genai';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract raw text for header classification
    const pdfData = await pdfParse(buffer);
    const text = pdfData.text || '';

    let parsedRows: any[] = [];

    // Document Format Markers
    const isSpatialTabular = text.includes('Inevstor') || text.includes('Investor') || (text.includes('Folio Number') && text.includes('Amount Transferred'));
    const isYearBlockIEPF = text.includes('Folio Number of  Securities') || (text.includes('PINCode') && text.includes('Investment Type'));
    const isTrentFormat = text.includes('FOLIO NO') && text.includes('NAM1') && text.includes('NETDVD');

    if (isSpatialTabular) {
      parsedRows = await tryParseSpatialCoordinateFormat(buffer);
    }

    if (parsedRows.length === 0 && isYearBlockIEPF) {
      parsedRows = await tryParseYearBlockFormat(buffer);
    }

    if (parsedRows.length === 0 && isTrentFormat) {
      parsedRows = await tryParseTrentDividendFormat(buffer);
    }

    // Fallbacks if classification markers were ambiguous
    if (parsedRows.length === 0) {
      parsedRows = await tryParseSpatialCoordinateFormat(buffer);
    }
    if (parsedRows.length === 0) {
      parsedRows = await tryParseYearBlockFormat(buffer);
    }
    if (parsedRows.length === 0) {
      parsedRows = await tryParseTrentDividendFormat(buffer);
    }

    // Fallback to Gemini AI if algorithmic parsing yielded 0 records
    if (parsedRows.length === 0 && process.env.GEMINI_API_KEY) {
      parsedRows = await tryParseWithGemini(buffer);
    }

    // Map output to BatchRow format expected by /bulk
    const batchRows = parsedRows.map((r, idx) => ({
      folio: r.folio || `FOLIO-${idx + 1}`,
      name: r.name || 'Unknown Name',
      address: r.address || '',
      city: r.city || r.state || '',
      status: "pending"
    }));

    return NextResponse.json({ rows: batchRows });

  } catch (error: any) {
    console.error("PDF Parsing Error in Batch Route:", error);
    return NextResponse.json({ error: error.message || "Failed to parse PDF" }, { status: 500 });
  }
}

/**
 * Strategy 1: IEPF Year-Block Parser
 */
async function tryParseYearBlockFormat(buffer: Buffer): Promise<any[]> {
  try {
    const pdfData = await pdfParse(buffer);
    const lines = pdfData.text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    const yearIndices: number[] = [];
    lines.forEach((line, idx) => {
      if (/^(19|20)\d\d$/.test(line)) {
        yearIndices.push(idx);
      }
    });

    if (yearIndices.length === 0) return [];

    const records: any[] = [];

    for (let i = 0; i < yearIndices.length; i++) {
      const startIdx = yearIndices[i];
      const endIdx = (i + 1 < yearIndices.length) ? yearIndices[i + 1] : lines.length;
      const block = lines.slice(startIdx, endIdx);

      if (block.length < 4) continue;

      const year = block[0];
      let folio = '';
      let pincode = '';
      let amount = '';
      let date = '';

      let pinFolioIdx = -1;

      block.forEach((l, bIdx) => {
        const pinFolioMatch = l.match(/(\d{6})\s+([A-Z0-9\/\-]+)/);
        if (pinFolioMatch && !folio) {
          pincode = pinFolioMatch[1];
          folio = pinFolioMatch[2];
          pinFolioIdx = bIdx;
        }

        const amtDateMatch = l.match(/([\d\.,]+)\s+(\d{2}-[A-Z]{3}-\d{4}|\d{2}\/\d{2}\/\d{4})/i);
        if (amtDateMatch && !amount) {
          amount = amtDateMatch[1];
          date = amtDateMatch[2];
        }
      });

      if (!folio) {
        block.forEach(l => {
          const standaloneFolio = l.match(/^([A-Z0-9]{8,25})$/);
          if (standaloneFolio && !folio) folio = standaloneFolio[1];
        });
      }

      if (folio && pinFolioIdx !== -1) {
        const firstName = block[1] || '';
        const isAddressKeyword = (str: string) => /\d|H\.NO|SEC-|FLAT|PLOT|ROAD|LANE|NAGAR|APPT|BUILDING|DIST|VILL|C\/O|W\/O|S\/O/i.test(str);
        
        let middleName = '';
        let lastName = '';
        let startAddrIdx = 4;

        if (isAddressKeyword(block[2] || '')) {
          middleName = '';
          lastName = '';
          startAddrIdx = 2;
        } else if (isAddressKeyword(block[3] || '')) {
          middleName = '';
          lastName = block[2] || '';
          startAddrIdx = 3;
        } else {
          middleName = block[2] || '';
          lastName = block[3] || '';
          startAddrIdx = 4;
        }

        const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ');

        const addressParts: string[] = [];
        for (let j = startAddrIdx; j < pinFolioIdx; j++) {
          addressParts.push(block[j]);
        }
        let fullAddress = addressParts.join(' ');
        if (pincode && !fullAddress.includes(pincode)) {
          fullAddress += ' - ' + pincode;
        }

        records.push({
          year,
          folio,
          name: fullName,
          firstName,
          middleName,
          lastName,
          address: fullAddress,
          city: '',
          pincode,
          investmentType: 'Amount for unclaimed and unpaid Dividend',
          amount,
          proposedDate: date
        });
      }
    }

    return records;
  } catch (err) {
    return [];
  }
}

/**
 * Strategy 2: Spatial Token Coordinate Parser
 */
function tryParseSpatialCoordinateFormat(buffer: Buffer): Promise<any[]> {
  return new Promise(resolve => {
    const pdfParser = new PDFParser();
    
    pdfParser.on("pdfParser_dataError", () => resolve([]));

    pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
      try {
        const records: any[] = [];

        pdfData.Pages.forEach((p: any) => {
          const items = p.Texts.map((t: any) => ({
            x: t.x,
            y: t.y,
            text: decodeURIComponent(t.R[0].T).trim()
          })).filter((t: any) => t.text.length > 0);

          const folioItems = items.filter((t: any) => 
            /^(HS\d+|[A-Z]{2,4}\d{6,16}|\d{16})$/i.test(t.text) || 
            (t.x >= 45 && t.x <= 50 && /^[A-Z0-9]{5,20}$/.test(t.text) && !t.text.includes('Folio'))
          );

          folioItems.forEach((fItem: any) => {
            const rowY = fItem.y;
            const rowTokens = items.filter((t: any) => Math.abs(t.y - rowY) <= 2.2);

            let firstName = '', middleName = '', lastName = '';
            let fhFirst = '', fhMiddle = '', fhLast = '';
            const addressParts: string[] = [];
            let country = '', state = '', district = '', pinCode = '';
            let folio = fItem.text;
            let investmentType = '';
            let amount = '';
            let proposedDate = '';

            rowTokens.sort((a: any, b: any) => a.x - b.x || a.y - b.y);

            rowTokens.forEach((t: any) => {
              if (t.x < 5.5) firstName += (firstName ? ' ' : '') + t.text;
              else if (t.x >= 5.5 && t.x < 8.5) middleName += (middleName ? ' ' : '') + t.text;
              else if (t.x >= 8.5 && t.x < 12.0) lastName += (lastName ? ' ' : '') + t.text;
              else if (t.x >= 12.0 && t.x < 15.5) fhFirst += (fhFirst ? ' ' : '') + t.text;
              else if (t.x >= 15.5 && t.x < 18.5) fhMiddle += (fhMiddle ? ' ' : '') + t.text;
              else if (t.x >= 18.5 && t.x < 22.0) fhLast += (fhLast ? ' ' : '') + t.text;
              else if (t.x >= 22.0 && t.x < 30.5) addressParts.push(t.text);
              else if (t.x >= 30.5 && t.x < 33.5) country += (country ? ' ' : '') + t.text;
              else if (t.x >= 33.5 && t.x < 38.0) state += (state ? ' ' : '') + t.text;
              else if (t.x >= 38.0 && t.x < 42.5) district += (district ? ' ' : '') + t.text;
              else if (t.x >= 42.5 && t.x < 46.0) pinCode += (pinCode ? ' ' : '') + t.text;
              else if (t.x >= 46.0 && t.x < 53.0) folio = t.text;
              else if (t.x >= 53.0 && t.x < 60.5) investmentType += (investmentType ? ' ' : '') + t.text;
              else if (t.x >= 60.5 && t.x < 64.5) amount += (amount ? ' ' : '') + t.text;
              else if (t.x >= 64.5) proposedDate += (proposedDate ? '' : '') + t.text;
            });

            const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ');
            let fullAddress = addressParts.join(' ');
            if (district) fullAddress += (fullAddress ? ', ' : '') + district;
            if (state) fullAddress += (fullAddress ? ', ' : '') + state;
            if (country) fullAddress += (fullAddress ? ', ' : '') + country;
            if (pinCode) fullAddress += ' - ' + pinCode;

            if (folio) {
              records.push({
                folio,
                name: fullName,
                firstName,
                middleName,
                lastName,
                address: fullAddress,
                city: district || state,
                state,
                country,
                pincode: pinCode,
                investmentType: investmentType || 'Unpaid / Unclaimed Dividend',
                amount,
                proposedDate
              });
            }
          });
        });

        resolve(records);
      } catch (err) {
        resolve([]);
      }
    });

    pdfParser.parseBuffer(buffer);
  });
}

/**
 * Strategy 3: Trent Dividend Format Parser
 */
function tryParseTrentDividendFormat(buffer: Buffer): Promise<any[]> {
  return new Promise(resolve => {
    const pdfParser = new PDFParser();
    pdfParser.on("pdfParser_dataError", () => resolve([]));
    pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
      try {
        const parsedRows: any[] = [];
        pdfData.Pages.forEach((page: any) => {
          const textElements = page.Texts;
          const yGroups: Record<string, any[]> = {};

          textElements.forEach((t: any) => {
            const decodedText = decodeURIComponent(t.R[0].T).trim();
            if (!decodedText) return;

            const foundY = Object.keys(yGroups).find(y => Math.abs(parseFloat(y) - t.y) < 0.5);
            const matchedY = foundY !== undefined ? foundY : t.y.toString();

            if (!yGroups[matchedY]) yGroups[matchedY] = [];
            yGroups[matchedY].push({ x: t.x, text: decodedText, w: t.w || 0 });
          });

          const sortedY = Object.keys(yGroups).sort((a, b) => parseFloat(a) - parseFloat(b));
          let currentRow: any = null;

          sortedY.forEach(y => {
            const rowItems = yGroups[y].sort((a: any, b: any) => a.x - b.x);
            const fullLineText = rowItems.map(r => r.text).join(" ");
            if (fullLineText.includes('TRENT LIMITED') || fullLineText.includes('FOLIO NO') || fullLineText.includes('==Start')) return;

            const firstItem = rowItems[0];
            const isNewRecord = firstItem && /^([A-Z]\d{7}|\d{16})$/.test(firstItem.text.replace(/ /g, ''));

            if (isNewRecord) {
              if (currentRow && currentRow.folio) parsedRows.push(currentRow);
              currentRow = { 
                folio: firstItem.text.replace(/ /g, ''), 
                name: "", 
                address: "", 
                city: "",
                investmentType: "Unclaimed Dividend"
              };

              let currentColumn = "name";
              let lastXEnd = firstItem.x + firstItem.w;

              for (let i = 1; i < rowItems.length; i++) {
                const item = rowItems[i];
                const gap = item.x - lastXEnd;
                if (gap > 4 && currentColumn === "name") currentColumn = "address";

                if (currentColumn === "name") {
                  currentRow.name += (currentRow.name ? " " : "") + item.text;
                } else {
                  currentRow.address += (currentRow.address ? " " : "") + item.text;
                }
                lastXEnd = item.x + item.w;
              }
            } else if (currentRow) {
              currentRow.address += " " + fullLineText;
            }
          });

          if (currentRow && currentRow.folio) parsedRows.push(currentRow);
        });

        resolve(parsedRows);
      } catch (err) {
        resolve([]);
      }
    });

    pdfParser.parseBuffer(buffer);
  });
}

/**
 * Strategy 4: Fallback with Gemini AI
 */
async function tryParseWithGemini(buffer: Buffer): Promise<any[]> {
  try {
    const pdfData = await pdfParse(buffer);
    const textSnippet = pdfData.text.substring(0, 15000);

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `Extract tabular dividend/investor data from the following text into JSON array of records. Each record should contain:
- folio (Folio Number / Demat AC)
- name (Full Investor Name ONLY - DO NOT include house address or street numbers in name)
- address (Full Address)
- city (City or District)
- state (State)
- country (Country)
- pincode (PIN Code)
- amount (Amount Due/Transferred)

Text Content:
${textSnippet}`,
      config: {
        temperature: 0.1,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              folio: { type: Type.STRING },
              name: { type: Type.STRING },
              address: { type: Type.STRING },
              city: { type: Type.STRING, nullable: true },
              state: { type: Type.STRING, nullable: true },
              country: { type: Type.STRING, nullable: true },
              pincode: { type: Type.STRING, nullable: true },
              amount: { type: Type.STRING, nullable: true },
            }
          }
        }
      }
    });

    const parsed = JSON.parse(response.text || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}
