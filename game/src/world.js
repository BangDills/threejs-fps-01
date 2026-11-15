// Vanguard Depot world geometry, lighting, colliders, and tactical waypoint graph.
// Generates an industrial aerospace logistics depot with daylight lighting (mean luma 70-95).
import * as THREE from 'three';
import { PALETTE } from './palette.js';
import { connectWalkableWaypoints } from './navigation.js';
import {
  createFloorTexture,
  createWallTexture,
  createHazardTexture,
  createCrateTexture,
  createMetalGrateTexture,
  createSiteDecalTexture,
} from './textures.js';

export function createWorld(scene) {
  const colliders = [];
  const shootables = [];

  // Helper to add box collider
  function addBoxCollider(minX, minY, minZ, maxX, maxY, maxZ) {
    colliders.push({
      min: new THREE.Vector3(Math.min(minX, maxX), Math.min(minY, maxY), Math.min(minZ, maxZ)),
      max: new THREE.Vector3(Math.max(minX, maxX), Math.max(minY, maxY), Math.max(minZ, maxZ)),
    });
  }

  // 1. Procedural Textures & Shared Materials
  const floorTex = createFloorTexture();
  floorTex.repeat.set(16, 14);
  const floorMat = new THREE.MeshLambertMaterial({ map: floorTex });

  const wallTex = createWallTexture();
  wallTex.repeat.set(8, 2);
  const wallMat = new THREE.MeshLambertMaterial({ map: wallTex });

  const hazardTex = createHazardTexture();
  hazardTex.repeat.set(6, 1);
  const hazardMat = new THREE.MeshLambertMaterial({ map: hazardTex });

  const crateBlueTex = createCrateTexture('VANGUARD CARGO', '#3d5268');
  const crateBlueMat = new THREE.MeshLambertMaterial({ map: crateBlueTex });

  const crateRedTex = createCrateTexture('AEROSPACE-01', '#7a3e36');
  const crateRedMat = new THREE.MeshLambertMaterial({ map: crateRedTex });

  const crateOliveTex = createCrateTexture('ORDNANCE RES', '#4e5642');
  const crateOliveMat = new THREE.MeshLambertMaterial({ map: crateOliveTex });

  const metalGrateTex = createMetalGrateTexture();
  metalGrateTex.repeat.set(4, 4);
  const metalGrateMat = new THREE.MeshLambertMaterial({ map: metalGrateTex });

  const steelStructureMat = new THREE.MeshLambertMaterial({ color: PALETTE.steelNavy });
  const trimMat = new THREE.MeshLambertMaterial({ color: PALETTE.steelTrim });

  // 2. Lighting Setup
  // Sky Hemisphere Light (Warm daylight ambient fill)
  const hemiLight = new THREE.HemisphereLight(
    PALETTE.ambientSky,
    PALETTE.ambientGround,
    PALETTE.ambientIntensity
  );
  hemiLight.position.set(0, 50, 0);
  scene.add(hemiLight);

  // High-Noon Direct Sunlight
  const sunLight = new THREE.DirectionalLight(PALETTE.sunLight, PALETTE.sunIntensity);
  sunLight.position.set(32, 60, 24);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 10;
  sunLight.shadow.camera.far = 130;
  const d = 48;
  sunLight.shadow.camera.left = -d;
  sunLight.shadow.camera.right = d;
  sunLight.shadow.camera.top = d;
  sunLight.shadow.camera.bottom = -d;
  sunLight.shadow.bias = -0.0004;
  scene.add(sunLight);

  // 3. Ground Plane
  const groundGeo = new THREE.PlaneGeometry(74, 64);
  groundGeo.rotateX(-Math.PI / 2);
  const groundMesh = new THREE.Mesh(groundGeo, floorMat);
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);
  shootables.push(groundMesh);

  // 4. Perimeter Walls (6m high enclosing 70m x 60m arena)
  function createWallMesh(w, h, d, x, y, z, mat = wallMat) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    shootables.push(mesh);
    addBoxCollider(x - w / 2, y - h / 2, z - d / 2, x + w / 2, y + h / 2, z + d / 2);
    return mesh;
  }

  // Outer bounds: X: -35 to +35, Z: -29 to +29
  createWallMesh(72, 6, 2, 0, 3, -29); // North Wall
  createWallMesh(72, 6, 2, 0, 3, 29);  // South Wall
  createWallMesh(2, 6, 60, -35, 3, 0); // West Wall
  createWallMesh(2, 6, 60, 35, 3, 0);  // East Wall

  // 5. Interior Lane Architecture & Dividers
  // Divider 1: Separates Lane A and Mid
  createWallMesh(2, 5, 20, -11, 2.5, -14); // North Section
  createWallMesh(2, 5, 18, -11, 2.5, 14);  // South Section
  // Opening between Lane A and Mid around Z: -4 to +5 (Mid Crossway)

  // Divider 2: Separates Mid and Lane B
  createWallMesh(2, 5, 20, 11, 2.5, -14); // North Section
  createWallMesh(2, 5, 18, 11, 2.5, 14);  // South Section
  // Opening between Mid and Lane B around Z: -4 to +5 (East Crossway)

  // 6. Mid Logistics Bay Structure
  // High arched roof trusses over Mid (X: -11 to +11, Z: -12 to +12)
  for (let z = -10; z <= 10; z += 5) {
    const truss = new THREE.Mesh(new THREE.BoxGeometry(22, 0.5, 0.5), steelStructureMat);
    truss.position.set(0, 6.2, z);
    scene.add(truss);
  }

  // Central Cargo Platform & Obstacles
  // Central Mid Crate Stack (Tactical Divider)
  createWallMesh(3.5, 2.4, 4.5, 0, 1.2, 0, crateBlueMat);
  createWallMesh(2.5, 1.2, 2.5, 0, 3.0, 0, crateRedMat);

  // Staggered Mid cover blocks
  createWallMesh(3.2, 1.2, 1.2, -4.5, 0.6, -7, crateOliveMat);
  createWallMesh(3.2, 1.2, 1.2, 4.5, 0.6, 7, crateBlueMat);
  createWallMesh(1.2, 2.4, 2.4, 5.0, 1.2, -6, crateRedMat);
  createWallMesh(1.2, 2.4, 2.4, -5.0, 1.2, 6, crateOliveMat);

  // 7. Site A: Coolant Matrix Yard (X: -23, Z: -10)
  const siteAPos = new THREE.Vector3(-23, 0, -10);

  // Site A Raised Octagonal Decal Platform
  const siteAGeo = new THREE.CylinderGeometry(5.2, 5.4, 0.25, 8);
  const siteAMesh = new THREE.Mesh(siteAGeo, steelStructureMat);
  siteAMesh.position.set(siteAPos.x, 0.125, siteAPos.z);
  siteAMesh.receiveShadow = true;
  scene.add(siteAMesh);
  shootables.push(siteAMesh);
  addBoxCollider(siteAPos.x - 5.2, 0, siteAPos.z - 5.2, siteAPos.x + 5.2, 0.25, siteAPos.z + 5.2);

  // Site A Decal
  const siteADecalTex = createSiteDecalTexture('A', '#00d2d3');
  const siteADecalMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(7.5, 7.5),
    new THREE.MeshBasicMaterial({ map: siteADecalTex, transparent: true })
  );
  siteADecalMesh.rotateX(-Math.PI / 2);
  siteADecalMesh.position.set(siteAPos.x, 0.26, siteAPos.z);
  scene.add(siteADecalMesh);

  // Coolant Matrix Core Cylinder
  const coreMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 0.8, 2.6, 12),
    new THREE.MeshLambertMaterial({ color: 0x00e5ff, emissive: 0x006677 })
  );
  coreMesh.position.set(siteAPos.x, 1.3, siteAPos.z);
  coreMesh.castShadow = true;
  scene.add(coreMesh);
  shootables.push(coreMesh);
  addBoxCollider(siteAPos.x - 0.8, 0, siteAPos.z - 0.8, siteAPos.x + 0.8, 2.6, siteAPos.z + 0.8);

  // Coolant site light
  const siteALight = new THREE.PointLight(0x00e5ff, 2.5, 12);
  siteALight.position.set(siteAPos.x, 2.8, siteAPos.z);
  scene.add(siteALight);

  // Site A Cover Containers
  createWallMesh(6.0, 2.6, 2.4, -28, 1.3, -12, crateRedMat);
  createWallMesh(2.4, 2.6, 5.0, -17, 1.3, -18, crateBlueMat);
  createWallMesh(4.0, 1.2, 2.0, -22, 0.6, -3, crateOliveMat);

  // Elevated Catwalk Ramp in Lane A (X: -32 to -26, Z: -2 to 10)
  const catwalkMesh = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.3, 12.0), metalGrateMat);
  catwalkMesh.position.set(-29, 2.0, 4.0);
  catwalkMesh.castShadow = true;
  catwalkMesh.receiveShadow = true;
  scene.add(catwalkMesh);
  shootables.push(catwalkMesh);
  addBoxCollider(-31, 0, -2, -27, 2.1, 10);

  // Catwalk Support Pillars
  for (let cz = -1; cz <= 9; cz += 5) {
    const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 2.0), steelStructureMat);
    p1.position.set(-30.8, 1.0, cz);
    scene.add(p1);
    const p2 = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 2.0), steelStructureMat);
    p2.position.set(-27.2, 1.0, cz);
    scene.add(p2);
  }

  // 8. Site B: Sub-Orbital Uplink (X: +23, Z: -10)
  const siteBPos = new THREE.Vector3(23, 0, -10);

  // Site B Octagonal Base
  const siteBGeo = new THREE.CylinderGeometry(5.2, 5.4, 0.25, 8);
  const siteBMesh = new THREE.Mesh(siteBGeo, steelStructureMat);
  siteBMesh.position.set(siteBPos.x, 0.125, siteBPos.z);
  siteBMesh.receiveShadow = true;
  scene.add(siteBMesh);
  shootables.push(siteBMesh);
  addBoxCollider(siteBPos.x - 5.2, 0, siteBPos.z - 5.2, siteBPos.x + 5.2, 0.25, siteBPos.z + 5.2);

  // Site B Decal
  const siteBDecalTex = createSiteDecalTexture('B', '#ff9f1c');
  const siteBDecalMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(7.5, 7.5),
    new THREE.MeshBasicMaterial({ map: siteBDecalTex, transparent: true })
  );
  siteBDecalMesh.rotateX(-Math.PI / 2);
  siteBDecalMesh.position.set(siteBPos.x, 0.26, siteBPos.z);
  scene.add(siteBDecalMesh);

  // Satellite Transceiver Dish Pedestal
  const dishPedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(1.0, 1.2, 1.8, 10),
    new THREE.MeshLambertMaterial({ color: 0x48586e })
  );
  dishPedestal.position.set(siteBPos.x, 0.9, siteBPos.z);
  dishPedestal.castShadow = true;
  scene.add(dishPedestal);
  shootables.push(dishPedestal);
  addBoxCollider(siteBPos.x - 1.0, 0, siteBPos.z - 1.0, siteBPos.x + 1.0, 1.8, siteBPos.z + 1.0);

  // Satellite Dish Ring / Cone
  const dishMesh = new THREE.Mesh(
    new THREE.ConeGeometry(1.6, 0.8, 12, 1, true),
    new THREE.MeshLambertMaterial({ color: 0xffaa22, side: THREE.DoubleSide })
  );
  dishMesh.position.set(siteBPos.x, 2.2, siteBPos.z);
  dishMesh.rotation.x = Math.PI / 4;
  dishMesh.castShadow = true;
  scene.add(dishMesh);

  // Amber Terminal Light
  const siteBLight = new THREE.PointLight(0xff9f1c, 2.5, 12);
  siteBLight.position.set(siteBPos.x, 2.8, siteBPos.z);
  scene.add(siteBLight);

  // Site B Server Racks and Wall Cover
  createWallMesh(2.4, 2.6, 5.0, 17, 1.3, -18, crateBlueMat);
  createWallMesh(6.0, 2.6, 2.4, 28, 1.3, -12, crateOliveMat);
  createWallMesh(3.5, 1.2, 2.0, 22, 0.6, -3, crateRedMat);

  // Lane B Alley Chokepoints (Z: 6 to 18)
  createWallMesh(4.0, 2.4, 2.0, 26, 1.2, 8, crateBlueMat);
  createWallMesh(2.0, 1.2, 4.0, 18, 0.6, 14, crateOliveMat);

  // 9. Attacker & Defender Spawn Barriers
  // Defender Spawn (North: Z: -22 to -26)
  createWallMesh(6.0, 1.2, 1.2, 0, 0.6, -22, hazardMat);
  // Attacker Spawn (South: Z: 22 to 26)
  createWallMesh(6.0, 1.2, 1.2, 0, 0.6, 22, hazardMat);

  // 10. Waypoint Navigation Graph (26 Tactical Waypoints)
  const waypoints = [
    // 0: Defender Spawn North
    { id: 0, pos: new THREE.Vector3(0, 0.9, -24), links: [1, 2, 3], tag: 'spawn_def' },
    // 1: CT Connector to Lane A
    { id: 1, pos: new THREE.Vector3(-14, 0.9, -22), links: [0, 4, 5], tag: 'lane_a' },
    // 2: CT Connector to Mid
    { id: 2, pos: new THREE.Vector3(0, 0.9, -15), links: [0, 6, 7], tag: 'mid' },
    // 3: CT Connector to Lane B
    { id: 3, pos: new THREE.Vector3(14, 0.9, -22), links: [0, 8, 9], tag: 'lane_b' },

    // 4, 5: Site A Approaches
    { id: 4, pos: new THREE.Vector3(-23, 0.9, -16), links: [1, 5, 10], tag: 'site_a' },
    { id: 5, pos: new THREE.Vector3(-23, 0.9, -10), links: [1, 4, 11, 12], tag: 'site_a' }, // SITE A CORE

    // 6, 7: Mid Lanes
    { id: 6, pos: new THREE.Vector3(-5, 0.9, -6), links: [2, 10, 13], tag: 'mid' },
    { id: 7, pos: new THREE.Vector3(5, 0.9, -6), links: [2, 8, 14], tag: 'mid' },

    // 8, 9: Site B Approaches
    { id: 8, pos: new THREE.Vector3(23, 0.9, -16), links: [3, 7, 9], tag: 'site_b' },
    { id: 9, pos: new THREE.Vector3(23, 0.9, -10), links: [3, 8, 15, 16], tag: 'site_b' }, // SITE B CORE

    // 10, 11, 12: Lane A Mid / Catwalk
    { id: 10, pos: new THREE.Vector3(-15, 0.9, -2), links: [4, 6, 12, 17], tag: 'cross' },
    { id: 11, pos: new THREE.Vector3(-28, 0.9, -2), links: [5, 12, 18], tag: 'lane_a' },
    { id: 12, pos: new THREE.Vector3(-22, 0.9, 4), links: [5, 10, 11, 18], tag: 'lane_a' },

    // 13, 14: Central Mid Crossway
    { id: 13, pos: new THREE.Vector3(-4, 0.9, 0), links: [6, 10, 14, 19], tag: 'mid' },
    { id: 14, pos: new THREE.Vector3(4, 0.9, 0), links: [7, 13, 16, 20], tag: 'mid' },

    // 15, 16: Lane B Mid
    { id: 15, pos: new THREE.Vector3(28, 0.9, -2), links: [9, 16, 21], tag: 'lane_b' },
    { id: 16, pos: new THREE.Vector3(16, 0.9, 0), links: [9, 14, 15, 22], tag: 'cross' },

    // 17, 18: South Lane A (T-Side Approach)
    { id: 17, pos: new THREE.Vector3(-14, 0.9, 10), links: [10, 18, 23], tag: 'lane_a' },
    { id: 18, pos: new THREE.Vector3(-24, 0.9, 14), links: [11, 12, 17, 23], tag: 'lane_a' },

    // 19, 20: South Mid
    { id: 19, pos: new THREE.Vector3(-4, 0.9, 8), links: [13, 17, 24], tag: 'mid' },
    { id: 20, pos: new THREE.Vector3(4, 0.9, 8), links: [14, 22, 24], tag: 'mid' },

    // 21, 22: South Lane B (T-Side Approach)
    { id: 21, pos: new THREE.Vector3(26, 0.9, 12), links: [15, 22, 25], tag: 'lane_b' },
    { id: 22, pos: new THREE.Vector3(16, 0.9, 10), links: [16, 20, 21, 25], tag: 'lane_b' },

    // 23, 24, 25: T Connectors
    { id: 23, pos: new THREE.Vector3(-15, 0.9, 20), links: [17, 18, 26], tag: 'spawn_atk' },
    { id: 24, pos: new THREE.Vector3(0, 0.9, 18), links: [19, 20, 26], tag: 'mid' },
    { id: 25, pos: new THREE.Vector3(15, 0.9, 20), links: [21, 22, 26], tag: 'spawn_atk' },

    // 26: Attacker Spawn South
    { id: 26, pos: new THREE.Vector3(0, 0.9, 24), links: [23, 24, 25], tag: 'spawn_atk' },
  ];

  connectWalkableWaypoints(waypoints, colliders);

  // 11. Pulse Disruptor Device Mesh (Planted in Site A or B)
  const deviceGroup = new THREE.Group();
  deviceGroup.name = 'pulse_disruptor';

  // Case body
  const caseGeo = new THREE.BoxGeometry(0.65, 0.22, 0.44);
  const caseMat = new THREE.MeshLambertMaterial({ color: 0x1f2630 });
  const caseMesh = new THREE.Mesh(caseGeo, caseMat);
  caseMesh.position.y = 0.11;
  caseMesh.castShadow = true;
  caseMesh.receiveShadow = true;
  deviceGroup.add(caseMesh);

  // Digital countdown screen
  const screenGeo = new THREE.PlaneGeometry(0.32, 0.18);
  const screenMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
  const screenMesh = new THREE.Mesh(screenGeo, screenMat);
  screenMesh.rotation.x = -Math.PI / 2;
  screenMesh.position.set(0, 0.225, 0.04);
  deviceGroup.add(screenMesh);

  // Energy core cylindrical conduits
  const conduitGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.46, 8);
  const conduitMat = new THREE.MeshLambertMaterial({ color: 0xff3b30, emissive: 0x881111 });
  const conduit1 = new THREE.Mesh(conduitGeo, conduitMat);
  conduit1.rotation.x = Math.PI / 2;
  conduit1.position.set(-0.24, 0.11, 0);
  deviceGroup.add(conduit1);

  const conduit2 = new THREE.Mesh(conduitGeo, conduitMat);
  conduit2.rotation.x = Math.PI / 2;
  conduit2.position.set(0.24, 0.11, 0);
  deviceGroup.add(conduit2);

  // Antenna
  const antGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.38, 6);
  const antMat = new THREE.MeshLambertMaterial({ color: 0x7a8a9a });
  const antMesh = new THREE.Mesh(antGeo, antMat);
  antMesh.position.set(0.18, 0.36, -0.12);
  deviceGroup.add(antMesh);

  // Blinking pulsing beacon light
  const deviceLight = new THREE.PointLight(0xff3b30, 2.5, 9);
  deviceLight.position.set(0, 0.45, 0);
  deviceGroup.add(deviceLight);

  deviceGroup.visible = false;
  scene.add(deviceGroup);

  function setPlantedDevice(pos, site) {
    let targetX = pos.x;
    let targetZ = pos.z;
    const targetY = 0.25;

    // Avoid clipping with central pillars
    if (site === 'A') {
      if (Math.abs(targetX - siteAPos.x) < 1.2 && Math.abs(targetZ - siteAPos.z) < 1.2) {
        targetX = siteAPos.x + 0.9;
        targetZ = siteAPos.z + 1.1;
      }
    } else if (site === 'B') {
      if (Math.abs(targetX - siteBPos.x) < 1.2 && Math.abs(targetZ - siteBPos.z) < 1.2) {
        targetX = siteBPos.x - 0.9;
        targetZ = siteBPos.z + 1.1;
      }
    }

    deviceGroup.position.set(targetX, targetY, targetZ);
    deviceGroup.visible = true;
    return deviceGroup.position;
  }

  function clearPlantedDevice() {
    deviceGroup.visible = false;
  }

  return {
    colliders,
    shootables,
    waypoints,
    siteA: siteAPos,
    siteB: siteBPos,
    defSpawn: new THREE.Vector3(0, 0.9, -24),
    atkSpawn: new THREE.Vector3(0, 0.9, 24),
    deviceMesh: deviceGroup,
    setPlantedDevice,
    clearPlantedDevice,
  };
}

/**
 * Creates a compact backpack carrier device mesh for the designated spike carrier.
 * @returns {THREE.Group}
 */
export function createCarrierDeviceMesh() {
  const g = new THREE.Group();
  const packGeo = new THREE.BoxGeometry(0.38, 0.46, 0.16);
  const packMat = new THREE.MeshLambertMaterial({ color: 0x1f2630 });
  const pack = new THREE.Mesh(packGeo, packMat);
  g.add(pack);

  // Glowing status light
  const ledGeo = new THREE.BoxGeometry(0.12, 0.08, 0.04);
  const ledMat = new THREE.MeshBasicMaterial({ color: 0xff3b30 });
  const led = new THREE.Mesh(ledGeo, ledMat);
  led.position.set(0, 0.12, 0.09);
  g.add(led);

  // Hazard stripe accents
  const stripGeo = new THREE.BoxGeometry(0.34, 0.04, 0.17);
  const stripMat = new THREE.MeshBasicMaterial({ color: 0xffaa22 });
  const strip = new THREE.Mesh(stripGeo, stripMat);
  strip.position.set(0, -0.08, 0);
  g.add(strip);

  return g;
}
