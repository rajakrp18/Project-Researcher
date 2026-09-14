import { GoogleGenAI } from '@google/genai';

const key1 = process.env.GEMINI_API_KEY || '';
const key2 = process.env.GEMINI_API_KEY_2 || '';

async function test(keyName, apiKey, modelName) {
  console.log(`Testing ${keyName} with model ${modelName}...`);
  try {
    const ai = new GoogleGenAI({ apiKey });
    const res = await ai.models.generateContent({
      model: modelName,
      contents: 'Hello',
    });
    console.log(`SUCCESS [${keyName} - ${modelName}]:`, res.text);
  } catch (err) {
    console.error(`ERROR [${keyName} - ${modelName}]:`, err.message);
  }
}

async function run() {
  await test("Key 1 (in .env.local)", key1, "gemini-3.6-flash");
  await test("Key 1 (in .env.local)", key1, "gemini-2.5-flash");
  await test("Key 1 (in .env.local)", key1, "gemini-2.0-flash");
  await test("Key 1 (in .env.local)", key1, "gemini-1.5-flash");
  await test("Key 2 (in root .env)", key2, "gemini-2.5-flash");
  await test("Key 2 (in root .env)", key2, "gemini-2.0-flash");
  await test("Key 2 (in root .env)", key2, "gemini-1.5-flash");
}

run();
