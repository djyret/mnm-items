---
version: 1
slug: "web-src-pages-start-tsx"
primary_target: "web/src/pages/Start.tsx"
related_targets: ["web/src/App.tsx","web/src/components/MiniDoll.tsx"]
---

# Startsidan (Hem)

Scope: ny startsida `#/` plus skalets vertikala meny. Mode: operate (med läsinslag). Förrådet flyttar till `#/forrad`.

Audience: gänget (3 spelare) som öppnar appen före eller efter en spelkväll. Job: se sin main och vad som hänt senast, och hoppa vidare. Besökare ser bara krönikorna.

Constraints: headern ligger kvar överst; menyskyltarna (målade rasters 560x132) staplas längs vänsterkanten och är klibbiga; under 900px blir de en rad som förut. Main väljs per konto (`memberships.main_character_id`).

## Direction contract

THESIS: Startsidan är tavernaväggen man kliver in till: ens egen karaktär står som ett karaktärsblad, gängets senaste kvällar sitter spikade bredvid. Den vägrar instrumentpanelens rutnät av lika kort och siffror.

OWN-WORLD: Tavernans järn, brons och guld. Karaktärsbladet är en vanlig panel med filigranhörn, dockans ikonrutor och spelets statsruta. Kvällarna är bränt pergament (`pergament.webp`, 9-slice) med smidda spikar (`spik.webp`), omslaget i item-järnramen, bläck och vaxrött på papperet.

STORY: Man känner igen sin main och dess gear-bonus på ett ögonkast, ser vilken kväll som är senast och läser vidare eller öppnar Armory. Besökaren ser direkt att det här är ett gängs krönika.

FIRST VIEWPORT: Header överst (som i dag, men slutar strax under hyllkanten). Vänster: menyskyltarna i en kolumn (~190px). Mitten: karaktärsbladet (~400px): namn, klass, level, kompakt docka runt porträttet, statsruta, knapp "Öppna Armory". Höger: väggen med rubrik "Senast på väggen"; den senaste kvällen som stor lapp (omslag, titel, zon, ingress), två äldre som mindre lappar bredvid, varje lapp lätt roterad och spikad. Under väggen: "Alla kvällar".

FORM: Tavernans anslagstavla, nummer 6 av 7 på min lista. seed:36431803cfefba81

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
