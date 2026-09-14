import ExcelJS from 'exceljs';

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
  [key: string]: any;
}

export async function generateExcelBuffer(rows: ExtractedRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Contact Finder App';
  workbook.lastModifiedBy = 'Contact Finder App';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Dividend Records', {
    views: [{ showGridLines: true }]
  });

  worksheet.columns = [
    { header: 'Year', key: 'year', width: 10 },
    { header: 'Folio / Demat A/C', key: 'folio', width: 24 },
    { header: 'Investor Name', key: 'name', width: 30 },
    { header: 'First Name', key: 'firstName', width: 18 },
    { header: 'Middle Name', key: 'middleName', width: 18 },
    { header: 'Last Name', key: 'lastName', width: 18 },
    { header: 'Address', key: 'address', width: 50 },
    { header: 'City / District', key: 'city', width: 20 },
    { header: 'State', key: 'state', width: 20 },
    { header: 'Country', key: 'country', width: 14 },
    { header: 'PIN Code', key: 'pincode', width: 12 },
    { header: 'Investment Type', key: 'investmentType', width: 32 },
    { header: 'Amount Due (₹)', key: 'amount', width: 18 },
    { header: 'Proposed Date of Transfer', key: 'proposedDate', width: 22 },
  ];

  // Header Row Styling
  const headerRow = worksheet.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' } // Dark blue header fill
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      left: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'medium', color: { argb: 'FF1E293B' } },
      right: { style: 'thin', color: { argb: 'FF94A3B8' } }
    };
  });

  // Add Data Rows
  rows.forEach((row, idx) => {
    const numAmount = typeof row.amount === 'string' ? parseFloat(row.amount.replace(/,/g, '')) : row.amount;
    const addedRow = worksheet.addRow({
      year: row.year || '',
      folio: row.folio || '',
      name: row.name || '',
      firstName: row.firstName || '',
      middleName: row.middleName || '',
      lastName: row.lastName || '',
      address: row.address || '',
      city: row.city || '',
      state: row.state || '',
      country: row.country || '',
      pincode: row.pincode || '',
      investmentType: row.investmentType || '',
      amount: isNaN(numAmount as number) ? (row.amount || '') : numAmount,
      proposedDate: row.proposedDate || ''
    });

    addedRow.height = 22;

    // Alternating Row Fills
    const isEven = idx % 2 === 0;
    const rowBg = isEven ? 'FFFFFFFF' : 'FFF8FAFC';

    addedRow.eachCell((cell, colNumber) => {
      cell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF0F172A' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
      cell.alignment = { vertical: 'middle', wrapText: true };
      
      // Amount column formatting
      if (colNumber === 13 && typeof cell.value === 'number') {
        cell.numFmt = '₹#,##0.00';
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      }

      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
