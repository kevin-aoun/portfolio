// Every word on the page lives here.
// Facts come from Kevin's LinkedIn export, his blog (blog.kevinaoun.dev) and GitHub.

const email = 'business@kevinaoun.dev'; // Cloudflare Email Routing forwards it to Kevin's Gmail
export const person = {
  name: 'Kevin Aoun',
  role: 'AI engineer',
  email,
  call: 'https://cal.com/kevin-aoun',
  // The links out under Book a call, in this order.
  links: [
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/kevin-w-aoun/' },
    { label: 'GitHub', href: 'https://github.com/kevin-aoun' },
    { label: 'Email', href: `mailto:${email}` },
    { label: 'Blog', href: 'https://blog.kevinaoun.dev/' },
    { label: 'X', href: 'https://x.com/kevin_aoun1' },
  ],
};

// The scroll story's beats with words, Kevin's loop: listen (the logic gate), build (the finished board, then
// the marquee as it powers on); the body and the memory chart carry the rest. `side` is where the text sits;
// the subject takes the other side.
export const beats = [
  { id: 'logic', side: 'right', title: 'Four make a decision', text: 'Four transistors are enough to make a decision. Most of my projects start with one too. At Gaya, I work with insurance carriers and brokers, next to our sales team, to figure out what is worth building first.' },
  // Said over the finished board, once the chip has built itself.
  { id: 'build', side: 'left', title: 'Then I build it', text: 'I like taking things from a rough prototype all the way to production. At Gaya, that means browser and desktop agents that handle insurance quotes, so people spend a lot less time doing it by hand. Before that, at BMW, I built a local LLM pipeline that ended up becoming a flagship project.' },
  // One line, large, read right to left as it scrolls past.
  { id: 'boot', marquee: true, title: 'Now it can talk.', text: 'At inmind, I build voice AI that people talk to every day.' },
];

// The chip goes into a robot's head (src/scene/robot.js); this is said as it lights up.
export const body = { id: 'body', side: 'left', title: 'Give it a body', text: 'Once it is out in the world, it has to keep working for the people using it. That is why I care a lot about evals (I built the dashboard my team uses for them), and why I enjoy teaching people, technical or not, how to work with AI.' };

// Said under every Token IDs view: the IDs are GPT-4o's, not those of the model in the story.
export const idNote = 'IDs from OpenAI’s o200k_base (GPT-4o).';

// What the contact box charges for reading a message: an illustrative per-million-token input price, in the
// range of a mid-size frontier model.
export const pricing = { input: 3 };

export const hello = {
  lead: 'Cards on the table: I’m obsessed with building, and with seeing a product grow and get loved by people. So, I’m deployed at the intersection of Sales, Engineering / Product, and Customer Success.',
};

// Roles, newest first. `from` and `to` are year-month (to: null = still there); the page writes the
// dates from them and draws each role on the work timeline, labelled with `short` when the role is long.
export const work = [
  { org: 'Gaya', role: 'AI engineer', from: '2026-08', to: null, what: 'Browser agents for insurance agents' },
  { org: 'inmind.ai', role: 'Advisor', from: '2026-08', to: null, what: 'GPU sizing and estimates, technical leadership' },
  { org: 'inmind.ai', role: 'AI engineer', from: '2025-06', to: '2026-08', what: 'Voice AI, multimodal RAG and computer vision' },
  { org: 'Lebanese American University', role: 'Undergraduate researcher, with BMW Group', short: 'Researcher', from: '2025-01', to: null, what: 'Quantum state preparation via neural network encoding.', href: 'https://arxiv.org/abs/2605.31006', linkText: 'Paper on arXiv' },
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
];

// Handpicked, strongest first. `href` is optional (private work has none). Each one gets its own drawing
// in src/sections/render.js (ART, by name); one without a drawing gets a plain card.
export const projects = [
  { name: 'Live avatar', kind: 'Voice AI', lang: 'Python', text: 'A talking avatar you can have a live conversation with, and it can call tools while you talk. Built with LiveKit and Pipecat at inmind (private).' },
  { name: 'HELIN', kind: 'Brain-computer interface', lang: 'Python', href: 'https://github.com/kevin-aoun/helin-eeg', text: 'Humanity’s Last Interface. One pre-trained EEG model with a small adapter for each task, from motor imagery to epilepsy detection and gaming.' },
  { name: 'Quantum state preparation', kind: 'Research, with BMW Group', lang: 'Python', href: 'https://arxiv.org/abs/2605.31006', text: 'A neural network that predicts the circuit for loading data into a quantum state in one go, instead of optimising a new one for every input. Much faster, and the fidelity stays high.' },
  { name: 'LocalFi', kind: 'Local-first app', lang: 'TypeScript', href: 'https://github.com/kevin-aoun/LocalFi', text: 'Personal finance that lives in one SQLite file on your own machine.' },
];

export const writing = [
  { title: 'A framework for interacting with AI', date: 'Sep 2026', href: 'https://blog.kevinaoun.dev/essays/ai/a-framework-for-interacting-with-ai.html' },
  { title: 'Anatomy of a durable agent run using Temporal', date: 'Jul 2026', href: 'https://blog.kevinaoun.dev/tech/durable-agents/anatomy-of-a-durable-agent-run.html' },
  { title: 'Putting LLMs and GenAI to work', date: 'Feb 2024', href: 'https://blog.kevinaoun.dev/tech/putting-llms-and-genai-to-work.html' },
];
