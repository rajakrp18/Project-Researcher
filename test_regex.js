const config = require('./apps/contact-finder/lib/engine/config');

const text = "We pray to GodMay your noble soul rest in peace. Varshneyas, E862, Saraswati Vihar, Pitam pura,Delhi34.M:9582888440444,921226900203";

console.log("Extraction Patterns:");
config.EngineConfig.phone.extractionPatterns.forEach(pattern => {
  console.log(pattern);
  let match;
  while ((match = pattern.exec(text)) !== null) {
    console.log("Found:", match[1]);
  }
});
