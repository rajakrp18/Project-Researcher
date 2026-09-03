const { puter } = require('@heyputer/puter.js');

async function testPuter() {
  console.log('Testing Puter.js with Perplexity...');
  try {
    const response = await puter.ai.chat(
      "Find the phone number for Purshottam Varshneya at E-862 Saraswati Vihar", 
      { model: "perplexity/sonar-pro" }
    );
    console.log('Puter Response:', response);
  } catch (err) {
    console.error('Puter Error:', err);
  }
}

testPuter();
