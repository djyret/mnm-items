---
name: Loot & Lore
description: The gang's shared stash and chronicle, built as a lamplit tavern of stone, iron, bronze and burnt parchment.
colors:
  tavern-night: "#120f0b"
  gold: "#dcb362"
  bronze: "#a9814a"
  bronze-light: "#e0b872"
  bronze-dark: "#5c4224"
  iron: "#6f6a61"
  iron-dark: "#3a3732"
  candle-text: "#ebe3d3"
  ash-text: "#b3a993"
  heading-cream: "#f0e4c8"
  stone-text: "#f4f1ea"
  status-free: "#8fbf73"
  status-lent: "#e0ac48"
  status-sold: "#8c8478"
  status-reserved: "#86a6dc"
  status-equipped: "#c098e0"
  danger: "#d0604e"
  parchment: "#e8d6ad"
  parchment-light: "#f1e5c4"
  parchment-dark: "#cdb381"
  ink: "#3a2a17"
  ink-soft: "#6e4c22"
  pin-red: "#a3291c"
  panel-top: "#2a241d"
  panel-bottom: "#1d1914"
  well: "#0f0d0a"
typography:
  display:
    fontFamily: "Cinzel, 'Trajan Pro', Georgia, serif"
    fontSize: "clamp(1.6rem, 2.6vw, 2.3rem)"
    fontWeight: 700
    lineHeight: 1.15
  headline:
    fontFamily: "Cinzel, 'Trajan Pro', Georgia, serif"
    fontSize: "1.6rem"
    fontWeight: 700
    letterSpacing: "0.05em"
  title:
    fontFamily: "Cinzel, 'Trajan Pro', Georgia, serif"
    fontSize: "1.25rem"
    fontWeight: 700
    letterSpacing: "0.03em"
    fontFeature: "small-caps"
  body:
    fontFamily: "'Crimson Pro', Georgia, 'Times New Roman', serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.45
  reading:
    fontFamily: "'Crimson Pro', Georgia, 'Times New Roman', serif"
    fontSize: "1.06rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Cinzel, 'Trajan Pro', Georgia, serif"
    fontSize: "0.7rem"
    fontWeight: 500
    letterSpacing: "0.12em"
  button:
    fontFamily: "Cinzel, 'Trajan Pro', Georgia, serif"
    fontSize: "0.98rem"
    fontWeight: 700
    letterSpacing: "0.04em"
    fontFeature: "small-caps"
rounded:
  sm: "2px"
  md: "3px"
spacing:
  gutter: "16px"
  control-height: "2.6rem"
  grid-gap: "1.2rem"
  panel: "1.1rem 1.15rem"
  board-gap: "20px"
components:
  button:
    backgroundColor: "{colors.iron-dark}"
    textColor: "{colors.candle-text}"
    typography: "{typography.button}"
    rounded: "{rounded.sm}"
    height: "{spacing.control-height}"
    padding: "0.3rem 1.25rem 0.35rem"
  button-primary:
    backgroundColor: "{colors.bronze}"
    textColor: "#fff6df"
    typography: "{typography.button}"
    rounded: "{rounded.sm}"
    height: "{spacing.control-height}"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.candle-text}"
    rounded: "{rounded.sm}"
  chip:
    backgroundColor: "{colors.iron-dark}"
    textColor: "#e6dfd0"
    rounded: "{rounded.sm}"
    height: "2rem"
    padding: "0.2rem 0.7rem"
  chip-active:
    backgroundColor: "{colors.bronze}"
    textColor: "#fff3d6"
  input:
    backgroundColor: "{colors.well}"
    textColor: "{colors.candle-text}"
    rounded: "{rounded.md}"
    height: "{spacing.control-height}"
    padding: "0.42rem 0.6rem"
  panel:
    backgroundColor: "{colors.panel-bottom}"
    textColor: "{colors.candle-text}"
    rounded: "{rounded.md}"
    padding: "{spacing.panel}"
  badge:
    textColor: "{colors.gold}"
    rounded: "{rounded.sm}"
    padding: "0.18rem 0.5rem"
  tab-active:
    backgroundColor: "{colors.bronze-dark}"
    textColor: "#fff6df"
  parchment-note:
    backgroundColor: "{colors.parchment}"
    textColor: "{colors.ink}"
  wall-note:
    backgroundColor: "{colors.parchment}"
    textColor: "{colors.ink}"
    padding: "20px 22px 24px"
  menu-plaque:
    height: "42px"
---

# Design System: Loot & Lore

## Overview

**Creative North Star: "The Lamplit Tavern Stash"**

Every screen sits inside one painted tavern. The page is one timber-framed tavern wall, built from parts that share one scale (the 2560px-wide header band = 100vw): a full-width painted band on top (`bilder/taverna-band.webp`: a cross-beam, a shelf with the loot chest, coins and a sack on the left and old tomes, a scroll and a candle on the right, candle sconces on the two timber posts; the gang's four comic characters, Gabbex, Derinx, Daremx and Fizzler, sit on the shelf with their legs dangling over the edge, small next to the human-sized chest and books), the posts continuing straight down both edges as tiled strips (`stolpe-vanster.webp` / `stolpe-hoger.webp`, 7.5vw wide, the same 192px of the band) and a tiled plank wall between them (`vagg.webp`, 40vw per tile). Content stays inside the posts. The Loot & Lore sign is its own image per language (`skylt-sv.webp` / `skylt-en.webp`, cut from the earlier header paintings, the ribbon follows the chosen language) centred on the band at 27vw and is the link home. Under 900px the band keeps a minimum height and is cropped at the centre, and the posts are dropped. The menu is a sticky column of leather plaques down the left edge beside the content (see Material System). Everything the gang touches is made of the same few materials: dark bronze-framed panels with filigree corners, stone faces inside iron frames for anything clickable, gold metal for whatever is active, and the game's own iron item frame (`bilder/item-ram.webp`) around item cards. The palette is candlelight on dark wood: warm cream text, gold and bronze accents, near-black browns.

The Krönikan surface extends that world with one new material, burnt parchment (`bilder/pergament.webp`), held by forged iron nail heads (`bilder/spik.webp`). In the reading view the evening is nailed straight onto the tavern wall that is already the background; comic images reuse the item iron frame; story, notes and title sign are parchment with dark-brown ink. The working view stays in the incumbent panel world and stays calm.

The start page (`#/`) is the wall you step in to: the signed-in member's main stands as a character sheet in the panel world, and the gang's three latest evenings hang beside it as nailed parchment notes. It is the one place outside Krönikan where parchment appears, because the notes are pieces of the chronicle.

The system is dense where it administers (stash grid, filters, tables) and generous where it remembers (the chapter wall). It is game-UI literal by intent: tooltips and frames copy the in-game window chrome of Monsters & Memories.

**Key Characteristics:**
- Raster materials carry the world: tavern background, painted header and menu, stone, item frame, parchment, nail.
- Cinzel for every heading, label and control; Crimson Pro for all reading text.
- Iron frame = clickable; gold frame = selected or active; red face = destructive.
- Bronze filigree corner ornaments on panels and frames.
- Parchment and ink are the chronicle's material: Krönikan and the chronicle notes on the start page's wall, nowhere else.

## Material System (2026-11)

The interface is built from painted materials in `web/public/ui/` (9-slice border-images, each with a provenance `.json`), and this section wins over older iron, stone and filigree descriptions further down:

- **Leather and brass are for tools.** Panels default to the quiet leather (`panel-tyst.webp`, slice 40, 20px): smooth dark leather with one stitched seam, calm enough for forms and tables. Hero surfaces (the start page character sheet) use the heavy leather (`panel--tung`, `panel-tung.webp`, slice 96): tooled leather with brass corner caps and studs.
- **Buttons and tabs** are stitched leather (`knapp-lader.webp`, slice 32, 12px; 9px small); primary and the active tab are brass leather (`knapp-massing.webp`) with dark ink text; danger is red leather (`knapp-fara.webp`). Inputs and selects are a recessed leather well (`falt.webp`, slice 20, 10px).
- **The menu** is a column of rounded leather plaques with a stitched seam and a brass stud at each end (`meny.webp`, slice 76 64 25 64 drawn on a `::before`), a painted icon (`ikon-*.webp`, 34px) and the label as HTML text in Cinzel small caps. The active page is polished golden leather (`meny-aktiv.webp`) with dark text. Help text shows small inline copies (`menu-item--inline`).
- **Paper is for memories.** Whole hand-painted sheets per use, drawn with `background-size: 100% 100%` so their torn silhouettes, painted-in folded or curled corners, scorch marks and candle rings survive: `lapp-bred.webp` (lead note), `lapp-1/2/3.webp` (smaller notes and quotes, alternating), `skylt-papper.webp` (title sign), `foto-papper.webp` (screenshot mounts), and `rulle.webp` for the story roll and saga as a vertical 3-slice (rolled ends 120px, middle repeats with `round`). Padding keeps ink clear of the edges. Sheets that carry a screenshot or text use rustic variants whose damage stays in the outer edge, never a curl over the face: burnt (`bred-brand`, `lapp-brand`, `foto-brand`), torn (`bred-riven`, `lapp-riven`, `foto-riven`), folded flat (`lapp-vikt`), pin holes with rust and a wax drip (`lapp-nalhal`), water-stained (`lapp-vatten`) and a clean fallback (`foto-slat`); neighbours rotate so no two look alike. Curled corners remain only on quote notes.
- **Wax seals mark what is special**: red with ribbons for the latest evening (`sigill-band-rod.webp`), and red/green/blue seals (`sigill-*.webp`) reserved for featured/completed/in-progress states; `medaljong.webp` is reserved for Hall of Fame.

## Colors

Candlelight on dark wood: a near-black brown base, cream text, and one metal family (gold and bronze) for emphasis, with parchment and ink as the chronicle's paper.

### Primary
- **Lamplight Gold** (gold): links, panel titles, field-group labels, counters and totals, the active metal. Used for emphasis, not for fills.
- **Worn Bronze** (bronze, bronze-light, bronze-dark): frame borders, focus rings, dashed drop zones, divider gradients (`bronze` fading to transparent), selected-state outlines (bronze-light). Bronze-dark is the standard 1px border of panels and images.

### Secondary
- **Burnt Parchment** (parchment, parchment-light, parchment-dark): chronicle material only, which means Krönikan plus the evening notes on the start page's wall (see The Chronicle Paper Rule). The title sign, story roll, notes, screenshot mounts and start-page notes, always rendered through the `pergament.webp` 9-slice rather than as a flat fill. The small zone plaque uses a parchment gradient (parchment to parchment-dark).
- **Oak-Gall Ink** (ink, ink-soft): text on parchment. Ink-soft for meta lines and muttered quotes.
- **Wax Red** (pin-red): the accent on parchment only: drop cap of the story roll, shouted quotes, links and focus outline inside the roll.

### Tertiary
- **Item status set** (status-free, status-lent, status-sold, status-reserved, status-equipped, danger): badge text and borders for item state, reused for Krönikan entry kinds (comic = equipped violet, screenshot = reserved blue, clip = lent amber). Danger also tints alerts and the destructive button face.

### Neutral
- **Tavern Night** (tavern-night): base behind the background painting.
- **Iron** (iron, iron-dark): rivets, inner frame lines, holder badges; the iron metal gradient (`--iron-metal`) frames every control.
- **Candle Text** (candle-text): body text. **Ash Text** (ash-text): secondary text, field labels, empty states. **Heading Cream** (heading-cream): page titles, card titles, names. **Stone Text** (stone-text): text on stone faces inside the item frame.
- **Panel** (panel-top to panel-bottom gradient) and **Well** (well): panel fill and recessed input fill.

### Named Rules
**The Metal Means State Rule.** Iron is resting, gold is chosen. Any selectable thing (menu, button, chip, icon picker, seller, character row, tab) switches from iron metal and iron rivets to gold metal and gold rivets when active; no other colour signals selection.

**The Paper Has Its Own Ink Rule.** On parchment, text is ink or ink-soft and the accent is wax red; player name colours are darkened toward ink (mixed 45% with #2a1a0c) because the game's tags are made for dark backgrounds. Never put cream text or gold on parchment.

**The Chronicle Paper Rule.** Parchment marks the chronicle, not a page. It belongs to Krönikan's surfaces and, as a deliberate scoped exception, to the start page's wall, whose notes are chronicle evenings linking into Krönikan. Everything else on the start page (the character sheet, the main picker, the buttons) stays in the panel world. Any other new surface that wants parchment must carry chronicle content.

## Typography

**Display Font:** Cinzel (with Trajan Pro, Georgia, serif), weights 500 and 700
**Body Font:** Crimson Pro (with Georgia, Times New Roman, serif), 400, 600, italic 400

**Character:** Carved inscription capitals over a warm book serif. Cinzel speaks for the interface, Crimson Pro tells the story.

### Hierarchy
- **Display** (700, clamp(1.6rem, 2.6vw, 2.3rem), 1.15): the chapter title on the parchment sign, ink colour, balanced wrap.
- **Headline** (700, 1.6rem, 0.05em tracking): page titles in heading cream with a dark text shadow.
- **Title** (700, small caps, 1.05 to 1.35rem): card and frame titles, character names, menu and tab labels.
- **Body** (400, 18px, 1.45): base text. Reading text on parchment and in the story panel runs 1.06 to 1.12rem at 1.6 line height.
- **Label** (Cinzel 500, 0.62 to 0.85rem, 0.08 to 0.14em, uppercase): field labels (ash text), panel titles (gold, with a bronze-to-transparent underline), table headers, badges.
- **Button** (700, small caps, 0.98rem, 0.04em): every button, chip and tab.

### Named Rules
**The Small-Caps Control Rule.** Clickable things speak in Cinzel small caps (buttons, chips, tabs, menu labels); uppercase tracking is reserved for labels and badges that are not clicked.

**The Spoken Volume Rule.** On the chapter wall, quotes are set by how loudly they were said: shouting in Cinzel 700 at 1.55rem in wax red, speaking in Cinzel 700 at 1.12rem, muttering in Crimson Pro italic at 0.98rem in ink-soft.

## Layout

Pages are centred at a 1400px max width with 16px gutters (`1.5rem 16px 2rem` page padding). The header image scales with viewport width (clamped 780 to 1400px; 600px under 600px viewport) with its edges masked into the tavern background, and ends just below the shelf edge; it carries no menu. Below it the shell is two columns, the menu rail (auto width) and the content (0.5rem gap), together at most 1620px wide (the 1400px page plus room for the rail), with 16px left padding.

Working pages use sidebar plus content grids: the stash is a 290px sticky filter column beside an auto-fill card grid (`minmax(340px, 1fr)`, 1.2rem gap); item and add pages split into two columns with a sticky preview. Controls share one height (2.6rem) so fields, selects and buttons line up in rows.

The Krönikan reading view is a 330px sticky parchment roll beside a wall grid of 200px columns and 133px rows with 20px gaps, centred, filled strictly in evening order (placement computed in `KapitelLas.tsx`). Pieces are rotated slightly (comic images within about 1.2deg, paper within about 3deg). The working view (Verkstad) is a workbench: the list of the evening's memories beside one 460px control panel (24px gap). The panel is sticky 16px from the top, capped at the viewport height minus 32px, and scrolls on its own; list rows run a 2rem number column, a 128px thumbnail at 3:2 and the text.

The start page is a character sheet column (330 to 390px) beside the wall (2rem row, 2.6rem column gap). The wall is a two-column board (1.55fr and 1fr, 1.6rem by 1.8rem gaps): the latest evening spans both rows on the left, the two older evenings stack on the right. When only one side is shown (visitors, or members without the stash area) it takes the full width. Under 1200px the sheet sits above the wall in one column, held to its narrow width; under 700px the wall moves above the sheet (remembering before administering), the board becomes one column and the latest note stops spanning. When only the wall is shown it is capped at 980px.

At 900px and below every multi-column layout collapses to one column, sticky elements become static, the menu rail becomes a centred, wrapping row of 40px plaques above the content (at most 480px wide), the Krönikan wall becomes two equal columns with auto rows, the workbench stacks with the control panel first and the list below (rows shrink to a 1.6rem number and a 96px thumbnail), and the background stops being fixed.

## Elevation & Depth

Depth is physical: things hang on the wall and cast soft dark shadows, frames are bevelled with inset lines, and inputs are recessed wells. Shadows are always black, soft and downward; warm glow (rgba(224, 160, 80, ~0.35)) is reserved for selected and hovered states.

### Shadow Vocabulary
- **Panel** (`inset 0 0 0 2px #15120e, inset 0 0 0 3px rgba(169,129,74,0.35), 0 10px 24px rgba(0,0,0,0.5)`): every panel and frame; double inner line plus drop.
- **Panel hover** (adds `inset 0 0 0 3px rgba(224,184,114,0.6)` and `0 0 18px rgba(224,150,70,0.18)`, lifts 2px): clickable cards and help tiles.
- **Recessed well** (`inset 0 2px 4px rgba(0,0,0,0.6), 0 1px 0 rgba(169,129,74,0.15)`): inputs and textareas.
- **Focus glow** (`0 0 0 1px var(--bronze), 0 0 10px rgba(224,160,80,0.3)`): input and select focus.
- **Selected glow** (`0 0 8px rgba(224,160,80,0.35)`): active chips, pickers, sellers.
- **Hung on the wall** (`filter: drop-shadow(0 8px 10px to 0 16px 16px, rgba(0,0,0,0.5 to 0.65))`; the deeper end is for a piece lifted on hover): rasters with 9-slice borders (item frame, parchment, posters, menu images) use drop-shadow filters, not box-shadow, so the shadow follows the torn or riveted silhouette.

### Named Rules
**The Silhouette Shadow Rule.** Anything drawn with a raster border-image casts `filter: drop-shadow`, never `box-shadow`, so torn parchment and riveted iron keep their real outline.

## Shapes

Corners are nearly square: 3px on panels, inputs and alerts, 2px on buttons, chips, badges and frames, 0 on 9-slice rasters. Round shapes appear only as the gold coin step numbers in help and small status dots. Frames carry ornament instead of radius: bronze filigree corners (`--corner-tl/tr/bl/br`, 24px) on panels, square X-rivets (`--rivet`, `--rivet-gold`, 7 to 9px) in the corners of every iron-framed control, the 9-slice item frame (`item-ram.webp`, slice 60 38 50 37) on item cards and comic posters, and the 9-slice parchment (`pergament.webp`, slice 56) with torn edges on chronicle paper (Krönikan and the start page's wall), mirrored per piece so neighbours never share an edge. Dashed bronze borders (2px) mark drop targets only.

## Components

### Buttons
Iron-framed stone plaques, tactile and a little heavy.
- **Shape:** 4px iron-metal border with rivets in each corner, 2px radius, 2.6rem min height (2.15rem small).
- **Default:** stone texture face (`stone.webp`) under a dark wash, cream small-caps Cinzel with a black text shadow.
- **Primary:** gold metal frame and gold rivets, warm white text.
- **Ghost / secondary:** same iron frame, darker stone face, softer text.
- **Danger:** red-washed stone face in a rust-red metal frame.
- **Hover / Active / Disabled:** brightness 1.18 on hover, 0.92 on press, 45% opacity disabled.

### Menu
Leather plaques from the Material System (`ui/meny.webp`, `ui/meny-aktiv.webp`) with a painted icon (`ui/ikon-*.webp`) and the label as HTML text; hover brightens and nudges right; the active page is the golden plaque with dark text.
- **Rail (default):** a column along the left edge below the header, sticky 16px from the top, 42px plaques with a 0.55rem gap, left-aligned, starting 1.75rem down; hover nudges a plaque 2px to the right.
- **Row (900px and below):** the rail becomes a static, centred, wrapping row above the content (40px plaques, at most 480px wide); hover lifts 1px instead.
- **Home:** the Hem/Home plaque (`hem.webp`, a tavern hearth in the icon box) leads the rail and turns gold on the start page. The painted header sign also links home (screen-reader label only); do not set it in type.

### Chips
- **Style:** 2px iron-metal border around a stone face, small-caps Cinzel 0.82rem, 2rem high.
- **State:** active swaps to gold metal with a bronze-tinted face and selected glow; warning chips get a red face.

### Cards / Containers
- **Panel / frame:** panel gradient, 1px bronze-dark border, near-black outline, panel shadow, bronze filigree corners, 1.1rem padding, gold uppercase panel title with a bronze fading underline.
- **Item card:** a frame holding the in-game tooltip, which is the 9-slice item frame with stone, a darkened title bar and stone-text body; card footer is a dark recessed strip with holder and badges.

### Inputs / Fields
- **Style:** recessed dark well (`#0f0d0a` to `#191612`), 1px `#4a4237` border with darker top edge, 3px radius, italic muted placeholder.
- **Select:** small iron frame around a stone face with a cream chevron.
- **Checkbox:** square dark well that fills with a bronze gradient and gold check.
- **Focus:** bronze border plus focus glow.

### Badges
Tiny uppercase Cinzel (0.64rem, 0.08em) with a 1px border in the text's own status colour on a 45% black fill.

### Navigation (chapter tabs)
Läs | Verkstad sit top right on both chapter views in a dark recessed strip; tabs are Cinzel small caps in ash text; active tab gets a bronze-dark gradient, bronze-light border and warm white text; focus is a 2px bronze-light outline.

### Icons
Line icons drawn as inline SVG (`Icon.tsx`: 24px viewbox, 2.2 stroke, round caps) for arrows, close, play, up, down and plus. Content icons (slots, classes, coins, help topics) are painted rasters with a dark drop shadow.

### Chronicle Wall (signature)
Krönikan's reading view: the parchment title sign nailed at both top corners; the sticky parchment story roll with a wax-red Cinzel drop cap, where paragraphs linked to images carry a nail head in the margin and, on hover or click, light their pieces (lit pieces straighten and gain a bronze-light outline, others dim to 38%); comic images in the item iron frame; screenshots mounted on parchment with up to five italic caption lines; notes and quotes on mirrored parchment, each held by one rotated forged nail. Pieces pin in one by one (0.42s, 45ms stagger) only when reduced motion is not requested. Clicking an image opens a large dark viewer with arrow navigation for screen sharing.

### Workbench (signature)
Krönikan's working view: one list that selects, one panel that acts. Both halves are plain panels (panel gradient, bronze-dark border, panel shadow).
- **Memory list:** a header (page title, zone line, memory count with the number waiting for an image in status-lent) above an ordered list of rows. Each row is a single button: a tabular Cinzel number in ash text (2rem column), a 128px 3:2 thumbnail in a recessed well, then the kind badge (plus an Omslag badge on the cover), a two-line caption and the cast. Rows carry no buttons of their own; clicking selects. Hover is a faint warm wash (rgba(224,184,114,0.06)), selected is a bronze gradient fading to the right with a bronze-light border, focus is a 2px bronze-light outline.
- **Control panel:** one 460px sticky panel holds every action and has two states. Chapter state: sections divided by faint bronze rules: Lägg till (the dashed bronze paste and drop zone and a full-width Nytt ögonblick button), the AI chronicler stacked in one column, and Kapitlet (edit or read the chapter). Inspector state for the selected memory: a head row with a back button, the title "<kind> N av M" and previous/next arrows; a tool row (make a comic, move up or down, make cover) closed by a rule; the entry editor, whose kind picker is labelled Sort; and a sticky footer with Spara (primary) and Stäng, with Ta bort as a small ghost danger-text button pushed to the right.

**The Comic Absorbs Its Source Rule.** A comic built from screenshots (its source ids) absorbs them: those screenshots stop appearing as memories of their own in the list and on the wall and live on only as the comic's original. In the workshop the original sits as a small inset (38% wide, 4:3, 2px cream border) in the corner of the comic's thumbnail, or, before the comic is painted, is the thumbnail itself under a "Väntar på seriebild" strip with a dashed bronze top edge; the inspector lists it with Gör till eget minne to unfold it. On the wall it is tucked into the comic's lower-right corner as a small cream-mounted print captioned "Från spelet" in italic ink, tilted 5deg, and opens in the viewer.

### Start Page (signature)
The wall you step in to (`Start.tsx`): one's own main on the left, the gang's latest evenings on the right.
- **Character sheet:** one plain panel. Head: the 44px class icon beside the name (Cinzel 700, 1.6rem, heading cream with a dark shadow) and a level · race · class line. Below it a compact doll: the Armory doll's slot layout around the portrait, 44px icon slots without labels. The doll is a picture, not 22 links: a mouse click anywhere on it opens the Armory (touch taps do nothing; the button is the way there), slot and item names sit in tooltips, and keyboard and screen-reader users get a hidden list of what is worn plus the Öppna Armory button. Then a short stat box under an iron-dark rule: Health, Mana and AC large (1.3rem) in three columns, then only the non-zero attributes and resistances in two columns, then the bonus note. A "Sedan sist" block follows (gold uppercase label over an iron-dark rule): new items in the stash since the last visit (remembered per account in the browser and advanced once per browser session), linking to the stash filtered to those items (`#/forrad?sedan=…`), and what the main is borrowing or has lent out, each item a link. Actions close the panel: Öppna Armory as the primary button, Byt main as a small ghost button opposite it.
- **Choose your main:** a member without a chosen main sees a "Välj din main" panel form instead (intro, one select, primary save, ghost cancel when changing).
- **Wall:** the heading "Senast på väggen" (page title), for visitors an italic ash line under it ("Gängets äventyr, en spelkväll i taget."), then the three latest evenings as burnt-parchment notes, each a single link to its chapter. Each note is held by one forged nail at its top centre and hangs at its own tilt (-1.1deg, 1.8deg, -2.2deg), with the parchment mirrored on the middle one so neighbours never share an edge; the cover sits in the item iron frame at 3:2. Note padding (20px 22px 24px; 22px 24px 26px on the latest) keeps all ink inside the 18px burnt rim. The latest note is large and spans two rows, its cover cropped to 16:9 so title and summary reach the first viewport: title at clamp(1.4rem, 1.9vw, 1.8rem) with a wax-red initial, date and zone in italic ink-soft, a summary clamped to four lines and "Läs kvällen" in wax-red small caps. The older notes carry only cover, title and meta. Hover straightens a note and lifts it 3px (no transition under reduced motion); focus is a 2px bronze-light outline offset 6px. "Alla kvällar" is a default button right-aligned under the wall. Without the sheet (visitors) the wall is capped at 980px. If the evenings cannot be loaded, an alert says so with a Försök igen button; the empty message is reserved for a wall that really is empty.
- **Shell accessibility:** a "Hoppa till innehållet" skip link appears top left on keyboard focus, and plaques, buttons and the header sign share the 2px bronze-light focus outline.
- **Visitors** see only the wall.

### Chronicle Slideshow (signature)
Krönikan played as a full-screen show (`/kronikan/:id/bildspel`, `Bildspel.tsx`). The chapter title and the end card are the parchment title sign over the first and last image. Images fill the screen uncropped (contain) over a darkened blurred copy of themselves and drift slowly (18s scale and pan, four variants). The focal transition is the **burn-through**: the next image burns its way through the previous one along an irregular front (distance from a varying origin plus value noise, computed at low resolution as a mask), with a white-gold to orange glowing edge and a thin soot band ahead of it, 2.2s. The story is written onto one burnt parchment roll at the bottom that unrolls once and stays; each word soaks in like ink (blurred and wet-dark to sharp ink, 1.1s) in time with the clock, with a wax-red Cinzel drop cap; pausing freezes the ink. Paragraphs own the images they reference; unreferenced images are spread evenly across paragraphs. Controls (iron buttons) and a thin bronze-to-gold progress line sit at the bottom and fade out when the mouse rests. Reduced motion: a 0.5s cross-fade, no drift, the whole paragraph at once.

## Do's and Don'ts

### Do:
- **Do** build every new clickable from the iron frame and stone face, and mark selection by switching to gold metal and gold rivets.
- **Do** keep the tavern background visible and fixed; place new surfaces on it rather than on a new backdrop.
- **Do** use Cinzel for headings, labels and controls and Crimson Pro for anything read as prose.
- **Do** draw parchment and frames with their 9-slice rasters and shadow them with `drop-shadow`.
- **Do** keep parchment text in ink, ink-soft and wax red, and darken player tag colours before using them on paper.
- **Do** keep controls on the shared 2.6rem height when they sit in a row.
- **Do** gate entrance motion behind `prefers-reduced-motion: no-preference`.
- **Do** gather a working surface's actions in one sticky control panel beside a list whose rows only select; the destructive action sits last, pushed right.

### Don't:
- **Don't** introduce rounded, flat or pill-shaped controls; corners stay at 2 to 3px and are ornamented with rivets or filigree instead.
- **Don't** use office push pins, sticky-note colours or a separate board texture on the chronicle wall; pieces are held by forged nails on the tavern wall itself.
- **Don't** put cream text or gold accents on parchment, or parchment surfaces in the administrative views.
- **Don't** use cool or saturated accent colours beyond the item status set.
- **Don't** use unicode glyphs as icons; draw them in `Icon.tsx`.
- **Don't** add coloured side-stripe borders to callouts.
