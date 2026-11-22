# Portfolio restructure and beta colours: design

Date: 2026-11-22. Project: `~/Documents/Work/portfolio` (Vite, Three.js, anime.js v4). Nothing is committed; the
owner commits when he asks.

## Intent

The site reads as a GPU commercial. Kevin wants it to read as his portfolio: who he is early, one fluid story from a
transistor to a robot, then proof of work (certifications, handpicked projects, writing, timeline) and a way to reach
him. He also wants a beta colour mode built from ten two-colour templates of his own (`templates/`), shown as blocks
like a regular website, each block in one template's palette with black blocks between.

## Goals

1. New story order (one sticky 3D stage, scroll-driven as now):
   1. Hero: the transistor with its electron bursts, unchanged.
   2. "Hey, I'm Kevin": the existing hello panel (name tokens with IDs, lead line, "Book a call" and the email
      link), moved from the end to right after the hero. The transistor stays on stage beside it (the existing
      `hello` camera key). It now leaves like the other panels.
   3. "Four make a decision": the existing logic beat and panel. From there the camera keeps pulling out and the
      chip builds itself (SM, die, package, board) in one continuous move with no text panels and no callouts.
   4. "Now it can talk.": the existing horizontal marquee, kept as is; the chip powers on under it.
   5. The robot assembles around the chip as now (arm, torso, legs, chip into the head, light-up), no words.
   6. "Give it a body" with Kevin's line as its text (copy below).
   7. "What fits in 80 GB": the existing memory chart, his stack as the KV cache. The camera dives into the robot's
      head to the chip (head opens, robot leaves at the end of the move, as the old `loop` key does) and the HBM
      fills as the chart does. This is the final beat: its panel stays up while the story scrolls away, as the
      hello panel's did.
2. Sections below the story, in this order: Certifications, Projects, Writing, Work timeline, Write to me, footer
   (the tree grove). All existing sections stay.
3. Certifications: a new section with three badges (files in `~/Downloads`, copied into `public/badges/`):
   - Claude Certified Architect, Foundations (Anthropic). Issued Jul 2026. Verify:
     https://www.credly.com/badges/4b4f319c-b6b1-4b11-b2dd-4ebf30155af0
   - NVIDIA Certified Professional, Agentic AI (NVIDIA).
   - Microsoft Certified: Azure AI Engineer Associate (Microsoft).
   - Fundamentals of Deep Learning (NVIDIA DLI), moved here from the Work section's credentials list, as a card
     without a badge.
   Each entry is data in `content.js` (`name`, `issuer`, `date?`, `href?`, `badge?`), so dates, verify links and
   badges can be added later. Works in dark, light and beta. The Work section's credentials list keeps the degree,
   TUM Robotics and the Google Solution Challenge, and drops CCA-F (now here).
4. Projects, handpicked, each with its own drawn image as today (procedural SVG in `sections/render.js`):
   Gadfly, LocalFi, HELIN, Quantum state preparation, Live avatar. Removed: Mabelle, Archangel (YOLOv8),
   Logistics vision (YOLOv7). Adding a project stays one entry in `content.js` plus, optionally, one drawing;
   a project with no drawing gets a plain fallback so it never shows an empty card.
   - HELIN: public repo https://github.com/kevin-aoun/helin-eeg. Brain-computer interface: one pre-trained EEG
     model (LaBraM) with small swappable LoRA adapters for motor imagery, epilepsy spike detection and fear
     detection for games.
   - Quantum state preparation: research at LAU with BMW Group, paper https://arxiv.org/abs/2605.31006
     (quantum state preparation via neural network encoding).
   - Live avatar: at inmind, private, no link. A live talking avatar on a voice AI pipeline built with LiveKit
     and Pipecat, with tool calling.
   Future entries he named: BPE from scratch (optimised), a transformer from scratch, a link to all blog posts.
5. Beta colours:
   - A "Beta" toggle in the bar beside the theme button; remembered in localStorage; `?look=beta` also turns it on.
     Default stays exactly as today. In beta the dark/light button is hidden (beta sets its own colours).
   - Palettes, extracted from `templates/` (background / ink; ink is used for text and line art alike):
     amber `#ebb53d`/`#842300`, sage `#afcd87`/`#041b06`, forest `#173324`/`#bfe099`,
     pink `#fbc4d9`/`#2e0056`, rust `#8a2b12`/`#ffc856`, aubergine `#200937`/`#f090d1`,
     navy `#011945`/`#34cadb`, ice `#dde9f5`/`#044169`, wine `#6e0a30`/`#ffa0c9`;
     black `#000000`/`#c7c7cb` is the black block (its template's mark is a rainbow gradient, so black blocks keep
     the five token colours as accents). Sampled once from the JPEGs and hard-coded; no build step.
   - Shuffled on every visit: palettes are dealt to blocks at random, never the same palette on two neighbouring
     blocks, black between palette blocks.
   - Sections: whole sections take turns, in a fixed phase: Certifications black, Projects palette, Writing
     black, Work timeline palette, then "Write to me" and the footer together as one black block (the live
     tokenizer and the grove puzzle need the five token colours, which only black blocks keep).
   - Story: each beat holds its own dealt palette while its text is up; during the camera move to the next beat
     the screen passes through black (stage background and ink go to black-block values, then to the next
     palette). The hero is black (token-coloured electrons, like the black template's rainbow mark); hello gets
     the first palette. The wordless chip build and robot assembly are black-block stretches.
   - Within a palette block everything is two colours: background, ink, and tints of the ink (muted text, lines,
     fills, the grid). The five token colours become five tints of the ink there, so lists and charts stay
     readable. The aura is off in beta; the grain stays.
6. Remove what the new story no longer uses: the Llama diagram (`src/model/diagram.js`, `src/styles/model.css`),
   the inference panel ("What has Kevin built?", its pricing, context and answer copy, their tokens), the
   roofline, Pareto and cost charts (the memory chart stays), the "One switch" transistor panel, the panels for
   core, die, package and board, and the camera keys, stage code and CSS only those used.

## Copy

New text goes through the unslop pass (plain, specific, no hype, no periods on one-line captions). Drafts:
- Body beat. Title: "Give it a body". Text: "I'm a mechatronics engineer who works on both the technical side and the
  client side, from customer discovery and sales to prototypes and production."
- Certifications heading: "Certifications".
- Project texts: written from the facts above only; no claims beyond them.

## Non-goals

- No new fonts (the templates' serif is not part of this change), no change to the default colours, no new
  dependencies.
- No testimonials, metrics or claims that Kevin hasn't given.
- No GitHub link for the live avatar.

## Anti-goals

- Beta that looks muddy: two colours that fight, or a third colour leaking into a palette block.
- A story that stops for text during the chip build (it must read as one animation).
- Losing anything that works today in the default look: the five token colours, the aura, the grove puzzle,
  reduced motion, phones, the no-WebGL fallback.

## Constraints

- Default look and the animations that stay must look the same as today.
- Design skills: Emil Kowalski's animation skills (animate, choreograph, improve-animations), impeccable,
  ui-ux-pro-max; not the taste skill. Unslop over all new text.
- Performance work from 2026-11-21 stays (shaders compiled at load, aura draws only visible rows).

## Approaches

- Beta as a third look built like dark and light (CSS custom properties per block plus a per-beat palette for the
  stage's shader and materials) was the only sensible way: the theme system already works this way. Rejected:
  a CSS filter or blend over the page (cannot keep text and line art in exactly the template's two colours).
- Palette assignment: fixed art-directed order, or shuffled per visit. Kevin picked shuffled.
- Story colour change: through black, or a direct crossfade. Kevin picked through black (direct blends pass
  through muddy mid-tones).

## Left to the builder

Camera timings and lengths for the new moves; how the hello panel leaves now that it is no longer the final
beat; the drawings for the three new projects (in the style of the existing ones); the certification layout;
how the memory chart's camera key frames the chip inside the opened head; where the toggle sits on phones.
