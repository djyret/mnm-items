# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Ett kompisgäng (tre spelare i dag: Gabbex, Derinx, Daremx) som spelar MMO:t Monsters & Memories tillsammans på kvällar. Alla i gänget använder appen: de lägger in items i förrådet, lånar ut till varandras alts och fyller på Krönikan.

## Product Purpose

Loot & Lore (tidigare MnM Förrådet) är gängets gemensamma förråd och minnesbok.

- **Förrådet:** items avlästa från skärmdumpar, vem som har vad, lån, försäljning.
- **Startsidan:** ens main med utrustning och gear-bonus, och gängets senaste kvällar spikade på väggen. Besökare ser bara kvällarna.
- **Armory:** en sida per karaktär med porträtt, utrustning slot för slot, upp till fyra önskeset att jämföra stats mot och historik över vad som tagits på och av.
- **Krönikan:** gängets äventyr, ett kapitel per spelkväll. Under kvällen dumpas skärmdumpar från spelet; efteråt skriver en AI-krönikör berättelsen och föreslår scener, som blir seriebilder i gängets egen stil (genererade i ChatGPT). Målet är att kunna gå tillbaka och minnas tillsammans, som en serietidning om det de upplevt.

## Positioning

Byggt för just det här gänget och det här spelet: läser spelets egna skärmdumpar (chatt, stridslogg, namnskyltar) och berättar deras kvällar med deras karaktärer, deras humor och deras seriestil.

## Operating Context

- Läses oftast tillsammans på Discord (någon delar skärmen efter en kväll) och var för sig på datorn i efterhand.
- Alla i gänget laddar upp, skriver och skapar seriebilder; det finns ingen enskild redaktör. Alla godkända redaktörer får ändra allt delat innehåll.
- Alla med länken kan läsa. För att skriva, ladda upp och använda AI-funktionerna loggar man in med Discord och godkänns av en admin (roller: läsare, redaktör, admin; se `docs/SECURITY_MODEL.md`).
- Seriebilder görs utanför appen (ChatGPT) från en prompt appen bygger, och klistras sedan in.

## Capabilities and Constraints

- React + Vite på GitHub Pages; Supabase för databas, bildlagring och Edge Functions (Claude för avläsning och krönika).
- Bilder komprimeras till WebP i webbläsaren innan uppladdning.
- Gränssnittet finns på svenska och engelska (språkval uppe till höger, standard efter webbläsaren); spelets egna namn (zoner, monster, items) på engelska. Det gänget skrivit översätts aldrig. AI-texter skrivs på språket hos den som genererar.

## Brand Commitments

- Krönikan är en del av samma app och behåller Förrådets tavernavärld: målad header, målade menyknappar, järn- och guldramar, Cinzel och Crimson Pro.
- Seriestilen för AI-bilderna: stiliserad 3D (Pixar/Blizzard-lik), 3:2, M&M-logga och pergamentskylt med zonnamn uppe till vänster, pratbubblor på språket hos den som gör bilden.

## Evidence on Hand

- Gängets första kapitel, "Första äventyret i Rothold", med sju seriebilder.
- Referensbilder på karaktärerna i stilbibeln.

## Product Principles

1. Att minnas går före att administrera: läsning ska kännas som ett äventyr, inte som ett formulär.
2. Att lägga in ska vara friktionsfritt mitt i spelet: klistra in och spela vidare.
3. Gängets egna ord och skämt går före AI:ns; AI föreslår, gänget bestämmer.
4. Samma värld överallt: Krönikan ska kännas som en del av Förrådet.
