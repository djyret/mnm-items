---
version: 1
slug: "web-src-pages-kapitel-tsx"
primary_target: "web/src/pages/Kapitel.tsx"
related_targets: ["web/src/pages/KapitelLas.tsx","web/src/pages/Kronikan.tsx","web/src/components/Kronikoren.tsx"]
---

# Krönikan – kapitel (Läs och Verkstad)

Mode: Experience for Läs (the chapter's own content leads), Operate for Verkstad (uploading, the chronicler, editing).

Read and work are separate routes: `/kronikan/:id` is Läs, `/kronikan/:id/verkstad` is Verkstad. Tabs "Läs | Verkstad" sit in the same place on both. A new chapter opens in Verkstad.

## Direction contract

THESIS: The evening is pinned to the tavern's notice board, not stacked as a feed of equal cards. The default it refuses is the upload gallery with a form above it.

OWN-WORLD: No board of its own: the evening is nailed straight onto the tavern wall that is already the page background (user, 2026-10-25: "plankor på plankor som inte riktigt går ihop" – use the existing background). Comic images in Förrådet's iron item frame (item-ram.webp); screenshots mounted on burnt parchment; story roll, notes and title sign in burnt parchment (pergament.webp) with torn outlines that differ between neighbours; held by forged iron nail heads, not office push pins (user: "mer fantasy/rustikt utseende istället för perfekta postitlappar"). Quotes in Cinzel sized by intensity (telop discipline: shouting big and red, muttering small). Inherits Förrådet: Cinzel/Crimson Pro, gold for active, iron menu.

STORY: The gang opens the evening and remembers it in order, laughs at the lines, reads the story and clicks an image to show it large on Discord.

FIRST VIEWPORT: The title sign centred on the wall; the parchment roll with the story on the left (sticky); to the right a strict column grid, laid out in strict evening order with no backfilling (holes are closed by widening or lengthening the small piece before them): comic images 2×2 (square 2×3, portrait 2×4, never cropped), screenshots 1×2 (the image plus a caption of up to five lines needs the height), notes 1×1 (long ones 1×2), the last comic image closes the wall as a finale across all columns (portrait: 2 columns) because on a 4-column wall a 3×3 finale leaves a one-column hole. Gently rotated. Läs | Verkstad at top right.

FORM: Tavern notice board, position 6 on the ordered list (1 comic page grid, 2 bard's spread, 3 slideshow, 4 webtoon scroll, 5 travel map, 6 notice board, 7 tapestry). seed:42d2a1ea570f0a96. Signature: hovering or clicking a paragraph on the roll lights up the pins it tells about; click an image → large view with ← → for screen sharing.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
