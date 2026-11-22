// Tokenize the name with o200k_base (GPT-4o's tokenizer), so the hello shows real token boundaries and IDs.
// Run after changing it: node scripts/tokenize.mjs (writes src/data/tokens.json).
import { Tiktoken } from 'js-tiktoken/lite';
import o200k from 'js-tiktoken/ranks/o200k_base';
import { writeFileSync } from 'node:fs';

const NAME = "Hey, I'm Kevin";
const enc = new Tiktoken(o200k);
const name = enc.encode(NAME).map((id) => ({ id, t: enc.decode([id]) }));
// Every token must decode back to the exact text, or the page would show something the tokenizer never wrote.
if (name.map((x) => x.t).join('') !== NAME) throw new Error('token round-trip failed');
writeFileSync('src/data/tokens.json', JSON.stringify({ encoding: 'o200k_base', name }));
console.log('name', name.map((x) => `${JSON.stringify(x.t)}=${x.id}`).join(' '));
