import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    let body: any = {};
    try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }); }

    const { query, customGeminiKey, customOpenrouterKey } = body;
    if (!query || typeof query !== 'string') return NextResponse.json({ error: 'Query is required' }, { status: 400 });

    const geminiKey = (String(customGeminiKey || process.env.GEMINI_API_KEY || '')).trim();
    const openrouterKey = (String(customOpenrouterKey || process.env.OPENROUTER_API_KEY || '')).trim();

    if (!geminiKey && !openrouterKey) {
      return NextResponse.json({ error: 'No API key configured. Please add a Gemini or OpenRouter key in Settings.' }, { status: 500 });
    }

    // 1. Fetch GitHub + Reddit links (best-effort, non-fatal)
    let ghData: any = null;
    let redditData: any = null;
    try {
      [ghData, redditData] = await Promise.all([
        fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=3`, {
          headers: { 'User-Agent': 'Project-Researcher-App' }
        }).then(r => r.json()).catch(() => null),
        fetch(`https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&limit=2`, {
          headers: { 'User-Agent': 'Project-Researcher-App/1.0' }
        }).then(r => r.json()).catch(() => null)
      ]);
    } catch { /* non-fatal */ }

    let similarProjectsText = "No similar projects found.";
    if (ghData?.items?.length > 0) {
      similarProjectsText = ghData.items
        .map((item: any) => `- ${item.full_name}: ${String(item.description || 'No description')}`)
        .join('\n');
    }

    // 2. Prompt
    const prompt = `You are an expert technical researcher and project planner.
The user is searching for project ideas related to: "${query}".

Here are some real-world open source projects matching this query:
${similarProjectsText}

Generate a detailed project plan for a high-quality project that matches this query. 
CRITICAL: You must be extremely concise to fit within a strict 2000 token limit. Keep the PRD, TRD, and devPrompt sections highly condensed.
If your generated project is heavily inspired by or based on a real, existing open-source repository or project, provide its source platform (e.g., "github", "linkedin", "reddit"), the exact name/path (e.g., "alokkitchloo/pulse-crm-ai"), and its URL.

Respond ONLY in valid JSON format with the following exact structure:
{
  "projectName": "Catchy and relevant project name",
  "details": "A 2-3 sentence summary of the project.",
  "source": { "platform": "github", "name": "owner/repo", "url": "https://github.com/owner/repo" },
  "prd": "# Product Requirements Document\\n\\n...",
  "trd": "# Technical Requirements Document\\n\\n...",
  "flow": "# Architecture & Flow\\n\\n...",
  "fileStructure": "# File Structure\\n\\n...",
  "analysis": "A brief analysis of the real-world projects provided above.",
  "devPrompt": "A highly condensed system prompt that a developer can copy-paste into an AI coding assistant to build this entire project."
}

Note: Set "source": null if this is a completely original concept.`;

    // 3. Call LLM via plain fetch (avoids SDK WASM crash on Windows)
    let resultText = '';

    const callGeminiRest = async (): Promise<string> => {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.7-flash:generateContent?key=${geminiKey}`;
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, responseMimeType: 'application/json' }
        })
      });
      const data = await r.json();
      if (data.error) throw new Error(String(data.error.message || 'Gemini API Error'));
      return String(data.candidates?.[0]?.content?.parts?.[0]?.text || '');
    };

    const callOpenRouter = async (): Promise<string> => {
      if (!openrouterKey) throw new Error('No OpenRouter key available');
      const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${openrouterKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'google/gemini-3.7-flash',
          response_format: { type: 'json_object' },
          messages: [{ role: 'user', content: prompt }]
        })
      });
      const data = await r.json();
      if (data.error) throw new Error(String(data.error.message || 'OpenRouter API Error'));
      return String(data.choices?.[0]?.message?.content || '');
    };

    if (geminiKey) {
      try {
        resultText = await callGeminiRest();
      } catch (geminiErr: any) {
        const geminiMsg = String(geminiErr?.message || 'Gemini failed');
        console.log('Gemini failed:', geminiMsg, '— trying OpenRouter...');
        if (!openrouterKey) {
          return NextResponse.json({ error: `Gemini API error: ${geminiMsg}` }, { status: 500 });
        }
        try {
          resultText = await callOpenRouter();
        } catch (orErr: any) {
          return NextResponse.json({ error: `Both APIs failed. Gemini: ${geminiMsg}. OpenRouter: ${String(orErr?.message || 'unknown')}` }, { status: 500 });
        }
      }
    } else {
      try {
        resultText = await callOpenRouter();
      } catch (orErr: any) {
        return NextResponse.json({ error: `OpenRouter error: ${String(orErr?.message || 'unknown')}` }, { status: 500 });
      }
    }

    // 4. Parse JSON from LLM output
    let parsedResult: any;
    try {
      let clean = resultText.trim();
      if (clean.startsWith('```json')) clean = clean.slice(7);
      else if (clean.startsWith('```')) clean = clean.slice(3);
      if (clean.endsWith('```')) clean = clean.slice(0, -3);
      parsedResult = JSON.parse(clean.trim());
    } catch {
      console.log('--- INVALID JSON RECEIVED ---');
      console.log(resultText);
      console.log('-----------------------------');
      return NextResponse.json({ error: 'AI returned invalid JSON. Please try again.' }, { status: 500 });
    }

    // 5. Attach real links
    parsedResult.links = [];
    if (ghData?.items) {
      for (const item of ghData.items) {
        parsedResult.links.push({ type: 'github', title: String(item.full_name), url: String(item.html_url) });
      }
    }
    if (redditData?.data?.children) {
      for (const post of redditData.data.children) {
        parsedResult.links.push({
          type: 'reddit',
          title: String(post.data.title || '').substring(0, 50) + '...',
          url: `https://reddit.com${post.data.permalink}`
        });
      }
    }

    return NextResponse.json(parsedResult);

  } catch (topErr: any) {
    const msg = String(topErr?.message || topErr || 'Unknown server error');
    console.log('Unhandled route error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
