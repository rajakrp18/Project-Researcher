import { NextResponse } from 'next/server';
import { InvestigationOrchestrator } from '@/lib/engine/InvestigationOrchestrator';
import { Subject, BatchResult } from '@/lib/engine/types';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.subjects || !Array.isArray(body.subjects) || body.subjects.length === 0) {
      return NextResponse.json(
        { error: 'subjects array is required and must not be empty' },
        { status: 400 }
      );
    }

    if (body.subjects.length > 20) {
      return NextResponse.json(
        { error: 'Maximum 20 subjects per batch' },
        { status: 400 }
      );
    }

    const subjects: Subject[] = body.subjects.map((s: any) => ({
      name: s.name?.trim(),
      fatherName: s.fatherName?.trim() || undefined,
      address: s.address?.trim(),
      city: s.city?.trim() || undefined,
      company: s.company?.trim() || undefined,
      notes: s.notes?.trim() || undefined,
    }));

    const invalid = subjects.find(s => !s.name || !s.address);
    if (invalid) {
      return NextResponse.json(
        { error: `Each subject must have name and address. Missing for: ${invalid.name || 'unnamed'}` },
        { status: 400 }
      );
    }

    const orchestrator = new InvestigationOrchestrator();
    const results = [];

    for (const subject of subjects) {
      const result = await orchestrator.investigate(subject);
      results.push(result);
    }

    const phonesFound = results.reduce((sum, r) => sum + r.phones.length, 0);
    const avgConfidence = results.reduce((sum, r) => {
      const topPhone = r.phones[0];
      return sum + (topPhone?.confidence || 0);
    }, 0) / results.length;

    const batchResult: BatchResult = {
      results,
      summary: {
        totalCases: results.length,
        phonesFound,
        avgConfidence: Math.round(avgConfidence * 10) / 10,
        avgDurationMs: Math.round(results.reduce((s, r) => s + r.durationMs, 0) / results.length),
        avgQueriesUsed: Math.round(results.reduce((s, r) => s + r.queriesUsed, 0) / results.length * 10) / 10,
      },
    };

    return NextResponse.json(batchResult);
  } catch (error: any) {
    console.error('Batch investigation error:', error.message);
    return NextResponse.json(
      { error: error.message || 'Batch investigation failed' },
      { status: 500 }
    );
  }
}
