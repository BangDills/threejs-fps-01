// Procedural canvas textures for Vanguard Depot: clean, high-readability daylight-industrial surfaces.
// Uses crisp vector shapes and geometric joints without per-pixel noise to optimize PNG compression.
import * as THREE from 'three';

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function createFloorTexture() {
  const c = makeCanvas(256, 256);
  const ctx = c.getContext('2d');

  // Base industrial light concrete tarmac
  ctx.fillStyle = '#b0bac4';
  ctx.fillRect(0, 0, 256, 256);

  // Quadrant slabs with clean subtle tone shifts
  ctx.fillStyle = '#b8c2cc';
  ctx.fillRect(4, 4, 122, 122);
  ctx.fillRect(130, 130, 122, 122);

  ctx.fillStyle = '#a6b0ba';
  ctx.fillRect(130, 4, 122, 122);
  ctx.fillRect(4, 130, 122, 122);

  // Clean expansion joints
  ctx.strokeStyle = '#8c97a2';
  ctx.lineWidth = 4;
  ctx.strokeRect(0, 0, 256, 256);

  ctx.beginPath();
  ctx.moveTo(128, 0); ctx.lineTo(128, 256);
  ctx.moveTo(0, 128); ctx.lineTo(256, 128);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createWallTexture() {
  const c = makeCanvas(256, 256);
  const ctx = c.getContext('2d');

  // Clean architectural modular wall panel
  ctx.fillStyle = '#cdd5dc';
  ctx.fillRect(0, 0, 256, 256);

  // Inner panel inset
  ctx.fillStyle = '#d6dde4';
  ctx.fillRect(12, 12, 232, 232);

  // Structural panel bevel & joint seam
  ctx.strokeStyle = '#a4b0bc';
  ctx.lineWidth = 4;
  ctx.strokeRect(12, 12, 232, 232);

  // Corner rivet bolts
  ctx.fillStyle = '#7a8896';
  const rivets = [22, 234];
  for (const rx of rivets) {
    for (const ry of rivets) {
      ctx.beginPath();
      ctx.arc(rx, ry, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createHazardTexture() {
  const c = makeCanvas(128, 128);
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(0, 0, 128, 128);

  ctx.fillStyle = '#1e2530';
  ctx.beginPath();
  const stripe = 24;
  for (let x = -128; x < 256; x += stripe * 2) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x + stripe, 0);
    ctx.lineTo(x + stripe + 128, 128);
    ctx.lineTo(x + 128, 128);
    ctx.closePath();
  }
  ctx.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createCrateTexture(label = 'VANGUARD CARGO', baseColor = '#475569') {
  const c = makeCanvas(256, 256);
  const ctx = c.getContext('2d');

  // Solid container body
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 256, 256);

  // Reinforced steel frame
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 14;
  ctx.strokeRect(7, 7, 242, 242);

  // Diagonal cross brace
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(14, 14); ctx.lineTo(242, 242);
  ctx.moveTo(242, 14); ctx.lineTo(14, 242);
  ctx.stroke();

  // Clean stencil label
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 128, 128);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createMetalGrateTexture() {
  const c = makeCanvas(128, 128);
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#475569';
  ctx.fillRect(0, 0, 128, 128);

  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, 128, 128);

  // Raised diamond tread bars
  ctx.fillStyle = '#64748b';
  for (let y = 16; y < 128; y += 32) {
    for (let x = 16; x < 128; x += 32) {
      ctx.fillRect(x - 6, y - 2, 12, 4);
      ctx.fillRect(x + 10, y + 14, 4, 12);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createSiteDecalTexture(letter = 'A', accent = '#00d2d3') {
  const c = makeCanvas(256, 256);
  const ctx = c.getContext('2d');

  ctx.clearRect(0, 0, 256, 256);

  // Outer target ring
  ctx.strokeStyle = accent;
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(128, 128, 114, 0, Math.PI * 2);
  ctx.stroke();

  // Inner broken reticle
  ctx.lineWidth = 6;
  ctx.setLineDash([18, 12]);
  ctx.beginPath();
  ctx.arc(128, 128, 90, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Stencil letter
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 96px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(letter, 128, 122);

  ctx.fillStyle = accent;
  ctx.font = 'bold 22px monospace';
  ctx.fillText(`SITE ${letter} // CORE`, 128, 186);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
