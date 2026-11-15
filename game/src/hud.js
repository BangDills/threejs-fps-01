// Tactical HUD controller, 2D radar minimap, killfeed, and interactive modals for Vanguard Depot.
import { playHitmarker } from './audio.js';

export function createHud() {
  // DOM Elements
  const crosshair = document.getElementById('crosshair');
  const chTop = document.getElementById('ch-top');
  const chBottom = document.getElementById('ch-bottom');
  const chLeft = document.getElementById('ch-left');
  const chRight = document.getElementById('ch-right');

  const hitmarker = document.getElementById('hitmarker');
  const scoreDef = document.getElementById('score-def');
  const scoreAtk = document.getElementById('score-atk');
  const roundTimer = document.getElementById('round-timer');
  const roundPhase = document.getElementById('round-phase');

  const vitalHp = document.getElementById('vital-hp');
  const vitalAp = document.getElementById('vital-ap');
  const hpBarFill = document.getElementById('hp-bar-fill');
  const apBarFill = document.getElementById('ap-bar-fill');

  const weaponName = document.getElementById('weapon-name');
  const weaponFiremode = document.getElementById('weapon-firemode');
  const ammoMag = document.getElementById('ammo-mag');
  const ammoReserve = document.getElementById('ammo-reserve');
  const gearHe = document.getElementById('gear-he');
  const gearSmoke = document.getElementById('gear-smoke');

  const hudKillfeed = document.getElementById('hud-killfeed');
  const hudObjBar = document.getElementById('hud-objective-bar');
  const objTitle = document.getElementById('obj-title');
  const objProgressFill = document.getElementById('obj-progress-fill');
  const defuseBar = document.getElementById('hud-defuse-bar');
  const defuseTitle = document.getElementById('defuse-title');
  const defuseProgressFill = document.getElementById('defuse-progress-fill');

  const roundBanner = document.getElementById('round-banner');
  const bannerHeadline = document.getElementById('banner-headline');
  const bannerSubtext = document.getElementById('banner-subtext');
  const bannerReward = document.getElementById('banner-reward');

  const buyMenu = document.getElementById('buy-menu');
  const buyCredits = document.getElementById('buy-credits');
  const scoreboard = document.getElementById('scoreboard');
  const sbTbody = document.getElementById('sb-tbody');

  // Minimap 2D canvas
  const minimapCanvas = document.getElementById('minimap-canvas');
  const miniCtx = minimapCanvas ? minimapCanvas.getContext('2d') : null;

  let hitmarkerTimeout = null;

  function hitMarker(headshot = false, durationMs = 120) {
    if (!hitmarker) return;
    if (hitmarkerTimeout) clearTimeout(hitmarkerTimeout);

    hitmarker.className = headshot ? 'active headshot' : 'active';
    playHitmarker(headshot);

    hitmarkerTimeout = setTimeout(() => {
      hitmarker.className = '';
    }, durationMs);
  }

  function updateCrosshair(spread) {
    if (!chTop || !chBottom || !chLeft || !chRight) return;
    const offset = Math.min(24, Math.max(4, Math.round(spread * 520)));
    chTop.style.top = `${15 - offset}px`;
    chBottom.style.bottom = `${15 - offset}px`;
    chLeft.style.left = `${15 - offset}px`;
    chRight.style.right = `${15 - offset}px`;
  }

  function updateVitals(hp, ap) {
    const clampedHp = Math.max(0, Math.round(hp));
    const clampedAp = Math.max(0, Math.round(ap));
    if (vitalHp) vitalHp.textContent = clampedHp;
    if (vitalAp) vitalAp.textContent = clampedAp;
    if (hpBarFill) hpBarFill.style.width = `${clampedHp}%`;
    if (apBarFill) apBarFill.style.width = `${clampedAp}%`;
  }

  function updateAmmo(mag, reserve, name, firemode, he = 1, smoke = 1) {
    if (ammoMag) {
      ammoMag.textContent = mag;
      ammoMag.className = mag <= 5 ? 'low' : '';
    }
    if (ammoReserve) ammoReserve.textContent = reserve;
    if (weaponName && name) weaponName.textContent = name;
    if (weaponFiremode && firemode) weaponFiremode.textContent = firemode;
    if (gearHe) gearHe.className = he > 0 ? 'gear-icon ready' : 'gear-icon';
    if (gearSmoke) gearSmoke.className = smoke > 0 ? 'gear-icon ready' : 'gear-icon';
  }

  function updateTimer(seconds, isPlanted = false) {
    if (!roundTimer) return;
    const s = Math.max(0, Math.floor(seconds));
    const m = Math.floor(s / 60);
    const rem = s % 60;
    roundTimer.textContent = `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
    roundTimer.style.color = isPlanted ? '#ff3b30' : '#ffffff';
  }

  function updateScores(def, atk) {
    if (scoreDef) scoreDef.textContent = def;
    if (scoreAtk) scoreAtk.textContent = atk;
  }

  function updatePhase(phaseText) {
    if (roundPhase) roundPhase.textContent = phaseText;
  }

  function addKill(killer, victim, weapon, headshot, killerTeam, victimTeam) {
    if (!hudKillfeed) return;
    const row = document.createElement('div');
    row.className = 'kill-row';

    const kTeamCls = killerTeam === 0 ? 'def' : 'atk';
    const vTeamCls = victimTeam === 0 ? 'def' : 'atk';

    row.innerHTML = `
      <span class="kill-killer ${kTeamCls}">${killer}</span>
      <span class="kill-weapon">[${weapon}]</span>
      ${headshot ? '<span class="kill-hs">⌖</span>' : ''}
      <span class="kill-victim ${vTeamCls}">${victim}</span>
    `;

    hudKillfeed.appendChild(row);
    setTimeout(() => {
      row.style.opacity = '0';
      row.style.transition = 'opacity 0.4s ease';
      setTimeout(() => row.remove(), 400);
    }, 5500);
  }

  function showObjectiveBar(title) {
    if (!hudObjBar) return;
    if (objTitle) objTitle.textContent = title;
    hudObjBar.className = 'visible';
  }

  function setObjectiveProgress(ratio) {
    if (objProgressFill) {
      objProgressFill.style.width = `${Math.max(0, Math.min(100, ratio * 100))}%`;
    }
  }

  function setDefuseProgress(ratio, active) {
    if (!defuseBar) return;
    defuseBar.classList.toggle('visible', active);
    if (defuseTitle) defuseTitle.textContent = active ? 'DEFUSING DISRUPTOR' : 'HOLD E TO DEFUSE';
    if (defuseProgressFill) defuseProgressFill.style.width = `${Math.max(0, Math.min(100, ratio * 100))}%`;
  }

  function hideObjectiveBar() {
    if (hudObjBar) hudObjBar.className = '';
  }

  function showBanner(headline, subtext, reward, isWin = true) {
    if (!roundBanner) return;
    roundBanner.className = isWin ? 'visible win' : 'visible loss';
    if (bannerHeadline) bannerHeadline.textContent = headline;
    if (bannerSubtext) bannerSubtext.textContent = subtext;
    if (bannerReward) bannerReward.textContent = reward;
  }

  function hideBanner() {
    if (roundBanner) roundBanner.className = '';
  }

  function openBuyMenu() {
    if (buyMenu) buyMenu.className = 'modal-overlay open';
  }

  function closeBuyMenu() {
    if (buyMenu) buyMenu.className = 'modal-overlay';
  }

  function setCredits(credits) {
    if (buyCredits) buyCredits.textContent = credits.toLocaleString();
  }

  function showScoreboard() {
    if (scoreboard) scoreboard.className = 'modal-overlay open';
  }

  function hideScoreboard() {
    if (scoreboard) scoreboard.className = 'modal-overlay';
  }

  function updateScoreboard(roster) {
    if (!sbTbody) return;
    let html = '';

    // Defenders Header
    html += '<tr class="sb-team-header sb-team-def"><td colspan="7">IRON VANGUARD (DEFENDERS)</td></tr>';
    for (const p of roster.filter((x) => x.team === 0)) {
      const isMe = p.id === 0 ? ' class="sb-me"' : '';
      html += `
        <tr${isMe}>
          <td>${p.name}</td>
          <td>${p.alive !== false ? 'ALIVE' : 'KIA'}</td>
          <td>${p.k}</td>
          <td>${p.d}</td>
          <td>${p.a}</td>
          <td>$${p.money}</td>
          <td>${p.ping}ms</td>
        </tr>
      `;
    }

    // Attackers Header
    html += '<tr class="sb-team-header sb-team-atk"><td colspan="7">ECLIPSE CELL (ATTACKERS)</td></tr>';
    for (const p of roster.filter((x) => x.team === 1)) {
      html += `
        <tr>
          <td>${p.name}</td>
          <td>${p.alive !== false ? 'ALIVE' : 'KIA'}</td>
          <td>${p.k}</td>
          <td>${p.d}</td>
          <td>${p.a}</td>
          <td>$${p.money}</td>
          <td>${p.ping}ms</td>
        </tr>
      `;
    }
    sbTbody.innerHTML = html;
  }

  // 2D Radar Minimap Rendering
  function updateMinimap(playerPos, playerYaw, bots, siteA, siteB, isPlanted, plantPos) {
    if (!miniCtx) return;
    const w = 170;
    const h = 170;
    miniCtx.clearRect(0, 0, w, h);

    // Map bounds: X: -35..35, Z: -29..29
    const scaleX = w / 72;
    const scaleZ = h / 60;
    const toMapX = (x) => (x + 36) * scaleX;
    const toMapZ = (z) => (z + 30) * scaleZ;

    // Background & arena outline
    miniCtx.fillStyle = '#141c26';
    miniCtx.fillRect(0, 0, w, h);

    // Lanes architecture layout (light grey schematic corridors)
    miniCtx.fillStyle = '#222f40';
    // Lane A
    miniCtx.fillRect(toMapX(-32), toMapZ(-26), 20 * scaleX, 52 * scaleZ);
    // Mid
    miniCtx.fillRect(toMapX(-10), toMapZ(-24), 20 * scaleX, 48 * scaleZ);
    // Lane B
    miniCtx.fillRect(toMapX(12), toMapZ(-26), 20 * scaleX, 52 * scaleZ);
    // Crossways
    miniCtx.fillRect(toMapX(-14), toMapZ(-4), 28 * scaleX, 8 * scaleZ);

    // Objective Sites
    miniCtx.fillStyle = '#00d2d3';
    miniCtx.beginPath();
    miniCtx.arc(toMapX(siteA.x), toMapZ(siteA.z), 6, 0, Math.PI * 2);
    miniCtx.fill();
    miniCtx.fillStyle = '#ffffff';
    miniCtx.font = 'bold 9px sans-serif';
    miniCtx.fillText('A', toMapX(siteA.x) - 3, toMapZ(siteA.z) + 3);

    miniCtx.fillStyle = '#ff9f1c';
    miniCtx.beginPath();
    miniCtx.arc(toMapX(siteB.x), toMapZ(siteB.z), 6, 0, Math.PI * 2);
    miniCtx.fill();
    miniCtx.fillStyle = '#ffffff';
    miniCtx.fillText('B', toMapX(siteB.x) - 3, toMapZ(siteB.z) + 3);

    // Planted Pulse Disruptor beacon
    if (isPlanted && plantPos) {
      miniCtx.fillStyle = '#ff3b30';
      miniCtx.beginPath();
      miniCtx.arc(toMapX(plantPos.x), toMapZ(plantPos.z), 7, 0, Math.PI * 2);
      miniCtx.fill();
    }

    // Teammate & Enemy Operatives
    for (const b of bots) {
      if (!b.alive) continue;
      const bx = toMapX(b.position.x);
      const bz = toMapZ(b.position.z);
      miniCtx.fillStyle = b.team === 0 ? '#00d2d3' : '#ff3b30';
      miniCtx.beginPath();
      miniCtx.arc(bx, bz, 3.5, 0, Math.PI * 2);
      miniCtx.fill();
    }

    // Player position & orientation FOV cone
    const px = toMapX(playerPos.x);
    const pz = toMapZ(playerPos.z);

    // FOV cone
    miniCtx.fillStyle = 'rgba(0, 210, 211, 0.25)';
    miniCtx.beginPath();
    miniCtx.moveTo(px, pz);
    const fovAngle = Math.PI / 3;
    const coneLen = 22;
    const dirAngle = playerYaw - Math.PI / 2;
    miniCtx.arc(px, pz, coneLen, dirAngle - fovAngle / 2, dirAngle + fovAngle / 2);
    miniCtx.closePath();
    miniCtx.fill();

    // Player blip
    miniCtx.fillStyle = '#ffffff';
    miniCtx.beginPath();
    miniCtx.arc(px, pz, 4, 0, Math.PI * 2);
    miniCtx.fill();
  }

  return {
    hitMarker,
    updateCrosshair,
    updateVitals,
    updateAmmo,
    updateTimer,
    updateScores,
    updatePhase,
    addKill,
    showObjectiveBar,
    setObjectiveProgress,
    setDefuseProgress,
    hideObjectiveBar,
    showBanner,
    hideBanner,
    openBuyMenu,
    closeBuyMenu,
    setCredits,
    showScoreboard,
    hideScoreboard,
    updateScoreboard,
    updateMinimap,
  };
}
