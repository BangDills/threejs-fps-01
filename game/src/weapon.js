// Weapon systems, ballistics, recoil, ADS mechanics, and first-person viewmodels for Vanguard Depot.
import * as THREE from 'three';
import { PALETTE } from './palette.js';
import { playGunshot, playReload } from './audio.js';

export const WEAPON_REGISTRY = {
  arc9: {
    id: 'arc9',
    name: 'Arc-9 Tactical',
    type: 'pistol',
    mode: 'Semi-Auto',
    cost: 0,
    magSize: 15,
    reserveMax: 45,
    fireInterval: 0.16,
    auto: false,
    damage: 34,
    spreadBase: 0.008,
    recoilP: 0.014,
    recoilY: 0.004,
    reloadTime: 1.6,
    pellets: 1,
    zoomFov: 62,
  },
  stinger: {
    id: 'stinger',
    name: 'Stinger PDW',
    type: 'smg',
    mode: 'Full-Auto (880 RPM)',
    cost: 1500,
    magSize: 30,
    reserveMax: 90,
    fireInterval: 0.068,
    auto: true,
    damage: 26,
    spreadBase: 0.015,
    recoilP: 0.018,
    recoilY: 0.007,
    reloadTime: 1.8,
    pellets: 1,
    zoomFov: 58,
  },
  bulldog: {
    id: 'bulldog',
    name: 'Bulldog-8 Shotgun',
    type: 'shotgun',
    mode: 'Pump-Action',
    cost: 1700,
    magSize: 8,
    reserveMax: 24,
    fireInterval: 0.72,
    auto: false,
    damage: 18, // 8 pellets * 18 = 144 max point-blank
    spreadBase: 0.042,
    recoilP: 0.045,
    recoilY: 0.012,
    reloadTime: 2.4,
    pellets: 8,
    zoomFov: 65,
  },
  valkyrie: {
    id: 'valkyrie',
    name: 'Valkyrie AR-24',
    type: 'rifle',
    mode: 'Full-Auto (660 RPM)',
    cost: 2800,
    magSize: 30,
    reserveMax: 90,
    fireInterval: 0.09,
    auto: true,
    damage: 38,
    spreadBase: 0.010,
    recoilP: 0.024,
    recoilY: 0.009,
    reloadTime: 2.1,
    pellets: 1,
    zoomFov: 50,
  },
  onyx: {
    id: 'onyx',
    name: 'Onyx Scout Rifle',
    type: 'sniper',
    mode: 'Precision Bolt',
    cost: 4400,
    magSize: 5,
    reserveMax: 15,
    fireInterval: 1.1,
    auto: false,
    damage: 85,
    spreadBase: 0.002,
    recoilP: 0.065,
    recoilY: 0.015,
    reloadTime: 2.6,
    pellets: 1,
    zoomFov: 32, // High optical zoom
  },
};

export function createWeapon(camera) {
  // First-person viewmodel rig
  const viewmodelRoot = new THREE.Group();
  camera.add(viewmodelRoot);

  // Weapon geometries & materials
  const receiverGeo = new THREE.BoxGeometry(0.08, 0.12, 0.45);
  const barrelGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.42, 8);
  barrelGeo.rotateX(Math.PI / 2);
  const magGeo = new THREE.BoxGeometry(0.05, 0.18, 0.08);

  const gunmetalMat = new THREE.MeshLambertMaterial({ color: PALETTE.weaponGunmetal });
  const receiverMat = new THREE.MeshLambertMaterial({ color: PALETTE.weaponReceiver });
  const accentMat = new THREE.MeshLambertMaterial({ color: PALETTE.weaponAccent });

  const receiverMesh = new THREE.Mesh(receiverGeo, receiverMat);
  const barrelMesh = new THREE.Mesh(barrelGeo, gunmetalMat);
  barrelMesh.position.set(0, 0.04, -0.32);
  const magMesh = new THREE.Mesh(magGeo, gunmetalMat);
  magMesh.position.set(0, -0.12, -0.05);
  const stripeMesh = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.02, 0.2), accentMat);
  stripeMesh.position.set(0, 0.06, -0.05);

  viewmodelRoot.add(receiverMesh);
  viewmodelRoot.add(barrelMesh);
  viewmodelRoot.add(magMesh);
  viewmodelRoot.add(stripeMesh);

  // Default hipfire viewmodel position
  const hipfirePos = new THREE.Vector3(0.24, -0.22, -0.52);
  const adsPos = new THREE.Vector3(0.0, -0.155, -0.42);
  viewmodelRoot.position.copy(hipfirePos);

  let currentGun = WEAPON_REGISTRY.arc9;
  let currentMag = currentGun.magSize;
  let currentReserve = currentGun.reserveMax;

  let fireCooldown = 0;
  let reloadTimer = 0;
  let isReloading = false;
  let punchAnim = 0;

  // Grenade inventory
  let heGrenades = 1;
  let smokeGrenades = 1;

  function switchWeapon(id) {
    if (!WEAPON_REGISTRY[id]) return;
    currentGun = WEAPON_REGISTRY[id];
    currentMag = currentGun.magSize;
    currentReserve = currentGun.reserveMax;
    isReloading = false;
    reloadTimer = 0;
    fireCooldown = 0.2;
  }

  function ready() {
    return fireCooldown <= 0 && !isReloading && currentMag > 0;
  }

  function reload() {
    if (isReloading || currentMag >= currentGun.magSize || currentReserve <= 0) return false;
    isReloading = true;
    reloadTimer = currentGun.reloadTime;
    playReload();
    return true;
  }

  function refill() {
    currentMag = currentGun.magSize;
    currentReserve = currentGun.reserveMax;
    isReloading = false;
    reloadTimer = 0;
    heGrenades = 1;
    smokeGrenades = 1;
  }

  function spread(speed, crouching, ads) {
    let s = currentGun.spreadBase;
    s += (speed / 5.5) * 0.028;
    if (crouching) s *= 0.55;
    if (ads) s *= 0.40;
    return s;
  }

  function pullTrigger() {
    if (!ready()) return false;
    currentMag--;
    fireCooldown = currentGun.fireInterval;
    punchAnim = 0.07;
    playGunshot(currentGun.type);
    return true;
  }

  function step(dt, ads = false) {
    if (fireCooldown > 0) fireCooldown -= dt;

    if (isReloading) {
      reloadTimer -= dt;
      if (reloadTimer <= 0) {
        isReloading = false;
        const needed = currentGun.magSize - currentMag;
        const amount = Math.min(needed, currentReserve);
        currentMag += amount;
        currentReserve -= amount;
      }
    }

    // Viewmodel position interpolation (Hipfire vs ADS)
    const targetPos = ads ? adsPos : hipfirePos;
    viewmodelRoot.position.lerp(targetPos, Math.min(1, dt * 16));

    // Punch recoil kick animation
    if (punchAnim > 0) {
      viewmodelRoot.position.z += punchAnim;
      punchAnim -= dt * 0.45;
    }

    // Camera FOV zoom for ADS
    const targetFov = ads ? currentGun.zoomFov : 75;
    camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 18);
    camera.updateProjectionMatrix();
  }

  // Get world muzzle point for tracer spawning
  const _muzzleLocal = new THREE.Vector3(0, 0.04, -0.6);
  const _muzzleWorld = new THREE.Vector3();
  function getMuzzlePosition() {
    return viewmodelRoot.localToWorld(_muzzleWorld.copy(_muzzleLocal));
  }

  return {
    get current() { return currentGun; },
    get mag() { return currentMag; },
    get reserve() { return currentReserve; },
    get isReloading() { return isReloading; },
    get he() { return heGrenades; },
    get smoke() { return smokeGrenades; },
    set he(v) { heGrenades = v; },
    set smoke(v) { smokeGrenades = v; },
    ready,
    reload,
    refill,
    pullTrigger,
    spread,
    switchWeapon,
    getMuzzlePosition,
    step,
  };
}
