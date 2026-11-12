# Art direction options for the full game

Written 2026-11-12 (Asia/Kuala_Lumpur) for the owner's request: "research for me and suggest 5
suitable game artstyle". Report: REP-010. Decision: DEC-018 (awaiting the owner).

This is desk research. No players were asked, and no survey of Southeast Asian art preferences was
found, so the fit and appeal notes below are judgement backed by the sources, not measurements.
Prices come from art vendors' own blog posts (US$, 2024–2026). They are rough and lean high, and
no Malaysian price list was found.

## What the game needs from any art style

1. **Readable at 20–35 px on a phone.** Heroes are about 34 px tall and troops about 21 px. Guides
   agree that clarity beats detail: test silhouettes in grey and at the real in-game size
   ([Bugnet][bugnet], [RocketBrush][rocketbrush]). The team that made a popular mobile brawler says
   each character must show its role through its silhouette at a glance ([GameDev.net][brawler]).
2. **Two teams told apart instantly**, on a busy lane and under the fog of war.
3. **Fits the Malay folk-tale world**: heroes such as Pelanduk, Buaya, Helang, Belang and Dalang;
   kubu forts and the Pusaka.
4. **Affordable to make and to animate.** The game has 20 heroes and 18 troop types, about 38
   characters, each with walk, attack, hit and idle poses.
5. **Works in today's engine** (Canvas 2D in the browser), or says plainly what has to change.
6. **Our own look.** No borrowed names, shapes, frames or colours (see the legal section of
   `research-report.md`).

Mobile art guides add that most mobile hits now use clean, bright, high-contrast art, often 2D or
a 2D/3D mix, with a crisp interface on top ([iLogos][ilogos], [Pixune][pixune-mobile]).

## Useful local precedents

- **Kabaret** (Persona Theory Games, Malaysia, 2023) uses wayang kulit and batik-inspired art with
  gold outlines in a narrative game about Malay folklore ([FMT 2023][fmt-kabaret],
  [The Magic Rain][magicrain]).
- **Paper Ghost Stories: 7PM** (Cellar Vault Games, Malaysia, 2024) builds a 2.5D world from paper
  cut-outs, including joss-paper textures ([FMT 2024][fmt-7pm], [Nook Gaming][nook]).
- **Shadow puppetry in games:** *Projection: First Light* is a puzzle game built on shadow puppetry
  from several cultures ([ACMI][acmi]). An Indonesian student project, *Code Atma*, studied
  wayang-based character design for games ([UMN journal][codeatma]). Background on wayang:
  [Britannica][britannica].
- **Local 3D animation** has a large home audience: Upin & Ipin (2007), BoBoiBoy (2011) and Ejen Ali
  ([FMT 2025][fmt-anim], [Marketing Magazine][mm]). Malaysian players already know a rounded,
  bright 3D look from these shows.

## Cost reference (vendor prices, rough)

| Item | Price per item | Source |
|---|---|---|
| 2D character design | US$250–1,500 | [Pixune][pixune-price], [Whimsy Games][whimsy] |
| Simple 2D mobile character | US$300–800 | [Whimsy Games][whimsy] |
| 3D character | US$1,000–10,000 (rigged mobile character about US$1,500–4,000) | [Pixune][pixune-price], [Whimsy Games][whimsy] |
| Artist time | 2D about US$25–80 an hour; 3D about US$40–150 an hour | [Pixune][pixune-price], [Whimsy Games][whimsy] |
| One animation, bone rig (cut-out) | US$150–500 | [Juego Studio][juego] |
| One animation, frame by frame | US$1,000–3,000 | [Juego Studio][juego] |

Bone-rigged ("cut-out") animation reuses one set of body parts for every pose, so it needs far fewer
pictures than frame-by-frame drawing ([Spine][spine]). The Spine editor itself needs a paid licence,
and its web player would be a new dependency, so both would need a plan of their own.

Rough sum for the **20 heroes only**:
- in 2D at US$250–1,500 each, about US$5,000–30,000 before animation;
- in 3D at US$1,500–4,000 each, about US$30,000–80,000 before animation.

These are multiplication of vendor ranges, not quotes.

## The five options

Ratings are the app steward's judgement against the needs above, not measurements.

### 1. Hikayat board game, painted by an artist (what we have now)

The current look, finished by hand: a painted rainforest board seen from above, chunky ink-outlined
standee figures on round bases, songket gold trim, parchment panels.
- **Fit:** good; it already uses kubu forts, songket and batik colours.
- **Phone readability:** high; big heads, one prop each, a coloured base for the team.
- **Cost and work:** lowest. An artist can repaint one layer at a time (board, then heroes, then
  troops) with no code change. Code-drawn art can carry on at RM0.
- **Against:** looks like a tidy indie or prototype game. It is less striking in a store listing than
  options 2 or 3, and small standees show little personality.

### 2. Toy-box 3D

Rounded, glossy, toy-like 3D characters with big heads and bright colours: the look of most
mass-market mobile strategy and brawler games, and close to Malaysia's own 3D cartoons.
- **Fit:** medium. It is friendly and familiar, but the folk-tale flavour has to come from costumes
  and props, not from the style.
- **Phone readability:** high when silhouettes are bold ([GameDev.net][brawler]).
- **Cost and work:** highest, at US$1,500–4,000 per rigged character. It needs either a 3D engine
  (a large architecture change) or 3D models rendered to sprites (keeps the engine, but means
  bigger downloads).
- **Against:** the least distinctive look on the store, because it is crowded with similar games. It
  costs the most.

### 3. Wayang kulit "living puppets"

Heroes and troops as coloured, perforated leather puppets with jointed arms on rods, standing on a
lamp-lit board. Team colour is the pool of lamplight under each puppet and its rod handle. Each
ultimate plays as a puppet-show flourish. The hero Dalang (the puppet master) becomes a natural
mascot.
- **Fit:** the strongest, as a living Malay-world art form. Kabaret shows a Malaysian studio has
  already used it in a modern game, and the other precedents show it can work in games.
- **Phone readability:** medium; it needs care. Real puppets are thin, intricate and seen side-on.
  For play they need chunkier bodies, solid colour fills and only a few big perforations, or detail
  disappears at 34 px.
- **Cost and work:** medium. Puppets are already jointed, so cut-out bone animation suits them and
  is the cheaper kind ([Juego Studio][juego]). Flat figures fit today's standee engine.
- **Against:** it needs a cultural adviser, because puppet types and figures carry meaning. It is
  harder to make readable than options 1 or 2, and too much brown and black can look dull.

### 4. Batik paper-cut diorama (2.5D)

The board as layered cut paper and batik cloth with soft drop shadows; figures as die-cut paper
standees with a white edge; batik dots and crackle lines as texture. It reads like a pop-up book.
- **Fit:** good. Batik is well known, and both Malaysian precedents (Kabaret and 7PM) use paper or
  batik.
- **Phone readability:** medium. The white cut edge separates figures well, but busy batik textures
  must stay on the board, never on the figures.
- **Cost and work:** medium. It is 2D layers with cut-out animation, and close to today's engine.
- **Against:** paper-craft looks exist elsewhere, so it needs our own motifs to stand out. Texture
  can turn into noise on small screens.

### 5. Anime cel-shaded 2D

Clean line art, two-tone cel shading and expressive faces, with large splash portraits for the draft
and versus screens. This look is familiar to Southeast Asian players from many hero and gacha games.
- **Fit:** low to medium. It suits the draft screen and hero appeal, but most of the local flavour
  would sit in costumes only.
- **Phone readability:** medium. Detailed anime figures need simplifying (chibi in play, full art on
  portraits), so this means two art sets.
- **Cost and work:** medium to high, with splash art plus in-game sprites. The engine stays the same.
- **Against:** the least original look. It is strongly tied to gacha games in players' minds, which
  sits awkwardly with our no-loot-box rule.

### Considered and not shortlisted

- **Pixel art:** cheap and readable, but it fights the painted folk-tale identity and looks
  rough when zoomed.
- **Ink-and-watercolour storybook:** beautiful, but soft edges are hard to read at 20–35 px.

## Comparison

| | 1 Hikayat | 2 Toy 3D | 3 Wayang | 4 Batik paper | 5 Anime |
|---|---|---|---|---|---|
| Stands out in a store | medium | low | high | high | low |
| Readable on a phone | high | high | medium | medium | medium |
| Fits the folk-tale world | high | medium | very high | high | low–medium |
| Art cost | low | high | medium | medium | medium–high |
| Engine change | none | large (or sprites) | small | small | small |

## First recommendation (before the owner's reference)

- **For now:** keep Hikayat while the game is still changing. It is free and readable.
- **For the full game:** wayang "living puppets" (3), with batik colours and paper layering
  from 4 on the board. It is the one look that is clearly ours. It suits cheap cut-out animation
  and flat figures. A Malaysian studio (Kabaret) has already shown it works in a modern game.
- **Runner-up:** toy-box 3D (2), if the goal is the widest mass-market reach and there is an art
  budget to match.
- **Before choosing:** make a code-drawn look test of one lane in one or two styles (RM0), and
  check it on the owner's phone at real size.

## Update: the owner's reference, Demon Slayer (2026-11-12)

The owner replied: "i like demon slayer's artstyle". Report REP-011 adds a sixth option and changes
the recommendation.

**What makes that look work**, in three parts we can borrow as an approach, without copying any
designs:
- **Painterly anime characters.** Thick, painterly outlines and hard cel shading (the app
  steward's own description of the look).
- **Traditional art in the effects.** The makers say they drew on old ukiyo-e woodblock prints,
  including Hokusai, for the look of the sword techniques ([Comicbook.com][ds-ukiyoe],
  [Popverse][ds-popverse]).
- **A signature pattern per hero.** Each main character wears one traditional Japanese textile
  pattern, which makes them easy to recognise ([Fun Japan][ds-patterns],
  [Tokyo Weekender][wagara]).

Several search results about the show were fan or low-quality pages. Only the interview quotes
above are relied on.

### 6. Anime heroes with Malay heritage art

The same three parts, built from our own world:
- cel-shaded anime heroes with thick outlines;
- one signature Malay pattern each (songket, batik or a woodcarving motif);
- ultimates drawn as moving heritage art, such as a batik wave, songket gold or a wayang shadow.

Assessment:
- **Fit:** high. The patterns and effects carry the Malay world, so the style is more than costumes.
- **Phone readability:** medium. Faces vanish at 34 px, so play figures stay simple, and the full
  anime art goes on portraits, the draft, the versus screen and ultimate banners. The signature
  pattern helps tell heroes apart.
- **Cost and work:** medium to high. It needs two art sets (play figures and portraits). The engine
  stays the same.
- **Against:** borrow the approach only, never the show's characters, patterns, colours or effects.
  Anime still reminds some players of gacha games.

**New recommendation:** option 6, tried first as a free, code-drawn look test (PLAN-008), with a
switch in the settings menu. Hikayat stays the default until the owner decides.

[bugnet]: https://bugnet.io/blog/readable-game-art-why-clarity-beats-detail
[rocketbrush]: https://rocketbrush.com/blog/shape-language-in-game-character-design-how-to-make-characters-readable-and-consistent
[brawler]: https://gamedev.net/news/making-of-a-brawler-character-creation-for-brawl-stars-clip-3-r4113/
[ilogos]: https://ilogos.biz/mobile-game-art-guide/
[pixune-mobile]: https://pixune.com/blog/mobile-game-art/
[pixune-price]: https://pixune.com/blog/game-art-outsourcing-price/
[whimsy]: https://whimsygames.co/blog/the-complete-guide-to-game-art-outsourcing-costs-timelines-and-how-to-choose-a-studio/
[juego]: https://www.juegostudio.com/blog/2d-animation-budget-for-video-games
[spine]: https://en.esotericsoftware.com/spine-in-depth
[fmt-kabaret]: https://www.freemalaysiatoday.com/category/leisure/2023/04/08/sip-tea-and-mingle-with-monsters-in-this-malaysian-made-video-game
[magicrain]: https://themagicrain.com/?p=34837
[fmt-7pm]: https://www.freemalaysiatoday.com/category/leisure/2024/11/02/paper-ghost-stories-presents-cut-out-creepiness-msian-style
[nook]: https://nookgaming.com/paper-ghost-stories-7pm-review/
[acmi]: https://www.acmi.net.au/stories-and-ideas/influence-wayang-puppet-theatre-moving-image/
[codeatma]: https://ejournals.umn.ac.id/index.php/FSD/article/download/3230/1386
[britannica]: https://www.britannica.com/art/wayang
[fmt-anim]: https://www.freemalaysiatoday.com/category/leisure/2025/08/22/how-malaysian-animations-are-promoting-local-culture-to-the-world
[mm]: https://marketingmagazine.com.my/?p=133919
[ds-ukiyoe]: https://comicbook.com/anime/news/demon-slayer-movie-infinity-castle-animation
[ds-popverse]: https://www.thepopverse.com/movies-demon-slayer-kimetsu-no-yaiba-infinity-castle-ufotable-dynamic-anime-honors-koyoharu-gotouge
[ds-patterns]: https://www.fun-japan.jp/en/articles/14279
[wagara]: https://www.tokyoweekender.com/art_and_culture/japanese-culture/wagara-japanese-patterns-and-what-they-mean/
