import { NextResponse } from 'next/server';

export async function GET() {
  // Only return whether keys are configured, never the actual values
  return NextResponse.json({
    gemini: !!(process.env.GEMINI_API_KEY || '').trim(),
    openrouter: !!(process.env.OPENROUTER_API_KEY || '').trim(),
    tinyfish: !!(process.env.TINYFISH_API_KEY || '').trim(),
    serper: !!(process.env.SERPER_API_KEY || '').trim(),
  });
}
