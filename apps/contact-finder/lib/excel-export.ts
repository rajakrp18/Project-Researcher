import ExcelJS from 'exceljs';
import { isDummyOrSpamPhone } from './engine/extractors/PhoneExtractor';

export interface ExtractedRow {
  year?: string;
  folio?: string;
  name?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  investmentType?: string;
  amount?: string | number;
  proposedDate?: string;
  status?: string;
  candidates?: Array<{
    phone: string;
    owner?: string;
    confidence: number;
    sourceUrl?: string;
    relationship?: string;
    category?: 'A' | 'B' | 'C' | 'D' | 'Rejected';
    reason?: string;
  }>;
  notes?: string;
  [key: string]: any;
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
    if (host.includes('quickcompany.in') || host.includes('thecompanycheck.com')) return 'Corporate Registry';
    if (host.includes('gov.in') || host.includes('nic.in') || host.includes('mca.gov.in') || host.includes('iepf.gov.in')) return 'Govt Portal (MCA/IEPF/Tax)';
    if (host.includes('locatefamily.com')) return 'LocateFamily Directory';

    const cleanHost = host.replace(/^www\./, '');
    return cleanHost.charAt(0).toUpperCase() + cleanHost.slice(1);
  } catch {
    return 'Web Source';
  }
}

export async function generateExcelBuffer(rows: ExtractedRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Contact Finder Engine v2.0';
  workbook.created = new Date();

  // Create 4 sheets
  const callSheet = workbook.addWorksheet('Daily Call Sheet (A-C)', { views: [{ showGridLines: true }] });
  const reviewSheet = workbook.addWorksheet('Manual Review (Cat D)', { views: [{ showGridLines: true }] });
  const unresolvedSheet = workbook.addWorksheet('Unresolved Cases', { views: [{ showGridLines: true }] });
  const rejectedSheet = workbook.addWorksheet('Rejected Candidates', { views: [{ showGridLines: true }] });

  const columns = [
    { header: 'Status / Category', key: 'status', width: 18 },
    { header: 'Folio', key: 'folio', width: 22 },
    { header: 'Shareholder Name', key: 'name', width: 32 },
    { header: 'Registered Address', key: 'address', width: 50 },
    { header: 'Verified Phone Leads', key: 'phone', width: 40 },
    { header: 'Confidence / Score', key: 'confidence', width: 18 },
    { header: 'Evidence Source', key: 'source', width: 38 },
  ];

  [callSheet, reviewSheet, unresolvedSheet, rejectedSheet].forEach(sheet => {
    sheet.columns = columns;
    const headerRow = sheet.getRow(1);
    headerRow.height = 30;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF020617' } },
        left: { style: 'thin', color: { argb: 'FF020617' } },
        bottom: { style: 'medium', color: { argb: 'FF020617' } },
        right: { style: 'thin', color: { argb: 'FF020617' } }
      };
    });
  });

  rows.forEach((r, idx) => {
    const rawCandidates = r.candidates || [];
    const validCandidates = rawCandidates.filter(c => {
      if (!c.phone || c.phone === 'Not Found') return false;
      if (isDummyOrSpamPhone(c.phone, c.sourceUrl)) return false;
      return true;
    });

    const callLeads = validCandidates.filter(c => c.category === 'A' || c.category === 'B' || c.category === 'C').slice(0, 3);
    const reviewLeads = validCandidates.filter(c => c.category === 'D');
    const rejectedLeads = validCandidates.filter(c => c.category === 'Rejected');

    // Sheet 1: Daily Call Sheet (A-C)
    if (callLeads.length > 0) {
      const phoneTexts = callLeads.map(c => c.owner ? `${c.phone}\n(${c.owner})` : c.phone);
      const confTexts = callLeads.map(c => `[Cat ${c.category || 'A'}] ${c.confidence}%`);
      const srcTexts = callLeads.map(c => getCleanSourceLabel(c.sourceUrl));

      const row = callSheet.addRow({
        status: `Matched [${callLeads[0].category}]`,
        folio: r.folio || '',
        name: r.name || '',
        address: r.address || '',
        phone: phoneTexts.join('\n\n'),
        confidence: confTexts.join('\n\n'),
        source: srcTexts.join('\n\n')
      });
      styleRow(row, idx, 'MATCHED');
    }

    // Sheet 2: Manual Review (Cat D)
    if (reviewLeads.length > 0) {
      const phoneTexts = reviewLeads.map(c => c.phone);
      const confTexts = reviewLeads.map(c => `[Cat D] ${c.confidence}%`);
      const srcTexts = reviewLeads.map(c => `${getCleanSourceLabel(c.sourceUrl)} (${c.reason || 'Needs Manual Review'})`);

      const row = reviewSheet.addRow({
        status: 'Needs Review',
        folio: r.folio || '',
        name: r.name || '',
        address: r.address || '',
        phone: phoneTexts.join('\n\n'),
        confidence: confTexts.join('\n\n'),
        source: srcTexts.join('\n\n')
      });
      styleRow(row, idx, 'REVIEW');
    }

    // Sheet 3: Unresolved Cases
    if (callLeads.length === 0 && reviewLeads.length === 0) {
      const isOut = r.status === 'out_of_scope' || r.notes === 'OUT_OF_SCOPE_FOREIGN_ADDRESS';
      const row = unresolvedSheet.addRow({
        status: isOut ? 'Out of Scope (Foreign)' : 'Unresolved',
        folio: r.folio || '',
        name: r.name || '',
        address: r.address || '',
        phone: 'No Qualified Lead',
        confidence: '-',
        source: '-'
      });
      styleRow(row, idx, 'UNRESOLVED');
    }

    // Sheet 4: Rejected Candidates
    if (rejectedLeads.length > 0) {
      rejectedLeads.forEach(c => {
        const row = rejectedSheet.addRow({
          status: 'Rejected',
          folio: r.folio || '',
          name: r.name || '',
          address: r.address || '',
          phone: c.phone,
          confidence: `${c.confidence}%`,
          source: `${getCleanSourceLabel(c.sourceUrl)} — Reason: ${c.reason || 'No Anchor'}`
        });
        styleRow(row, idx, 'REJECTED');
      });
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function styleRow(row: ExcelJS.Row, idx: number, type: 'MATCHED' | 'REVIEW' | 'UNRESOLVED' | 'REJECTED') {
  row.alignment = { vertical: 'top', wrapText: true };
  row.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF1E293B' } };

  const statusCell = row.getCell('status');
  statusCell.alignment = { vertical: 'top', horizontal: 'center', wrapText: true };

  if (type === 'MATCHED') {
    statusCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF166534' } };
    statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
  } else if (type === 'REVIEW') {
    statusCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF92400E' } };
    statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEEBC8' } };
  } else {
    statusCell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF991B1B' } };
    statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
  }

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
}
