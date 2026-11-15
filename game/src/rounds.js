// Tactical round lifecycle, 5v5 match economy, and Pulse Disruptor objective rules for Vanguard Depot.
import * as THREE from 'three';
import { playObjectiveBeep } from './audio.js';

export const ROUND_PHASE = {
  BUY: 'BUY_PHASE',
  ACTION: 'ACTION_PHASE',
  DECIDED: 'ROUND_DECIDED',
};

export function createRounds(world, hud) {
  let phase = ROUND_PHASE.BUY;
  let phaseTimer = 7.0; // 7s buy phase
  let roundClock = 100.0; // 100s round time
  let roundNumber = 1;

  let scoreDef = 0;
  let scoreAtk = 0;
  let lossStreakDef = 0;
  let lossStreakAtk = 0;

  // Objective state
  let isPlanted = false;
  let plantSite = null;
  let plantTimer = 40.0;
  let isDefused = false;
  let plantProgress = 0;
  let defuseProgress = 0;
  const plantPosition = new THREE.Vector3();

  // Player & bot economy
  let playerMoney = 800;

  // 10-player stats table for scoreboard
  const rosterStats = [
    // Iron Vanguard (Defenders)
    { id: 0, name: 'You (Operative)', team: 0, k: 0, d: 0, a: 0, ping: 12, money: 800 },
    { id: 1, name: 'Vanguard-02 (Kross)', team: 0, k: 0, d: 0, a: 0, ping: 18, money: 800 },
    { id: 2, name: 'Vanguard-03 (Vance)', team: 0, k: 0, d: 0, a: 0, ping: 24, money: 800 },
    { id: 3, name: 'Vanguard-04 (Rook)', team: 0, k: 0, d: 0, a: 0, ping: 16, money: 800 },
    { id: 4, name: 'Vanguard-05 (Echo)', team: 0, k: 0, d: 0, a: 0, ping: 22, money: 800 },

    // Eclipse Cell (Attackers)
    { id: 5, name: 'Eclipse-01 (Apex)', team: 1, k: 0, d: 0, a: 0, ping: 28, money: 800 },
    { id: 6, name: 'Eclipse-02 (Specter)', team: 1, k: 0, d: 0, a: 0, ping: 32, money: 800 },
    { id: 7, name: 'Eclipse-03 (Cipher)', team: 1, k: 0, d: 0, a: 0, ping: 19, money: 800 },
    { id: 8, name: 'Eclipse-04 (Wraith)', team: 1, k: 0, d: 0, a: 0, ping: 25, money: 800 },
    { id: 9, name: 'Eclipse-05 (Ghost)', team: 1, k: 0, d: 0, a: 0, ping: 30, money: 800 },
  ];

  let beepCooldown = 0;

  function startRound(player, bots, weapon) {
    phase = ROUND_PHASE.BUY;
    phaseTimer = 7.0;
    roundClock = 100.0;
    isPlanted = false;
    plantSite = null;
    plantTimer = 40.0;
    isDefused = false;
    plantProgress = 0;
    defuseProgress = 0;
    beepCooldown = 1.0;

    // Reset player & bots to spawns
    player.reset(world.defSpawn, 0);
    bots.reset('A');
    weapon.refill();

    hud.updateScores(scoreDef, scoreAtk);
    hud.updateTimer(roundClock);
    hud.updatePhase('BUY PHASE');
    hud.hideObjectiveBar();
    hud.hideBanner();
    hud.setCredits(playerMoney);
  }

  function registerKill(killerName, victimName, weaponName, headshot, killerTeam, victimTeam) {
    hud.addKill(killerName, victimName, weaponName, headshot, killerTeam, victimTeam);

    const killer = rosterStats.find((p) => p.name === killerName);
    if (killer) {
      killer.k++;
      killer.money += 300;
      if (killer.id === 0) playerMoney += 300;
    }
    const victim = rosterStats.find((p) => p.name === victimName);
    if (victim) {
      victim.d++;
    }
    hud.updateScoreboard(rosterStats);
    hud.setCredits(playerMoney);
  }

  function checkObjectivePlant(pos) {
    // Check if within Site A (radius 4.5m) or Site B (radius 4.5m)
    const distA = pos.distanceTo(world.siteA);
    const distB = pos.distanceTo(world.siteB);
    if (distA < 4.8) return 'A';
    if (distB < 4.8) return 'B';
    return null;
  }

  function plantDisruptor(site, pos) {
    if (isPlanted) return;
    isPlanted = true;
    plantSite = site;
    plantTimer = 40.0;
    plantPosition.copy(pos);
    hud.showObjectiveBar(`DISRUPTOR ARMED AT SITE ${site}`);
  }

  function defuseDisruptor() {
    if (!isPlanted || isDefused) return;
    isDefused = true;
  }

  function decideRound(winnerTeam, reasonText) {
    phase = ROUND_PHASE.DECIDED;
    phaseTimer = 5.0;

    let reward = 0;
    if (winnerTeam === 0) {
      scoreDef++;
      lossStreakDef = 0;
      lossStreakAtk++;
      reward = 3250;
      playerMoney += reward;
    } else {
      scoreAtk++;
      lossStreakAtk = 0;
      lossStreakDef++;
      reward = 1500 + Math.min(lossStreakDef * 400, 1400);
      playerMoney += reward;
    }

    hud.updateScores(scoreDef, scoreAtk);
    hud.showBanner(
      winnerTeam === 0 ? 'ROUND WON' : 'ROUND LOST',
      reasonText,
      `+$${reward.toLocaleString()} ROUND BONUS`,
      winnerTeam === 0
    );
    hud.setCredits(playerMoney);
  }

  function step(dt, player, bots, weapon) {
    if (phase === ROUND_PHASE.BUY) {
      phaseTimer -= dt;
      hud.updatePhase(`BUY PHASE (00:0${Math.ceil(phaseTimer)})`);
      if (phaseTimer <= 0) {
        phase = ROUND_PHASE.ACTION;
        hud.updatePhase('ACTION');
        hud.closeBuyMenu();
      }
      return;
    }

    if (phase === ROUND_PHASE.ACTION) {
      roundClock -= dt;
      hud.updateTimer(roundClock);

      // Objective plant countdown
      if (isPlanted) {
        plantTimer -= dt;
        const progress = Math.max(0, plantTimer / 40.0);
        hud.setObjectiveProgress(progress);

        // Beep frequency increases as timer runs out
        beepCooldown -= dt;
        if (beepCooldown <= 0) {
          const intensity = 1.0 - progress;
          playObjectiveBeep(intensity);
          beepCooldown = Math.max(0.18, 1.2 - intensity * 0.95);
        }

        if (plantTimer <= 0) {
          // Attackers win via detonation
          decideRound(1, 'DISRUPTOR DETONATED - SECTOR CRUCIAL SYSTEMS COMPROMISED');
          return;
        }

        if (isDefused) {
          // Defenders win via defusal
          decideRound(0, 'DISRUPTOR DEFUSED - SITE SECURED');
          return;
        }
      }

      // Check team eliminations
      const defAlive = (player.state.alive ? 1 : 0) + bots.getAlive(0).length;
      const atkAlive = bots.getAlive(1).length;

      if (atkAlive === 0) {
        if (isPlanted) {
          // Disruptor must still be defused!
        } else {
          decideRound(0, 'ALL HOSTILE BREACH UNITS ELIMINATED');
          return;
        }
      }

      if (defAlive === 0) {
        decideRound(1, 'ALL VANGUARD FORCES COMPROMISED');
        return;
      }

      if (roundClock <= 0 && !isPlanted) {
        decideRound(0, 'MISSION CLOCK EXPIRED - SITE DEFENDED');
        return;
      }
    }

    if (phase === ROUND_PHASE.DECIDED) {
      phaseTimer -= dt;
      if (phaseTimer <= 0) {
        roundNumber++;
        startRound(player, bots, weapon);
      }
    }
  }

  function buyItem(itemKey, player, weapon) {
    const costs = {
      arc9: 0,
      stinger: 1500,
      bulldog: 1700,
      valkyrie: 2800,
      onyx: 4400,
      armor: 1000,
      he: 300,
      smoke: 300,
    };
    const cost = costs[itemKey] ?? 0;
    if (playerMoney < cost) return false;

    if (itemKey === 'armor') {
      player.state.armor = 100;
    } else if (itemKey === 'he') {
      weapon.he = Math.min(2, weapon.he + 1);
    } else if (itemKey === 'smoke') {
      weapon.smoke = Math.min(2, weapon.smoke + 1);
    } else {
      weapon.switchWeapon(itemKey);
    }

    playerMoney -= cost;
    hud.setCredits(playerMoney);
    return true;
  }

  return {
    get phase() { return phase; },
    get isPlanted() { return isPlanted; },
    get plantSite() { return plantSite; },
    get plantPosition() { return plantPosition; },
    get money() { return playerMoney; },
    get stats() { return rosterStats; },
    startRound,
    registerKill,
    checkObjectivePlant,
    plantDisruptor,
    defuseDisruptor,
    decideRound,
    buyItem,
    step,
  };
}
