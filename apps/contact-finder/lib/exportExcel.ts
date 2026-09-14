import ExcelJS from 'exceljs';
import { isDummyOrSpamPhone } from './engine/extractors/PhoneExtractor';

export interface BatchRowCandidate {
  phone: string;
  owner?: string;
  confidence: number;
  sourceUrl?: string;
  relationship?: string;
}

export interface BatchRowData {
  folio: string;
  name: string;
  address: string;
  city: string;
  status: "pending" | "processing" | "success" | "error";
  candidates?: BatchRowCandidate[];
  company?: string;
  error?: string;
}

export function getCleanSourceLabel(urlStr?: string): string {
  if (!urlStr) return '-';
  try {
    const url = new URL(urlStr);
    const host = url.hostname.toLowerCase();

    if (host.includes('zaubacorp.com')) return 'ZaubaCorp (Company Registry)';
    if (host.includes('scribd.com')) return 'Scribd Legal Records';
    if (host.includes('indiamart.com')) return 'IndiaMart B2B Directory';
    if (host.includes('tradeindia.com')) return 'TradeIndia Directory';
    if (host.includes('justdial.com')) return 'JustDial Local Directory';
    if (host.includes('marketscreener.com')) return 'MarketScreener Financials';
    if (host.includes('quickcompany.in') || host.includes('thecompanycheck.com')) return 'Corporate Registry';
    if (host.includes('gov.in') || host.includes('nic.in') || host.includes('mca.gov.in') || host.includes('iepf.gov.in')) return 'Govt Portal (MCA/IEPF/Tax)';
    if (host.includes('pdfcoffee.com')) return 'PDF Document Archive';
    if (host.includes('locatefamily.com')) return 'LocateFamily Directory';

    // Default clean hostname
    const cleanHost = host.replace(/^www\./, '');
    return cleanHost.charAt(0).toUpperCase() + cleanHost.slice(1);
  } catch {
    return 'Web Source';
  }
}

export function getOwnerTag(candidate: BatchRowCandidate, subjectName: string): string {
  if (!candidate.owner || candidate.owner === 'Unknown') return '';

  const ownerUpper = candidate.owner.toUpperCase().trim();
  const subjectUpper = subjectName.toUpperCase().trim();

  // Check relationship tag
  let relTag = candidate.relationship || '';
  if (relTag === 'self' || ownerUpper === subjectUpper || subjectUpper.includes(ownerUpper)) {
    relTag = 'Self';
  } else if (relTag === 'father') {
    relTag = 'Father';
  } else if (relTag === 'spouse') {
    relTag = 'Spouse';
  } else if (relTag === 'broker') {
    relTag = 'Broker/Agent';
  } else if (relTag === 'rwa_official') {
    relTag = 'RWA Official';
  } else if (relTag === 'proxy' || relTag === 'unknown_person') {
    relTag = 'Proxy Contact';
  } else {
    relTag = 'Associated Contact';
  }

  return `${candidate.owner} [${relTag}]`;
}

export async function exportToExcel(
  rows: BatchRowData[],
  options: { filename?: string; minConfidence?: number } = {}
) {
  const { filename = 'investigation_results.xlsx', minConfidence = 25 } = options;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Contact Finder Batch Engine';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Refined Investigation Results', {
    views: [{ showGridLines: true }]
  });

  // Define columns
  worksheet.columns = [
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Folio', key: 'folio', width: 16 },
    { header: 'Name', key: 'name', width: 32 },
    { header: 'Address', key: 'address', width: 50 },
    { header: 'Phone Found (Refined)', key: 'phone', width: 42 },
    { header: 'Confidence', key: 'confidence', width: 15 },
    { header: 'Source Domain', key: 'source', width: 38 },
  ];

  // Format Header Row
  const headerRow = worksheet.getRow(1);
  headerRow.height = 32;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F172A' } // Deep slate navy
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF020617' } },
      left: { style: 'thin', color: { argb: 'FF020617' } },
      bottom: { style: 'medium', color: { argb: 'FF020617' } },
      right: { style: 'thin', color: { argb: 'FF020617' } }
    };
  });

  // Populate Rows
  rows.forEach((r, idx) => {
    // Filter candidates: Eliminate dummy/spam phones & candidates under minConfidence
    let rawCandidates = r.candidates || [];
    let candidates = rawCandidates.filter(c => {
      if (!c.phone || c.phone === 'Not Found') return false;
      if (isDummyOrSpamPhone(c.phone, c.sourceUrl)) return false;
      if (c.confidence < minConfidence) return false;
      return true;
    });

    // If filtering eliminated all numbers, but raw candidates had high confidence numbers, fall back to non-dummy ones
    if (candidates.length === 0 && rawCandidates.length > 0) {
      candidates = rawCandidates.filter(c => c.phone && c.phone !== 'Not Found' && !isDummyOrSpamPhone(c.phone, c.sourceUrl));
    }

    const hasMatches = candidates.length > 0;

    let statusText = 'Pending';
    if (r.status === 'success') {
      statusText = hasMatches ? 'Matched' : 'No Match';
    } else if (r.status === 'error') {
      statusText = 'Error';
    }

    const phoneTexts: string[] = [];
    const confidenceTexts: string[] = [];
    const sourceTexts: string[] = [];

    if (hasMatches) {
      candidates.forEach(c => {
        const ownerTag = getOwnerTag(c, r.name);
        const hasOwner = Boolean(ownerTag);
        
        const phoneVal = hasOwner ? `${c.phone}\n(${ownerTag})` : c.phone;
        const confVal = hasOwner ? `${c.confidence}%\n ` : `${c.confidence}%`;
        
        const cleanLabel = getCleanSourceLabel(c.sourceUrl);
        const sourceVal = hasOwner ? `${cleanLabel}\n ` : cleanLabel;

        phoneTexts.push(phoneVal);
        confidenceTexts.push(confVal);
        sourceTexts.push(sourceVal);
      });
    } else {
      phoneTexts.push('Not Found');
      confidenceTexts.push('-');
      sourceTexts.push('-');
    }

    const row = worksheet.addRow({
      status: statusText,
      folio: r.folio || '',
      name: r.name || '',
      address: r.address || '',
      phone: phoneTexts.join('\n\n'),
      confidence: confidenceTexts.join('\n\n'),
      source: sourceTexts.join('\n\n')
    });

    // Row styling
    row.alignment = { vertical: 'top', wrapText: true };
    row.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF1E293B' } };

    // Status badge styling
    const statusCell = row.getCell('status');
    statusCell.alignment = { vertical: 'top', horizontal: 'center', wrapText: true };
    if (statusText === 'Matched') {
      statusCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF166534' } };
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
    } else if (statusText === 'No Match') {
      statusCell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF991B1B' } };
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
    }

    const folioCell = row.getCell('folio');
    folioCell.font = { name: 'Consolas', size: 10, color: { argb: 'FF2563EB' } };

    const confCell = row.getCell('confidence');
    confCell.alignment = { vertical: 'top', horizontal: 'center', wrapText: true };

    // Hyperlink Source Cell
    const sourceCell = row.getCell('source');
    if (hasMatches && candidates[0]?.sourceUrl) {
      // Add hyperlink to first candidate source if available
      sourceCell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF2563EB' }, underline: true };
    }

    // Zebra striping
    const isEven = idx % 2 === 0;
    const bgRowColor = isEven ? 'FFFFFFFF' : 'FFF8FAFC';

    row.eachCell((cell, colNumber) => {
      if (colNumber !== 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgRowColor } };
      }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
    });
  });

  // Write & Download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.URL.revokeObjectURL(url);
}
