# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Castle Siege is a 2-player tower defense browser game built as a single `index.html` file (~1900 lines). It uses Phaser 3 (loaded from CDN) with sprite assets from `assets/0x72/`. No build tools or bundlers.

## Running

Open `index.html` directly in a browser, or serve with any static file server (e.g., `npx serve .` or `python -m http.server`). The Phaser CDN script and local tileset image must be accessible.

## Architecture

Everything lives in one `<script>` block inside `index.html`. The code has two layers: top-level shared state/functions, and Phaser Scene classes.

### Top-level code (lines ~20-280)

- **Configuration** (~20-120): Game constants (`W`, `H`, `T=32`, `COLS=40`, `ROWS=18`), data arrays (`TOWER_DATA`, `ENEMY_DATA`, `SPECIAL_DATA`, `BUILD_OPTS`), tileset frame parsing from `TILESET_FRAMES`
- **Utilities** (~125-132): `rnd`, `clamp`, `dist`, coordinate conversion (`colToX`, `rowToY`, `xToCol`, `yToRow`)
- **Audio** (~134-194): Web Audio API procedural sound effects and music system (no audio files)
- **Grid & Pathfinding** (~196-248): `grid[][]` array, BFS `findPath`, `canPlace` validation ensuring paths remain open
- **Game State** (~250-267): State machine (`title` → `build` → `combat` → `waveEnd` → `gameover`), player data, entity arrays (`enemies`, `towers`, `projectiles`)
- **Input State** (~269-281): Key/mouse state tracking consumed by scenes

### Phaser Scenes (lines ~283-1914)

- **BootScene** (~286-735): Loads `assets/0x72/` tileset, generates all textures procedurally (characters, buildings, castles, background, projectiles, particles), creates sprite animations
- **TitleScene** (~736-802): Title screen with P1/P2 ready-up, help button
- **HelpScene** (~805-897): Stats reference screen for towers, enemies, specials
- **GameScene** (~898-1691): Main gameplay — builds grid, manages enemies/towers/projectiles, handles input (gamepad, keyboard, mouse), runs build/combat/waveEnd logic, special abilities
- **HUDScene** (~1693-1873): Runs parallel to GameScene — top bar (HP, credits, wave info), bottom panel (build options, specials, ready button)
- **GameOverScene** (~1874-1893): Victory/defeat screen with stats

### Phaser Config (~1895-1914)

`Phaser.AUTO` renderer, 1280×720, pixelArt mode, gamepad enabled, `Phaser.Scale.FIT`.

## Key Design Patterns

- **Players array is 1-indexed**: `players[0]` is null; `players[1]` is P1 (blue, left, controller/keyboard), `players[2]` is P2 (red, right, mouse)
- **Grid coordinates**: Column/row in tile space; pixel conversion via `colToX(c)`/`rowToY(r)`. Tile size `T=32`. Game area starts at `GAME_Y=48` (below HUD).
- **Territory**: P1 builds in columns 2-19, P2 in columns 20-37. Castles occupy cols 0-1 (P1) and 38-39 (P2).
- **Ownership/targeting**: Enemies owned by P1 attack P2's castle (move right), and vice versa. Towers target enemies owned by the opponent.
- **Pathfinding blocker logic**: P1's buildings block P2's enemies (blocker owner = 1 for P2's pathfinding). `canPlace` validates that placing doesn't completely block enemy paths.
- **Hybrid rendering**: Phaser sprites for enemies/buildings, Phaser Graphics objects for grid overlay, HP bars, cursors, range indicators, and projectile trails.
- **HUD as parallel scene**: HUDScene runs alongside GameScene via `scene.launch('HUD')` and reads shared global state each frame.
- **Texture generation in BootScene**: All tower/wall/castle/background textures are created procedurally from canvas elements in `BootScene`, then registered as Phaser textures. Character sprites are extracted from the 0x72 dungeon tileset.

## Controls

**Player 1 (Controller/Keyboard)**:
- Move: L.Stick/D-Pad or WASD/Arrows
- Place: A or Space | Sell: B or E | Cycle: LB/RB or Q/Tab
- Special cycle: Y or Z | Use special: X or F | Ready: Start or R

**Player 2 (Mouse)**:
- Move: mouse | Place: left click | Sell: right click
- Cycle: scroll wheel | Special: click special button in bottom panel
- Ready: middle click or UI button

## Important Notes

- Phaser 3.90.0 loaded from CDN (`cdn.jsdelivr.net`). No local copy.
- Audio is procedural via Web Audio API oscillators — no audio files.
- Enemy purchasing buys 10 units at a time (cost shown is per-unit, charged as `cost*10`).
- Each wave adds baseline enemies automatically; player-purchased enemies are added on top.
- Walls/barricades can be destroyed by enemy units that attack adjacent walls when their remaining path is long (>10 tiles).
- Assets: `assets/0x72/0x72_DungeonTilesetII_v1.7.png` tileset used for character sprites and items. `assets/kenney-medieval/` exists but is not currently used in code.
