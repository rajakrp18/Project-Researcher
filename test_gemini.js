const { GoogleGenAI } = require('@google/genai');

async function run() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: 'Give me the URL to the official React github repository and a reddit discussion about React 19. Respond in JSON format: {"github": "url", "reddit": "url"}',
      config: {
          temperature: 0.1,
          responseMimeType: 'application/json'
      }
    });
    console.log("RESPONSE:", response.text);
  } catch(e) {
    console.error("ERROR:", e.message);
  }
}
run();
