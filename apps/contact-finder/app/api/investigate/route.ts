import { NextResponse } from 'next/server';
import { InvestigationOrchestrator } from '@/lib/engine/InvestigationOrchestrator';
import { Subject } from '@/lib/engine/types';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { name, fatherName, address, city, company, notes } = body;

    if (!name || !address) {
      return NextResponse.json(
        { error: 'Name and address are required fields' },
        { status: 400 }
      );
    }

    const subject: Subject = {
      name: name.trim(),
      fatherName: fatherName?.trim() || undefined,
      address: address.trim(),
      city: city?.trim() || undefined,
      company: company?.trim() || undefined,
      notes: notes?.trim() || undefined,
    };

    const orchestrator = new InvestigationOrchestrator();
    const result = await orchestrator.investigate(subject);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Investigation error:', error.message);
    return NextResponse.json(
      { error: error.message || 'Investigation failed' },
      { status: 500 }
    );
  }
}
