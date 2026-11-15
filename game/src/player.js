// First-person kinematic player controller, collision, crouching, and body hitboxes for Vanguard Depot.
import * as THREE from 'three';
import { playFootstep } from './audio.js';

export function createPlayer(colliders) {
  const radius = 0.42;
  const standEye = 1.65;
  const crouchEye = 1.05;

  const state = {
    position: new THREE.Vector3(0, 0, -24),
    velocity: new THREE.Vector3(),
    yaw: 0,
    pitch: 0,
    eye: standEye,
    targetEye: standEye,
    grounded: true,
    crouching: false,
    health: 100,
    armor: 100,
    alive: true,
    footstepDist: 0,
  };

  // Recoil kick spring
  let recoilPitch = 0;
  let recoilYaw = 0;

  // Collision box sizing
  const playerBox = new THREE.Box3();
  const stepBox = new THREE.Box3();

  function look(dx, dy, sensitivity = 0.0022) {
    state.yaw -= dx * sensitivity;
    state.pitch -= dy * sensitivity;
    state.pitch = Math.max(-Math.PI * 0.48, Math.min(Math.PI * 0.48, state.pitch));
  }

  function recoil(kickP, kickY) {
    recoilPitch += kickP;
    recoilYaw += kickY;
  }

  function reset(pos = new THREE.Vector3(0, 0, -24), yaw = 0) {
    state.position.copy(pos);
    state.velocity.set(0, 0, 0);
    state.yaw = yaw;
    state.pitch = 0;
    state.eye = standEye;
    state.targetEye = standEye;
    state.grounded = true;
    state.crouching = false;
    state.health = 100;
    state.armor = 100;
    state.alive = true;
    state.footstepDist = 0;
    recoilPitch = 0;
    recoilYaw = 0;
  }

  function damage(amount, part = 'torso') {
    if (!state.alive) return false;

    let mult = 1.0;
    if (part === 'head') mult = 3.5;
    else if (part === 'legs') mult = 0.75;

    const raw = amount * mult;
    if (state.armor > 0 && part !== 'head') {
      const absorbed = raw * 0.65;
      const passThrough = raw * 0.35;
      state.armor = Math.max(0, state.armor - absorbed);
      state.health = Math.max(0, state.health - (passThrough + (absorbed > state.armor ? absorbed - state.armor : 0)));
    } else {
      state.health = Math.max(0, state.health - raw);
    }

    if (state.health <= 0) {
      state.alive = false;
      state.health = 0;
      return true; // Killed
    }
    return false;
  }

  function resolveCollisions(axis, delta) {
    const halfH = state.eye / 2;
    const centerY = state.position.y + halfH;
    playerBox.min.set(state.position.x - radius, state.position.y, state.position.z - radius);
    playerBox.max.set(state.position.x + radius, state.position.y + state.eye + 0.15, state.position.z + radius);

    for (let i = 0; i < colliders.length; i++) {
      const c = colliders[i];
      if (
        playerBox.min.x < c.max.x && playerBox.max.x > c.min.x &&
        playerBox.min.y < c.max.y && playerBox.max.y > c.min.y &&
        playerBox.min.z < c.max.z && playerBox.max.z > c.min.z
      ) {
        if (axis === 'x') {
          if (delta > 0) state.position.x = c.min.x - radius - 0.001;
          else state.position.x = c.max.x + radius + 0.001;
          state.velocity.x = 0;
        } else if (axis === 'z') {
          if (delta > 0) state.position.z = c.min.z - radius - 0.001;
          else state.position.z = c.max.z + radius + 0.001;
          state.velocity.z = 0;
        } else if (axis === 'y') {
          if (delta < 0) {
            state.position.y = c.max.y;
            state.grounded = true;
          } else {
            state.position.y = c.min.y - (state.eye + 0.15);
          }
          state.velocity.y = 0;
        }
      }
    }
  }

  function groundSpeed() {
    return Math.hypot(state.velocity.x, state.velocity.z);
  }

  function step(dt, keys) {
    if (!state.alive) return;

    // Crouch handling
    state.crouching = keys.has('ShiftLeft') || keys.has('KeyC') || keys.has('ControlLeft');
    state.targetEye = state.crouching ? crouchEye : standEye;
    state.eye += (state.targetEye - state.eye) * Math.min(1, dt * 14);

    // Movement direction input
    let moveForward = 0;
    let moveRight = 0;
    if (keys.has('KeyW')) moveForward += 1;
    if (keys.has('KeyS')) moveForward -= 1;
    if (keys.has('KeyD')) moveRight += 1;
    if (keys.has('KeyA')) moveRight -= 1;

    // Movement speeds
    const topSpeed = state.crouching ? 2.6 : 5.6;
    const accel = state.grounded ? 45.0 : 12.0;
    const friction = state.grounded ? 10.0 : 0.8;

    // World relative movement vectors
    const forwardX = -Math.sin(state.yaw);
    const forwardZ = -Math.cos(state.yaw);
    const rightX = Math.cos(state.yaw);
    const rightZ = -Math.sin(state.yaw);

    let wishX = forwardX * moveForward + rightX * moveRight;
    let wishZ = forwardZ * moveForward + rightZ * moveRight;
    const wishLen = Math.hypot(wishX, wishZ);
    if (wishLen > 0.001) {
      wishX /= wishLen;
      wishZ /= wishLen;
    }

    // Accelerate
    state.velocity.x += wishX * topSpeed * accel * dt;
    state.velocity.z += wishZ * topSpeed * accel * dt;

    // Drag / Friction
    const curSpeed = groundSpeed();
    if (curSpeed > 0) {
      const drop = curSpeed * friction * dt;
      const newSpeed = Math.max(0, curSpeed - drop);
      state.velocity.x = (state.velocity.x / curSpeed) * newSpeed;
      state.velocity.z = (state.velocity.z / curSpeed) * newSpeed;
    }

    // Gravity & Jump
    if (state.grounded) {
      if (keys.has('Space')) {
        state.velocity.y = 5.4;
        state.grounded = false;
      }
    } else {
      state.velocity.y -= 19.6 * dt;
    }

    // Axis-by-axis integration with collision resolution
    state.position.x += state.velocity.x * dt;
    resolveCollisions('x', state.velocity.x);

    state.position.z += state.velocity.z * dt;
    resolveCollisions('z', state.velocity.z);

    state.grounded = false;
    state.position.y += state.velocity.y * dt;
    if (state.position.y <= 0) {
      state.position.y = 0;
      state.velocity.y = 0;
      state.grounded = true;
    }
    resolveCollisions('y', state.velocity.y);

    // Footstep audio
    if (state.grounded && curSpeed > 1.2) {
      state.footstepDist += curSpeed * dt;
      if (state.footstepDist > (state.crouching ? 2.4 : 1.8)) {
        state.footstepDist = 0;
        playFootstep();
      }
    }

    // Recoil spring recovery
    if (recoilPitch > 0) {
      const rec = Math.min(recoilPitch, dt * 0.12);
      state.pitch += rec;
      recoilPitch -= rec;
    }
    if (Math.abs(recoilYaw) > 0) {
      const recY = Math.sign(recoilYaw) * Math.min(Math.abs(recoilYaw), dt * 0.08);
      state.yaw += recY;
      recoilYaw -= recY;
    }
  }

  // Hitbox coordinates for bot raycasts
  function getHitboxes() {
    const headPos = new THREE.Vector3(state.position.x, state.position.y + state.eye, state.position.z);
    const torsoMin = new THREE.Vector3(state.position.x - 0.3, state.position.y + state.eye * 0.45, state.position.z - 0.25);
    const torsoMax = new THREE.Vector3(state.position.x + 0.3, state.position.y + state.eye * 0.9, state.position.z + 0.25);
    const legsMin = new THREE.Vector3(state.position.x - 0.25, state.position.y, state.position.z - 0.25);
    const legsMax = new THREE.Vector3(state.position.x + 0.25, state.position.y + state.eye * 0.45, state.position.z + 0.25);

    return {
      head: { center: headPos, radius: 0.22 },
      torso: { min: torsoMin, max: torsoMax },
      legs: { min: legsMin, max: legsMax },
    };
  }

  return {
    state,
    look,
    recoil,
    reset,
    damage,
    groundSpeed,
    getHitboxes,
    step,
  };
}
