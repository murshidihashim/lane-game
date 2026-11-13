# Character art · heroic designs (PLAN-014)

Decision: DEC-022 (the owner: "okay now lets do a thorough enhancement of heroes and creep design,
take Dota 2 characters as the target of what we want to be"). Style: the batik paper look (DEC-018,
`art-style.md`). Code: `src/ui/figures.ts`. Written 2026-11-13 (Asia/Kuala_Lumpur).

**Dota 2 is the quality bar, not a source.** We follow the general principles Valve published for
character art (a shape you can read at a glance, a value pattern, one clear focal point). We copy no
hero, name, costume, weapon or shape. Every design below comes from Malay craft, dress and folk tales,
and stays a cut-paper standee.

Sources for the principles:
- [Steam Support: Dota 2 character art guide](https://help.steampowered.com/faqs/view/0688-7692-4D5A-1935)
- [A copy of the guide (Scribd)](https://www.scribd.com/doc/298310210/Dot-a-2-Character-Art-Guide)

## The template

| Part | Rule |
|---|---|
| Proportions | About five heads tall: broad shoulders, a narrower waist, longer legs, a small sharp face. Five builds: slim, stocky, robe, belly, giant. |
| Costume parts | Pauldrons (round, spiked, stone, feather, shell, leaf, fur), chest plate, belt with a gold buckle, skirt or sarong, bracers, boots, cape. |
| Value pattern | Each figure is lighter at the head and shoulders and darker towards the feet, so the eye goes to the face and the signature shape. Troops get a softer version. |
| Signature shape | One big shape per hero that reads even as a black silhouette (a hat, shield, umbrella, wing, horn, wave or pack). |
| Glow | Only magic users and beasts get glowing eyes or props. Glow stays small: eyes, a lantern, an orb. |
| Team colour | Still only the base, the sash, the pennant (or a collar, tabard or caparison). The figure's own colours never use team blue or red. |
| Sizes | Heroes 42 px and troops 24 px tall before each one's own scale (were 34 and 21). |

## Heroes: source and signature

| Hero | Our source | Signature shape | Other marks |
|---|---|---|---|
| Rimba | Forest hunters with a blowpipe (sumpit) | Deep hood swept back to a point, a long banded blowpipe | Leaf cape, cloth mask, green eyes, dart quiver |
| Benteng | The kubu, a Malay hill fort | Tall tower shield with our fort emblem | Battlement helm, stone pauldrons, bronze chest, lamellar skirt |
| Kail | River fishermen | A giant terendak (woven conical hat) | Net cape with cork floats, checked sarong, wave tattoo, barbed hook on a rope |
| Seri | Orang bunian, the hidden folk | Glowing veil and an ornate floating lantern | Gold tiara, songket bands, gold eyes |
| Belang | The weretiger of Malay tales | Tiger head with a pale cheek ruff and a striped tail | One spiked pauldron, claw blades; at level 4 an armoured tiger with glowing eyes |
| Gergasi | The gergasi, the giant of Malay tales | Curling horns and a spiked, iron-banded club | Tusks, ember eyes, chain across the chest |
| Dalang | The puppet master of wayang kulit | Tall swept headdress and a big shadow puppet on glowing strings | High collar, gold perforated trim (like puppet leather), violet eyes |
| Senja | Dusk (senja) and the crescent moon | Tall hat tipped with a gold crescent; a staff with a glowing orb | A snake draped on the shoulders, dusk-orange hem |
| Hujan | The monsoon rain | A big oil-paper umbrella with gold ribs | Cloud cape, water-drop pendant, falling drops |
| Layang | The wau bulan (moon kite) of Kelantan | A wide kite with notched wings and a crescent tail | Rider with goggles and a long team scarf |
| Pendekar | The silat warrior | A tanjak headcloth with a tall peak, and a wavy keris | Songket samping, gold belt, arm wraps, keris sheath |
| Pelanduk | Sang Kancil, the clever mousedeer | Tall ears through a short hood | Small size (0.8), satchel, quick dagger |
| Saudagar | Spice traders of the old ports | A tall trader's pack with a hanging balance | Jewelled turban with a plume, brocade coat, coin purse |
| Badak | The Sumatran rhinoceros | A great horn under a riveted iron brow plate | Spiked pauldrons, plate chest, war hammer |
| Tedung | The king cobra (ular tedung) | A wide hood | Pale hood bands, gold crown band, glowing eyes, fangs |
| Tukang | The village builder | A tall bamboo scaffold on the back (the team pennant flies from its top) | Big mallet, tool belt |
| Helang | The sea eagle of the coasts | Folded wings above the shoulders and a great recurve bow | Eagle helm with a gold beak visor, feather pauldrons |
| Embun | Morning dew and mist | A tall frost crown | Ice shards orbiting her, a sheer cape, snowflake orb |
| Ombak | The sea wave | A wave curling up behind him | Shell pauldrons, scaled skirt, gold trident |
| Buaya | The estuary crocodile | Long toothy jaws and a heavy ridged tail | Scute pauldrons, glowing eyes, claws |

## Troops

| Species | Troops | Look |
|---|---|---|
| Kampung | spearman, archer, shieldbearer, ram | Militia in iron helmets with a gold ridge, team plumes and team tabards; the shieldbearer's arched shield is team-coloured; the ram is an armoured water buffalo under a team caparison |
| Hutan | kera, harimau, enggang, seladang | A monkey with a team headband and a bone club; a clouded leopard with a team collar and glowing eyes; a hornbill with a team wing band; a gaur with horn tips and a team caparison |
| Sungai | ketam, sumpit, belut | A crab with snapping claws and eye stalks; an archerfish with team fins; an eel with glowing eyes and sparks |
| Serangga | kerengga, tebuan, kumbang, ratu | Ants with snapping mandibles and a team band; a hornet and a beetle with glowing eyes; the queen with a gold crown and glowing eyes |
| Batu | kerikil, golem | A rolling pebble with a team band; a stone golem with glowing cracks and ember eyes |
| Summons | lontar, puppet, decoy, watchtower, Gajah Mina | A catapult with a team banner; Dalang's puppet with violet eyes; Pelanduk's ghostly decoy; Tukang's bamboo watchtower; the river boss with a gold crest and team saddle cloth |

## Originality check (PLAN-014 T5)

- Every hero above takes its look from a Malay craft, dress, animal or tale named in the table.
- No Dota 2 hero's name, costume, weapon or silhouette was used as a reference shape.
- The words the project avoids (CLAUDE.md) do not appear in any name.
- A real artist pass and a trademark check stay separate, later steps (art-style.md, "What is not done yet").
