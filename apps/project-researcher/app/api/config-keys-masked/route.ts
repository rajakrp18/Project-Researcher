import { NextResponse } from 'next/server';

const mask = (key: string | undefined) => {
  if (!key || key.trim() === '') return null;
  const k = key.trim();
  if (k.length <= 8) return k.slice(0, 4) + '...';
  return k.slice(0, 10) + '...' + k.slice(-4);
};

export async function GET() {
  return NextResponse.json({
    gemini: mask(process.env.GEMINI_API_KEY),
    openrouter: mask(process.env.OPENROUTER_API_KEY),
    tinyfish: mask(process.env.TINYFISH_API_KEY),
    serper: mask(process.env.SERPER_API_KEY),
  });
}
