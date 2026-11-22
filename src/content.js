// Every word on the page lives here.
// Facts come from Kevin's LinkedIn export, his blog (blog.kevinaoun.dev) and GitHub.

export const person = {
  name: 'Kevin Aoun',
  role: 'AI engineer',
  email: 'business@kevinaoun.dev', // Cloudflare Email Routing forwards it to Kevin's Gmail
  call: 'https://cal.com/kevin-1',
  links: [
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/kevin-w-aoun/' },
    { label: 'GitHub', href: 'https://github.com/kevin-aoun' },
    { label: 'X', href: 'https://x.com/kevin_aoun1' },
    { label: 'Blog', href: 'https://blog.kevinaoun.dev/' },
  ],
};

// The scroll story's beats with words. After the hero and the hello, the camera pulls out from the logic
// gates and the whole chip builds itself without words, then the marquee. `side` is where the text sits;
// the subject takes the other side.
export const beats = [
  { id: 'logic', side: 'right', title: 'Four make a decision', text: 'Wire four together and you have a NAND gate. Every computation can be built out of NAND.' },
  // One line, large, read right to left as it scrolls past.
  { id: 'boot', marquee: true, title: 'Now it can talk.', text: 'The prompt goes in at once, then every new token reads the weights again.' },
];

// The chip goes into a robot's head (src/scene/robot.js); this is said as it lights up.
export const body = { id: 'body', side: 'left', title: 'Give it a body', text: 'I’m a mechatronics engineer who works on both the technical and the client side: customer discovery, sales, prototyping, and deployment to production.' };

// Said under every Token IDs view: the IDs are GPT-4o's, not those of the model in the story.
export const idNote = 'IDs from OpenAI’s o200k_base (GPT-4o).';

// What the contact box charges for reading a message: an illustrative per-million-token input price, in the
// range of a mid-size frontier model.
export const pricing = { input: 3 };

export const hello = {
  lead: 'AI engineer at Gaya and advisor at inmind.ai. I build browser agents and voice AI, and size the GPUs they run on.',
};

// Roles, newest first. `from` and `to` are year-month (to: null = still there); the page writes the
// dates from them and draws each role on the work timeline, labelled with `short` when the role is long.
export const work = [
  { org: 'Gaya', role: 'AI engineer', from: '2026-08', to: null, what: 'Browser agents for insurance agents' },
  { org: 'inmind.ai', role: 'Advisor', from: '2026-08', to: null, what: 'GPU sizing and estimates, technical leadership' },
  { org: 'inmind.ai', role: 'AI engineer', from: '2025-06', to: '2026-08', what: 'Voice AI, multimodal RAG and computer vision' },
  { org: 'Lebanese American University', role: 'Undergraduate researcher, with BMW Group', short: 'Researcher', from: '2025-01', to: '2026-10', what: 'Quantum state preparation via neural network encoding.', href: 'https://arxiv.org/abs/2605.31006', linkText: 'Paper on arXiv' },
  { org: 'BMW Group', role: 'Deep learning and automation', short: 'Deep learning', from: '2024-08', to: '2024-12', what: 'Munich, with Google Cloud' },
  { org: 'inmind.ai', role: 'Robotics and machine learning', short: 'Robotics', from: '2024-01', to: '2024-03', what: 'Mkalles, Lebanon' },
];

export const credentials = [
  { name: 'BE in Mechatronics', where: 'Lebanese American University, Honors Program' },
  { name: 'Offer holder · Robotics', where: 'Technical University of Munich' },
  { name: 'First place, Google Solution Challenge', where: 'MENA region' },
];

// Certifications, each with its badge where there is one (in public/badges). `date` and `href` (a page that
// verifies it) are optional.
export const certifications = [
  { name: 'Claude Certified Architect, Foundations', issuer: 'Anthropic', date: 'Jul 2026', href: 'https://www.credly.com/badges/4b4f319c-b6b1-4b11-b2dd-4ebf30155af0', badge: 'badges/claude-certified-architect.png' },
  { name: 'Certified Professional, Agentic AI', issuer: 'NVIDIA', badge: 'badges/nvidia-agentic-ai.png' },
  { name: 'Azure AI Engineer Associate', issuer: 'Microsoft', badge: 'badges/microsoft-azure-ai-engineer.svg' },
  { name: 'Fundamentals of Deep Learning', issuer: 'NVIDIA Deep Learning Institute' },
];

// Handpicked, strongest first. `href` is optional (private work has none). Each one gets its own drawing
// in src/sections/render.js (ART, by name); one without a drawing gets a plain card.
export const projects = [
  { name: 'Live avatar', kind: 'Voice AI', lang: 'Python', text: 'A talking avatar that holds a live conversation and calls tools as it goes, on a voice pipeline built with LiveKit and Pipecat. Built at inmind; private.' },
  { name: 'HELIN', kind: 'Brain-computer interface', lang: 'Python', href: 'https://github.com/kevin-aoun/helin-eeg', text: 'Humanity’s Last Interface: one pre-trained EEG model with small adapters swapped in per task, for motor imagery, epilepsy spike detection and fear detection in games.' },
  { name: 'Quantum state preparation', kind: 'Research, with BMW Group', lang: 'Python', href: 'https://arxiv.org/abs/2605.31006', text: 'Loading data into a quantum state usually takes a fresh circuit optimisation for every input. A neural network predicts the circuit’s parameters in one step instead: fidelity up to 0.992 on unseen images, over 5,000 times faster. Research at LAU with BMW Group.' },
  { name: 'Gadfly', kind: 'Voice AI', lang: 'TypeScript', href: 'https://github.com/kevin-aoun/gadfly', text: 'A Socratic voice AI. It asks until you find out what you know, and what you don’t.' },
  { name: 'LocalFi', kind: 'Local-first app', lang: 'TypeScript', href: 'https://github.com/kevin-aoun/LocalFi', text: 'Personal finance in one SQLite file that never leaves your machine: accounts, budgets, investments, net worth.' },
];

export const writing = [
  { title: 'A framework for interacting with AI', date: 'Sep 2026', href: 'https://blog.kevinaoun.dev/essays/ai/a-framework-for-interacting-with-ai.html' },
  { title: 'Anatomy of a durable agent run using Temporal', date: 'Jul 2026', href: 'https://blog.kevinaoun.dev/tech/durable-agents/anatomy-of-a-durable-agent-run.html' },
  { title: 'Putting LLMs and GenAI to work', date: 'Feb 2024', href: 'https://blog.kevinaoun.dev/tech/putting-llms-and-genai-to-work.html' },
];
