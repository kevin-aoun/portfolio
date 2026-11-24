# The story, told as Kevin's loop

## Why

The scroll story is a striking hardware animation with textbook lines on top: only the robot and the 80 GB
chart say anything about Kevin. Kevin wants the page to tell his story, with his projects, flowing as one
piece, and the animations fitted to the story rather than the other way round.

## The spine (approach A, Kevin's pick)

Kevin's own line sets it up: he works where sales, engineering and customer success meet. Each chapter
proves one part of that line, with facts from his CV (2026-11-24) only:

1. **Listen**: discovery with clients, alongside sales.
2. **Build**: prototype to production.
3. **Keep it loved**: evals, the team's tools, teaching.
4. **Run it lean**: GPU sizing and cost.
5. **Range**: research and side projects, then the sections and Book a call.

Proposed order swap (Claude's call, for Kevin to confirm): *Keep it loved* before *Run it lean*. It reads as
"ship it to people, then run it lean", and it lets the animations stay in their order (the robot comes
before the dive into the chip's memory).

Rejected: B, chronological (reads like the CV and buries the "intersection" line). C, one Gaya case told end
to end (strongest story, but needs detail Gaya may not let Kevin share).

## Beat by beat

| Beat (animation, unchanged unless noted) | Chapter | Title | Text |
| --- | --- | --- | --- |
| Transistor, electrons flashing | (opening) | none | none |
| Hey, I'm Kevin | Intro | the name, in tokens | Cards on the table: I'm obsessed with building, and with watching a product grow and people love it. So I work where sales, engineering and customer success meet. |
| NAND gate | Listen | Four make a decision | Wire four transistors together and they make a decision. My work starts with one too: at Gaya I lead discovery with insurance carriers and brokers, alongside sales, and turn a messy workflow into a plan we can ship. |
| The chip builds itself; **new: a panel on the finished board** | Build | Then build it, layer by layer | From prototype to production. At Gaya, the harness, context and guardrails for browser and desktop agents that submit insurance quotes: manual handling down 3×. At BMW, a local LLM pipeline that now answers 25,000+ queries a day. |
| The chip powers on, the marquee | Build, live | Now it can talk. | The voice AI and RAG I shipped at inmind answer about 500 queries a day. |
| The robot assembles and lights up | Keep it loved | Give it a body | Then it lives with people, and has to keep working for them. My eval pipelines catch any slip in tool-call accuracy or response time, my eval dashboard is now the whole team's, and I teach engineers and non-engineers alike how to work with AI. |
| Into the chip's memory, the 80 GB chart | Run it lean | What fits in 80 GB | As inmind's advisor I size the GPUs; profiling clients' stacks with Nsight and TensorRT cut their hosting bill by 37%. Mine holds mostly Python and FastAPI, with hiking and MMA in reserve. |
| Projects section, **new lead line** | Range | Projects | Off the clock: quantum research with BMW, a brain-computer interface, and tools I build for myself. |

Chapter names are for this document only; the page shows the titles and texts. Kevin confirmed the order
(Keep it loved before Run it lean). The credentials stay as they are (the CV's student-club and varsity lines
were offered and not taken).

## Scroll hint (Kevin's addition)

On the opening transistor screen, a small "Scroll" at the bottom centre fades in and out every few seconds,
in the muted text colour. It goes for good once the visitor scrolls, and holds still (shown, no pulse) under
reduced motion.

## Constraints

- Every fact is from the CV or already on the site; numbers are the CV's (3×, 25k+, ~500/day, 37%).
- Words live in `src/content.js` (beats, body, hello) and `src/graphs/markup.js` (the 80 GB panel).
- The hello lead must still fit between the transistor and the bottom of a 390 × 844 phone.
- The marquee is one line read as it scrolls past: its text stays one short sentence.

## Left to the builder

- The Build panel: give the `board` hold a panel and enough length to read it (about the logic beat's 96 svh),
  on the side opposite the NAND panel, and move the board's camera key so the board takes the other side.
- Check every panel at 1440 × 900, 1280 × 720 and 390 × 844, in both themes.
- Update the README's story list to match.
