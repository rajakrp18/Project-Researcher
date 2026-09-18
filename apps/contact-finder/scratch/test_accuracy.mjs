import { parseAddress } from '../lib/engine/address/AddressParser.ts';
import { classifyAttribution } from '../lib/engine/attribution/ContactAttributionResolver.ts';
import { generateQueries, generateReversePhoneQueries } from '../lib/engine/QueryGenerator.ts';

console.log('--- TEST 1: Surname-Only Attribution Safety ---');
const phoneCandidate = {
  phone: '9876543210',
  raw: '9876543210',
  context: 'Contact Shri Rajesh Gupta at 9876543210 for property details in Vasant Vihar',
  sourceUrl: 'http://example.com'
};

const result = classifyAttribution(phoneCandidate, 'SANYOGITA GUPTA');
console.log('Attribution for "Rajesh Gupta" vs "SANYOGITA GUPTA":', result);
if (result.attribution === 'PROXY_PERSON') {
  console.error('❌ FAIL: Surname-only matched person was incorrectly marked as PROXY_PERSON');
} else {
  console.log('✅ PASS: Surname-only match was correctly marked as AMBIGUOUS / non-proxy:', result.attribution);
}

console.log('\n--- TEST 2: Staged Query Generator ---');
const queries = generateQueries({
  name: 'SANYOGITA GUPTA',
  address: 'B-3/19 VASANT VIHAR NEW DELHI'
}, parseAddress('B-3/19 VASANT VIHAR NEW DELHI'));

console.log('Generated Staged Queries:', queries);

console.log('\n--- TEST 3: Reverse Phone Queries ---');
const reverseQueries = generateReversePhoneQueries('9873900603', 'SANYOGITA GUPTA');
console.log('Generated Reverse Phone Queries:', reverseQueries);
