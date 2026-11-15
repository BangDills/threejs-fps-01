// Pre-allocated object pools for visual effects in Vanguard Depot.
// Eliminates garbage collection spikes during high-rate automatic fire and grenade detonations.
import * as THREE from 'three';
import { PALETTE } from './palette.js';

export function createEffects(scene) {
  // 1. Bullet Tracers (32 pooled meshes)
  const TRACER_COUNT = 32;
  const tracerGeo = new THREE.CylinderGeometry(0.025, 0.025, 1, 4);
  tracerGeo.rotateX(Math.PI / 2);
  const tracerMat = new THREE.MeshBasicMaterial({
    color: PALETTE.tracerColor,
    transparent: true,
    opacity: 0.95,
  });

  const tracers = [];
  for (let i = 0; i < TRACER_COUNT; i++) {
    const mesh = new THREE.Mesh(tracerGeo, tracerMat);
    mesh.visible = false;
    scene.add(mesh);
    tracers.push({ mesh, active: false, life: 0, maxLife: 0.16 });
  }

  // 2. Impact Sparks (64 pooled particle meshes)
  const SPARK_COUNT = 64;
  const sparkGeo = new THREE.BoxGeometry(0.04, 0.04, 0.04);
  const sparkMat = new THREE.MeshBasicMaterial({
    color: PALETTE.sparkColor,
    transparent: true,
    opacity: 1.0,
  });

  const sparks = [];
  for (let i = 0; i < SPARK_COUNT; i++) {
    const mesh = new THREE.Mesh(sparkGeo, sparkMat);
    mesh.visible = false;
    scene.add(mesh);
    sparks.push({
      mesh,
      active: false,
      velocity: new THREE.Vector3(),
      life: 0,
      maxLife: 0.35,
    });
  }

  // 3. Impact Dust / Hit Puffs (32 pooled particle meshes)
  const PUFF_COUNT = 32;
  const puffGeo = new THREE.SphereGeometry(0.12, 5, 5);
  const dustMat = new THREE.MeshBasicMaterial({
    color: 0xc8c8c0,
    transparent: true,
    opacity: 0.7,
  });
  const bloodMat = new THREE.MeshBasicMaterial({
    color: 0xd92626,
    transparent: true,
    opacity: 0.85,
  });

  const puffs = [];
  for (let i = 0; i < PUFF_COUNT; i++) {
    const mesh = new THREE.Mesh(puffGeo, dustMat);
    mesh.visible = false;
    scene.add(mesh);
    puffs.push({
      mesh,
      active: false,
      velocity: new THREE.Vector3(),
      scaleSpeed: 1.8,
      life: 0,
      maxLife: 0.45,
    });
  }

  // 4. Muzzle Flashes (6 pooled meshes + lights)
  const FLASH_COUNT = 6;
  const flashGeo = new THREE.OctahedronGeometry(0.18, 0);
  const flashMat = new THREE.MeshBasicMaterial({
    color: PALETTE.muzzleFlash,
    transparent: true,
    opacity: 0.95,
  });

  const flashes = [];
  for (let i = 0; i < FLASH_COUNT; i++) {
    const mesh = new THREE.Mesh(flashGeo, flashMat);
    const light = new THREE.PointLight(PALETTE.muzzleFlash, 3.5, 6);
    mesh.add(light);
    mesh.visible = false;
    scene.add(mesh);
    flashes.push({ mesh, light, active: false, life: 0, maxLife: 0.05 });
  }

  // 5. Smoke Clouds (4 pooled volumetric clusters)
  const SMOKE_COUNT = 4;
  const smokeClouds = [];
  const cloudSphereGeo = new THREE.SphereGeometry(1.6, 6, 6);
  const smokeCloudMat = new THREE.MeshLambertMaterial({
    color: 0xcccccc,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
  });

  for (let i = 0; i < SMOKE_COUNT; i++) {
    const group = new THREE.Group();
    for (let j = 0; j < 7; j++) {
      const part = new THREE.Mesh(cloudSphereGeo, smokeCloudMat);
      part.position.set(
        (Math.random() - 0.5) * 2.2,
        0.8 + Math.random() * 1.6,
        (Math.random() - 0.5) * 2.2
      );
      group.add(part);
    }
    group.visible = false;
    scene.add(group);
    smokeClouds.push({ group, active: false, life: 0, maxLife: 14.0, position: new THREE.Vector3() });
  }

  // Reusable math objects for spawning
  const _dir = new THREE.Vector3();
  const _mid = new THREE.Vector3();

  function spawnTracer(start, end) {
    for (let i = 0; i < TRACER_COUNT; i++) {
      const t = tracers[i];
      if (!t.active) {
        t.active = true;
        t.life = t.maxLife;
        _dir.subVectors(end, start);
        const dist = _dir.length();
        t.mesh.scale.set(1, 1, dist);
        _mid.addVectors(start, end).multiplyScalar(0.5);
        t.mesh.position.copy(_mid);
        t.mesh.lookAt(end);
        t.mesh.visible = true;
        break;
      }
    }
  }

  function spawnSparks(origin, normal, count = 6) {
    let spawned = 0;
    for (let i = 0; i < SPARK_COUNT && spawned < count; i++) {
      const s = sparks[i];
      if (!s.active) {
        s.active = true;
        s.life = s.maxLife;
        s.mesh.position.copy(origin);
        s.mesh.visible = true;
        s.velocity.set(
          normal.x * 2 + (Math.random() - 0.5) * 3,
          normal.y * 2 + Math.random() * 3,
          normal.z * 2 + (Math.random() - 0.5) * 3
        );
        spawned++;
      }
    }
  }

  function spawnHitPuff(origin, isBlood = false) {
    for (let i = 0; i < PUFF_COUNT; i++) {
      const p = puffs[i];
      if (!p.active) {
        p.active = true;
        p.life = p.maxLife;
        p.mesh.material = isBlood ? bloodMat : dustMat;
        p.mesh.position.copy(origin);
        p.mesh.scale.setScalar(0.4);
        p.mesh.visible = true;
        p.velocity.set(
          (Math.random() - 0.5) * 0.8,
          Math.random() * 1.2,
          (Math.random() - 0.5) * 0.8
        );
        break;
      }
    }
  }

  function spawnMuzzleFlash(position, rotation) {
    for (let i = 0; i < FLASH_COUNT; i++) {
      const f = flashes[i];
      if (!f.active) {
        f.active = true;
        f.life = f.maxLife;
        f.mesh.position.copy(position);
        if (rotation) f.mesh.rotation.copy(rotation);
        f.mesh.visible = true;
        break;
      }
    }
  }

  function spawnSmoke(position) {
    for (let i = 0; i < SMOKE_COUNT; i++) {
      const sc = smokeClouds[i];
      if (!sc.active) {
        sc.active = true;
        sc.life = sc.maxLife;
        sc.position.copy(position);
        sc.group.position.copy(position);
        sc.group.scale.setScalar(0.2);
        sc.group.visible = true;
        break;
      }
    }
  }

  function isPositionSmoked(pos) {
    for (let i = 0; i < SMOKE_COUNT; i++) {
      const sc = smokeClouds[i];
      if (sc.active && sc.life > 1.0) {
        if (pos.distanceTo(sc.position) < 5.5) {
          return true;
        }
      }
    }
    return false;
  }

  function step(dt) {
    // 1. Tracers
    for (let i = 0; i < TRACER_COUNT; i++) {
      const t = tracers[i];
      if (t.active) {
        t.life -= dt;
        if (t.life <= 0) {
          t.active = false;
          t.mesh.visible = false;
        }
      }
    }

    // 2. Sparks
    for (let i = 0; i < SPARK_COUNT; i++) {
      const s = sparks[i];
      if (s.active) {
        s.life -= dt;
        if (s.life <= 0) {
          s.active = false;
          s.mesh.visible = false;
        } else {
          s.velocity.y -= 9.8 * dt;
          s.mesh.position.addScaledVector(s.velocity, dt);
        }
      }
    }

    // 3. Puffs
    for (let i = 0; i < PUFF_COUNT; i++) {
      const p = puffs[i];
      if (p.active) {
        p.life -= dt;
        if (p.life <= 0) {
          p.active = false;
          p.mesh.visible = false;
        } else {
          p.mesh.position.addScaledVector(p.velocity, dt);
          const sc = p.mesh.scale.x + p.scaleSpeed * dt;
          p.mesh.scale.setScalar(sc);
        }
      }
    }

    // 4. Muzzle Flashes
    for (let i = 0; i < FLASH_COUNT; i++) {
      const f = flashes[i];
      if (f.active) {
        f.life -= dt;
        if (f.life <= 0) {
          f.active = false;
          f.mesh.visible = false;
        }
      }
    }

    // 5. Smoke Clouds
    for (let i = 0; i < SMOKE_COUNT; i++) {
      const sc = smokeClouds[i];
      if (sc.active) {
        sc.life -= dt;
        if (sc.life <= 0) {
          sc.active = false;
          sc.group.visible = false;
        } else {
          // Expand initially, then linger
          const elapsed = sc.maxLife - sc.life;
          if (elapsed < 1.5) {
            const progress = elapsed / 1.5;
            sc.group.scale.setScalar(0.2 + progress * 0.9);
          }
        }
      }
    }
  }

  return {
    spawnTracer,
    spawnSparks,
    spawnHitPuff,
    spawnMuzzleFlash,
    spawnSmoke,
    isPositionSmoked,
    step,
  };
}
