// The contact form's tokenizer, off the main thread: unpacking o200k_base's rank table takes about half a
// second (two on a phone), which would freeze the field mid-sentence. Text in; token IDs and their text out.
import { Tiktoken } from 'js-tiktoken/lite';
import o200k from 'js-tiktoken/ranks/o200k_base';

const enc = new Tiktoken(o200k);

onmessage = ({ data: text }) => {
  // No special tokens: text that looks like one (<|endoftext|>) is read as plain text instead of throwing.
  const ids = enc.encode(text, [], []);
  postMessage({ text, ids, pieces: ids.map((id) => enc.decode([id])) });
};
