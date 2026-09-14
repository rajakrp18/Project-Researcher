import { GoogleGenAI } from '@google/genai';
import { fileURLToPath } from 'url';
import fs from 'fs';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env.local');

// Parse .env.local manually to avoid dotenv dependency
const envVars = {};
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      envVars[match[1]] = match[2].replace(/^["']|["']$/g, '');
    }
  });
}

const apiKey = envVars['GEMINI_API_KEY'];
const ai = new GoogleGenAI({ apiKey });

const models = [
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-1.0-pro',
  'gemini-pro',
  'gemini-1.5-flash-8b',
  'gemini-2.0-flash',
  'gemini-3.6-flash'
];

async function testModels() {
  console.log(`Testing with API Key: ${apiKey.substring(0, 5)}...`);
  for (const model of models) {
    console.log(`Testing model: ${model}`);
    try {
      await ai.models.generateContent({
        model: model,
        contents: "Say hello",
      });
      console.log(`✅ SUCCESS: ${model}`);
    } catch (err) {
      console.error(`❌ FAILED: ${model} - ${err.message}`);
    }
  }
}

testModels();
