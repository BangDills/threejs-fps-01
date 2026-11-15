// Boot, fixed-step 60Hz loop, pointer lock, and deterministic ?shot= rendering for Vanguard Depot.
import * as THREE from 'three';
import { PALETTE } from './palette.js';
import { createWorld } from './world.js';
import { createInput } from './input.js';
import { createPlayer } from './player.js';
import { createWeapon } from './weapon.js';
import { createBots } from './bots.js';
import { createEffects } from './effects.js';
import { createRounds, ROUND_PHASE } from './rounds.js';
import { createHud } from './hud.js';

const FIXED_STEP = 1 / 60;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seed = Number.parseInt(params.get('seed') ?? '1', 10) || 1;

function mulberry32(initial) {
  let a = initial;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = mulberry32(seed);

// Three.js Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.getElementById('game').appendChild(renderer.domElement);

// Scene & Perspective Camera
const scene = new THREE.Scene();
scene.background = new THREE.Color(PALETTE.sky);
scene.fog = new THREE.Fog(new THREE.Color(PALETTE.fog), 45, 110);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.05, 150);
scene.add(camera);

// Subsystem Modules
const world = createWorld(scene);
const effects = createEffects(scene);
const hud = createHud();
const player = createPlayer(world.colliders);
const weapon = createWeapon(camera);
const bots = createBots(scene, world, effects, random);
const rounds = createRounds(world, hud);

const input = createInput(renderer.domElement, onLockChange);

// Raycaster for player hitscan shooting
const raycaster = new THREE.Raycaster();
raycaster.far = 80;
const direction = new THREE.Vector3();

let frozen = false;
let started = false;
let accumulator = 0;
let lastTime = performance.now();
let buyMenuOpen = false;

// Initialize HUD State
hud.updateVitals(player.state.health, player.state.armor);
hud.updateAmmo(weapon.mag, weapon.reserve, weapon.current.name, weapon.current.mode, weapon.he, weapon.smoke);
hud.updateScores(0, 0);
hud.setCredits(rounds.money);
hud.updateScoreboard(rounds.stats);

function onLockChange(locked) {
  if (shot) return;
  if (locked) {
    started = true;
    buyMenuOpen = false;
    hud.closeBuyMenu();
  }
}

// Interactive Buy Menu click bindings
document.querySelectorAll('.buy-card').forEach((card) => {
  card.addEventListener('click', () => {
    const item = card.getAttribute('data-buy');
    if (item) {
      const ok = rounds.buyItem(item, player, weapon);
      if (ok) {
        hud.updateAmmo(weapon.mag, weapon.reserve, weapon.current.name, weapon.current.mode, weapon.he, weapon.smoke);
        hud.updateVitals(player.state.health, player.state.armor);
      }
    }
  });
});

function syncCamera() {
  camera.position.set(
    player.state.position.x,
    player.state.position.y + player.state.eye,
    player.state.position.z
  );
  camera.rotation.set(player.state.pitch, player.state.yaw, 0, 'YXZ');
}

function shoot() {
  if (!weapon.ready()) return false;
  if (!weapon.pullTrigger()) return false;

  const muzzlePos = weapon.getMuzzlePosition();
  const pellets = weapon.current.pellets || 1;
  const currentSpread = weapon.spread(player.groundSpeed(), player.state.crouching, input.state.ads);

  camera.getWorldDirection(direction);

  for (let p = 0; p < pellets; p++) {
    const dir = direction.clone();
    dir.x += (random() * 2 - 1) * currentSpread;
    dir.y += (random() * 2 - 1) * currentSpread;
    dir.z += (random() * 2 - 1) * currentSpread;
    dir.normalize();

    raycaster.set(camera.position, dir);

    // Target list: world shootables + bot hitboxes
    const hitCandidates = world.shootables.concat(bots.hitMeshes);
    const hits = raycaster.intersectObjects(hitCandidates, false);

    let hitPoint = camera.position.clone().addScaledVector(dir, 50);

    if (hits.length > 0) {
      const h = hits[0];
      hitPoint.copy(h.point);

      if (h.object.userData && h.object.userData.botId) {
        const botId = h.object.userData.botId;
        const part = h.object.userData.part || 'torso';
        const isHead = part === 'head';
        const killed = bots.damage(botId, weapon.current.damage, part);

        effects.spawnHitPuff(h.point, true);
        hud.hitMarker(isHead, 120);

        if (killed) {
          const victim = bots.bots.find((b) => b.id === botId);
          rounds.registerKill('You', victim ? victim.name : 'Eclipse Operative', weapon.current.name, isHead, 0, 1);
        }
      } else {
        effects.spawnSparks(h.point, h.face ? h.face.normal : new THREE.Vector3(0, 1, 0), 4);
      }
    }

    effects.spawnTracer(muzzlePos, hitPoint);
  }

  effects.spawnMuzzleFlash(muzzlePos, camera.rotation);
  player.recoil(weapon.current.recoilP, (random() * 2 - 1) * weapon.current.recoilY);
  hud.updateAmmo(weapon.mag, weapon.reserve, weapon.current.name, weapon.current.mode, weapon.he, weapon.smoke);
  return true;
}

function handleInput() {
  if (buyMenuOpen) return;

  const look = input.takeLook();
  player.look(look.x, look.y);

  if (input.state.firing && weapon.ready()) {
    shoot();
  }

  // Tactical key toggles
  if (input.state.keys.has('KeyR')) weapon.reload();
  if (input.state.keys.has('KeyB')) {
    input.state.keys.delete('KeyB');
    buyMenuOpen = !buyMenuOpen;
    if (buyMenuOpen) {
      input.exitLock();
      hud.openBuyMenu();
    } else {
      hud.closeBuyMenu();
    }
  }
  if (input.state.keys.has('Tab')) {
    hud.showScoreboard();
  } else {
    hud.hideScoreboard();
  }

  // Weapon number shortcuts
  if (input.state.keys.has('Digit1')) weapon.switchWeapon('valkyrie');
  if (input.state.keys.has('Digit2')) weapon.switchWeapon('arc9');
  if (input.state.keys.has('Digit3')) weapon.switchWeapon('stinger');

  // Objective interact key (Plant / Defuse)
  if (input.state.keys.has('KeyE')) {
    if (rounds.isPlanted) {
      const dist = player.state.position.distanceTo(rounds.plantPosition);
      if (dist < 3.2) {
        rounds.defuseDisruptor();
      }
    } else {
      const site = rounds.checkObjectivePlant(player.state.position);
      if (site) {
        rounds.plantDisruptor(site, player.state.position);
      }
    }
  }
}

function step(dt) {
  player.step(dt, input.state.keys);
  weapon.step(dt, input.state.ads);
  bots.step(dt, player, world.shootables, (killer, victim, gun, hs, kt, vt) => {
    rounds.registerKill(killer, victim, gun, hs, kt, vt);
  });
  effects.step(dt);
  rounds.step(dt, player, bots, weapon);

  // Update HUD readouts
  hud.updateVitals(player.state.health, player.state.armor);
  hud.updateAmmo(weapon.mag, weapon.reserve, weapon.current.name, weapon.current.mode, weapon.he, weapon.smoke);
  hud.updateCrosshair(weapon.spread(player.groundSpeed(), player.state.crouching, input.state.ads));
  hud.updateMinimap(
    player.state.position,
    player.state.yaw,
    bots.bots,
    world.siteA,
    world.siteB,
    rounds.isPlanted,
    rounds.plantPosition
  );
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  if (!frozen) {
    handleInput();

    accumulator += dt;
    let steps = 0;
    while (accumulator >= FIXED_STEP && steps < 5) {
      step(FIXED_STEP);
      accumulator -= FIXED_STEP;
      steps++;
    }
    if (accumulator > FIXED_STEP * 5) accumulator = 0;

    syncCamera();
  }

  renderer.render(scene, camera);
}

function settle(stepCount) {
  for (let i = 0; i < stepCount; i++) {
    step(FIXED_STEP);
  }
}

function paintTwiceThenReady() {
  let painted = 0;
  function paint() {
    syncCamera();
    renderer.render(scene, camera);
    painted++;
    if (painted >= 2) {
      window.__shotReady = true;
      frozen = true;
    } else {
      requestAnimationFrame(paint);
    }
  }
  requestAnimationFrame(paint);
}

// Deterministic Screenshot Engine (?shot=<name>&seed=<n>)
function runShot(name) {
  hud.closeBuyMenu();
  hud.hideScoreboard();
  hud.hideBanner();
  hud.hideObjectiveBar();

  if (name === 'start') {
    // Shot 1: Round start with Buy Menu open, high daylight overview of Mid
    player.reset(new THREE.Vector3(0, 0, -22), 0);
    player.state.pitch = -0.04;
    weapon.switchWeapon('arc9');
    rounds.startRound(player, bots, weapon);
    settle(12);

    hud.openBuyMenu();
    hud.setCredits(800);
    hud.updateScores(0, 0);
    hud.updatePhase('BUY PHASE (00:07)');
    hud.updateTimer(100);
    paintTwiceThenReady();
  } else if (name === 'fight') {
    // Shot 2: Intense daylight firefight in Lane A with tracer in flight & muzzle flash
    player.reset(new THREE.Vector3(-18.5, 0, -2), 0.38);
    player.state.pitch = -0.05;
    weapon.switchWeapon('valkyrie');

    // Position enemy bot in direct sightline
    const enemyBot = bots.bots.find((b) => b.id === 5);
    if (enemyBot) {
      enemyBot.position.set(-21.5, 0, -11.5);
      enemyBot.yaw = Math.PI * 0.95;
      enemyBot.group.rotation.y = enemyBot.yaw;
      enemyBot.group.position.copy(enemyBot.position);
    }

    settle(15);

    // Spawn combat tracer & muzzle flash
    const muzzlePos = weapon.getMuzzlePosition();
    const targetPos = new THREE.Vector3(-21.5, 1.5, -11.5);
    effects.spawnTracer(muzzlePos, targetPos);
    effects.spawnMuzzleFlash(muzzlePos, camera.rotation);
    effects.spawnHitPuff(targetPos, true);
    hud.hitMarker(false, 3000);

    hud.updateScores(2, 1);
    hud.updateTimer(88);
    hud.updatePhase('ACTION');
    hud.updateVitals(84, 75);
    hud.updateAmmo(24, 60, 'Valkyrie AR-24', 'Full-Auto', 1, 1);
    hud.addKill('Vanguard-02 (Kross)', 'Eclipse-02 (Specter)', 'Valkyrie AR-24', true, 0, 1);

    paintTwiceThenReady();
  } else if (name === 'plant') {
    // Shot 3: Site A Coolant Matrix with Pulse Disruptor planted & bot approaching
    player.reset(new THREE.Vector3(-20.5, 0, -6.5), 0.22);
    player.state.pitch = -0.16;
    weapon.switchWeapon('valkyrie');

    const sitePos = new THREE.Vector3(-23, 0.25, -10);
    rounds.plantDisruptor('A', sitePos);

    // Position approaching bot holding angle
    const bot = bots.bots.find((b) => b.id === 6);
    if (bot) {
      bot.position.set(-27.0, 0, -12.0);
      bot.yaw = -Math.PI * 0.35;
      bot.group.rotation.y = bot.yaw;
      bot.group.position.copy(bot.position);
    }

    settle(20);

    hud.updateScores(3, 2);
    hud.updateTimer(64);
    hud.showObjectiveBar('DISRUPTOR ARMED AT SITE A');
    hud.setObjectiveProgress(0.72);
    hud.updateVitals(100, 100);
    hud.updateAmmo(30, 90, 'Valkyrie AR-24', 'Full-Auto', 1, 1);

    paintTwiceThenReady();
  } else if (name === 'end') {
    // Shot 4: Round decided banner and Match Scoreboard with 10-player stats
    player.reset(new THREE.Vector3(0, 0, -14), 0);
    player.state.pitch = 0.02;
    weapon.switchWeapon('valkyrie');

    settle(20);

    hud.updateScores(4, 2);
    hud.updateTimer(0);
    hud.updatePhase('DECIDED');
    hud.showBanner('ROUND WON', 'ALL HOSTILE BREACH UNITS ELIMINATED', '+$3,250 ROUND BONUS', true);

    // Update roster stats for endgame display
    rounds.stats[0].k = 5; rounds.stats[0].d = 1; rounds.stats[0].a = 2; rounds.stats[0].money = 4650;
    rounds.stats[1].k = 3; rounds.stats[1].d = 2; rounds.stats[1].a = 1; rounds.stats[1].money = 3850;
    rounds.stats[2].k = 2; rounds.stats[2].d = 2; rounds.stats[2].a = 3; rounds.stats[2].money = 3550;
    rounds.stats[5].k = 3; rounds.stats[5].d = 3; rounds.stats[5].a = 0; rounds.stats[5].money = 2100;
    rounds.stats[6].k = 2; rounds.stats[6].d = 3; rounds.stats[6].a = 1; rounds.stats[6].money = 1900;
    hud.updateScoreboard(rounds.stats);
    hud.showScoreboard();

    paintTwiceThenReady();
  } else {
    paintTwiceThenReady();
  }
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

syncCamera();
if (shot) {
  runShot(shot);
} else {
  requestAnimationFrame(frame);
}
