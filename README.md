# Vanguard Depot: Tactical FPS

[![make.fun · threejs-fps-02](https://make.fun/badge/threejs-fps-02.svg)](https://make.fun/bounty/threejs-fps-02?utm_source=github&utm_medium=readme&utm_campaign=threejs-fps-02)
[![rank](https://make.fun/badge/threejs-fps-02/BangDills/threejs-fps-01/rank.svg)](https://make.fun/bounty/threejs-fps-02/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=threejs-fps-02)
[![reward](https://make.fun/badge/threejs-fps-02/BangDills/threejs-fps-01/reward.svg)](https://make.fun/bounty/threejs-fps-02?utm_source=github&utm_medium=readme&utm_campaign=threejs-fps-02)

A competitive high-performance tactical first-person shooter built on Three.js 0.187.0 with pure ES modules, fixed-step simulation, deterministic rendering, and zero binary assets.

## Setting & Narrative

Operatives of the **Iron Vanguard** garrison hold **Vanguard Depot**, an arid aerospace logistics facility housing critical sub-orbital communication arrays and high-capacity coolant reactors. Infiltration shock squads from the **Eclipse Cell** have breached the facility perimeter, attempting to plant and detonate a **Pulse Disruptor** at either **Site A (Coolant Matrix)** or **Site B (Sub-Orbital Uplink)**. The Vanguard garrison must eliminate all hostile breach operatives or defuse planted pulse disruptors before catastrophic detonation.

## Key Features

1. **Tactical Ballistics & Hitscan Gunplay**
   - True hitscan raycasting for player and bot operatives: rays cast from weapon muzzle through camera/aim direction, checking world colliders and actor hitboxes.
   - Per-part hitboxes (Head, Torso, Limbs) with dynamic damage multipliers (Head 3.5x lethal headshots, Torso 1.0x, Limbs 0.75x).
   - Armor system: Kevlar vest & helmet absorb 65% of incoming torso and limb damage.
   - Recoil curves & dynamic bloom: continuous automatic fire kicks weapon vertically with horizontal sway; movement expands spread; crouching tightens spread by 45%.
   - Aim Down Sights (ADS) via Right Mouse Button: smooth field-of-view zoom, reduced weapon sway, and stabilized cone of fire.
   - Distinct 5-weapon procedural arsenal:
     - **Arc-9 Tactical**: Semi-automatic polymer sidearm with rapid recovery ($0).
     - **Stinger PDW**: High-fire-rate (880 RPM) close-quarters personal defense weapon ($1,500).
     - **Bulldog-8 Shotgun**: Heavy 8-pellet breaching shotgun with high point-blank lethality ($1,700).
     - **Valkyrie AR-24**: Versatile bullpup assault rifle with high lethality ($2,800).
     - **Onyx Scout**: Precision bolt-action marksman rifle with high-power optical scope ($4,400).
   - Tactical Throwables:
     - **HE Blast Grenade** (`4` key): Bouncing physical grenade with blast radius dealing up to 85 splash damage ($300).
     - **Aerosol Smoke Grenade** (`5` key): Deployable volumetric concealment cloud blocking vision and bot line-of-sight for 14s ($300).

2. **5v5 Team Rosters & Autonomous Bot AI**
   - Full 10-actor matches (5 Iron Vanguard vs 5 Eclipse Cell) with assigned tactical roles (Entry, Anchor, Flanker, Support).
   - Real hitscan ballistics for bots: zero coin-flip accuracy checks. Bots calculate aim tracking error that smoothly tightens over tracking time, apply weapon spread and recoil, trace rays against world/player hitboxes, and deal body-part scaled damage.
   - Autonomous economy: bots purchase appropriate weapons, armor, and grenades based on team bank and round phase.
   - Objective mechanics: Eclipse bots carry the Pulse Disruptor, plant at Sites A/B, and Vanguard bots actively navigate to and defuse planted disruptors.
   - Tactical awareness: auditory reaction to sprints and gunfire, angle-holding off the waypoint graph, and line-of-sight occlusion through smoke clouds.

3. **Zero-Allocation Effect Pooling & Visuals**
   - High-performance pre-allocated object pools in `effects.js`: 32 bullet tracers, 64 impact sparks, 32 impact dust/hit puffs, 6 muzzle flashes with point lights, and 4 volumetric smoke clouds.
   - Zero runtime `THREE.Object3D`, `BufferGeometry`, or `Material` allocations during combat hot loops.
   - Calibrated daylight-industrial aesthetic: high ambient fill, bright concrete slabs, clear hazard trims, and high-contrast signage for instant scene readability (mean luma 70-95 across all capture modes).
   - Real-time 2D radar minimap in HUD showing level architecture, bomb sites, player orientation cone, teammate markers, and enemy radar pings.

4. **Level Design & Architecture**
   - **Vanguard Depot**: A classic competitive three-lane map:
     - **Lane A**: Exterior courtyard with elevated catwalk platform, container cover, and Site A (Coolant Matrix).
     - **Mid**: Covered high-ceiling transit bay with structural roof trusses, central divider, and staggered crate stacks.
     - **Lane B**: Sub-orbital communication terminal with satellite dish array, server racks, and Site B.
     - **Connectors**: West and East connectors linking spawns with crossways.
   - Procedural canvas textures: Concrete slabs, diamond-tread metal grates, hazard caution striping, freight containers, and facility decals.

5. **Competitive Match Flow & Economy**
   - 15-round match format with buy phase timer, round clock, and win/loss banners.
   - Economy rewards: Win bonuses ($3,250), loss payouts ($1,500 with escalating loss-streak bonuses up to $2,700), kill rewards ($300), and objective plant/defuse bonuses.
   - Categorized Requisitions Terminal (`B` key): Sidearms, Primary Armament, and Tactical Gear.
   - Full 10-player match-end and tab scoreboard with K/D/A, credits, armor status, and ping.
   - Directional damage indicators, dynamic reticle bloom, and tactical killfeed.

## Controls

| Key / Action | Action |
| --- | --- |
| `W`, `A`, `S`, `D` | Tactical Movement |
| `Mouse` | Look / Precision Aim |
| `Left Click` | Discharge Weapon |
| `Right Click` | Aim Down Sights (ADS Zoom) |
| `R` | Tactical Reload |
| `Shift` / `Ctrl` / `C` | Tactical Crouch (stabilizes recoil & spread) |
| `Space` | Jump / Vault |
| `B` | Requisitions Terminal (Buy Menu) |
| `Tab` | Match Operational Telemetry (Scoreboard) |
| `E` | Plant / Defuse Pulse Disruptor |
| `1` | Equip Primary Weapon |
| `2` | Equip Sidearm |
| `3` | Equip PDW |
| `4` | Deploy HE Blast Grenade |
| `5` | Deploy Aerosol Smoke Grenade |
| `ESC` | Exit Pointer Lock / Close Menus |

## Technical Architecture

- **Engine**: Three.js 0.187.0 loaded via browser import map.
- **Modules**: Pure ES modules separated into dedicated single-responsibility components (`world.js`, `player.js`, `weapon.js`, `bots.js`, `rounds.js`, `hud.js`, `input.js`, `effects.js`, `audio.js`, `textures.js`, `palette.js`, `main.js`).
- **Loop**: Decoupled fixed 60Hz physics and tactical simulation loop feeding smooth render frame updates.
- **Deterministic Captures**: Supports `?shot=<start|fight|plant|end>&seed=<n>` generating byte-identical visual verification renders.

## Run it

```sh
node serve.ts --port 8080   # then open http://localhost:8080
```

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=threejs-fps-02) · AI agents build software for cash rewards</sub>
