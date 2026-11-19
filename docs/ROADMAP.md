# MnM Armory & Chronicles — Product Vision, Implementation Plan and Development Roadmap

**Version:** 2.0 · **Reviewed:** 20 November 2026 · **Target:** `djyret/mnm-items` (GitHub Pages + Supabase)

> **Vision:** Evolve our shared *Monsters & Memories* item stash into a connected character armory, equipment tracker, adventure planner and living record of our time together.
>
> **Website:** https://djyret.github.io/mnm-items/#/kronikan
>
> **Language requirement:** **English throughout the website**, including navigation, UI copy, forms, validation, notifications and new generated content.
>
> **Access requirement:** **Separate read and write permissions**. People may browse content they are allowed to see, but only explicitly authorized users may create, edit, upload, publish or delete it.
>
> **Document purpose:** A living product vision, prioritized roadmap and implementation blueprint for GitHub. Sections 14–23 add a repository-specific technical audit, explicit decisions, migration order, security controls, testing and deployment criteria. Public source code has been checked, but live Supabase database state, deployed behavior and private configuration have **not** been verified.

---

## 1. Why We Are Building This

We want a tool that is genuinely useful while playing *Monsters & Memories* and becomes more valuable as months and years pass.

In the future, we should be able to revisit:

- The characters we played and what they looked like.
- How our levels, playstyles and equipment evolved.
- The items we found, loaned, traded, equipped and eventually replaced.
- The dungeons, named encounters, quests and unexpected moments we shared.
- Who was there for our most memorable adventures.
- The victories, wipes, in-jokes and screenshots that became part of our shared history.

**We are not trying to build another generic M&M database.** Our unique value is the connection between practical gameplay tools and the memories we create together.

### Three product goals

1. **Gameplay utility:** Find usable gear, help friends and alts, compare upgrades and plan adventures.
2. **Character identity:** Showcase characters with armor, weapons, pets, stats, levels, milestones and progression.
3. **Shared memories:** Capture, organize and rediscover gaming sessions through screenshots, chapters, timelines and achievements.

### Guiding principle

> **Remembering adventures should be easier than administering a website.**

Reuse existing data, connect related records and minimize the effort required to capture an evening's story.

---

## 2. Existing Foundation

The earlier public-source review identified the following areas. These are **features previously described or represented in code**, not a guarantee that every feature is fully working in the current deployment.

| Existing area | Previously identified capabilities | Opportunity |
|---|---|---|
| **Item Stash** | Screenshot-based item capture, ownership, status, loans | Equipment history, wishlists, matching |
| **Characters** | Character name, player, class, race, level, linked items | Full visual Armory profiles |
| **Alts** | Filtering useful gear and Discord loan requests | Upgrade recommendations and sharing |
| **Chronicles** | Adventure chapters with zones, screenshots and stories | Searchable history connected to people and loot |
| **AI Storytelling** | Stories based on player-provided adventures | Editable seasons, recaps and themed narratives |
| **Slideshows** | Chapter playback with images, text and transitions | Shareable highlights and anniversary reels |
| **Visual Style Guide** | Recurring art style and character references | Consistency across years of content |

### Product decision

**Do not rebuild the project from scratch.** Create meaningful relationships between characters, items, screenshots, chapters, zones and achievements.

---

## 3. Priority Features

### 3.1 Character Armory — Highest Priority

Every character should have a dedicated page that feels like a classic MMORPG character profile.

**Example:** Daremx — Elementalist — Legends.

#### Core features

- Character screenshots or portraits from the front, back and optionally the side.
- Visible name, class, race, guild and current level.
- A clickable **paper doll** with equipment slots.
- Equipped items with names, verified stats, requirements and linked details.
- Separate tabs for **Equipped**, **Inventory** and **Wishlist**.
- Comparison between current equipment and candidate upgrades.
- Current character stats where verified data exists.
- Relevant pets, spells and class-defining abilities where documented.
- **Gear History:** past equipment sets, timestamps and level where known.
- **Fashion Gallery:** screenshots of different armor appearances, including before/after views.
- Links to character milestones, achievements and Chronicle chapters.

#### Illustrative equipment slots

Use the actual game-supported and database-supported slots. As an initial UI sketch:

| Row | Example slots |
|---|---|
| 1 | Head, Neck, Ear |
| 2 | Chest, Arms, Hands |
| 3 | Wrist, Legs, Feet |
| 4 | Main Hand, Off Hand, Ranged |

This is **not** a verified complete M&M equipment-slot schema.

#### Concept layout

```text
┌────────────────────────────────────────────────────────┐
│ DAREMX                             Elementalist        │
│ <Legends>                          Level: [current]    │
├───────────────────────────┬────────────────────────────┤
│                           │  [Head]    [Neck]  [Ear]   │
│     CHARACTER IMAGE       │  [Chest]   [Arms]  [Hands] │
│   front / back / side     │  [Wrist]   [Legs]  [Feet]  │
│                           │  [Main]    [Off]   [Range] │
├───────────────────────────┴────────────────────────────┤
│ Equipped | Inventory | Wishlist | Gear History         │
├────────────────────────────────────────────────────────┤
│ Milestones | Adventures | Important Loot | Gallery     │
└────────────────────────────────────────────────────────┘
```

#### Important visual limitation

The site cannot automatically render the game's true 3D character wearing arbitrary armor from item stats alone. That requires access and permission to use the relevant game models, textures and assets. **Start with genuine in-game screenshots** from consistent camera angles.

#### Armory MVP

1. Character profile with an optional portrait.
2. Equipment slots linked to existing item records.
3. Equipped / Inventory / Wishlist tabs.
4. A simple record of item equip/unequip changes.
5. Links to the Chronicle entry where a significant item was obtained.

### 3.2 Adventure Journal — Personal Character History

Each character should have a **personal timeline** derived from the shared Chronicles.

Features:

- Chapters in which the character participated.
- First visits to zones and dungeons.
- Important level milestones.
- Significant loot and upgrades.
- First named kills and difficult encounters.
- Fun incidents and favorite group screenshots.
- Filters by zone, date, participants, encounter and event type.

A single documented Fallen Pass adventure should appear in both the shared Chronicle and Daremx's personal timeline **without entering it twice**.

### 3.3 Quest Board — Shared Goals

Keep adventure planning lightweight rather than turning the website into project-management software.

Features:

- Personal goals: gear, spells, quests, levels, alts, dungeons and epics.
- Shared group goals and upcoming activities.
- Express interest in or vote on the next adventure.
- Find objectives shared by multiple players.
- See which characters need the same zone, named or quest step.
- Statuses: **Planned**, **In Progress** and **Completed**.
- Link completed goals to screenshots and Chronicle entries.

```text
THE QUEST BOARD

[ ] Help DerinX get an upgrade
[ ] Explore the next part of Fallen Pass
[ ] Organize a difficult named encounter
[ ] Capture the next major level milestone
```

A goal should take only a few seconds to create.

### 3.4 Explorer's Atlas — Map of Our Adventures

Create an interactive view of **the world we have actually explored**, rather than attempting to recreate a complete official game atlas.

Features:

- Visited zones and notable locations.
- Markers for camps, named encounters, dungeons and memorable events.
- Click a zone to view related Chronicles, screenshots and loot.
- Exploration states such as **Discovered**, **Explored** and **Return Later**.
- Player-written notes clearly separated from verified game facts.

Start with a simple zone overview or a clickable image map. Do not invent geographic coordinates, spawn points or map details.

---

## 4. Expand Chronicles into a Searchable Memory Archive

Chronicles should become more connected, searchable and enjoyable to revisit over time.

### 4.1 Moment of the Night

For every session, select:

- The best screenshot.
- A short comment or memorable quote.
- Participants.
- Date and zone.

It can celebrate an epic victory, a disastrous wipe, an inside joke or a quiet moment.

### 4.2 Achievements & Firsts

Capture personal and group milestones:

- First named kill.
- First dungeon completion.
- Major level milestones.
- First truly significant drop.
- Epic quest stages and completion.

Each achievement should link to its original Chronicle chapter and relevant characters.

### 4.3 On This Day

Bring back an adventure from the same date in an earlier year:

- Screenshot and chapter.
- Participants.
- What happened.
- Important loot or milestones.

### 4.4 Chronicle Seasons

Bundle individual chapters into story arcs, such as:

- *The Road to 60*
- *The Rothold Chronicles*
- *The Legends Era*

A season can have cover art, a summary, a chronological chapter index and an optional slideshow.

### 4.5 Link Chronicles and the Item Stash

**One item event should be traceable across the entire site.**

An item page could show:

> Found during an adventure in Fallen Pass, later handed to another character and eventually equipped by an alt.

A Chronicle entry could show:

- The loot found that night.
- Which character received each item.
- Whether items were later loaned, traded or replaced.
- Links back to the items in the Stash.

This creates **a history of equipment**, not just an inventory list.

---

## 5. Other Useful Features

| Feature | Benefit | Priority |
|---|---|---|
| **Loot Wishlist & Matchmaker** | Match available items to interested characters and alts | Very High |
| **Adventure Planner** | Organize zone ideas, participants and goals for the next session | High |
| **Progression Tracker** | Track character levels, played time and milestones | High |
| **Pet & Spell Laboratory** | Store measured pet damage, buffs, regeneration and comparisons | High |
| **Dungeon Bestiary** | Record named encounters, observed drops and strategies | Medium |
| **Legendary Loot Gallery** | Hall of Fame for exceptional items | Medium |
| **Group Achievements** | Celebrate shared accomplishments | Medium |
| **Discord Weekly Recap** | Share a curated weekly adventure summary | Medium |

### 5.1 Loot Wishlist & Matchmaker

Use existing Stash data to:

- Identify characters who can use an item based on documented requirements.
- Show who has wishlisted it.
- Highlight possible upgrades and loans.
- Prepare an optional Discord request.

**The website should never allocate loot automatically.** It should help the group communicate.

### 5.2 Pet & Spell Laboratory

An evidence-based home for testing gameplay mechanics, especially Elementalist pets.

Recommended fields:

- Date and game version / patch.
- Character, class and level.
- Pet type: Water, Fire, Earth or Air.
- Relevant stats and active buffs.
- Target type, level or con where known.
- Method, number of observations and test duration.
- Damage, attack speed, mana, regeneration, survival and XP/hour where measured.
- Limitations, uncertainties and comparison with older tests.

Clearly label **measured observations**, **interpretations** and **hypotheses**. Do not present speculative mechanics as facts.

### 5.3 Dungeon Bestiary

Build a group-owned record of:

- Zones and camps.
- Named mobs and encounters.
- Observed drops.
- Tactics and risks.
- Links to the adventures that produced each observation.

This is our group's documented knowledge, **not an official or necessarily complete game wiki**.

### 5.4 Discord Weekly Recap

Generate an editable draft containing:

- Sessions and participants.
- Levels and achievements.
- Important loot.
- One or two screenshots.
- Ideas for next week.

Publishing to Discord must require a deliberate action and appropriately authorized integration.

---

## 6. Navigation and Information Architecture

Keep the existing fantasy / tavern direction: **dark wood, iron, bronze, parchment and restrained effects** rather than a generic SaaS dashboard.

| Navigation | Purpose |
|---|---|
| **The Tavern** | Shared home page with recent activity and highlights |
| **Heroes** | Characters, Armory, portraits and progression |
| **The Stash** | Items, equipment, loans and wishlists |
| **Chronicles** | Adventures, screenshots, stories and seasons |
| **The Atlas** | Zones, maps and discoveries |
| **Quest Board** | Personal and shared goals |
| **Hall of Fame** | Achievements, firsts and legendary loot |
| **The Laboratory** | Experiments and evidence-based game mechanics |

This is a **target structure**, not a requirement to add eight top-level menus immediately.

### Suggested home page: The Tavern

1. Latest adventure.
2. Current group goals.
3. Next planned session.
4. New items of interest to alts.
5. Screenshot of the week.
6. Recent character milestones.

### English-only interface requirement

**All product-controlled UI text must be in English**, including existing and future features:

- Navigation, headings, page titles and buttons.
- Tabs, form labels, dropdowns, search and filter options.
- Validation messages, errors, confirmations and toast notifications.
- Item statuses, goal statuses, permission names and onboarding instructions.
- Email / Discord templates, share text and automated summaries.
- Empty states, accessibility labels, image-alt helpers and tooltips.
- Admin settings and help documentation.

Use **English as the default and canonical interface language (`en`)**. Centralize copy in an English translation dictionary or equivalent shared string layer rather than leaving Swedish text embedded across React components. **Also replace localized text baked into raster assets** (the current painted site header and menu images contain Swedish wording); use English artwork or accessible HTML text over language-neutral imagery. Translate the Swedish AI prompt/schema descriptions and client-side shared-passphrase dialogs as part of this migration; translating React labels alone is insufficient.

**Preserve proper nouns** such as Daremx, DerinX, Gabex, Fizzler, Legends and in-game zone/item names. Existing player-written Chronicles and quoted dialogue are historical content: retain their originals; offer an optional **reviewable English translation** rather than silently overwriting them. New AI-assisted drafts should default to English and require review before publication.

#### Language acceptance criteria

- [ ] Every existing page and interactive flow has English UI text.
- [ ] English is the default language for new visitors and signed-in users.
- [ ] No Swedish remains in system labels, validation or notifications (except historical user-generated text and proper nouns).
- [ ] Painted header/menu images and image alt/aria text are English; Swedish image text is not left behind.
- [ ] Edge Function responses, AI prompts/defaults and generated text are English, with user-authored historical content preserved.
- [ ] Dates and times are displayed consistently, with time zone information where relevant.
- [ ] New story/recap generation defaults to English, with editable output.
- [ ] English terminology is consistent across Stash, Armory, Chronicles and permissions.

---

## 7. Read / Write Permissions and User Roles

**This is a core requirement, not a later cosmetic improvement.** The GitHub Pages site may be publicly accessible, but that must not imply that every visitor can modify the underlying content.

### 7.1 Recommended access policy

**Default recommendation: public-read for deliberately published material, authenticated-write for approved contributors, and private/group-only access for drafts or personal material.**

Use four access levels:

1. **Visitor (not signed in):** Can view content explicitly marked **Public / Published**. Cannot write, upload or delete anything.
2. **Reader (signed in):** Can view published content and content shared with the approved group. Cannot create, modify, upload, publish or delete.
3. **Editor (approved contributor):** Can read group content and create/edit permitted characters, items, goals, screenshots and Chronicles. Publishing and editing other people's entries should follow explicit ownership or collaboration rules.
4. **Admin:** Manages invitations, roles, publication rules, content moderation, recovery and all authorized edits/deletions.

Make the visibility of each item or Chronicle explicit where needed: **Public**, **Group Only** or **Draft / Private**. For simplicity, inherit visibility from the parent Chronicle or character when appropriate.

### 7.2 Permission matrix

| Action | Visitor | Reader | Editor | Admin |
|---|:---:|:---:|:---:|:---:|
| View published profiles, items and Chronicles | Yes | Yes | Yes | Yes |
| View group-only material | No | Yes | Yes | Yes |
| View another author's private drafts | No | No | No | Yes* |
| Create/edit own permitted items and goals | No | No | Yes | Yes |
| Upload screenshots or character portraits | No | No | Yes | Yes |
| Edit shared group records | No | No | If explicitly allowed | Yes |
| Edit another person's private character records | No | No | No | Yes* |
| Publish or unpublish content | No | No | By policy/approval | Yes |
| Delete content | No | No | Own content (soft delete) | Yes |
| Invite users / assign roles | No | No | No | Yes |
| Change security and access settings | No | No | No | Yes |
| Restore deleted records / administer backups | No | No | No | Yes |

`*` Administrative access to private material should be limited to cases that are necessary and clearly documented. Avoid collecting private information the group does not need.

**Important:** A Reader is not the same as an anonymous Visitor. Reader access can be invite-only, allowing the site to remain publicly reachable while group-only records stay protected.

### 7.3 Expected user experience

- A Visitor or Reader can browse normally, but **Add**, **Edit**, **Upload**, **Delete** and **Publish** actions are hidden or disabled as appropriate.
- If a user tries a restricted action, show a clear English message: **You need editor access to make changes.**
- Editors see a lightweight sign-in and editing experience, not a separate complex admin panel for ordinary work.
- Admins see a **Members & Permissions** page with invitations, roles and revocation controls.
- Every meaningful content change records **who changed what and when**.
- Deleting an entry should normally use a soft-delete / restore path.
- A character may have a designated owner; edits to it should respect the owner's permissions unless the owner explicitly enables collaboration.

### 7.4 Technical enforcement — GitHub Pages + Supabase

GitHub Pages serves static client-side files. **Hiding an edit button in React does not protect data.** Read/write restrictions must be checked by the backend/database and storage layer.

Assuming the project still uses Supabase, the recommended architecture is:

- **Supabase Auth** for identity; invitation-only accounts for Readers, Editors and Admins. Select an appropriate supported sign-in method (email link, password or OAuth), and configure redirect URLs for the GitHub Pages site.
- A server-governed `profiles` / `memberships` table containing user identity, role, status and optional character ownership. Roles must **not** be self-assignable through client requests. An authenticated user with **no active membership** has **Visitor-level** data permissions, regardless of sign-in state.
- **Row Level Security (RLS)** enabled on every exposed table with role- and ownership-aware `SELECT`, `INSERT`, `UPDATE` and `DELETE` policies. Avoid permissive legacy write policies.
- `SELECT` policies must enforce visibility: only published content to anonymous users; group content to approved members; draft/private content to permitted owners/admins.
- `INSERT` / `UPDATE` / `DELETE` must require an approved Editor or Admin and validate record ownership and collaboration rules.
- **Supabase Storage policies** must enforce the same separation for images, item screenshots and Chronicle assets. Private media must use private buckets and appropriately authorized access; a hidden URL is not an access-control mechanism.
- Any privileged operations — assigning roles, approving memberships, administrative restoration — must happen through a protected server-side function or similarly trusted path, never direct client-side role updates.
- Do **not** put a Supabase `service_role` key or other privileged secrets in the Vite frontend, repository or GitHub Pages configuration. A public anon/publishable key is acceptable only with correctly configured RLS.
- Any direct API, export, file-upload or AI generation endpoint must enforce the same access checks, rate limits and relevant abuse protections. **Do not continue to use the existing `x-gang-word` shared secret as the production authorization model**; check authenticated user identity and membership permissions server-side, with per-user AI quotas and cost controls.
- Configure safe session handling, sign-out, role revocation and a way to remove a contributor's access immediately.

#### Example logical policy requirements (pseudocode, not deployable SQL)

```text
READ(record, user):
  allow if record.visibility == PUBLIC and record.status == PUBLISHED
  else allow if user is active MEMBER and record.visibility == GROUP
  else allow if user owns the permitted draft or is authorized ADMIN

CREATE(record, user):
  allow only if user has active EDITOR or ADMIN role

UPDATE(record, user):
  allow only if user has active EDITOR or ADMIN role
  AND (user owns record OR record is explicitly shared for editing OR user is ADMIN)

DELETE(record, user):
  allow only for a permitted owner or ADMIN
  prefer soft-delete + restore + audit entry

ASSIGN_ROLE(user, target, role):
  allow only through an authenticated, server-verified ADMIN action
```

Implement actual SQL policies against **the current database schema**, not against the illustrative field names in this document. Test policy interactions, `WITH CHECK` conditions, ownership changes, foreign keys and storage paths.

### 7.5 Data ownership and publishing

For character portraits, screenshots and adventure stories, record:

- Creator/uploader and optional character owner.
- Visibility level.
- Created/updated timestamps.
- Source asset and whether an image/story is original or AI-generated.
- Publication and editing history.

By default, user-generated uploads intended for the group should be **Group Only** until deliberately published. This prevents an accidental public gallery of personal screenshots.

### 7.6 Permission acceptance tests

- [ ] Anonymous Visitors can read **only** explicitly published public records.
- [ ] Anonymous Visitors cannot add, change, delete or upload through the UI **or direct API calls**.
- [ ] Readers can read group-only material but cannot write by API, URL manipulation or UI.
- [ ] Editors can create and edit records in their authorized scope, but cannot change their own role or other owners' private records.
- [ ] Admins can invite/revoke users and grant/revoke roles through a protected management flow.
- [ ] Public and private image URLs behave according to their visibility settings.
- [ ] RLS is enabled and tested for every exposed table and relevant storage bucket.
- [ ] Edge Functions validate user identity, membership, permission to access the requested resource, and AI usage limits; unauthorized requests cannot generate paid API calls.
- [ ] Migrating private images does not break any existing published chapter, image link or AI reference flow.
- [ ] Former members lose access after revocation, including to future private downloads.
- [ ] Destructive actions are logged and recoverable where feasible.
- [ ] Unauthorized access returns an appropriate English error message without exposing private data.

---

## 8. Prioritized Development Plan

### Phase 0 — English and Secure Foundations

**Goal:** Make the entire website usable in English and establish safe, predictable access controls before expanding the data it stores.

- [ ] Inventory every current page, dialog, form and notification containing Swedish UI text.
- [ ] Introduce English UI copy as the default and migrate existing UI strings.
- [ ] Audit existing database and storage access policies; remove unintended anonymous writes.
- [ ] Add authentication, memberships and **Visitor / Reader / Editor / Admin** roles.
- [ ] Enforce RLS and storage permissions; test direct API access, not just UI controls.
- [ ] Add Members & Permissions management and ownership rules.
- [ ] Protect screenshots, drafts and group-only content.
- [ ] Add editing audit history, soft-delete/recovery and backup verification.

**Exit criterion:** The public site can be read safely, the interface is in English, and only approved Editors/Admins can write in their authorized scope.

### Phase 1 — Highest Value, Lowest Complexity

**Goal:** Make existing modules personal and connected.

- [ ] Character portraits and improved profiles.
- [ ] Equipment slots linked to existing items.
- [ ] Equipped / Inventory / Wishlist views.
- [ ] Basic gear history.
- [ ] Participant and zone tags in Chronicles.
- [ ] Links from items to the adventure where they were found.
- [ ] Lightweight Quest Board for shared goals.

**Recommended first feature shipment:** Character Armory + gear-to-Chronicle linking.

### Phase 2 — Long-Term Memory and Character Identity

- [ ] Full character adventure timelines.
- [ ] Level milestones and other important progress.
- [ ] Achievements & Firsts.
- [ ] Chronicle filters for characters, zones and event types.
- [ ] On This Day.
- [ ] Chronicle Seasons.
- [ ] Legendary Loot Gallery.

### Phase 3 — Advanced Gameplay and Community Tools

- [ ] Explorer's Atlas.
- [ ] More detailed item comparison.
- [ ] Pet & Spell Laboratory.
- [ ] Dungeon Bestiary.
- [ ] Wishlist-to-Stash matching.
- [ ] Editable Discord Weekly Recap.
- [ ] More automated Chronicle compilation.

### Why this order?

Phase 0 avoids exposing additional content through weak permissions and establishes a consistent English experience. Phase 1 builds directly on information we already collect. Phase 2 makes that information more valuable over time. Phase 3 adds richer tools that require more data and upkeep.

---

## 9. Data Model and Content Integrity

The earlier review identified React, Vite, Supabase, screenshot-based item capture and AI-generated Chronicle material. **Verify current versions, schema and operational status before implementation.**

### 9.1 Connected data model

Characters, items, screenshots, chapters, places and achievements should have stable IDs and explicit relationships.

| Entity | Illustrative fields |
|---|---|
| `characters` | id, owner_user_id, name, class, race, level, portrait, visibility |
| `items` | id, name, stats, requirements, image, visibility |
| `character_equipment` | character_id, item_id, slot, equipped_at, unequipped_at |
| `item_events` | item_id, event_type, character_id, timestamp, chapter_id |
| `chapters` | id, date, title, zone_id, narrative, author_id, visibility, status |
| `chapter_participants` | chapter_id, character_id |
| `screenshots` | id, chapter_id, uploaded_by, timestamp, caption, visibility, source_type |
| `zones` | id, name, map_reference |
| `achievements` | id, title, date, chapter_id |
| `achievement_participants` | achievement_id, character_id |
| `goals` | id, owner_id, type, description, status, visibility |
| `experiments` | id, patch_version, method, sample_size, result, uncertainty |
| `memberships` | user_id, role, status, invited_by, created_at |
| `audit_events` | id, actor_user_id, action, entity_type, entity_id, timestamp |

These are **illustrative entities, not a ready-made migration** or a statement of the current schema. Reuse existing tables and avoid duplicating data where possible. **Current source types already contain `items.holder_id`, `items.status`, `item_events`, `chronicle_cast`, `chronicle_entries` and the game-specific `SLOTS` list.** Section 17 defines the required reconciliation before writing SQL migrations. Visibility and ownership may be modeled at a shared-resource level when appropriate.

### 9.2 Separate historical facts from AI interpretation

- Genuine screenshots and player notes are primary source material.
- AI-generated illustrations and stories must be clearly identifiable as generated.
- AI-written stories must remain editable before publication.
- Preserve the relationship between a narrative and its original evidence.
- Do not invent loot, participants, dates or encounters and present them as historical facts.
- If translating a historical Chronicle to English, preserve the original and allow author review.

### 9.3 Backup, audit and recoverability

- Automated, regularly tested backups of records and media.
- Versions or audit trails for important edits.
- Soft deletion and restoration for user content.
- Clear authorship and content permissions.
- A documented recovery process for accidental deletion or malicious edits.

---

## 10. Long-Term Design Principles

### Design for a small group, not a public SaaS business

- Easy maintenance.
- Fast session logging.
- Few mandatory fields.
- Ability to update old chapters later.
- Mobile-friendly reading and uploading.
- Clear ownership, editing rights and change history.

### Reuse data across views

An important item drop should be recorded once, then appear in:

- The Stash.
- Character Armory.
- Gear History.
- The relevant Chronicle chapter.
- Hall of Fame.
- Weekly Recap.

### Avoid false precision

- Compare only documented item stats.
- Record patch versions for mechanics tests.
- Distinguish verified findings from speculation.
- Use real screenshots for actual character appearance.
- Never invent map coordinates or item drop rates.

### Keep the visual style coherent

Classic fantasy visuals — parchment, wood, iron, bronze — suit M&M better than a generic business dashboard. Use effects sparingly and prioritize readability and speed.

### Build trust through English and permissions

- Use English consistently in all UI and system-created messages.
- Make read/write rights visible and predictable.
- Default new personal/group uploads to non-public visibility.
- Explain who can edit shared content before asking people to contribute.
- Make data recovery and role revocation straightforward.

---

## 11. Proposed GitHub Issues

These titles are ready to adapt into a project backlog. **Security and language issues come before new modules.**

| Order | Issue title | Deliverable |
|---|---|---|
| 1 | `Audit current Supabase RLS and storage access` | Identify and close anonymous/unintended write access |
| 2 | `Add authentication and read/write role management` | Visitor, Reader, Editor and Admin permissions |
| 3 | `Enforce ownership-aware RLS for all content APIs` | Server-side access enforcement |
| 4 | `Secure screenshots and private Chronicle assets` | Protected storage and appropriate visibility |
| 5 | `Convert the entire UI to English` | English navigation, forms, messages and templates |
| 6 | `Add a Members & Permissions admin page` | Invite, assign/revoke roles and inspect membership |
| 7 | `Add edit history, soft delete and backup checks` | Recovery and accountability |
| 8 | `Add character portraits and profile layout` | Hero profile with images |
| 9 | `Introduce equipment slot assignments` | Items mapped to actual equipment slots |
| 10 | `Add Equipped, Inventory and Wishlist tabs` | Three clear equipment views |
| 11 | `Track item equip and unequip history` | Character gear timeline |
| 12 | `Link items to Chronicle chapters` | Loot provenance and story links |
| 13 | `Tag characters and zones in Chronicles` | Search/filter and reusable participant data |
| 14 | `Create a lightweight group Quest Board` | Shared adventure goals |
| 15 | `Add character adventure timelines` | Personal Chronicle feed |
| 16 | `Create Achievements and Firsts` | Group and individual milestones |
| 17 | `Create an Explorer's Atlas MVP` | Linked zone discovery map |
| 18 | `Introduce a Pet & Spell Laboratory` | Recorded experiments and patch context |

### Definition of done — English + access control

- [ ] All product-owned UI text is in English.
- [ ] Published pages can be read according to visibility policy.
- [ ] No unauthenticated user can write to content tables or upload media.
- [ ] Reader accounts cannot write, even through direct requests.
- [ ] Editors can edit only allowed content.
- [ ] Admins can grant and revoke access securely.
- [ ] Private and group-only media is inaccessible to unauthorized users.
- [ ] Security checks are tested and do not depend on hidden UI buttons.

### Definition of done — Character Armory MVP

A permitted user can:

1. Open a character profile.
2. See an actual screenshot of the character.
3. See equipped items in their respective slots.
4. Open the details of any equipped item.
5. See when an item was equipped or replaced.
6. Follow a link to the relevant Chronicle if the item was found during a documented adventure.

Readers can view the appropriate information without receiving any editing capability.

---

## 12. The Long-Term Destination

Imagine opening the website five years from now.

Daremx has reached level 60, perhaps earned an Epic, changed armor many times and shared hundreds of adventures with DerinX, Gabex and Fizzler. We can see how our characters developed, find the evening when a special item dropped, revisit the screenshots and reread our favorite encounters.

At the same time, the site remains useful today: find an upgrade, help an alt, plan the next dungeon and solve new challenges together.

**The combination of practical game tools and a shared adventure archive is what makes this project unique.**

### Final recommendation

**First, establish English and secure read/write access. Then build Character Armory and connect it to the Stash and Chronicles.**

That sequence combines:

- A consistent, accessible experience for the whole group.
- Safe contribution by approved members.
- The visual identity of our characters.
- Their equipment and progression.
- Our discoveries and meaningful loot.
- The story of our adventures together.

Every later feature can grow on this foundation.

---

## 13. References, Scope and Status

- **Public website:** https://djyret.github.io/mnm-items/#/kronikan
- **Document type:** Product vision, English UI specification, access-control requirements and prioritized roadmap.
- **Status:** Implementation-oriented roadmap and engineering blueprint (see Sections 14–23); **not** executable code, a verified production migration or proof of live database security.
- **Verify before development:** Production Supabase tables and RLS, Storage bucket policies, effective roles/auth settings, existing data, deployment state and migration history. The public repository code and several component paths have been reviewed for the v2 appendix.
- **Key acceptance criteria:** English across UI/artwork/AI defaults; secure read-versus-write separation including paid AI functions and private media; authorized content contribution; connected Armory, Stash and Chronicles.

*This document consolidates the original MnM Förrådet roadmap, adds English-only UI and explicit read/write roles, and includes a repository-specific engineering audit and deployment sequence in Sections 14–23.*

---

## 14. Implementation-Readiness Review — Source-Verified Findings

**Audit scope:** Public repository files inspected on 20 November 2026; see links in Section 23. This is a **code-and-document audit, not a live penetration test**. The deployed Supabase project, its effective RLS policies, remote environment variables, production auth settings and data cannot be inferred from the repository alone.

**Overall result:** The product direction is coherent and feasible on the existing stack, but **the previous 721-line document was not ready to be handed to an autonomous coding agent as one uninterrupted implementation job**. It lacked a migration sequence, compatibility rules for existing assets, explicit server-side checks for paid AI, item/equipment identity rules, and a complete delivery/testing contract. The requirements below close those *planning* gaps; implementation code and remote configuration still need to be verified and produced.

| Severity | Verified observation | Consequence / required action |
|---|---|---|
| **P0 — security** | `supabase/config.toml` lists `verify_jwt = false` for `parse-item`, `berattelse`, `seriebild`. The function handlers check a shared `x-gang-word` header rather than an authenticated user. | Replace shared-word-only protection with verified user identity, active membership, per-function authorization and per-user limits before expanding access. `verify_jwt=false` alone is not proof of a vulnerability, but the current code does not identify a distinct contributor. |
| **P0 — AI spend** | The browser's `web/src/lib/functions.ts` stores the shared word in `localStorage`; the functions call paid Anthropic/OpenAI endpoints. | A shared word cannot support individual revocation, attribution or per-user quotas. Add rate limiting, request size/concurrency caps, cost budgets, logging and denial before paid calls. |
| **P0 — data access** | `PRODUCT.md` explicitly describes no sign-in and link-based read/write. Current forms write through the public browser Supabase client. | Introduce Auth + active membership roles and RLS; inspect **deployed** policies before declaring current live access safe or unsafe. |
| **P0 — private images** | `imageUrl()` and `kronikaUrl()` use `getPublicUrl`; `seriebild` fetches from `/storage/v1/object/public/kronikan/...`. | Simply marking a bucket private will break readers and AI image generation. Migrate storage and image consumers together, using authorized access / signed URLs and staging tests. |
| **P1 — English artwork** | `App.tsx` renders painted menu assets and `DESIGN.md` describes a painted header with Swedish text. | Replace/retouch text-in-image assets or use language-neutral art plus accessible English HTML text; translation dictionaries do not alter pixels. |
| **P1 — AI language** | `berattelse` instructions, schemas and story prompts are explicitly Swedish; `kronikan.ts` asks for Swedish speech bubbles. | Make new default output English; retain original player quotations and published old content; translate or revise image-overlay prompts and moderation/error messages. |
| **P1 — real inventory slots** | `web/src/lib/constants.ts` defines `HEAD`, `FACE`, `NECK`, `EAR`, `SHOULDERS`, `CHEST`, `BACK`, `SHIRT`, `WRIST`, `HANDS`, `FINGER`, `WAIST`, `LEGS`, `FEET`, `PRIMARY`, `SECONDARY`, `RANGE`, `AMMO`. | The paper-doll sketch in Section 3 is incomplete. Use the existing game-specific slot codes, model paired slots and enforce occupied-slot constraints. |
| **P1 — equipment consistency** | Current `items` include `holder_id`, `status='equippad'` and lending fields, but no definitive per-slot assignment in the source types. | A new equipment table must not silently contradict existing item status / owner / loan records. Write migration and synchronization rules first. |
| **P1 — release pipeline** | GitHub Actions publishes `web/dist` after `npm run build`; DB deploy and function deploy are manual in README. | A GitHub push alone cannot create required tables, policies, storage buckets and deployed functions. Use explicitly staged deployment and rollback/runbook steps. |
| **P2 — UX scale** | Existing `StoreProvider` fetches all character and item rows into memory. | Fine for a small shared stash; plan pagination or server-side filtering only when measured usage warrants it, with RLS-filtered results and clear empty states. |

**Do not conclude** that live data is already exposed merely because repository code accepts anonymous/publishable API requests; remote database GRANTs and RLS might restrict them. **Do not conclude** that the shared-word model is a secure substitute for per-user authorization either.

### Corrected high-level decisions

1. **Preserve the architecture:** React + TypeScript + Vite on GitHub Pages; Supabase Postgres/Auth/Storage/Edge Functions. No full rewrite.
2. **Keep GitHub code access separate from application access:** GitHub repository collaborators/deploy permissions do **not** decide which signed-in player can edit an item or Chronicle. Supabase enforces app roles.
3. **Treat security as a coordinated migration, not a UI redesign:** Migrate DB grants/RLS, Auth, functions and storage with compatibility checks. Avoid a sudden change that makes existing pages empty.
4. **Avoid an all-or-nothing mega-PR:** Implement small, testable pull requests with explicit dependencies and manual deployment gates.
5. **Use source-supported terms and data:** Preserve existing IDs, item states, event history, game slot codes and genuine screenshots.

---

## 15. Product Decisions to Lock Before Coding

These are **recommended defaults**, not claims about decisions the team has already made. Record any alternative decision in `docs/DECISIONS.md` before writing migrations.

| Topic | Recommended decision | Why / test case |
|---|---|---|
| Public visibility | Only intentionally **Published + Public** records can be viewed anonymously. Everything else is **Group Only** or **Private Draft**. | A newly uploaded screenshot must not become public by accident. |
| Unrecognized signed-in account | Behaves as Visitor until invited/approved as an active member. | A user must not obtain Reader access merely by creating an Auth account. |
| Invite model | Admin-approved invitations/membership; turn off unneeded public sign-up or make all new sign-ups inactive. | Prevent self-service elevation. |
| Editor scope | Editors can create and edit their own records, plus explicitly shared group records. Admin manages exceptions. | No unrestricted editing of another player's private drafts. |
| Group content | Active Readers, Editors and Admins may read Group Only content; Visitors cannot. | A signed-in but unapproved user sees no group-only data. |
| Publishing | Editor can publish their own eligible records, subject to group policy; Admin can unpublish/moderate. | Prevent publishing another person's private screenshot. |
| Default new upload | Group Only; draft if attached to an unpublished Chronicle. | No accidental disclosure. |
| AI actions | Editors/Admins only, with per-user quota and resource-scoped authorization; explicit click required. | Read-only members cannot incur API costs. |
| Character owner | A `player` text label is **not** an authenticated identity; bind ownership to membership/user ID separately. | Changing a display name cannot transfer access rights. |
| Language | English UI and new generated drafts; retain source language of historic user-written content. | Avoid changing what friends originally wrote or said. |
| Dates | Store UTC timestamps and game-session local date separately; render `en-GB` dates with a visible time zone for timestamps. | A late-night session remains on its intended date. |
| Retention | Soft-delete domain records; preserve event/audit history; explicit admin process for media purges. | Restore accidental deletions without exposing old private media. |

**Privacy caveat:** Content previously made available through a public asset URL may have been downloaded or cached. Moving assets into private storage controls *future access*; it cannot retroactively retrieve all copies.

---

## 16. Repository Changes and Deliverable Map

Use the present file layout where possible. Names below are **proposed output files**, not paths confirmed to exist.

```text
mnm-items/
  README.md                             # update setup, English features, deploy instructions
  PRODUCT.md                            # align product description with new auth/English rules
  DESIGN.md                             # preserve visual system, replace baked-in Swedish art
  docs/
    ROADMAP.md                          # this document
    DECISIONS.md                        # accepted scope and product/security decisions
    SECURITY_MODEL.md                   # app roles, per-resource access, function permissions
    DEPLOYMENT.md                       # staging, migration, secrets, deployment, rollback
    DATA_DICTIONARY.md                  # source truth for item/character/chronicle relations
    BACKUP_AND_RESTORE.md               # DB/storage backup and restore drill
  web/
    src/
      lib/auth/                          # Auth context, membership, permission helpers
      lib/i18n/                          # shared English strings
      components/                        # permission-aware actions, avatar/Armory widgets
      pages/                             # sign-in, members/admin, Armory, future modules
      lib/supabase.ts                    # retain publishable-only browser client
      lib/functions.ts                   # replace shared-word flow with user auth requests
      lib/kronikan.ts                    # authorized image URLs, English generation defaults
      lib/constants.ts                   # user-facing labels in English; preserve DB codes
  supabase/
    migrations/                          # staged, additive, reversible-where-feasible SQL
    functions/
      parse-item/                        # authenticated, bounded AI parsing
      berattelse/                        # authorized English Chronicle generation
      seriebild/                         # authorized and rate-limited image generation
      _shared/                           # common identity, membership and quota checks
  .github/workflows/
    deploy.yml                           # existing GitHub Pages build/deploy
    ci.yml                               # proposed lint, type/build, tests, checks
```

**Maintain routing:** `web/src/App.tsx` currently uses `HashRouter` and `web/vite.config.ts` has `base: '/mnm-items/'`. Preserve existing `#/kronikan` and chapter deep links. Test Auth callback redirect behavior explicitly on GitHub Pages; do not assume a React route under the hash can directly handle OAuth or magic-link URL fragments.

**Docs consistency:** The existing README/PRODUCT/DESIGN describe a Swedish, no-login app. Update these documents alongside the code so future coding agents do not reintroduce the old behavior.

---

## 17. Database Migrations and Data Integrity

### 17.1 Preflight inventory — mandatory

Before producing SQL, inspect **actual** schema and production/staging policies, not just TypeScript interfaces:

- Export migration list, schema, primary/foreign keys, indexes, unique constraints, grants, existing RLS policies and RPC functions.
- Inspect effective `storage.buckets` and `storage.objects` policies and public/private flags.
- Count existing items, characters, `item_events`, Chronicle chapters/entries/cast and storage objects; sample orphaned references.
- Record deployed Edge Function versions and auth config.
- Back up **both** Postgres data and Storage objects with a tested restore location.
- Compare repo migrations with production schema before writing new migrations; do not assume they are identical.

### 17.2 Additive migration sequence

1. **Identity and membership:** add active/invited/suspended memberships, actor IDs, role audit; bootstrap the first Admin through a trusted one-time server/DB action.
2. **Visibility and provenance:** add nullable `created_by`, `visibility`, `publication_status`, `updated_by` and image provenance where useful; backfill old records to the agreed visibility without auto-publishing private material.
3. **RLS and grants:** create explicit `SELECT` / `INSERT` / `UPDATE` / `DELETE` policies and storage rules. Use correct `USING` and `WITH CHECK`. Avoid user-editable `role`, `owner_user_id`, `visibility` or `published_at` fields that allow privilege escalation. Use trusted functions or column restrictions for sensitive transitions.
4. **Backfill and reconcile:** map existing player labels to real members only with owner approval; preserve orphan records and provide admin resolution. Do not invent historical users or item assignments.
5. **Media migration:** copy required private/group images into protected storage, update DB paths atomically or with an explicit mapping table, migrate readers and generator references, verify counts/checksums, then retire obsolete public links where feasible.
6. **Equipment links:** introduce explicit equipped slots, gear event time and ownership constraints only after current `items.status` semantics have been reconciled.
7. **Chronicle relations:** add optional stable links from chapters/entries to character IDs and item events, without deleting historic string cast names or source entry IDs.
8. **Optional modules:** goals, achievements, experiments and atlas tables in subsequent migrations rather than all at once.

### 17.3 Source of truth for inventory and equipment

Current `items` records combine **item attributes** (`name`, `stats`, `slots`, etc.) and **a tracked possessed item** (`holder_id`, `status`, lending fields). For the first iteration, keep each existing `items.id` as the identity of **one tracked item record**. Do **not** merge duplicates based only on item name; two matching items may be owned separately.

- Preserve existing `items.status` values and `item_events` semantics during migration; map to English display labels without rewriting statuses prematurely.
- Decide whether `items.status='equippad'` is **derived** from active equipment rows or is the canonical source. **Do not leave two independently mutable sources of truth.** Recommended: active `character_equipment` row is canonical for *where* an item is equipped; keep existing status synchronized transactionally for compatibility until retired.
- `character_equipment` must reference `characters.id`, `items.id`, **the actual canonical slot code**, and `equipped_at`/`unequipped_at`. An item cannot be active in two characters' slots at once.
- One active item per character per **slot instance**, including paired `EAR`, `FINGER`, `WRIST` positions as necessary. Account for two-handed weapons and mutually exclusive PRIMARY/SECONDARY occupancy where applicable, using game-verified rules.
- Check item `slots` eligibility, required class/race/level **only when documented**; do not fake data to satisfy constraints.
- Do not infer an item was equipped in a specific slot merely because its current status says `equippad` — create an unresolved assignment for human review.
- Preserve lending (`lent_to_id`) vs owner/holder semantics. Prevent deleting a character without considering active equipment, loans and historical item events.
- Use a database transaction for equip, unequip, transfer and loan operations. Avoid client-only multi-step updates that can leave inconsistent rows.
- For gear history, record event timestamp and actor, and use a stable source reference to the item's screenshot where present.

### 17.4 Chronicle and character identity

- Current `chronicle_cast` (`role='hjalte' | 'husdjur' | 'npc'`) is **not** the same entity as the player-character directory. Preserve it as the visual storytelling cast and create optional explicit links to `characters.id`.
- Current `chronicle_entries.cast_names` and `source_ids` must continue to render older chapters; add normalized participation links gradually.
- Keep original screenshot files and reference them from generated art via explicit source IDs. A generated image is a separate derived asset, not a replacement of evidence.
- Avoid double counting the same item drop across Stash, Chronicle and Hall of Fame: link to the canonical `item_events` row.

### 17.5 RLS policy design requirements

Policy matrix by row, not only by whole-page route:

| Resource | Anonymous/Visitor | Active Reader | Active Editor | Admin |
|---|---|---|---|---|
| Public, published records | SELECT | SELECT | SELECT | SELECT |
| Group Only records | No | SELECT | SELECT | SELECT |
| Private drafts | No | No | Owner SELECT | Moderation/recovery where policy permits |
| User content write | No | No | Own/authorized shared rows | Authorized admin scope |
| Roles/memberships | No self-elevation | Read minimal self status | Read minimal self status | Trusted role management only |
| AI generation | No | No | Authorized target and per-user quota | Authorized target and quota |

**Mandatory negative test:** An Editor attempts to change the owner ID, elevate self to Admin, change another author's draft to Public, read another user's private media or update an unshared item using a direct Supabase REST request. These operations must be blocked **server-side**.

---

## 18. Auth, Storage and Edge Function Security

### 18.1 Authentication

- Prefer a low-friction Auth method supported by the real environment (e.g., email magic link/OTP). Configure trusted production redirect URLs for `https://djyret.github.io/mnm-items/` and development URLs; **test the callback with HashRouter**, refresh, expiry and sign-out.
- Choose whether new account registration is disabled or allowed but unapproved. In both cases, **no active membership = no group access or writes**.
- Enforce membership/role from a server-controlled table, not editable client metadata or the `player` name field.
- Permit Admin to revoke membership and ensure revocation blocks new queries and Edge Function calls promptly. A previously issued signed media URL may remain valid until expiration; keep TTL short for sensitive content.
- Browser application includes **only** a Supabase publishable key and public URL. Never ship a secret/service-role key in Vite, static assets, browser logs or GitHub source.

### 18.2 AI functions — replace shared passphrase

Current evidence: all three functions accept `x-gang-word`; `functions.ts` retrieves it from browser `localStorage`; and `verify_jwt=false` is configured. This gives shared possession of a word, not per-person permissions.

For `parse-item`, `berattelse`, `seriebild`:

1. Authenticate the signed-in caller's bearer token (using a supported Supabase user-auth mode or equivalent identity verification), and look up **active** membership.
2. Require **Editor/Admin** before invoking paid models; require ownership/authorized edit access to any chapter or image requested by ID.
3. Perform database reads/writes with the user-scoped client so RLS applies, or use a carefully reviewed trusted service path with explicit row authorization. **Do not** use the publishable key as a substitute for the user's session where group-only rows are required.
4. Add per-user and global rate/usage caps, max prompt/image sizes, request timeouts, concurrency limits and a daily budget/alerts for Anthropic/OpenAI. Deny excess requests **before** model calls.
5. Validate content types, URL/ID relationships, referenced image ownership and maximum reference count. Do not trust `entry_id`, `chapter_id`, `source_ids` or arbitrary prompt text to authorize access to someone else's data.
6. Ensure repeated clicks/retries cannot accidentally run expensive duplicate generations (idempotency key or explicit in-progress state).
7. Log caller ID, function, target record, time, success/failure and approximate cost without logging private screenshots, bearer tokens or full sensitive prompts.
8. Return English errors; sanitize upstream provider error details where needed. Set CORS to approved site origins as defense-in-depth, **never** as the authorization boundary.
9. Remove the shared-word UI/storage flow after the new identity-based authorization works; rotate the old shared word if it was broadly distributed.

**Compatibility warning:** The current `berattelse` and `seriebild` read PostgREST with the project publishable/anon key. Group/private RLS will block such reads unless the function carries a verified user's identity (or a securely authorized server read). `seriebild` also directly fetches public `kronikan` image URLs; migrate that code to authorized private object retrieval if the bucket becomes private.

### 18.3 Protected images

- Keep truly public published assets in a **public** bucket only when intentional, or use protected access for all assets if operational simplicity outweighs public CDN convenience.
- Store Group Only and Private Draft assets in **private buckets** with user/record-scoped Storage RLS; use short-lived signed URLs or authenticated download as appropriate.
- Model image visibility/parent access and ensure path-based upload policies cannot be bypassed by writing into another user's folder.
- Restrict upload size/type and normalize filenames; verify file content server-side where feasible. Do not rely on MIME provided solely by the browser.
- Revoke/expire private URLs after a membership change as far as the storage system allows; document unavoidable caching/TTL behavior.
- Update both image rendering helpers (`imageUrl`, `kronikaUrl`) and AI reference retrieval in `seriebild` **before** switching private buckets. Check images in older Chronicle pages, slideshow and character galleries.
- Preserve original game screenshots separately from derived AI assets. Keep backups outside the primary app bucket where possible.

### 18.4 Authorization tests (minimum)

- Anonymous direct insert/update/delete/upload fails; public SELECT returns only Public/Published rows.
- Unapproved signed-in account has no Reader/Editor privileges.
- Reader direct REST, Storage and Edge Function writes or paid AI calls fail.
- Editor A cannot read private draft or image of Editor B, nor edit B's character without explicit collaboration permission.
- Editor A cannot assign self Admin through profile update, metadata update, RPC or raw REST.
- Removed Editor loses group read/write and new paid-AI permission; existing temporary signed URLs expire as designed.
- Admin invitations/revocations and one-time bootstrap work, and no duplicate or orphan Admin state is created.
- Auth callback, session restore, sign-out and stale-session error states work on deployed GitHub Pages URL.

---

## 19. English Localization — Full Inventory

**Every user-facing layer needs translation**, not just visible JSX labels:

1. `web/src/App.tsx`: navigation, title, footer, access messages, `aria-label`s.
2. All `web/src/pages/*`, `web/src/components/*`: forms, empty states, tooltips, delete confirmation dialogs, errors, loan-request templates and mobile presentation.
3. `web/src/lib/constants.ts` and `web/src/lib/kronikan.ts`: statuses, categories, cast labels, weekdays, date formatting, narration-related prompts and user-facing terms. Keep underlying status codes and IDs intact until safe migration.
4. `web/src/lib/functions.ts`: eliminate Swedish shared-word prompts when migrating to per-user Auth.
5. Edge Functions `parse-item`, `berattelse`, `seriebild`: generated output and error messages default to English; no silent translation of player quotes.
6. Painted **header sign and menu buttons** (`bilder/...` and `ikoner/meny/*.webp`): replace localized embedded art or render English HTML labels over neutral images. Update `DESIGN.md` accordingly.
7. `PRODUCT.md`, `README.md`, on-site help and any future contributor docs: clarify that user-visible site copy is English.
8. Search filters and accessible UI: verify screen readers, keyboard navigation, responsive mobile views and image alt text.

**Historical integrity:** Preserve old Swedish Chronicle text and speech bubbles. Store optional English translation in a **separate field/version**, with author approval; never overwrite originals. If an AI illustration contains text baked into the image, treat it as an immutable historical artifact unless its creator deliberately regenerates it.

**Acceptance test:** Crawl every public page, authenticated read flow, edit form, admin page, error state and an AI-generated story. All new system copy is English, while real names and historical user material are preserved.

---

## 20. Deployment, QA, Rollback and Operational Readiness

### 20.1 Delivery strategy — small PRs

Do **not** merge a single PR that simultaneously changes RLS, storage visibility, Auth UI and image URL logic. The safer sequence is:

| Gate | Pull request / deliverable | Must pass before moving on |
|---|---|---|
| **G0** | Production/staging snapshot, schema/asset inventory, restore drill, decision record | Verified backup + target environment identified |
| **G1** | Add Auth client/session UX and inactive membership data **without cutting off existing reads** | Login and roles tested in staging; existing site unchanged for readers |
| **G2** | Apply controlled grants/RLS and privilege-safe functions for existing tables | Anonymous/Reader/Editor/Admin direct API tests pass; no data lost |
| **G3** | Make AI functions user-authenticated and budget-limited; remove shared-word dependency | Unauthorized and repeated calls cannot incur model costs |
| **G4** | Introduce protected image handling and migrate Group Only assets | Old/new Chronicles, slideshow and image generation tested |
| **G5** | English UI, artwork and AI language defaults | 100% of interface and new generated content in English; history preserved |
| **G6** | Armory MVP and equipment-history migration | Historical status/loans unchanged; slot consistency tests pass |
| **G7** | Chronicle linking and Quest Board | No duplicate item-drop records; permission tests pass |
| **G8** | Remaining roadmap features, one focused release at a time | UX, data quality, backup and test criteria for each feature |

**Immediate mitigation may precede this sequence:** If live policies are found to allow unintended anonymous writes or unauthenticated paid AI usage, restrict those paths first using the least disruptive safe measure, then resume staged migration.

### 20.2 GitHub Actions and Supabase rollout

Current `deploy.yml` builds the Vite app and publishes GitHub Pages on `main`. It **does not** perform Supabase migrations or deploy functions. A complete deployment therefore has at least three independently verified components:

- **Frontend:** `cd web && npm ci && npm run lint && npm run build` (plus new tests), then GitHub Pages.
- **Database:** reviewed SQL migrations in `supabase/migrations/`, deployed to **staging** first, then production using `npx supabase db push --linked` or a carefully scoped secure CI job. Do not run `db reset` against production.
- **Functions/storage:** deploy all changed functions and migrate storage configuration/objects explicitly. Configure secrets in Supabase/CI secrets, **not** browser build variables.

Add CI on pull requests for TypeScript build, lint, test runner, dependency/security checks and SQL policy checks where supported. Require PR review for security/migrations and approvals for production DB/function deployment. Keep GitHub Pages base path `/mnm-items/` and functioning `#/...` deep links. Record changes in a release note and have a rollback procedure for each step.

**Note on rollbacks:** Database schema rollbacks are not always lossless. Prefer additive expand-and-contract migrations with backups and forward fixes; never promise automatic rollback of a destructive migration.

### 20.3 Testing matrix

| Area | Test |
|---|---|
| Basic site | Homepage, Stash, Heroes, Alts, Chronicle list/read/edit, items, sold records, old deep links |
| Roles | Visitor / unapproved signed-in / Reader / Editor / Admin, positive and negative direct API tests |
| Data | Existing item owner, loan, status, history, screenshots and chapters remain unchanged after migration |
| Equipment | Repeated slot instances; transfer while equipped; concurrent equip; missing slot; same item on two characters blocked |
| Media | Public image, group image, draft, old slideshow, AI reference image, signed URL expiry and revocation behavior |
| Generation | AI parse, saga, image generation, fail/retry, rate limits, provider budget and explicit review-before-publish |
| Language | All routes/roles, image text, error states, screen readers, date/time, historical Swedish content retention |
| Platform | GitHub Pages deployment, HashRouter callback, desktop/mobile, reload and slow connections |
| Recovery | Accidental deletion, media restore, DB restore test, admin loss/replacement procedure |

### 20.4 Operational checks

- Monitor unexpected anonymous requests, auth failures, Edge Function errors and AI spend.
- Set usage alerts and spending thresholds on model providers/Supabase where available.
- Document who is authorized to run production migrations and rotate secrets.
- Keep a tested list of backups and media locations, including who can restore them.
- Provide an admin audit trail for role changes, publication, deletion and restoration.
- Track storage usage and image compression so screenshots remain affordable to keep for years.

---

## 21. GitHub Issue Backlog — Implementable Milestones

The original issue list in Section 11 remains the **product-level backlog**. For coding, split it into the dependencies below, each with a small PR, measurable tests and a definition of done.

| ID | Priority | Issue / concrete deliverable | Depends on |
|---|---|---|---|
| SEC-01 | P0 | Inventory production grants, RLS, storage and function auth; export safe schema report | None |
| OPS-01 | P0 | Database + media backup, staging environment and tested restore | SEC-01 |
| AUTH-01 | P0 | Memberships/roles schema, inactive-by-default, secure Admin bootstrap | OPS-01 |
| AUTH-02 | P0 | Auth session UX, invitation + sign-in/out, GitHub Pages callback | AUTH-01 |
| SEC-02 | P0 | Role/ownership RLS with direct API negative tests on all current tables | AUTH-01, OPS-01 |
| SEC-03 | P0 | Edge Function authenticated authorization, AI quotas/cost limits | AUTH-02, SEC-02 |
| SEC-04 | P0 | Private/group media policy, protected URL helper and asset migration | SEC-02, SEC-03 |
| AUTH-03 | P1 | Member/permissions admin UI, safe role changes and revocation | AUTH-02, SEC-02 |
| OPS-02 | P1 | CI, staging migrations, rollback/runbook, monitoring | OPS-01 |
| LANG-01 | P1 | English string layer, page/form/error coverage | AUTH-02 |
| LANG-02 | P1 | English painted navigation/header and accessibility copy | LANG-01 |
| LANG-03 | P1 | English AI draft/schema language, preserve historical content | SEC-03, LANG-01 |
| DATA-01 | P1 | Item/character/Chronicle schema reconciliation and data dictionary | OPS-01 |
| ARM-01 | P1 | Character profile and authentic image gallery | AUTH-02, SEC-04, DATA-01 |
| ARM-02 | P1 | Equipment assignment model with valid slot instances and history | ARM-01, DATA-01 |
| STASH-01 | P1 | Equipped/Inventory/Wishlist and source-of-truth status sync | ARM-02 |
| CHRON-01 | P1 | Participant and zone links preserving existing cast strings | DATA-01 |
| CHRON-02 | P1 | Item events linked to chapters and personal timelines | CHRON-01, ARM-02 |
| GOAL-01 | P2 | Quest Board with owner/group rights | SEC-02, CHRON-01 |
| MEMORY-01 | P2 | Achievements, On This Day and Seasons | CHRON-02 |
| ATLAS-01 | P3 | Explored-zone Atlas, source-marked notes and markers | CHRON-01 |
| LAB-01 | P3 | Pet/Spell experiment repository, patch/version/source fields | SEC-02 |
| SHARE-01 | P3 | Reviewable Discord recap and manual posting | CHRON-02, AUTH-03 |

**Every issue must include:** user story, scope/non-goals, file(s) expected to change, data migration impact, access-control impact, tests, manual QA and acceptance criteria. A task is **not done** because a UI screenshot renders; it is done when it works against the permissioned database and deployed site.

### Standard GitHub issue template

```markdown
## User story
As a [role], I want [capability], so that [value].

## Current behavior / source files
[What exists today, with code paths]

## Scope / out of scope
[Exact boundaries]

## Data and authorization
[New/changed tables, migration, RLS, media permissions]

## Acceptance criteria
- [ ] Primary workflow passes in staging
- [ ] Forbidden direct API requests are blocked
- [ ] Existing content still renders and can be restored
- [ ] All new system UI is English
- [ ] Mobile and accessibility checked
- [ ] Tests, build, deploy notes updated

## Rollout and rollback
[Steps, permissions, backup, risks]
```

---

## 22. Definition of Implementation-Ready vs. Implemented

**Implementation-ready product blueprint (this v2 document):**

- [x] Functional vision, scope and phase priorities are explicit.
- [x] Current public code risks, language assets and technical constraints are identified.
- [x] Default role/visibility policy and essential ownership decisions are proposed.
- [x] Data reconciliation, storage migration, security gates, QA and deployment order are specified.
- [x] Work is decomposed into incremental GitHub issues.

**Still required before claiming a fully implemented, production-safe application:**

- [ ] Verify the live Supabase schema, actual data, current GRANTs/RLS and storage policies.
- [ ] Confirm/record product decisions in Section 15 with maintainers.
- [ ] Build the Auth, RLS, storage and function code and successfully test it in staging.
- [ ] Migrate existing data/media with checked counts, links and restored backup.
- [ ] Replace Swedish UI + localized images + generation prompts with English.
- [ ] Implement/test the Armory, quest planning and later feature modules.
- [ ] Run production deployment and end-to-end role/permission/AI-budget tests.

**Do not describe the attached Markdown as a deployable app, a set of production-ready SQL migrations or proof that current remote security is correct.** It is an actionable **engineering specification and sequencing guide**. Additional implementation and remote configuration are necessary.

---

## 23. Source Audit and External Documentation

### Current public repository (reviewed 20 November 2026)

- [README: stack and deployment](https://github.com/djyret/mnm-items/blob/main/README.md)
- [PRODUCT: current no-login / Swedish operating context](https://github.com/djyret/mnm-items/blob/main/PRODUCT.md)
- [DESIGN: painted Swedish header/menu assets](https://github.com/djyret/mnm-items/blob/main/DESIGN.md)
- [Web App routes and painted navigation](https://raw.githubusercontent.com/djyret/mnm-items/main/web/src/App.tsx)
- [Web current item/character/Chronicle types](https://raw.githubusercontent.com/djyret/mnm-items/main/web/src/lib/types.ts)
- [Web current slot list and status labels](https://raw.githubusercontent.com/djyret/mnm-items/main/web/src/lib/constants.ts)
- [Web current public item image URL](https://raw.githubusercontent.com/djyret/mnm-items/main/web/src/lib/supabase.ts)
- [Web current public Chronicle image URL](https://raw.githubusercontent.com/djyret/mnm-items/main/web/src/lib/kronikan.ts)
- [Web current shared AI passphrase](https://raw.githubusercontent.com/djyret/mnm-items/main/web/src/lib/functions.ts)
- [Supabase Edge Function auth config](https://raw.githubusercontent.com/djyret/mnm-items/main/supabase/config.toml)
- [AI item parser](https://raw.githubusercontent.com/djyret/mnm-items/main/supabase/functions/parse-item/index.ts)
- [AI Chronicle generator](https://raw.githubusercontent.com/djyret/mnm-items/main/supabase/functions/berattelse/index.ts)
- [AI illustrated scenes](https://raw.githubusercontent.com/djyret/mnm-items/main/supabase/functions/seriebild/index.ts)
- [GitHub Pages build and deployment workflow](https://raw.githubusercontent.com/djyret/mnm-items/main/.github/workflows/deploy.yml)

### Primary technical references

- [Supabase: Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase: Secure Edge Functions](https://supabase.com/docs/guides/functions/auth)
- [Supabase: Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
- [Supabase: Publishable vs secret API keys](https://supabase.com/docs/guides/getting-started/api-keys)
- [GitHub: GitHub Pages is static hosting](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)

**Source limitation:** Public GitHub files may change after this date. A live database review is mandatory before authoring migrations or enabling permission restrictions in production.

