// constants.js - Game constants and utility functions (v2.1.0 - Energy System)
// ========================================================
// GLOBAL VARIABLES
// ========================================================
let units = []; 
let castles = [];
let resourceNodes = []; // these are "trees"
let animals = [];
let apples = [];  // apples dropped by trees
let badMemories = []; 

// Track selected units and mouse position
let selectedUnits = new Set();
let mouseX = 0;
let mouseY = 0;

let unitIdCounter = 0;
const randomNames = [
  "Arthur","Lancelot","Gawain","Percival","Galahad","Tristan","Guinevere","Merlin","Morgana","Elaine"
];

const teamAttackMode = {
  "blue": false,
  "red": false
};

const combatStats = {
  "blue": {
    attacksLaunched: 0,
    unitsLost: 0,
    unitsKilled: 0,
    damageDealt: 0,
    lastCombatTime: 0,
    knightEffectiveness: 1.0,
    workerEffectiveness: 1.0,
    arrowsHit: 0,
    arrowsMissed: 0
  },
  "red": {
    attacksLaunched: 0,
    unitsLost: 0,
    unitsKilled: 0,
    damageDealt: 0,
    lastCombatTime: 0,
    knightEffectiveness: 1.0,
    workerEffectiveness: 1.0,
    arrowsHit: 0,
    arrowsMissed: 0
  }
};

// For enhanced stats
const gameStats = {
  startTime: Date.now(),
  frameCount: 0,
  lastTime: Date.now(),
  fps: 0,
  lastFpsUpdate: 0
};

// Game constants
const BUILD_PROTECTION_RADIUS = 60;
const UNIT_CAP = 50;

// Movement constants
const FORWARD_SPEED_MULTIPLIER = 1.5;  // 50% faster when moving forward
const BACKWARD_SPEED_MULTIPLIER = 0.7; // 30% slower when moving backward
const SIDEWAYS_SPEED_MULTIPLIER = 1.0; // Normal speed when moving sideways
const FORWARD_PATH_WEIGHT = 2.0;       // Weight multiplier for forward path preference
const MIN_DISTANCE_FOR_TURN = 50;      // Minimum distance to consider turning before moving
const SCREEN_MARGIN = 60;              // Keep units and waypoints this far from screen edges

// Attack constants
const MAX_ATTACK_RANGE = 300;          // Maximum range to fire arrows
const OPTIMAL_ATTACK_RANGE = 150;      // Most accurate attack range
const MIN_ATTACK_RANGE = 30;           // Too close to attack effectively
const MAX_ARROW_SPEED = 8;             // Maximum initial arrow speed
const MIN_ARROW_SPEED = 3;             // Minimum initial arrow speed
const ARROW_AIR_RESISTANCE = 0.98;     // Arrow slows down in flight (multiple per frame)
const MAX_ARROW_PREDICTION = 1.5;      // Maximum prediction lead factor
const ACCURACY_FACTOR = 0.9;           // Base accuracy (higher is more accurate)

// Physics constants
const FRICTION = 0.97;                 // Slow down velocity over time
const MOMENTUM_FACTOR = 0.8;           // How much momentum is preserved
const MAX_VELOCITY = 2.5;              // Maximum velocity cap

// Vision Cone constants
const VISION_CONE_RADIUS = 80;    // Maximum vision distance
const VISION_CONE_ANGLE = Math.PI/3;  // 60 degrees total (±30 degrees)

// Energy System Constants
const MAX_ENERGY = 100;            // Maximum energy level
const ENERGY_RECOVERY_RATE = 0.2;  // Energy recovery per frame while sleeping
const WALK_ENERGY_COST = 0.02;     // Energy cost per frame while walking
const RUN_ENERGY_COST = 0.1;       // Energy cost per frame while running
const ATTACK_ENERGY_COST = 0.5;    // Energy cost when firing an arrow
const IDLE_ENERGY_COST = 0.005;    // Minimal energy cost when idle
const WORK_ENERGY_COST = 0.03;     // Energy cost for worker activities

// Movement speed multipliers
const WALK_SPEED_MULTIPLIER = 1.0; // Walking is 70% of base speed
const RUN_SPEED_MULTIPLIER = 1.8;  // Running is 180% of base speed
const LOW_ENERGY_THRESHOLD = 30;   // Below this energy level, units can't run
const CRITICAL_ENERGY_THRESHOLD = 10; // Below this energy level, units move slowly

// Sleep parameters
const SLEEP_PROBABILITY = 0.33;    // 33% chance to sleep when tired
const SLEEP_ENERGY_THRESHOLD = 40; // Units consider sleeping below this threshold
const MIN_SLEEP_DURATION = 120;    // Minimum frames to sleep (2 seconds at 60fps)
const MAX_SLEEP_DURATION = 300;    // Maximum frames to sleep (5 seconds at 60fps)

// ========================================================
// UTILITY FUNCTIONS
// ========================================================
function getTeamColorChannels(team) {
  if (team === "blue") {
    let r = Math.floor(Math.random() * 128);
    let g = Math.floor(Math.random() * 128);
    let b = 128 + Math.floor(Math.random() * 128);
    return { r, g, b };
  } 
  else if (team === "red") {
    let r = 128 + Math.floor(Math.random() * 128);
    let g = Math.floor(Math.random() * 128);
    let b = Math.floor(Math.random() * 128);
    return { r, g, b };
  }
  // fallback
  return { r: 255, g: 255, b: 255 };
}

function channelsToCSS({r, g, b}) {
  return `rgb(${r},${g},${b})`;
}

function updateColorTowardsHumanity(colorChannels) {
  const targetG = 128; 
  let speed = 0.01;    
  let diff = targetG - colorChannels.g;
  colorChannels.g += diff * speed;
}

// ========================================================
// UTILITY AI HELPERS
// ========================================================
function generateRandomWaypoint(x, y, range = 150) {
  const angle = Math.random() * 2 * Math.PI;
  const dist = Math.random() * range;
  
  // Calculate raw position
  let newX = x + Math.cos(angle) * dist;
  let newY = y + Math.sin(angle) * dist;
  
  // Constrain to screen boundaries with margin
  newX = Math.max(SCREEN_MARGIN, Math.min(canvas.width - SCREEN_MARGIN, newX));
  newY = Math.max(SCREEN_MARGIN, Math.min(canvas.height - SCREEN_MARGIN, newY));
  
  return { x: newX, y: newY };
}

// Check if a waypoint is within screen boundaries
function isWaypointInBounds(waypoint) {
  return (
    waypoint.x >= SCREEN_MARGIN && 
    waypoint.x <= canvas.width - SCREEN_MARGIN &&
    waypoint.y >= SCREEN_MARGIN && 
    waypoint.y <= canvas.height - SCREEN_MARGIN
  );
}

// Adjust any waypoint to be within screen boundaries
function adjustWaypointToBounds(waypoint) {
  return {
    x: Math.max(SCREEN_MARGIN, Math.min(canvas.width - SCREEN_MARGIN, waypoint.x)),
    y: Math.max(SCREEN_MARGIN, Math.min(canvas.height - SCREEN_MARGIN, waypoint.y))
  };
}

// Helper function to determine movement direction relative to facing angle
function calculateMovementDirection(facingAngle, targetAngle) {
  // Calculate the absolute angle difference (0 to π)
  let angleDiff = Math.abs(((targetAngle - facingAngle + Math.PI) % (2 * Math.PI)) - Math.PI);
  
  // Forward: angle diff is small (within π/4 radians or 45 degrees)
  if (angleDiff <= Math.PI / 4) {
    return "forward";
  } 
  // Backward: angle diff is large (within π/4 radians of π or 135-180 degrees)
  else if (angleDiff >= Math.PI * 3/4) {
    return "backward";
  } 
  // Sideways: angle diff is in between
  else {
    return "sideways";
  }
}

function scoreWaypoint(waypoint, unit) {
  let memoryCost = 0;
  badMemories.forEach(mem => {
    const d = Math.hypot(mem.x - waypoint.x, mem.y - waypoint.y);
    if (d < 200) {
      memoryCost += mem.intensity * (200 - d) * 0.02;
    }
  });
  
  // Add direction preference if unit is provided
  let directionScore = 0;
  if (unit) {
    const targetAngle = Math.atan2(waypoint.y - unit.y, waypoint.x - unit.x);
    const direction = calculateMovementDirection(unit.angle, targetAngle);
    const distance = Math.hypot(waypoint.x - unit.x, waypoint.y - unit.y);
    
    // Add direction preference for longer distances
    if (distance > MIN_DISTANCE_FOR_TURN) {
      if (direction === "forward") {
        directionScore += FORWARD_PATH_WEIGHT * Math.min(distance / 200, 1.0); // Scale with distance up to a cap
      }
    }
  }
  
  return directionScore - memoryCost;
}

function adjustAngleForEdges(x, y, angle, speed) {
  let avoidX = 0, avoidY = 0;
  
  // Stronger repulsion force to prevent going out of bounds
  if (x < SCREEN_MARGIN) {
    avoidX = (SCREEN_MARGIN - x) / SCREEN_MARGIN;
    // Apply stronger repulsion when very close to the edge
    if (x < SCREEN_MARGIN * 0.5) {
      avoidX *= 2;
    }
  } else if (x > canvas.width - SCREEN_MARGIN) {
    avoidX = -(x - (canvas.width - SCREEN_MARGIN)) / SCREEN_MARGIN;
    if (x > canvas.width - SCREEN_MARGIN * 0.5) {
      avoidX *= 2;
    }
  }
  
  if (y < SCREEN_MARGIN) {
    avoidY = (SCREEN_MARGIN - y) / SCREEN_MARGIN;
    if (y < SCREEN_MARGIN * 0.5) {
      avoidY *= 2;
    }
  } else if (y > canvas.height - SCREEN_MARGIN) {
    avoidY = -(y - (canvas.height - SCREEN_MARGIN)) / SCREEN_MARGIN;
    if (y > canvas.height - SCREEN_MARGIN * 0.5) {
      avoidY *= 2;
    }
  }
  
  if (avoidX !== 0 || avoidY !== 0) {
    let avoidAngle = Math.atan2(avoidY, avoidX);
    // Stronger adjustment factor (0.5 instead of 0.3) to ensure units turn away from edges
    angle += 0.5 * ((((avoidAngle + Math.PI) % (2 * Math.PI)) - angle));
  }
  
  return angle;
}

function addCenterBias(unit) {
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const centerAngle = Math.atan2(centerY - unit.y, centerX - unit.x);
  let diffCenter = ((centerAngle - unit.angle + Math.PI) % (2 * Math.PI)) - Math.PI;
  unit.angle += diffCenter * 0.01;
  return unit.angle;
}

function computeTeamThreat(team) {
  let threat = 0;
  units.forEach(u => {
    if (u.team === team) {
      threat += u.skills.fighter;
    }
  });
  return threat;
}

function canBuildCastle(x, y) {
  for (let castle of castles) {
    let d = Math.hypot(x - castle.x, y - castle.y);
    if (d < BUILD_PROTECTION_RADIUS) {
      return false;
    }
  }
  return true;
}

function adjustAngleForEnemies(x, y, angle, speed, selfTeam) {
  let newAngle = angle;
  let avoidAngles = [];
  units.forEach(unit => {
    if (unit.team !== selfTeam && unit.skills.fighter > 1) {
      let d = Math.hypot(unit.x - x, unit.y - y);
      if (d < 150) {
        let awayAngle = Math.atan2(y - unit.y, x - unit.x);
        avoidAngles.push(awayAngle);
      }
    }
  });
  if (avoidAngles.length > 0) {
    let sumX = 0, sumY = 0;
    avoidAngles.forEach(a => {
      sumX += Math.cos(a);
      sumY += Math.sin(a);
    });
    let avgAngle = Math.atan2(sumY, sumX);
    newAngle = newAngle + 0.4 * ((((avgAngle + Math.PI) % (2 * Math.PI)) - newAngle));
  }
  return newAngle;
}

function getNearestCastle(team, x, y) {
  let nearest = null;
  let nearestDist = Infinity;
  castles.forEach(castle => {
    if (castle.team === team) {
      let d = Math.hypot(castle.x - x, castle.y - y);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = castle;
      }
    }
  });
  return { castle: nearest, dist: nearestDist };
}

// Calculate center of all trees
function calculateTreeCenter() {
  if (resourceNodes.length === 0) return { x: canvas.width/2, y: canvas.height/2 };
  
  let totalX = 0, totalY = 0;
  resourceNodes.forEach(tree => {
    totalX += tree.x;
    totalY += tree.y;
  });
  
  return {
    x: totalX / resourceNodes.length,
    y: totalY / resourceNodes.length
  };
}

// Predict target position based on movement
function predictTargetPosition(target, projectileSpeed, shooter) {
  if (!target) return null;
  
  // Calculate current distance
  const distance = Math.hypot(target.x - shooter.x, target.y - shooter.y);
  
  // Estimate time to hit based on distance and projectile speed
  const timeToHit = distance / projectileSpeed;
  
  // Calculate target velocity (including momentum)
  const targetVelocityX = target.velocityX || (Math.cos(target.angle) * target.speed * target.speedMultiplier);
  const targetVelocityY = target.velocityY || (Math.sin(target.angle) * target.speed * target.speedMultiplier);
  
  // Predict position after timeToHit
  // Apply a prediction factor based on fighter skill
  const predictionFactor = Math.min(MAX_ARROW_PREDICTION, 0.5 + (shooter.skills.fighter * 0.5));
  
  const predictedX = target.x + (targetVelocityX * timeToHit * predictionFactor);
  const predictedY = target.y + (targetVelocityY * timeToHit * predictionFactor);
  
  // Return predicted position
  return { x: predictedX, y: predictedY };
}

// Calculate accuracy based on distance and skills
function calculateAccuracy(distance, skill) {
  // Base accuracy that scales with fighter skill
  const baseAccuracy = ACCURACY_FACTOR + (skill * 0.1);
  
  // Optimal accuracy at medium range
  let distanceFactor = 0;
  if (distance < MIN_ATTACK_RANGE) {
    // Too close - reduced accuracy
    distanceFactor = distance / MIN_ATTACK_RANGE * 0.5;
  } else if (distance <= OPTIMAL_ATTACK_RANGE) {
    // Optimal range - best accuracy
    distanceFactor = 1.0;
  } else {
    // Far range - declining accuracy
    distanceFactor = 1.0 - ((distance - OPTIMAL_ATTACK_RANGE) / (MAX_ATTACK_RANGE - OPTIMAL_ATTACK_RANGE) * 0.8);
  }
  
  return Math.min(0.99, Math.max(0.2, baseAccuracy * distanceFactor));
}

// ========================================================
// SEPARATION FUNCTION
// ========================================================
function applySeparation(unit) {
  let separationForceX = 0, separationForceY = 0;
  const separationDistance = 40;
  units.forEach(other => {
    if (other.id !== unit.id) {
      let dx = unit.x - other.x;
      let dy = unit.y - other.y;
      let dist = Math.hypot(dx, dy);
      if (dist < separationDistance && dist > 0) {
        if (!(other.id in unit.affinities)) {
          unit.affinities[other.id] = Math.random() * 2 - 1;
        }
        let affinity = unit.affinities[other.id];
        let multiplier = (affinity < 0 ? 1 - affinity : 1);
        let force = (separationDistance - dist) * multiplier;
        separationForceX += (dx / dist) * force;
        separationForceY += (dy / dist) * force;
      }
    }
  });
  unit.x += separationForceX * 0.05;
  unit.y += separationForceY * 0.05;
}

// ========================================================
// COLLISION DETECTION
// ========================================================
function checkCollisions() {
  const unitsToRemove = new Set();
  
  // Iterate through all units with fighter skills to check arrows
  units.forEach(shooter => {
    if (shooter.skills.fighter > 0) {
      shooter.arrows.forEach(arrow => {
        // Check collision with units
        units.forEach(target => {
          if (target.team !== shooter.team) {
            const dx = arrow.x - target.x;
            const dy = arrow.y - target.y;
            if (Math.hypot(dx, dy) < target.size * 0.5) {
              arrow.hit = true;
              
              // Damage based on remaining speed - faster arrows do more damage
              const speedFactor = Math.max(0.5, arrow.speed / arrow.initialSpeed);
              const baseDamage = 50;
              const damage = Math.floor(baseDamage * speedFactor);
              
              target.hp -= damage;
              combatStats[shooter.team].damageDealt += damage;
              combatStats[shooter.team].arrowsHit++;
              combatStats[shooter.team].lastCombatTime = performance.now();
              shooter.incrementSkill("fighter", 0.02);
              
              // Visual feedback for hit
              target.communicate("-" + damage + " HP!");

              if (target.hp <= 0) {
                unitsToRemove.add(target);
                combatStats[target.team].unitsLost++;
                combatStats[target.team].lastCombatTime = performance.now();
                combatStats[shooter.team].unitsKilled = (combatStats[shooter.team].unitsKilled || 0) + 1;
                if (target.skills.fighter > 0.5) {
                  combatStats[target.team].knightEffectiveness *= 0.95;
                  combatStats[shooter.team].knightEffectiveness *= 1.05;
                } else if (target.skills.worker > 0.5) {
                  combatStats[target.team].workerEffectiveness *= 0.95;
                }
                badMemories.push({ x: target.x, y: target.y, intensity: 2.0 });
                
                // Kill message
                shooter.communicate("Killed enemy!");
              }
            }
          }
        });
        
        // Check collision with castles
        castles.forEach(castle => {
          if (arrow.team !== castle.team) {
            const dx = arrow.x - castle.x;
            const dy = arrow.y - castle.y;
            if (Math.hypot(dx, dy) < 20) {
              arrow.hit = true;
              const damage = Math.floor(20 + (30 * (arrow.speed / arrow.initialSpeed)));
              castle.hp -= damage;
              combatStats[arrow.team].damageDealt += damage;
              combatStats[arrow.team].arrowsHit++;
              
              if (castle.hp <= 0) {
                const castlesToRemove = [];
                castlesToRemove.push(castle);
                badMemories.push({ x: castle.x, y: castle.y, intensity: 3.0 });
                castles = castles.filter(c => !castlesToRemove.includes(c));
              }
            }
          }
        });
      });
    }
  });
  
  // Remove dead units
  units = units.filter(unit => !unitsToRemove.has(unit));
}

// ========================================================
// ENHANCED STATS CALCULATION
// ========================================================
function calculateAverageSkills(team) {
  const teamUnits = units.filter(u => u.team === team);
  if (teamUnits.length === 0) return { fighter: 0, worker: 0, leader: 0, trainer: 0 };
  
  let totals = { fighter: 0, worker: 0, leader: 0, trainer: 0 };
  teamUnits.forEach(unit => {
    totals.fighter += unit.skills.fighter;
    totals.worker += unit.skills.worker;
    totals.leader += unit.skills.leader;
    totals.trainer += unit.skills.trainer;
  });
  
  return {
    fighter: totals.fighter / teamUnits.length,
    worker: totals.worker / teamUnits.length, 
    leader: totals.leader / teamUnits.length,
    trainer: totals.trainer / teamUnits.length
  };
}

function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  return `${hours.toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}

function updateStatsDisplay() {
  const leftStatsPanel = document.getElementById('leftStats');
  const rightStatsPanel = document.getElementById('rightStats');
  
  // Calculate time elapsed
  const elapsedMs = Date.now() - gameStats.startTime;
  const timeStr = formatTime(elapsedMs);
  
  // Calculate FPS
  const now = Date.now();
  gameStats.frameCount++;
  
  if (now - gameStats.lastFpsUpdate > 1000) {
    gameStats.fps = Math.round(gameStats.frameCount * 1000 / (now - gameStats.lastFpsUpdate));
    gameStats.frameCount = 0;
    gameStats.lastFpsUpdate = now;
  }
  
  // Team stats
  const blueCount = units.filter(u => u.team === "blue").length;
  const redCount = units.filter(u => u.team === "red").length;
  
  // Resource stats
  const blueApples = units.filter(u => u.team === "blue").reduce((sum, u) => sum + u.carrying, 0);
  const redApples = units.filter(u => u.team === "red").reduce((sum, u) => sum + u.carrying, 0);
  
  // Average skills
  const blueAvgSkills = calculateAverageSkills("blue");
  const redAvgSkills = calculateAverageSkills("red");
  
  // Leadership stats
  const blueLeaderCount = units.filter(u => u.team === "blue" && u.skills.leader > 1.0).length;
  const redLeaderCount = units.filter(u => u.team === "red" && u.skills.leader > 1.0).length;
  
  // Arrow stats
  const blueHitRate = combatStats.blue.attacksLaunched > 0 ? 
    Math.round(combatStats.blue.arrowsHit / combatStats.blue.attacksLaunched * 100) : 0;
  const redHitRate = combatStats.red.attacksLaunched > 0 ? 
    Math.round(combatStats.red.arrowsHit / combatStats.red.attacksLaunched * 100) : 0;
  
  // Resource control metrics - how many units are near the tree center
  const treeCenter = calculateTreeCenter();
  const nearCenterRadius = 100;
  const blueUnitsNearCenter = units.filter(u => 
    u.team === "blue" && Math.hypot(u.x - treeCenter.x, u.y - treeCenter.y) < nearCenterRadius
  ).length;
  const redUnitsNearCenter = units.filter(u => 
    u.team === "red" && Math.hypot(u.x - treeCenter.x, u.y - treeCenter.y) < nearCenterRadius
  ).length;
  
  // Calculate energy statistics
  const blueAvgEnergy = units.filter(u => u.team === "blue")
    .reduce((sum, u) => sum + u.energy, 0) / Math.max(1, blueCount);
  const redAvgEnergy = units.filter(u => u.team === "red")
    .reduce((sum, u) => sum + u.energy, 0) / Math.max(1, redCount);

  const blueSleepingCount = units.filter(u => u.team === "blue" && u.isSleeping).length;
  const redSleepingCount = units.filter(u => u.team === "red" && u.isSleeping).length;

  const blueRunningCount = units.filter(u => u.team === "blue" && u.movementMode === "run" && !u.isSleeping).length;
  const redRunningCount = units.filter(u => u.team === "red" && u.movementMode === "run" && !u.isSleeping).length;
  
  // Update panels
  leftStatsPanel.innerHTML = `
    <h3>Blue Team</h3>
    <div>Game Time: <span class="stat-value">${timeStr}</span> | FPS: <span class="stat-value">${gameStats.fps}</span></div>
    <div>Units: <span class="stat-value">${blueCount}</span></div>
    <div>Resources: <span class="stat-value">${blueApples}</span> apples carried</div>
    <div>Strategic Leaders: <span class="stat-value">${blueLeaderCount}</span></div>
    <div>Resource Control: <span class="stat-value">${blueUnitsNearCenter}/${blueCount}</span> units</div>
    <div>Energy Status:</div>
    <div>- Avg Energy: <span class="stat-value">${blueAvgEnergy.toFixed(1)}</span></div>
    <div>- Sleeping: <span class="stat-value">${blueSleepingCount}/${blueCount}</span></div>
    <div>- Running: <span class="stat-value">${blueRunningCount}/${blueCount - blueSleepingCount}</span></div>
    <div>Combat Stats:</div>
    <div>- Attacks: <span class="stat-value">${combatStats.blue.attacksLaunched}</span></div>
    <div>- Hits: <span class="stat-value">${combatStats.blue.arrowsHit}</span> (${blueHitRate}%)</div>
    <div>- Kills: <span class="stat-value">${combatStats.blue.unitsKilled || 0}</span></div>
    <div>- Deaths: <span class="stat-value">${combatStats.blue.unitsLost}</span></div>
    <div>- Damage: <span class="stat-value">${combatStats.blue.damageDealt}</span></div>
    <div>Avg. Skills:</div>
    <div>- Fighter: <span class="stat-value">${blueAvgSkills.fighter.toFixed(2)}</span></div>
    <div>- Worker: <span class="stat-value">${blueAvgSkills.worker.toFixed(2)}</span></div>
    <div>- Leader: <span class="stat-value">${blueAvgSkills.leader.toFixed(2)}</span></div>
    <div>- Trainer: <span class="stat-value">${blueAvgSkills.trainer.toFixed(2)}</span></div>
  `;
  
  rightStatsPanel.innerHTML = `
    <h3>Red Team</h3>
    <div>Apples Available: <span class="stat-value">${apples.length}</span></div>
    <div>Units: <span class="stat-value">${redCount}</span></div>
    <div>Resources: <span class="stat-value">${redApples}</span> apples carried</div>
    <div>Strategic Leaders: <span class="stat-value">${redLeaderCount}</span></div>
    <div>Resource Control: <span class="stat-value">${redUnitsNearCenter}/${redCount}</span> units</div>
    <div>Energy Status:</div>
    <div>- Avg Energy: <span class="stat-value">${redAvgEnergy.toFixed(1)}</span></div>
    <div>- Sleeping: <span class="stat-value">${redSleepingCount}/${redCount}</span></div>
    <div>- Running: <span class="stat-value">${redRunningCount}/${redCount - redSleepingCount}</span></div>
    <div>Combat Stats:</div>
    <div>- Attacks: <span class="stat-value">${combatStats.red.attacksLaunched}</span></div>
    <div>- Hits: <span class="stat-value">${combatStats.red.arrowsHit}</span> (${redHitRate}%)</div>
    <div>- Kills: <span class="stat-value">${combatStats.red.unitsKilled || 0}</span></div>
    <div>- Deaths: <span class="stat-value">${combatStats.red.unitsLost}</span></div>
    <div>- Damage: <span class="stat-value">${combatStats.red.damageDealt}</span></div>
    <div>Avg. Skills:</div>
    <div>- Fighter: <span class="stat-value">${redAvgSkills.fighter.toFixed(2)}</span></div>
    <div>- Worker: <span class="stat-value">${redAvgSkills.worker.toFixed(2)}</span></div>
    <div>- Leader: <span class="stat-value">${redAvgSkills.leader.toFixed(2)}</span></div>
    <div>- Trainer: <span class="stat-value">${redAvgSkills.trainer.toFixed(2)}</span></div>
  `;
}

// ========================================================
// MOUSE INTERACTION FOR UNIT SELECTION
// ========================================================
function handleCanvasClick(event) {
  const rect = canvas.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const clickY = event.clientY - rect.top;
  
  // Check if any unit was clicked
  let clickedUnit = null;
  
  for (let unit of units) {
    if (unit.isPointInside(clickX, clickY)) {
      clickedUnit = unit;
      break;
    }
  }
  
  if (clickedUnit) {
    // Toggle selection state of the clicked unit
    clickedUnit.selected = !clickedUnit.selected;
    
    // If clicked unit is now selected, add to selected set
    if (clickedUnit.selected) {
      selectedUnits.add(clickedUnit.id);
    } else {
      selectedUnits.delete(clickedUnit.id);
    }
  } else {
    // If click was not on any unit, deselect all units
    units.forEach(unit => {
      unit.selected = false;
    });
    selectedUnits.clear();
  }
}

// ========================================================
// VISION CONE PATHFINDING FUNCTIONS
// ========================================================

// Function to check if a point is within a unit's vision cone
function isPointInVisionCone(unit, pointX, pointY) {
  // Calculate distance to point
  const dx = pointX - unit.x;
  const dy = pointY - unit.y;
  const distance = Math.hypot(dx, dy);
  
  // Check if point is within vision radius
  if (distance > VISION_CONE_RADIUS) {
    return false;
  }
  
  // Calculate angle to point
  const angleToPoint = Math.atan2(dy, dx);
  
  // Calculate the difference between unit's facing angle and angle to point
  let angleDifference = angleToPoint - unit.angle;
  
  // Normalize the angle difference to [-π, π]
  angleDifference = ((angleDifference + Math.PI) % (2 * Math.PI)) - Math.PI;
  
  // Check if the point is within the angular limits of the vision cone
  return Math.abs(angleDifference) <= VISION_CONE_ANGLE / 2;
}

// Modified function to generate waypoints only within vision cone
function generateVisionConedWaypoint(unit, range = 150) {
  // Maximum attempts to find a valid waypoint
  const maxAttempts = 20;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Generate a point with bias toward the forward direction
    // Higher probability of generating points in the forward arc
    let angle;
    
    if (Math.random() < 0.7) {
      // 70% chance to generate in a narrower forward cone
      angle = unit.angle + (Math.random() - 0.5) * (VISION_CONE_ANGLE * 0.8);
    } else {
      // 30% chance to generate anywhere in the vision cone
      angle = unit.angle + (Math.random() - 0.5) * VISION_CONE_ANGLE;
    }
    
    // Random distance, with bias toward medium distance
    let dist;
    const r = Math.random();
    if (r < 0.2) {
      // Close range (20% chance)
      dist = Math.random() * range * 0.3;
    } else if (r < 0.8) {
      // Medium range (60% chance)
      dist = range * 0.3 + Math.random() * range * 0.4;
    } else {
      // Far range (20% chance)
      dist = range * 0.7 + Math.random() * range * 0.3;
    }
    
    // Cap at vision cone radius
    dist = Math.min(dist, VISION_CONE_RADIUS * 0.95);
    
    // Calculate raw position
    let newX = unit.x + Math.cos(angle) * dist;
    let newY = unit.y + Math.sin(angle) * dist;
    
    // Constrain to screen boundaries with margin
    newX = Math.max(SCREEN_MARGIN, Math.min(canvas.width - SCREEN_MARGIN, newX));
    newY = Math.max(SCREEN_MARGIN, Math.min(canvas.height - SCREEN_MARGIN, newY));
    
    // Confirm the adjusted point is still in vision cone
    if (isPointInVisionCone(unit, newX, newY)) {
      return { x: newX, y: newY };
    }
  }
  
  // Fallback: return a point directly in front of the unit (always in vision cone)
  const safeDistance = Math.min(VISION_CONE_RADIUS * 0.5, 40);
  let directX = unit.x + Math.cos(unit.angle) * safeDistance;
  let directY = unit.y + Math.sin(unit.angle) * safeDistance;
  
  // Ensure it's in bounds
  directX = Math.max(SCREEN_MARGIN, Math.min(canvas.width - SCREEN_MARGIN, directX));
  directY = Math.max(SCREEN_MARGIN, Math.min(canvas.height - SCREEN_MARGIN, directY));
  
  return { x: directX, y: directY };
}

// Enhanced waypoint scoring that prioritizes visible waypoints
function enhancedScoreWaypoint(waypoint, unit) {
  // Start with the base score from the original function
  let score = scoreWaypoint(waypoint, unit);
  
  // If the waypoint is not in the vision cone, severely penalize it
  if (!isPointInVisionCone(unit, waypoint.x, waypoint.y)) {
    return -100; // Strong negative score for points outside vision
  }
  
  // Calculate distance to the waypoint
  const distanceToWaypoint = Math.hypot(waypoint.x - unit.x, waypoint.y - unit.y);
  
  // Calculate the angle to the waypoint
  const angleToWaypoint = Math.atan2(waypoint.y - unit.y, waypoint.x - unit.x);
  
  // Calculate angle difference between unit facing and waypoint direction
  let angleDiff = Math.abs(((angleToWaypoint - unit.angle + Math.PI) % (2 * Math.PI)) - Math.PI);
  
  // Prioritize waypoints that are:
  // 1. More directly in front of the unit
  score += (VISION_CONE_ANGLE/2 - angleDiff) * 2;
  
  // 2. At an optimal distance (not too close, not at the edge of vision)
  const optimalDistance = VISION_CONE_RADIUS * 0.6;
  const distanceScore = 5 - Math.abs(distanceToWaypoint - optimalDistance) / 10;
  score += distanceScore;
  
  // 3. Consider strategic elements like resources or enemies
  // Check for resources nearby
  resourceNodes.forEach(tree => {
    const distToTree = Math.hypot(waypoint.x - tree.x, waypoint.y - tree.y);
    if (distToTree < 100 && isPointInVisionCone(unit, tree.x, tree.y)) {
      // Bonus for worker units to approach trees
      if (unit.skills.worker > 0) {
        score += 10 * (1 - distToTree/100);
      }
    }
  });
  
  // Fighters prefer waypoints that keep enemies in sight
  if (unit.skills.fighter > 0) {
    units.forEach(otherUnit => {
      if (otherUnit.team !== unit.team) {
        const distToEnemy = Math.hypot(waypoint.x - otherUnit.x, waypoint.y - otherUnit.y);
        
        // Check if enemy would be visible from the waypoint
        // This simulates the unit considering "If I go there, will I see enemies?"
        const simulatedUnit = {
          x: waypoint.x,
          y: waypoint.y,
          angle: unit.angle
        };
        
        if (distToEnemy < MAX_ATTACK_RANGE && isPointInVisionCone(simulatedUnit, otherUnit.x, otherUnit.y)) {
          score += 15 * unit.skills.fighter;
        }
      }
    });
  }
  
  return score;
}

// Draw vision cone waypoints for debugging (call this in the unit's draw method)
function drawVisionConeWaypoints(unit) {
  if (!unit.selected) return;
  
  // Draw vision cone outline for clarity
  ctx.save();
  ctx.translate(unit.x, unit.y);
  ctx.rotate(unit.angle);
  
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, VISION_CONE_RADIUS, -VISION_CONE_ANGLE/2, VISION_CONE_ANGLE/2);
  ctx.closePath();
  
  ctx.strokeStyle = "rgba(255, 255, 0, 0.5)";
  ctx.setLineDash([4, 4]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
  
  // Draw current waypoint with its score
  if (isPointInVisionCone(unit, unit.currentWaypoint.x, unit.currentWaypoint.y)) {
    ctx.beginPath();
    ctx.arc(unit.currentWaypoint.x, unit.currentWaypoint.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 255, 0, 0.7)";
    ctx.fill();
    
    // Draw score
    ctx.fillStyle = "white";
    ctx.font = "10px Arial";
    ctx.fillText(
      unit.currentValue.toFixed(1), 
      unit.currentWaypoint.x + 8, 
      unit.currentWaypoint.y - 5
    );
  } else {
    // Draw invalid waypoint
    ctx.beginPath();
    ctx.arc(unit.currentWaypoint.x, unit.currentWaypoint.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 0, 0, 0.7)";
    ctx.fill();
    
    // Draw X
    ctx.beginPath();
    ctx.moveTo(unit.currentWaypoint.x - 5, unit.currentWaypoint.y - 5);
    ctx.lineTo(unit.currentWaypoint.x + 5, unit.currentWaypoint.y + 5);
    ctx.moveTo(unit.currentWaypoint.x + 5, unit.currentWaypoint.y - 5);
    ctx.lineTo(unit.currentWaypoint.x - 5, unit.currentWaypoint.y + 5);
    ctx.strokeStyle = "rgba(255, 0, 0, 0.7)";
    ctx.stroke();
  }
  
  // Draw alt waypoint
  if (isPointInVisionCone(unit, unit.altWaypoint.x, unit.altWaypoint.y)) {
    ctx.beginPath();
    ctx.arc(unit.altWaypoint.x, unit.altWaypoint.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 255, 0, 0.7)";
    ctx.fill();
    
    // Draw score
    ctx.fillStyle = "white";
    ctx.font = "10px Arial";
    ctx.fillText(
      unit.altValue.toFixed(1), 
      unit.altWaypoint.x + 8, 
      unit.altWaypoint.y - 5
    );
  }
}