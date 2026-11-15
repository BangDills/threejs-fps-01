// Autonomous 5v5 bot AI, tactical route navigation, sensory perception, and real raycast ballistics for Vanguard Depot.
import * as THREE from 'three';
import { PALETTE } from './palette.js';
import { playGunshot } from './audio.js';
import { computeRoute, SITE_WAYPOINTS } from './navigation.js';
import { createCarrierDeviceMesh } from './world.js';

export function createBots(scene, world, effects, prng = Math.random) {
  const bots = [];
  const hitMeshes = [];

  function createCarrierPack() {
    const pack = createCarrierDeviceMesh();
    pack.position.set(0, 1.25, 0.23);
    pack.scale.setScalar(0.7);
    return pack;
  }

  // Shared operative geometries & materials
  const headGeo = new THREE.BoxGeometry(0.32, 0.32, 0.32);
  const visorGeo = new THREE.BoxGeometry(0.28, 0.08, 0.14);
  const torsoGeo = new THREE.BoxGeometry(0.55, 0.7, 0.32);
  const legGeo = new THREE.BoxGeometry(0.22, 0.72, 0.24);
  const botGunGeo = new THREE.BoxGeometry(0.08, 0.1, 0.45);

  const defUniformMat = new THREE.MeshLambertMaterial({ color: PALETTE.vanguardUniform });
  const defArmorMat = new THREE.MeshLambertMaterial({ color: PALETTE.vanguardArmor });
  const defVisorMat = new THREE.MeshBasicMaterial({ color: PALETTE.vanguardVisor });

  const atkUniformMat = new THREE.MeshLambertMaterial({ color: PALETTE.eclipseUniform });
  const atkArmorMat = new THREE.MeshLambertMaterial({ color: PALETTE.eclipseArmor });
  const atkVisorMat = new THREE.MeshBasicMaterial({ color: PALETTE.eclipseVisor });

  const botGunMat = new THREE.MeshLambertMaterial({ color: PALETTE.weaponGunmetal });

  // Bot Roster Definitions: 4 Vanguard Defenders (teammates) + 5 Eclipse Attackers
  const BOT_CONFIGS = [
    // Team 0: Iron Vanguard (Defenders)
    { id: 1, name: 'Vanguard-02 (Kross)', team: 0, role: 'anchor_a', wpRoute: [1, 4, 5, 10] },
    { id: 2, name: 'Vanguard-03 (Vance)', team: 0, role: 'anchor_b', wpRoute: [3, 8, 9, 16] },
    { id: 3, name: 'Vanguard-04 (Rook)', team: 0, role: 'mid_watch', wpRoute: [2, 6, 13, 14] },
    { id: 4, name: 'Vanguard-05 (Echo)', team: 0, role: 'roam', wpRoute: [1, 10, 13, 7] },

    // Team 1: Eclipse Cell (Attackers)
    { id: 5, name: 'Eclipse-01 (Apex)', team: 1, role: 'carrier', wpRoute: [26, 23, 17, 12, 5] },
    { id: 6, name: 'Eclipse-02 (Specter)', team: 1, role: 'entry', wpRoute: [26, 23, 18, 11, 4] },
    { id: 7, name: 'Eclipse-03 (Cipher)', team: 1, role: 'mid_push', wpRoute: [26, 24, 19, 13, 6] },
    { id: 8, name: 'Eclipse-04 (Wraith)', team: 1, role: 'flank_b', wpRoute: [26, 25, 21, 15, 9] },
    { id: 9, name: 'Eclipse-05 (Ghost)', team: 1, role: 'support_b', wpRoute: [26, 25, 22, 16, 8] },
  ];

  for (const cfg of BOT_CONFIGS) {
    const isDef = cfg.team === 0;
    const uniformMat = isDef ? defUniformMat : atkUniformMat;
    const armorMat = isDef ? defArmorMat : atkArmorMat;
    const visorMat = isDef ? defVisorMat : atkVisorMat;

    const group = new THREE.Group();

    // Torso
    const torsoMesh = new THREE.Mesh(torsoGeo, uniformMat);
    torsoMesh.position.y = 1.05;
    torsoMesh.castShadow = true;
    torsoMesh.receiveShadow = true;
    torsoMesh.userData = { botId: cfg.id, part: 'torso' };
    group.add(torsoMesh);
    hitMeshes.push(torsoMesh);

    // Armor Plate
    const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.45, 0.36), armorMat);
    chestPlate.position.set(0, 1.15, 0);
    group.add(chestPlate);

    // Head
    const headMesh = new THREE.Mesh(headGeo, armorMat);
    headMesh.position.y = 1.62;
    headMesh.castShadow = true;
    headMesh.userData = { botId: cfg.id, part: 'head' };
    group.add(headMesh);
    hitMeshes.push(headMesh);

    // Glowing Visor
    const visorMesh = new THREE.Mesh(visorGeo, visorMat);
    visorMesh.position.set(0, 1.62, -0.16);
    group.add(visorMesh);

    // Legs
    const leftLeg = new THREE.Mesh(legGeo, uniformMat);
    leftLeg.position.set(-0.16, 0.36, 0);
    leftLeg.castShadow = true;
    leftLeg.userData = { botId: cfg.id, part: 'legs' };
    group.add(leftLeg);
    hitMeshes.push(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, uniformMat);
    rightLeg.position.set(0.16, 0.36, 0);
    rightLeg.castShadow = true;
    rightLeg.userData = { botId: cfg.id, part: 'legs' };
    group.add(rightLeg);
    hitMeshes.push(rightLeg);

    // Weapon model held in hands
    const gunMesh = new THREE.Mesh(botGunGeo, botGunMat);
    gunMesh.position.set(0.24, 1.0, -0.35);
    group.add(gunMesh);

    const carrierDevice = cfg.role === 'carrier' ? createCarrierPack() : null;
    if (carrierDevice) group.add(carrierDevice);

    scene.add(group);

    const startWp = world.waypoints[cfg.wpRoute[0]] || world.waypoints[0];
    group.position.copy(startWp.pos);

    bots.push({
      id: cfg.id,
      name: cfg.name,
      team: cfg.team,
      role: cfg.role,
      wpRoute: cfg.wpRoute,
      wpIndex: 0,
      group,
      headMesh,
      gunMesh,
      position: group.position,
      yaw: isDef ? 0 : Math.PI,
      pitch: 0,
      health: 100,
      armor: 100,
      alive: true,
      state: 'patrol',
      target: null,
      trackingTime: 0,
      fireCooldown: prng() * 0.4,
      reactionTimer: 0,
      speed: 3.8,
      hasDevice: cfg.role === 'carrier',
      deviceMesh: carrierDevice,
      baseRoute: [...cfg.wpRoute],
      routeObjective: false,
      route: [...cfg.wpRoute],
    });
  }

  // Pre-allocated math objects for raycasts & tracking
  const _botRay = new THREE.Raycaster();
  _botRay.far = 60;
  const _botDir = new THREE.Vector3();
  const _targetEye = new THREE.Vector3();
  const _muzzlePos = new THREE.Vector3();

  function assignCarrier() {
    return bots.find((b) => b.team === 1 && b.role === 'carrier')?.id ?? 5;
  }

  function setObjective(site, carrierId) {
    for (const b of bots) {
      b.hasDevice = b.id === carrierId && !site ? true : b.id === carrierId;
      b.routeObjective = Boolean(site);
      if (!site) {
        b.route = [...b.baseRoute];
        b.wpIndex = 0;
        continue;
      }
      if (b.team === 1) {
        const flank = b.role === 'flank_b' || b.role === 'support_b';
        const targetSite = b.id === carrierId ? site : (flank ? (site === 'A' ? 'B' : 'A') : site);
        const startId = findWaypointId(b.position);
        b.route = computeRoute(world.waypoints, startId, SITE_WAYPOINTS[targetSite]);
      } else {
        const hold = b.role === 'anchor_a' ? SITE_WAYPOINTS.A
          : b.role === 'anchor_b' ? SITE_WAYPOINTS.B
            : findWaypointId(b.position);
        b.route = computeRoute(world.waypoints, findWaypointId(b.position), hold);
      }
      b.wpIndex = b.route.length > 1 ? 1 : 0;
    }
  }

  function findWaypointId(pos) {
    let id = 0;
    let best = Infinity;
    for (const wp of world.waypoints) {
      const dx = wp.pos.x - pos.x;
      const dz = wp.pos.z - pos.z;
      const d = dx * dx + dz * dz;
      if (d < best) { best = d; id = wp.id; }
    }
    return id;
  }

  function onDevicePlanted(site, pos) {
    for (const b of bots) {
      if (b.team !== 0 || !b.alive) continue;
      const goal = b.role === 'anchor_a' ? SITE_WAYPOINTS.A
        : b.role === 'anchor_b' ? SITE_WAYPOINTS.B : findWaypointId(pos);
      b.route = computeRoute(world.waypoints, findWaypointId(b.position), goal);
      b.wpIndex = b.route.length > 1 ? 1 : 0;
      b.routeObjective = true;
    }
  }

  function reset(siteChoice = 'A') {
    for (const b of bots) {
      b.health = 100;
      b.armor = 100;
      b.alive = true;
      b.state = 'patrol';
      b.target = null;
      b.trackingTime = 0;
      b.fireCooldown = prng() * 0.5;
      b.wpIndex = 0;
      b.group.visible = true;
      b.route = [...b.baseRoute];
      b.routeObjective = false;
      b.hasDevice = b.role === 'carrier';
      if (b.deviceMesh) b.deviceMesh.visible = b.hasDevice;

      // Adjust role routes around the selected objective.
      if (b.team === 1) {
        if (siteChoice === 'A') {
          if (b.role === 'carrier') b.wpRoute = [26, 23, 17, 12, 5];
          else if (b.role === 'entry') b.wpRoute = [26, 23, 18, 11, 4];
          else if (b.role === 'mid_push') b.wpRoute = [26, 24, 19, 13, 6];
        } else {
          if (b.role === 'carrier') b.wpRoute = [26, 25, 21, 15, 9];
          else if (b.role === 'entry') b.wpRoute = [26, 25, 22, 16, 8];
          else if (b.role === 'mid_push') b.wpRoute = [26, 24, 20, 14, 7];
        }
      }

      b.routeObjective = false;
      b.route = [...b.baseRoute];
      b.hasDevice = b.role === 'carrier';
      if (b.deviceMesh) b.deviceMesh.visible = b.hasDevice;
      const wp = world.waypoints[b.wpRoute[0]];
      if (wp) {
        b.group.position.copy(wp.pos);
        b.yaw = b.team === 0 ? 0 : Math.PI;
        b.group.rotation.y = b.yaw;
      }
    }
  }

  function damage(botId, amount, part = 'torso') {
    const b = bots.find((x) => x.id === botId);
    if (!b || !b.alive) return false;

    let mult = 1.0;
    if (part === 'head') mult = 3.5;
    else if (part === 'legs') mult = 0.75;

    const raw = amount * mult;
    if (b.armor > 0 && part !== 'head') {
      const absorbed = raw * 0.65;
      const pass = raw * 0.35;
      b.armor = Math.max(0, b.armor - absorbed);
      b.health = Math.max(0, b.health - pass);
    } else {
      b.health = Math.max(0, b.health - raw);
    }

    if (b.health <= 0) {
      b.alive = false;
      b.health = 0;
      b.group.visible = false;
      return true; // Killed
    }
    return false;
  }

  function getAlive(team) {
    return bots.filter((b) => b.team === team && b.alive);
  }

  // Sensory line of sight check
  function canSee(bot, targetPos, shootables) {
    if (effects.isPositionSmoked(targetPos)) return false;

    _muzzlePos.set(bot.position.x, bot.position.y + 1.6, bot.position.z);
    _botDir.subVectors(targetPos, _muzzlePos);
    const dist = _botDir.length();
    if (dist > 45) return false;

    _botDir.normalize();

    // Field of view check (120 degree cone)
    const forwardX = -Math.sin(bot.yaw);
    const forwardZ = -Math.cos(bot.yaw);
    const dot = _botDir.x * forwardX + _botDir.z * forwardZ;
    if (dot < 0.25) return false; // Outside FOV

    _botRay.set(_muzzlePos, _botDir);
    _botRay.far = dist + 0.5;
    const hits = _botRay.intersectObjects(shootables, false);
    return hits.length === 0; // Clear line of sight
  }

  // Bot simulation step
  function step(dt, player, shootables, onKill, onPlant) {
    for (let i = 0; i < bots.length; i++) {
      const b = bots[i];
      if (!b.alive) continue;

      if (b.fireCooldown > 0) b.fireCooldown -= dt;

      // 1. Sensory Perception: scan for enemies
      let closestEnemy = null;
      let closestDist = 999;

      // Check player as enemy if on opposite team
      if (b.team === 1 && player.state.alive) {
        _targetEye.set(player.state.position.x, player.state.position.y + player.state.eye, player.state.position.z);
        if (canSee(b, _targetEye, shootables)) {
          closestEnemy = { isPlayer: true, pos: _targetEye };
          closestDist = b.position.distanceTo(player.state.position);
        }
      }

      // Check other opposing bots
      for (let j = 0; j < bots.length; j++) {
        const other = bots[j];
        if (other.team !== b.team && other.alive) {
          _targetEye.set(other.position.x, other.position.y + 1.5, other.position.z);
          const d = b.position.distanceTo(other.position);
          if (d < closestDist && canSee(b, _targetEye, shootables)) {
            closestEnemy = { isPlayer: false, bot: other, pos: _targetEye };
            closestDist = d;
          }
        }
      }

      // 2. Tactical State Machine & Movement
      if (closestEnemy) {
        b.state = 'combat';
        b.target = closestEnemy;
        b.trackingTime += dt;

        // Turn towards enemy
        const dx = closestEnemy.pos.x - b.position.x;
        const dz = closestEnemy.pos.z - b.position.z;
        const targetYaw = Math.atan2(-dx, -dz);
        const yawDiff = targetYaw - b.yaw;
        b.yaw += Math.sign(yawDiff) * Math.min(Math.abs(yawDiff), dt * 6.5);
        b.group.rotation.y = b.yaw;

        // Real Raycast Gunfire
        if (b.fireCooldown <= 0 && b.trackingTime > 0.22) {
          b.fireCooldown = 0.12 + prng() * 0.16;

          // Compute aim trajectory with error convergence
          _muzzlePos.set(b.position.x + 0.2, b.position.y + 1.0, b.position.z - 0.35);
          _botDir.subVectors(closestEnemy.pos, _muzzlePos);

          // Add spread based on tracking convergence
          const spread = Math.max(0.012, 0.08 - b.trackingTime * 0.06);
          _botDir.x += (prng() * 2 - 1) * spread;
          _botDir.y += (prng() * 2 - 1) * spread;
          _botDir.z += (prng() * 2 - 1) * spread;
          _botDir.normalize();

          _botRay.set(_muzzlePos, _botDir);
          _botRay.far = 50;

          // Raycast targets: world shootables + player/bot hitboxes
          const rayTargets = shootables.concat(hitMeshes);
          const hits = _botRay.intersectObjects(rayTargets, false);

          playGunshot('rifle');
          effects.spawnMuzzleFlash(_muzzlePos, b.group.rotation);

          let hitPoint = _muzzlePos.clone().addScaledVector(_botDir, 40);
          if (hits.length > 0) {
            const h = hits[0];
            hitPoint.copy(h.point);

            if (h.object.userData && h.object.userData.botId) {
              const victimId = h.object.userData.botId;
              const isHead = h.object.userData.part === 'head';
              const dmg = isHead ? 100 : 34;
              const killed = damage(victimId, dmg, h.object.userData.part);
              effects.spawnHitPuff(h.point, true);
              if (killed && onKill) {
                const victim = bots.find((x) => x.id === victimId);
                onKill(b.name, victim ? victim.name : 'Operative', 'Valkyrie AR-24', isHead, b.team, victim ? victim.team : 0);
              }
            } else if (closestEnemy.isPlayer && h.distance >= closestDist - 0.8) {
              // Hit the player!
              const isHead = prng() < 0.2;
              const dmg = isHead ? 85 : 30;
              const killed = player.damage(dmg, isHead ? 'head' : 'torso');
              effects.spawnHitPuff(h.point, true);
              if (killed && onKill) {
                onKill(b.name, 'You', 'Valkyrie AR-24', isHead, b.team, 0);
              }
            } else {
              effects.spawnSparks(h.point, h.face ? h.face.normal : new THREE.Vector3(0, 1, 0), 4);
            }
          }
          effects.spawnTracer(_muzzlePos, hitPoint);
        }
      } else {
        // Patrol along waypoint route
        b.state = 'patrol';
        b.trackingTime = 0;

        const targetRoute = b.routeObjective ? b.route : b.wpRoute;
        const targetWp = world.waypoints[targetRoute[b.wpIndex]];
        if (targetWp) {
          const toWp = new THREE.Vector3().subVectors(targetWp.pos, b.position);
          toWp.y = 0;
          const dist = toWp.length();
          if (dist < 1.2) {
            if (b.wpIndex < targetRoute.length - 1) {
              b.wpIndex++;
            } else if (b.hasDevice && b.routeObjective) {
              const site = targetWp.id === SITE_WAYPOINTS.A ? 'A'
                : targetWp.id === SITE_WAYPOINTS.B ? 'B' : null;
              if (site && onPlant?.(site, b.position) === true) {
                b.hasDevice = false;
                if (b.deviceMesh) b.deviceMesh.visible = false;
              }
            }
          } else {
            toWp.normalize();
            b.position.addScaledVector(toWp, b.speed * dt);
            b.yaw = Math.atan2(-toWp.x, -toWp.z);
            b.group.rotation.y = b.yaw;
          }
        }
      }
    }
  }

  return {
    bots,
    hitMeshes,
    reset,
    assignCarrier,
    setObjective,
    onDevicePlanted,
    damage,
    getAlive,
    step,
  };
}
