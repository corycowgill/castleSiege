# Castle Siege 3D

A 2-player tower defense browser game built entirely with **Claude Code** (Anthropic's AI coding agent). No build tools, no bundlers, no frameworks beyond Three.js -- just HTML, JavaScript, and procedural 3D graphics.

**[Play it now](https://corycowgill.github.io/castleSiege/index_3d.html)** | **[Field Guide](https://corycowgill.github.io/castleSiege/guide.html)**

## What is this?

Two castles face each other across a medieval battlefield. Each player builds towers to defend, buys enemy units to attack, places walls to maze, and uses special abilities (Meteor, Lightning, Freeze, Heal) to turn the tide. Survive 10 waves as the day cycles from noon through dusk, midnight, dawn, and back.

### Features
- **4 tower types**: Turret, Magic (splash), Catapult (long-range AoE), Bombard (heavy single-target)
- **4 regular enemy types**: Goblin, Orc, Dark Knight, Archer -- purchased in squads of 10
- **3 boss units**: Troll, Dragon, Lich -- single elite purchases that tower over regulars
- **4 special abilities**: Meteor Strike, Chain Lightning, Freeze Wave, Castle Heal
- **Dynamic time-of-day**: sun position, sky color, fog, shadows all shift across 10 waves
- **Weather**: rain on wave 4 (dawn storm), misty fog on wave 2
- **1P vs AI** or **2P local** (keyboard+mouse or controller+mouse)
- **Mobile/touch** support with on-screen controls
- **PWA-ready** with fullscreen landscape manifest
- **Procedural audio** -- all sounds generated via Web Audio API oscillators (no audio files)
- **Interactive Field Guide** with animated 3D model previews of every unit, tower, and boss

## Built entirely with Claude Code

This game was developed through an extended conversation with [Claude Code](https://claude.ai/code), Anthropic's AI coding agent. The development spanned **20+ versions** (v3.0 through v3.20) covering:

### Prompts used during development

The session progressed through natural language requests. Here's the arc:

**Early phase -- graphics foundation:**
- "Improve the graphics details on the castles and towers"
- "Improve the graphics of the scene"
- "Improve the VFX effects of the projectiles"
- "Improve the details on the enemies"
- "Improve the scenery more"

**Performance crisis and fix:**
- "Improve the game performance - I see framerate starting to degrade"
- "Improve the framerate without degrading graphics"
- "Evaluate the game engine - do we need to make bigger changes? Do we need to evaluate game engines?"

**Architecture refactor:**
- "Are these in the field guide?" (discovered the guide was out of sync)
- "Yes fix it" (extracted shared `models.js`)
- "Yes do it" (extracted `vfx.js`, split the monolith)

**Gameplay content:**
- "Let's add boss wave as an option - create three boss options that a player can select"
- "Improve the gameplay balance"
- "Bosses should do a lot more damage"

**Visual polish + bug fixes:**
- "The road looks like a mess - remove those details you added to the road"
- "Remove it from the grass too it looks bad"
- "There's still blood or debris on the road - clean those up"
- "Starting on wave 3 a white orb shows up in middle of map - remove that"
- "I want to fix the HUD buttons for bosses - they overlap now - add it to same line as specials"
- "In the field guide the characters should be animated"
- "Add animation to the bosses - they should walk, dragon's tail and head should move"
- "Add details to the bosses graphics"

### What Claude built (version log)

| Version | What shipped |
|---------|-------------|
| v3.0 | Enemy/projectile mesh pooling + material canonicalization |
| v3.1 | Inline BufferGeometry merger -- collapses ~50 meshes/enemy to ~10 |
| v3.2 | Enemy detail pass (goblin warts, orc mohawk, dark knight runes) |
| v3.3 | Tower detail pass (archer silhouettes, arcanist shelves, crew) + tower merge |
| v3.4 | Fixed-timestep simulation (60 Hz sim decoupled from render rate) |
| v3.5 | Matrix freezing for static subtrees + castle/wall merge |
| v3.6 | Spatial grid for O(local) radial enemy lookups |
| v3.7 | Dynamic time-of-day lighting (sun, fog, sky tint per wave) |
| v3.8 | Castle detail pass (garrison, rose window, courtyard well, braziers) |
| v3.9 | Wall/barricade detail pass with per-instance randomization |
| v3.10 | Night sky (stars, rain weather system) |
| v3.11 | Projectile detail pass (barbed arrows, molten cannonballs, arcane orbs) |
| v3.12 | Battlefield ground decals (cobblestones, grass tufts) |
| v3.13 | Engine audit -- cached HUD DOM refs, merged battlefield decals |
| v3.14 | Boss wave feature (Troll, Dragon, Lich models + gameplay) |
| v3.15 | Balance pass (10 waves, tower rebalance, heal/meteor buff) |
| v3.16 | Boss HUD buttons moved to specials row |
| v3.17 | Boss damage doubled |
| v3.18 | Boss secondary animations (dragon tail sway, troll club swing, lich staff bob) + night sky fix |
| v3.19 | Boss detail pass (tribal paint, phylactery, chest heart glow) |
| v3.20 | Moon removal + cloud night-fade fix |

## Architecture

```
index_3d.html   (4,079 lines)  -- Game engine, UI, game loop
models.js       (3,370 lines)  -- All 3D model builders (shared with guide)
vfx.js          (  301 lines)  -- Particle system, damage numbers, special VFX
guide.html      (  584 lines)  -- Interactive field guide with animated previews
index.html      (3,323 lines)  -- Original 2D Phaser version (legacy)
three.min.js                   -- Three.js r150+ (bundled locally)
manifest.json                  -- PWA manifest (fullscreen landscape)
assets/0x72/                   -- Tileset (used by 2D version only)
```

### Loading order (3D version)
```
1. three.min.js     -- defines THREE
2. models.js        -- mkMat, mkMesh, createCastle, createTower, createWall,
                       createBarricade, createEnemyModel, createProjectileModel
3. vfx.js           -- particlePool, emitParticles, spawnMeteorStrike,
                       spawnLightningBolt, spawnHealAura, addVfx, updateVfx
4. inline <script>  -- game state, game loop, init()
```

All files use classic `<script>` tags (not ES modules). Top-level `function` and `const`/`let` declarations in each script share a common scope, so `models.js` functions are callable from the inline script at runtime.

### Performance pipeline

Every model in the game goes through the same optimization pipeline:

1. **`createXxxModel()`** -- builds a Group of 30-100+ sub-meshes using `mkMesh(geometry, material)`
2. **`__canonicalizeEnemyMaterials()`** -- deduplicates materials by signature (color+roughness+metalness+emissive)
3. **`__mergeEnemyModel()`** -- inline BufferGeometry merger collapses sub-meshes per material into ~1 draw call each, preserving limb Groups for animation
4. **`__freezeMergedMeshes()`** -- sets `matrixAutoUpdate=false` on static Mesh children
5. **Pool** (enemies/projectiles) -- `acquireEnemyMesh()`/`releaseEnemyMesh()` reuse meshes across spawn/death cycles

Result: a v3.19 boss with ~200 sub-primitives renders at ~10 draw calls, animates at 60 Hz, and costs zero GC on spawn/death.

### Game loop (fixed timestep)

```
SIM_DT = 1/60s

gameLoop():
  rawDt = clock.getDelta()
  simAcc += rawDt

  while simAcc >= SIM_DT:          -- 60 Hz simulation
    processInput(SIM_DT)
    updateBuild/updateCombat(SIM_DT)
    resetInputs()
    simAcc -= SIM_DT

  syncBuildings/Towers/Enemies()   -- every render frame
  updateParticles/VFX(rawDt)       -- visual smoothness at display rate
  renderer.render(scene, camera)
```

### Spatial grid

Tower targeting and enemy combat scanning use a tile-resolution spatial grid (`__spatCells[ROWS][COLS]`) rebuilt once per sim tick. Radial lookups via `__spatQuery(cx, cy, radius, out)` replace full enemy-array walks, dropping `updateCombat` from O(towers x enemies) to O(towers x local).

## Running locally

```bash
# Any static file server works
npx serve .
# or
python -m http.server 8000
```

Open `http://localhost:8000/index_3d.html` (or just open `index_3d.html` directly in a browser).

## Controls

**Player 1 (Keyboard / Controller):**
| Action | Keyboard | Controller |
|--------|----------|------------|
| Move cursor | WASD / Arrows | L.Stick / D-Pad |
| Place | Space | A |
| Sell | E | B |
| Cycle build | Q / Tab | LB / RB |
| Cycle special | Z | Y |
| Use special | F | X |
| Ready | R | Start |

**Player 2 (Mouse):**
| Action | Input |
|--------|-------|
| Move cursor | Mouse |
| Place | Left click |
| Sell | Right click |
| Cycle build | Scroll wheel |
| Use special | Click special button |
| Ready | Middle click / UI button |

**Mobile:** On-screen D-pad + action buttons.

## Tech stack

- **Three.js** r150+ -- 3D rendering, flat-shaded low-poly aesthetic
- **Web Audio API** -- all sounds procedurally generated (no audio files)
- **Vanilla HTML/CSS/JS** -- no React, no build step, no bundler
- **PWA manifest** -- installable on mobile with fullscreen landscape

## Credits

- **Game design & code**: Built entirely by [Claude Code](https://claude.ai/code) (Anthropic) through conversational prompts
- **Direction & testing**: [@corycowgill](https://github.com/corycowgill)
- **Tileset** (2D version): [0x72 DungeonTilesetII](https://0x72.itch.io/dungeontileset-ii) by Robert (CC0)
- **Medieval assets** (reference only): [Kenney Medieval RTS](https://kenney.nl/assets/medieval-rts) (CC0)

## License

MIT
