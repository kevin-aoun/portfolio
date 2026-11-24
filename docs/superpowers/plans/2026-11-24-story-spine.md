# Story Spine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The scroll story tells Kevin's loop (Listen, Build, Keep it loved, Run it lean, Range) in his own facts, with one new panel on the finished board and a "Scroll" hint on the opening screen.

**Architecture:** Words change in `src/content.js` and `src/graphs/markup.js`; the Build panel is one more entry in `beats`, given a window by the `board` hold in `src/story.js` and room by the board's camera key in `src/scene/scene.js`; the hint is one element in the stage, a CSS pulse, and one scroll listener.

**Tech Stack:** Vite, vanilla JS, anime.js v4, Three.js. No test framework: each task is checked by `npm run build` and headless screenshots (playwright-core, swiftshader, `?debug&shot`).

**Spec:** `docs/superpowers/specs/2026-11-24-story-spine-design.md`

## Global Constraints

- Copy is the spec's table, verbatim; no fact beyond the CV or the site.
- The marquee's text stays one short sentence.
- Check at 1440 × 900, 1280 × 720 and 390 × 844, dark and light.
- Commit only when Kevin says so.

## Review Focus

- The hello lead on a 390 × 844 phone: the panel's top must stay clear of the transistor and the bar.
- The Build panel on phones: the bottom card must not cover the board (board above the card).
- Scrolling back up through the board: the Build panel leaves before the marquee comes in (no overlap).
- A reload mid-page (scroll restored): the Scroll hint must not show.
- Reduced motion: the hint is shown without pulsing, and is gone after a scroll.

---

### Task 1: The story's words

**Files:**
- Modify: `src/content.js` (`hello.lead`, the `logic` and `boot` beats, `body`)
- Modify: `src/graphs/markup.js` (`GRAPHS[0].text`)
- Modify: `src/sections/render.js` (projects section: a lead paragraph after the `h2`), `src/styles/sections.css` (its style, matching `.ct-lead`)
- Modify: `README.md` (the story list)

- [ ] **Step 1:** Set each text to the spec's table, verbatim (hello, Listen, marquee, Keep it loved, Run it lean, Range).
- [ ] **Step 2:** `npm run build` → `✓ built`.
- [ ] **Step 3:** Screenshot hello, logic, boot, body, memory and projects at the three sizes. Expected: the hello panel clears the transistor; every panel's text fits its card.

### Task 2: The Build panel on the finished board

**Files:**
- Modify: `src/content.js` (`beats`: `{ id: 'build', side: 'left', title: 'Then build it, layer by layer', text: <spec> }` between `logic` and `boot`)
- Modify: `src/story.js` (`schedule()`: the `board` hold gets `len: 96, panel: '#beat-build'`)
- Modify: `src/scene/scene.js` (`hold('board', …)`: `f: [0.68, 0.5]` so the board sits right of the panel; `pf` raised above the phone card, starting at `[0.5, 0.36]`)

- [ ] **Step 1:** Make the three changes.
- [ ] **Step 2:** `npm run build` → `✓ built`.
- [ ] **Step 3:** Screenshot the board hold's middle at the three sizes, and its end and the marquee's start. Expected: board right of the panel on desktop, above the card on the phone; the panel is gone before the marquee shows.

### Task 3: The Scroll hint

**Files:**
- Modify: `src/render.js` (`story()`: `<p class="scroll-hint" aria-hidden="true">Scroll</p>` in `.stage`)
- Modify: `src/styles/story.css` (bottom centre, muted, small; a 3 s opacity pulse; `.gone` fades it out; none without JavaScript; no pulse under reduced motion)
- Modify: `src/story.js` (`initStory`: add `.gone` when `scrollY > 8`, at init and on the first scroll past it)

- [ ] **Step 1:** Make the three changes.
- [ ] **Step 2:** `npm run build` → `✓ built`.
- [ ] **Step 3:** Screenshot the top of the page (hint visible), after a scroll (gone) and a reload at the hello (not shown).
