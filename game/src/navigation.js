// Vanguard Depot waypoint navigation and deterministic shortest-path routing.
// Computes optimal paths over the tactical waypoint graph using Dijkstra's algorithm.

/**
 * Finds the nearest waypoint to a given 3D position.
 * @param {Array} waypoints List of waypoints from world.
 * @param {THREE.Vector3|{x:number, y:number, z:number}} pos
 * @returns {number} Waypoint ID
 */
export function findNearestWaypoint(waypoints, pos) {
  let bestId = 0;
  let minDist = Infinity;
  for (let i = 0; i < waypoints.length; i++) {
    const wp = waypoints[i];
    const dx = wp.pos.x - pos.x;
    const dy = wp.pos.y - pos.y;
    const dz = wp.pos.z - pos.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist < minDist) {
      minDist = dist;
      bestId = wp.id;
    }
  }
  return bestId;
}

/**
 * Deterministic shortest path routing using Dijkstra's algorithm.
 * Tie-breaks are strictly resolved by numerical waypoint ID for complete determinism.
 * @param {Array} waypoints
 * @param {number} startId
 * @param {number} goalId
 * @returns {number[]} Array of waypoint IDs from startId to goalId inclusive
 */
export function findShortestPath(waypoints, startId, goalId) {
  if (startId === goalId) return [startId];

  const n = waypoints.length;
  const dist = new Float64Array(n).fill(Infinity);
  const prev = new Int32Array(n).fill(-1);
  const visited = new Uint8Array(n);

  dist[startId] = 0;

  for (let iter = 0; iter < n; iter++) {
    let u = -1;
    let minD = Infinity;

    // Pick unvisited node with minimum distance, tie-breaking by smaller ID
    for (let i = 0; i < n; i++) {
      if (!visited[i] && dist[i] < minD) {
        minD = dist[i];
        u = i;
      }
    }

    if (u === -1 || u === goalId) break;
    visited[u] = 1;

    const uWp = waypoints[u];
    if (!uWp || !uWp.links) continue;

    // Sort links for deterministic traversal
    const links = [...uWp.links].sort((a, b) => a - b);
    for (let j = 0; j < links.length; j++) {
      const v = links[j];
      if (visited[v]) continue;

      const vWp = waypoints[v];
      if (!vWp) continue;

      const dx = uWp.pos.x - vWp.pos.x;
      const dy = uWp.pos.y - vWp.pos.y;
      const dz = uWp.pos.z - vWp.pos.z;
      const weight = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const alt = dist[u] + weight;

      if (alt < dist[v] - 1e-9) {
        dist[v] = alt;
        prev[v] = u;
      } else if (Math.abs(alt - dist[v]) <= 1e-9 && (prev[v] === -1 || u < prev[v])) {
        // Deterministic tie-break
        prev[v] = u;
      }
    }
  }

  if (dist[goalId] === Infinity) {
    return [startId];
  }

  const path = [];
  let curr = goalId;
  while (curr !== -1) {
    path.push(curr);
    if (curr === startId) break;
    curr = prev[curr];
  }
  path.reverse();
  return path;
}

export function connectWalkableWaypoints(waypoints, colliders, clearance = 0.5) {
  const obstacles = colliders.filter((box) => box.max.y > 0.3);
  const blocked = (x, z) => obstacles.some((box) =>
    x > box.min.x - clearance && x < box.max.x + clearance &&
    z > box.min.z - clearance && z < box.max.z + clearance);
  const corners = [];
  for (const box of obstacles) {
    for (const x of [box.min.x - clearance - 0.05, box.max.x + clearance + 0.05]) {
      for (const z of [box.min.z - clearance - 0.05, box.max.z + clearance + 0.05]) {
        if (Math.abs(x) < 33.5 && Math.abs(z) < 27.5 && !blocked(x, z)) corners.push({ x, z });
      }
    }
  }
  for (const wp of waypoints) {
    if (blocked(wp.pos.x, wp.pos.z)) {
      const nearest = corners.reduce((best, p) =>
        Math.hypot(p.x - wp.pos.x, p.z - wp.pos.z) < Math.hypot(best.x - wp.pos.x, best.z - wp.pos.z) ? p : best);
      wp.pos.set(nearest.x, 0, nearest.z);
    }
    wp.pos.y = 0;
    wp.links = [];
  }
  const template = waypoints[0].pos;
  for (const p of corners) {
    waypoints.push({ id: waypoints.length, pos: template.clone().set(p.x, 0, p.z), links: [], tag: 'cover_corner' });
  }
  // A segment must clear every expanded obstacle, including between samples.
  function clear(a, b) {
    for (const box of obstacles) {
      let enter = 0;
      let exit = 1;
      for (const axis of ['x', 'z']) {
        const delta = b[axis] - a[axis];
        const low = box.min[axis] - clearance;
        const high = box.max[axis] + clearance;
        if (Math.abs(delta) < 1e-9) {
          if (a[axis] <= low || a[axis] >= high) { enter = 2; break; }
        } else {
          const t1 = (low - a[axis]) / delta;
          const t2 = (high - a[axis]) / delta;
          enter = Math.max(enter, Math.min(t1, t2));
          exit = Math.min(exit, Math.max(t1, t2));
        }
      }
      if (enter <= exit) return false;
    }
    return true;
  }
  for (let a = 0; a < waypoints.length; a++) {
    for (let b = a + 1; b < waypoints.length; b++) {
      if (clear(waypoints[a].pos, waypoints[b].pos)) {
        waypoints[a].links.push(b);
        waypoints[b].links.push(a);
      }
    }
  }
  return waypoints;
}

export const SITE_WAYPOINTS = {
  A: 5, // Site A Core (world.waypoints[5])
  B: 9, // Site B Core (world.waypoints[9])
};

export const SPAWN_WAYPOINTS = {
  DEF: 0,
  ATK: 26,
};

/**
 * High-level deterministic route planner. Resolves positions or waypoint IDs to a route.
 * @param {Array} waypoints
 * @param {number|THREE.Vector3} from
 * @param {number|'A'|'B'|THREE.Vector3} to
 * @returns {number[]} Waypoint ID route
 */
export function computeRoute(waypoints, from, to) {
  const startId = typeof from === 'number' ? from : findNearestWaypoint(waypoints, from);
  let goalId;
  if (to === 'A') goalId = SITE_WAYPOINTS.A;
  else if (to === 'B') goalId = SITE_WAYPOINTS.B;
  else if (typeof to === 'number') goalId = to;
  else goalId = findNearestWaypoint(waypoints, to);

  return findShortestPath(waypoints, startId, goalId);
}
