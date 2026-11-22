# DIRECTION SHEET — The page is the object
seed 438470525 · drawn 2026-11-02 · sector personal-portfolio
Brief: AI engineer who loves GPUs, LLM internals, token costs and Renaissance paintings; scroll story from a transistor to a GPU to a model that writes the history of reasoning

| | |
| --- | --- |
| Direction | The page is the object |
| Hero | Tabbed folder stack |
| Type | Bebas Neue / EB Garamond |
| Colour | Rose grey, green |
| Sections | showcase (Square plate, spare text) → about (Founder's letter) → work (Book-spine index) → list (Cards that fold into spines) → contact (Visit card on a photograph) → footer (The back of the card) |
| Motion | Index with preview |
| Photographs | the "Architecture" set, as atmosphere |

This is the direction for this build. Adopt it. Do not blend it with the layout you would have made anyway,
and do not redraw because it is unfamiliar: unfamiliar is the point. Redraw a slot only when it conflicts
with a stated brand constraint or needs an asset that does not exist, and say why in your report.

The parts of this sheet were written separately and will disagree in small ways. Settle every disagreement in this order:
**house rules** (including type no smaller than 13px and body text of 16px or more) → **the direction** (the idea, the composition habits, where the
one accent goes) → **the type system and the palette** (which face does which job, the five size steps, which colour is the ground and where the
accent goes) → **the hero blueprint** → **the section blueprints**. Under each blueprint below, "Adjusted for this page" lists where it disagrees.
In practice: take geometry from blueprints (columns, proportions, what sits where) and take everything else from above them. Map every size a
blueprint names onto one of your five type steps instead of adding a sixth. Use one button shape, one corner radius and one pair of page margins on
the whole page, whatever individual blueprints say. If a blueprint names a kind of typeface (a light serif, a heavy grotesk), use the dealt face.

## 1. The idea
Find the printed or physical artefact that already exists in the subject's world and build the page as that thing. A wedding site is the invitation card. A restaurant is its menu. A conference is the ticket; a record is its sleeve; a shop is the receipt or the swing tag; an archive is a stack of tabbed folders; a course is the syllabus sheet. The artefact supplies everything a template would otherwise invent: its proportions, its typographic manners, its way of grouping information. Visitors recognise the object instantly, which is why these pages feel specific.

Before anything else, write one sentence in your notes: "On this page, <the subject's own material> becomes <the device>."
Fill the first blank from your inventory of what only this client has (its name and what it means, its street, its numbers, its
constraint), then put the nearest competitor in the sentence: if it still works, the idea is the category's, not the client's.
Then name the one live thing the visitor can do on the page (SKILL.md step 4).

## 2. Composition
The first screen shows the artefact as a single filled panel (paper colour on a contrasting ground) centred or offset, with believable proportions: a card at 5:7, a ticket at about 2.2:1 with a notch cut by `clip-path`, a menu as a tall sheet. All primary content lives on it, set the way that object is set: centred and symmetrical for an invitation, in tidy aligned columns for a menu or ticket. The ground behind is a flat colour or one full-bleed photograph. As the page continues, each section is another piece of the same stationery: a second card, a tear-off stub, a folded panel, always filled shapes with real edges (straight, notched, scalloped, perforated by a dotted `border` of round dots at 4px or more), never outlined boxes. The footer is the back of the object.

## 3. Type — Bebas Neue / EB Garamond
Huge condensed capitals against a light old-style serif with italics: an industrial voice and a literary one, with a twenty-fold size gap between them. Suits crafted physical products, spirits, outdoor goods and hospitality.
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue:wght@400&family=EB+Garamond:ital,wght@0,400;0,500;1,400;1,500&display=swap" rel="stylesheet">
```
- Display: **Bebas Neue** — weight 400 (single cut, capitals only) · tracking -0.02em, tightening to -0.06em above 15vw · leading 0.85 · uppercase
- Text: **EB Garamond** — leading 1.45 · tracking 0
```css
:root {
  --step-small: clamp(0.8125rem, 0.79rem + 0.1vw, 0.875rem);
  --step-body: clamp(1.0625rem, 1rem + 0.25vw, 1.1875rem);
  --step-lead: clamp(1.25rem, 1.1rem + 0.7vw, 1.625rem);
  --step-head: clamp(2.5rem, 1.2rem + 5vw, 5.5rem);
}
```
Take the manners of the artefact: a bookish serif with small caps avoided, or a blunt condensed face for tickets and posters. Sizes stay within what print would use relative to the panel; the name is large on the panel, details are small and exact.
The direction decides sizes and how many of them; the type system decides how this face is set. Where the two give different tracking or leading, use the values of the type system: they are tuned to this face.
The display size itself comes from the hero blueprint below.

## 4. Colour — Rose grey, green
```css
:root {
  --bg: #ebe5e3;
  --surface: #e1dad7;
  --ink: #2b2622;
  --muted: #6a615d;
  --accent: #0f7d45;
  --accent-ink: #ffffff;
}
```
A single rosy grey covers the page from top to bottom with brown-black text and grey secondary lines; images are kept greyscale. Green appears only on the current-page link and on one button in the footer.
Paper and ink plus the ground the paper sits on. Two or three flat colours in total, like a two-colour print job.

## 5. Imagery
**The project has no photographs of its own yet.** First choice: **real pictures of the subject's world from the open collections**: its city and street in old postcards and photographs, an old map of the neighbourhood, its materials up close, its trade in engravings, museum objects of its kind (references/imagery.md §3). Start with `node /home/kevin/.claude/skills/design-taste-frontend/scripts/assets.mjs "transistor"`, then queries from your inventory (its street, its materials, its trade's tools and history). Download what you use into the project with `--get` and credit every one on the page (`--credits` prints the footer line). They show the world around the client, never the client's own room, dish, product, person or team. Second, for what no honest picture exists of: draw the subject's own things in code, large, in one flat graphic language and the palette's real colours (its tiles, its windows, its objects; references/imagery.md §8). Third: the dealt photographs, only where an honestly generic picture fits (the sea, the weather, a material), never one a visitor could take for the thing itself and never an unrelated scene. One treatment for all of them. If this direction is built on photographs, plan the set before building (four to six pictures of one family) and reuse them at different crops and scales instead of finding or drawing a new picture for every slot; keep drawings as `<symbol>` + `<use>` or generate them with a small script so the page stays light. List every found picture (with its source and licence), every dealt photograph and every drawing that stands in for photography in your report.

Optional. One photograph behind the object, or small photographs placed on it like tipped-in plates. The object itself is the image.

**Floor (the inspector checks it):** at least four real pictures on the page, usually six to twelve; SVG drawings do not count. One moving picture where an honest clip exists: `node <skill>/scripts/assets.mjs --video "<query>"`, used as a muted loop with a poster frame. Whatever this direction says about pictures, it is carried out with real ones.

Photographs dealt for this build, from the "Architecture" set (structure, lines, bridges, facades and building interiors)
Order of preference for imagery: (1) the project's own photographs and product shots; (2) images you generate, if an image tool is
available; (3) real pictures of the subject's world found in the open collections (assets.mjs, downloaded and credited on the page);
(4) drawings of the subject in code; (5) these. They are real photographs (Unsplash licence, served by picsum.photos) of places, light and
texture. They are atmosphere, never a stand-in for a specific product, dish, person or interface. List the ones you use in your report so
they can be replaced.
- `https://picsum.photos/id/1081/1600/1000` — Stepped white modern building corner rising into a pale blue sky · light tone · white, pale blue, soft grey · calm area: top · native landscape · photo: Julien Moreau
- `https://picsum.photos/id/887/1600/1000` — White apartment block facade with repeating balconies and windows · light tone · white, pale grey, soft red · native landscape · photo: Roman Kraft
- `https://picsum.photos/id/693/1600/1000` — Red suspension bridge tower rising from fog above rugged cliffs · mid tone · rust red, grey, dark teal · calm area: left · native landscape · photo: Rob Bye
- `https://picsum.photos/id/620/1600/1000` — White arched bridge spanning grey water under a pale sky · light tone · white, pale grey, charcoal · black-and-white · calm area: bottom · native landscape · photo: Matthew Wiebe
- `https://picsum.photos/id/954/1600/1000` — Narrow opening in a white wall revealing a white staircase · light tone · off-white, pale beige · calm area: left · native landscape · photo: Todd Quackenbush
- `https://picsum.photos/id/508/1600/1000` — Tall pointed vaults and pale columns of a church interior · light tone · cream, warm grey, soft orange · native portrait · photo: Jeff Sheldon
- `https://picsum.photos/id/942/1600/1000` — White angular concrete building against a black sky · dark tone · black, white, pale grey · black-and-white · calm area: top · native landscape · photo: Carl Nenzen Loven
- `https://picsum.photos/id/855/1600/1000` — Small figure walking past a huge bright yellow wall · light tone · bright yellow, black · calm area: left · native landscape · photo: Rodion Kutsaev
The last two path numbers are width and height: request the exact crop you render (`/1200/1500` for a 4:5 portrait, `/2400/1350` for a hero) and
add `?grayscale` to desaturate. Use three to six of them, not all eight. Always set `width`, `height`, `alt` and `loading="lazy"` (not on the hero image).
Other sets that fit this brief: object-still, fog-and-quiet, hands-and-making, people — `node draw.mjs --photos <set>` prints one in full; `--photos list` shows all sets. Taking photographs from another set is your call and is not a redraw; keep them to one light and one treatment.

## 6. Hero — Tabbed folder stack
A dark flat ground. A slim top row at 24px holds the wordmark dead centre and one text link far right at 15px. The headline is one centred line of heavy condensed capitals at clamp(96px, 10vw, 160px), spanning about 70% of the width, its cap line 110px from the top. Under it one supporting sentence in a serif at 20px, centred, max 46ch. From 51% of the height down the screen is a stack of five file folders: flat colour bands 86% of the viewport wide, centred, each offset 64px below the one behind so only a strip of the back four shows. Every folder has one trapezoid tab rising 40px from its top edge, cut with `clip-path: polygon()`, at its own horizontal position and in its own colour, holding one section name at 18px. The front folder is open and runs off the bottom edge; it carries the single action as a solid button at its top-left with 32px padding. Each folder links to its section and lends that section its ground colour. The tab shape returns as the button's top corners.

On a phone: The headline sits 96px down at 17vw on one line, or two at 15vw, centred, with the supporting sentence at 16px beneath. The folder stack starts at 48svh at full width: bands offset 52px, tabs 32px tall with names at 15px, staggered left, centre and right. The front folder runs off the bottom with the action button at full width inside it.
Headline: The name or a two-word statement on one line of up to about 12 characters at 10vw; two lines allowed on a phone.

Adjusted for this page:
- It names a kind of typeface: use the dealt faces (display Bebas Neue, text EB Garamond) and their settings; capitals only where the type system sets them.
- Its vw sizes assume a face of normal width: with this condensed display face, size the words to fill the measure the blueprint gives them instead of copying the vw value.

## 7. Sections, in order
Each is a composition to rebuild with this project's content. Keep the geometry; change the subject. Re-order or drop a
section when the argument of the page needs it (see references/copy.md), never to fall back to a card grid.

### 1. showcase — Square plate, spare text (split)
One flat field split 50/50, at least 88svh tall. Left half: a single square photograph filling the half's width minus 40px margins, vertically centred, square corners. A large simple shape may be laid over it to turn the photograph into the object it stands for: a ring 86% of its width with a 6px stroke and a small solid dot at the centre makes a record; a notch cut by clip-path makes a ticket stub. Right half, a flex column with space-between: at the top a row of three plain text tabs at 18px (editions, years, variants), the active one in full ink and the others at 40%; in the middle the title, two to four words at 32–40px bold, with a 34ch description 48px below; along the bottom two filled rectangular cells side by side, each half the column wide and 72px tall, acting as the two actions, one in ink and one a tone off the field.
On a phone: The square photograph comes first at full width with 16px margins. The tabs sit under it as one row at 17px. Then the title at 28px, the description, and the two action cells stacked, each full width and 60px tall.

Adjusted for this page:
- It fades text: anything a visitor reads, inactive items of a list included, is `--ink` or `--muted` at full strength (contrast 4.5:1 or more). The active item is told apart by `--ink` against `--muted`, weight or the accent, not by fading the rest.

### 2. about — Founder's letter (stack)
A letter in a centred column 520px wide with at least 160px of empty ground above and below. At the column's top-left, a round portrait 44px across. 28px below it, four or five short paragraphs at 16–17px with leading 1.55, each two to four lines and separated by one blank line, written in the first person. No heading. The sign-off is the writer's name at 22px in the text face's italic, with the role at 14px in the soft ink beneath it. One phrase in the letter may carry a flat marker-colour background. Variant for a page built as an object: the letter sits on a filled paper-colour sheet 640px wide with 60px padding on a contrasting ground, square corners, its bottom edge cut into small scallops with `clip-path`, and below a row of 5px round dots a tear-off strip 72px tall that carries the email address.
On a phone: The column takes the full width with 24px margins; text at 16px, portrait 40px. In the sheet variant the sheet spans edge to edge with 24px padding and keeps its shaped bottom edge; the tear-off strip stacks the email above a full-width button.

Adjusted for this page:
- It names a kind of typeface: use the dealt faces (display Bebas Neue, text EB Garamond) and their settings; capitals only where the type system sets them.

### 3. work — Book-spine index (index)
The complete index in the footprint of a banner. Twenty to forty project names are set as single lines rotated to read top to bottom with `writing-mode: vertical-rl`, packed side by side like book spines across the full content width. Each spine is a column 30–34px wide and 420px tall: the name at 18px starts at the top, and the discipline follows after a 12px gap on a flat highlighter-colour background chosen from four palette colours by discipline. Spines are separated only by 6px of space. Hovering or focusing a spine turns it to full ink and dims the others to 40%; the whole spine is the link. A two- or three-word heading at 28px sits top-left above the shelf with a one-sentence note at 15px to its right on the same baseline. No images. Below the shelf, 96px of empty ground. It turns a long client list into one dense typographic object.
On a phone: Rotation is dropped. Names become a horizontal wrap: each name at 17px followed by its highlighted discipline, items flowing inline with 10px gaps and 14px of line spacing, so the index reads as one dense paragraph of links filling the width.

Adjusted for this page:
- It fades text: anything a visitor reads, inactive items of a list included, is `--ink` or `--muted` at full strength (contrast 4.5:1 or more). The active item is told apart by `--ink` against `--muted`, weight or the accent, not by fading the rest.

### 4. list — Cards that fold into spines (pinned)
For a journal, a run of notes or a list of chapters without pictures. A wrapper about 400svh tall holds a sticky stage of 100svh. The heading, two to four words at clamp(48px, 4.2vw, 64px), sits top-left on the 32px margin, 120px from the top. Under it a band 360px tall spans the content width and holds a horizontal deck of text cards, each about 620px wide, in three neighbouring flat tones of one hue taken in turn. On a card, with 32px padding: its title at 30px on up to two lines, leading 1.1; an excerpt of two lines at 16px; and along the bottom edge the date on the left and a text link to read it on the right, both at 16px. As the page scrolls, each step slides the next card in from the right edge and squeezes the earlier ones into slivers 120px wide stacked edge to edge at the left, like book spines, where only the first letters of their titles show, clipped by the sliver. Clicking a sliver brings its card back. 48px under the band, the number of entries and a link to the full list sit at 17px on the left margin, so the stage does not end on an empty floor.
On a phone: No pin and no slivers. The cards stack at full width with 12px gaps, each in its tone, the title at 24px, the excerpt at 16px, the date and link at the foot. The heading sits above them at 10vw.

Adjusted for this page:
- It pins something for three screens or more: hold a pin for two or three screens at most, give every screen under it its own content, and let nothing pass over the pinned words (the inspector checks all three).
- Its vw sizes assume a face of normal width: with this condensed display face, size the words to fill the measure the blueprint gives them instead of copying the vw value.

### 5. contact — Visit card on a photograph (full-bleed)
A full-bleed photograph of the place, 100vw by 100svh, carries one solid card and nothing else. The card is a filled panel in the paper colour, fully opaque, 380px wide with 8px corners and 32px padding, placed in the upper-right corner 60px from the top and right edges (or the upper-left: pick the corner where the photograph is calmest). It holds, top to bottom: a two- or three-word title at 28px in a light weight; the address on two lines at 16px; the opening hours as three rows with days at the left and times right-aligned in tabular figures; the phone number; then, flush with the card's bottom edge and spanning its width, a solid booking button 52px tall. The card may be `position: sticky; top: 60px` inside a taller section so it holds while the photograph scrolls beneath it. The photograph's focal point must stay clear of the card. No heading outside the card.
On a phone: The photograph is 100vw by 70svh. The card leaves the corner: it spans the width with 16px margins and overlaps the photograph's bottom edge by 80px, so image and card interlock. The booking button is full width, 56px tall, at the card's bottom.

Adjusted for this page:
- Its vw sizes assume a face of normal width: with this condensed display face, size the words to fill the measure the blueprint gives them instead of copying the vw value.

### 6. footer — The back of the card (stack)
The footer is the reverse side of the page's artefact, laid out as the back of a postcard. A paper-coloured panel spans columns 2–11 on the contrasting ground, about 420px tall, its top edge cut into a row of twelve semicircular scallops (an inline SVG path or `clip-path`, each scallop about 100px wide). The panel is divided by space into two halves. Left half: a short sign-off of two to four words at 32px, then two or three lines at 16px, written like a message. Right half: the address block, four left-aligned lines at 18px with 12px between them, each line a link (email, telephone, street, social); above it in the top-right corner, a stamp: one small photograph, 3:4 and 88px wide, with a 6px paper-coloured margin. Along the panel's bottom edge, a single centred line at 12px gives the copyright like a printer's imprint.
On a phone: The panel runs full width with six scallops across its top edge. The stamp sits top-right at 64px wide; the sign-off and message come first, then the address lines at 17px beneath them, then the imprint line centred at 12px.

Adjusted for this page:
- It sets text at 12px: use your small step (13px or more) instead.

## 8. Motion — Index with preview
Rows of text are the navigation through the work; pointing at a row brings up its image in one fixed frame and dims the other rows. On touch screens each row shows its image inline instead. Fast and exact (about 240ms crossfade), no lag behind the pointer. Recipe: 'Index with preview, anchored to the row' in references/motion.md.
This is the signature move, the one loud moment. Around it the page still needs the rest of the motion layer (SKILL.md step 9): an entrance for the parts of every section, feedback on every control, and one moving picture. The inspector fails a page that barely moves. Recipes: references/motion.md.

## 10. Where the richness comes from
Recognition. The shaped edges, the print-like alignment and the limited inks make a familiar object out of plain HTML.

## 11. How this direction goes wrong
Choose an artefact that truly belongs to the subject, or it becomes costume. Shape the edges with fills and `clip-path`; an outlined rectangle with a thin border is not an object. Keep text sizes readable on a phone, where the object becomes full width with its shaped edge kept at top and bottom.

## 12. Real references
Studied sites that work this way. Take the principle, never the specifics: no names, copy, images or signature assets of theirs.
- **The Deep End** (One Page Love, studied score 7.5) `opl-the-deep-end`
  Idea: The whole site is one invitation card floating over ambient footage, which shrinks into a pinned corner ticket as scattered stills scroll past.
  Hero: Full-bleed, dim, amber-toned video of a listening room: a modular synth and speaker at top, a person lying on a silk cushion in soft focus. Centred over it is a square-cornered panel about 55% of the viewport wide and 62% tall, a blurred brown-to-taupe wash. Inside, the three words of the title are spread along the top edge at left, centre and right in bold condensed caps. A small line-diagram logo sits below. Two left-aligned text blocks at 2.5vw in the same heavy condensed face, tightly leaded: five lines of event details, four of description. Bottom edge: credits left, an RSVP box centre, a small link right. No navigation.
  Worth taking: Spread the words of a short title to the left, centre and right of a card's top edge so the name becomes its frame.
- **Sarah & Matt Wedding** (One Page Love, studied score 8) `opl-sarah-matt-wedding`
  Idea: The site is the invitation: a letterpress-style card rendered as a physical object opens the page, and its ornaments, rules and small typographic parts become the components for everything after it.
  Hero: A flat blush-pink field fills the viewport. Top-left sits a gold filigree monogram about 120px square; three plain nav links are centred on the same line; a solid gold rectangular RSVP button sits top-right. Below, centred, a portrait invitation card half the viewport wide starts 200px down and is cropped by the bottom edge, with a soft halo shadow and a debossed border with scalloped inner corners. On the card: the two names in a large italic swash serif, staggered left and right against two ornamental roundels, separated by hairline rules carrying tiny wide-tracked caps for date and time.
  Worth taking: Make a real-world object (an invitation, a ticket, a label) the hero and reuse its small typographic parts, such as a boxed address line with slashes, as recurring components down the page.
- **bleibtgleich’26** (Awwwards Site of the Day, studied score 7.5) `aww-bleibtgleich26`
  Idea: One thin vertical rule runs down the page and a tight bold grotesk sentence wraps around it, words stepping from one side of the line to the other.
  Hero: White page, black type. Content sits in a narrow band between 26% and 68% of the width. A 1px vertical rule drops from the top edge at 37% for two-thirds of the height. Left of it: a black blob avatar at the top, a tiny role caption at its foot. Right of it: a tiny location note at the top, the name in two lines of 90px medium grotesk at the bottom. The tagline continues below at the same size, flush to the band's left edge, running past the fold. The upper half is otherwise blank. The handle is split into two pale-grey words fixed in the bottom corners; a black menu pill sits top-right.
  Worth taking: Draw one 1px vertical rule and typeset a large sentence around it, alternating words to either side so the line becomes the text's spine.
Full notes on any of them: `node draw.mjs --site <id>`.

## Always
Headlines two lines or fewer at every width. No eyebrow labels, no monospace, no 01/02/03, no thin rules, no gradients, no shadows at rest,
no cream-and-terracotta, no violet. The frame: one h1 on the first screen that says what this is, equal outer margins, no
section huddled on one side with the other half empty, no blank stretch over half a screen, a heading on every section.
`inspect.mjs` measures all of it.

Saved to /home/kevin/Documents/Work/portfolio/.taste-skill/datasheet/direction.json · reprint with `node draw.mjs --show`
