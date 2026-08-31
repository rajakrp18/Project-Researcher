import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key is not configured' }, { status: 500 });
    }

    // 1. Fetch Real Links from GitHub and Reddit in parallel
    const ghRes = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=3`, { headers: { 'User-Agent': 'Project-Researcher-App' } }).catch(() => null);
    const ghData = ghRes ? await ghRes.json().catch(() => null) : null;
      
    const redditRes = await fetch(`https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&limit=2`, { headers: { 'User-Agent': 'Project-Researcher-App' } }).catch(() => null);
    const redditData = redditRes ? await redditRes.json().catch(() => null) : null;

    let similarProjectsText = "No similar projects found.";
    if (ghData && ghData.items && ghData.items.length > 0) {
      similarProjectsText = ghData.items.map((item: any) => `- ${item.full_name}: ${item.description}`).join("\\n");
    }

    // 2. Fetch LLM Data
    const prompt = `
      You are an expert technical researcher and project planner. 
      The user is searching for project ideas related to: "${query}".
      
      Here are some real-world open source projects matching this query:
      ${similarProjectsText}

      Generate a detailed project plan for a high-quality project that matches this query. 
      If your generated project is heavily inspired by or based on a real, existing open-source repository or project, provide its source platform (e.g., "github", "linkedin", "reddit"), the exact name/path (e.g., "alokkitchloo/pulse-crm-ai"), and its URL.

      Respond ONLY in valid JSON format with the following exact structure:
      {
        "projectName": "Catchy and relevant project name",
        "details": "A 2-3 sentence summary of the project.",
        "source": {
          "platform": "github",
          "name": "owner/repo",
          "url": "https://github.com/owner/repo"
        },
        "prd": "# Product Requirements Document\\n\\n...",
        "trd": "# Technical Requirements Document\\n\\n...",
        "flow": "# Architecture & Flow\\n\\n...",
        "fileStructure": "# File Structure\\n\\n...",
        "analysis": "A detailed analysis of the real-world projects provided above, comparing them and suggesting which one is the absolute best reference for the user's specific goal.",
        "devPrompt": "A massive, comprehensive system prompt that a developer can copy-paste into an AI coding assistant (like Cursor or Claude) to build this entire project. It must analyze the PRD, TRD, and Flow to synthesize the ultimate master prompt, including suggested UI/UX design aesthetics, system architecture decisions, and the best tech stack."
      }
      
      Note: The "source" field is optional. If it is a completely original concept not based on a specific repo, you can set "source": null.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          temperature: 0.2,
          responseMimeType: 'application/json'
        }
    });

    const resultText = response.text || '';
    
    let cleanJson = resultText.trim();
    if (cleanJson.startsWith('```json')) cleanJson = cleanJson.substring(7);
    if (cleanJson.endsWith('```')) cleanJson = cleanJson.substring(0, cleanJson.length - 3);

    const parsedResult = JSON.parse(cleanJson);
    
    // 3. Attach Real Links
    parsedResult.links = [];
    if (ghData && ghData.items) {
      ghData.items.forEach((item: any) => {
        parsedResult.links.push({ type: 'github', title: item.full_name, url: item.html_url });
      });
    }
    if (redditData && redditData.data && redditData.data.children) {
      redditData.data.children.forEach((post: any) => {
        parsedResult.links.push({ type: 'reddit', title: post.data.title.substring(0, 50) + '...', url: `https://reddit.com${post.data.permalink}` });
      });
    }

    return NextResponse.json(parsedResult);

  } catch (error: any) {
    console.error('Gemini API Error:', error.message);
    return NextResponse.json({ error: error.message || 'Failed to generate project data' }, { status: 500 });
  }
}
