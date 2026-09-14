import { NextResponse } from 'next/server';
import { generateExcelBuffer } from '@/lib/excel-export';

export async function POST(req: Request) {
  try {
    const { rows, filename } = await req.json();

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No data provided for export" }, { status: 400 });
    }

    const buffer = await generateExcelBuffer(rows);
    const downloadName = filename ? filename.replace(/\.pdf$/i, '') + '.xlsx' : 'extracted_dividend_data.xlsx';

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${downloadName}"`,
      },
    });
  } catch (error: any) {
    console.error("Excel Export Error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate Excel file" }, { status: 500 });
  }
}
