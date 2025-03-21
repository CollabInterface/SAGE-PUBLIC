// main.js - Main game initialization and animation loop (v2.1.0 - Energy System)

// ========================================================
// CANVAS SETUP
// ========================================================
const canvas = document.getElementById("battleCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Handle window resize
window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

// Add mouse event listeners
canvas.addEventListener('click', handleCanvasClick);
canvas.addEventListener('mousemove', (event) => {
  const rect = canvas.getBoundingClientRect();
  mouseX = event.clientX - rect.left;
  mouseY = event.clientY - rect.top;
});

// ========================================================
// CREATE GAME WORLD
// ========================================================
function createDeterministicTrees(count = 5, radius = 200) {
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  for (let i = 0; i < count; i++) {
    const angle = (2 * Math.PI * i) / count;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    resourceNodes.push(new ResourceNode(x, y));
  }
}

function initializeWorld() {
  // Create initial castles
  let homeCastle = new Castle(400, canvas.height/2, "blue", 100, true, "Camelot");
  castles.push(homeCastle);
  let enemyCastle = new Castle(canvas.width - 400, canvas.height/2, "red", 100, true, "Mordor");
  castles.push(enemyCastle);

  // Create initial units
  let blueLeader = new Unit(130, canvas.height/2, 40, "blue", { leader: 2, trainer: 1 });
  units.push(blueLeader);
  let redLeader = new Unit(canvas.width - 130, canvas.height/2, 40, "red", { leader: 2, trainer: 1 });
  units.push(redLeader);

  let blueWorker = new Unit(160, canvas.height/2, 35, "blue", { worker: 1 });
  units.push(blueWorker);
  let redWorker = new Unit(canvas.width - 160, canvas.height/2, 35, "red", { worker: 1 });
  units.push(redWorker);
  
  // Add some initial fighter units
  let blueFighter = new Unit(140, canvas.height/2 - 50, 35, "blue", { fighter: 1 });
  units.push(blueFighter);
  let redFighter = new Unit(canvas.width - 140, canvas.height/2 - 50, 35, "red", { fighter: 1 });
  units.push(redFighter);

  // Create resource trees
  createDeterministicTrees(5, 200);

  // Create animals
  for (let i = 0; i < 5; i++){
    let x = Math.random() * canvas.width;
    let y = Math.random() * canvas.height;
    animals.push(new Animal(x, y));
  }
}

// ========================================================
// MAIN ANIMATION LOOP
// ========================================================
function animate() {
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Fade out bad memories over time
  badMemories.forEach(mem => {
    mem.intensity *= 0.999;
  });
  badMemories = badMemories.filter(mem => mem.intensity > 0.05);

  // Update all entities
  castles.forEach(castle => castle.update());
  animals.forEach(animal => animal.update());
  units.forEach(unit => unit.update());
  resourceNodes.forEach(tree => tree.update());
  apples.forEach(apple => apple.update());
  
  // Filter expired apples
  apples = apples.filter(a => !a.isExpired());

  // Check for collisions (arrows hitting units/castles)
  checkCollisions();

  // Draw layers in proper order
  // 1. First layer: resource nodes (trees) and apples
  resourceNodes.forEach(tree => tree.draw());
  apples.forEach(apple => apple.draw());
  
  // 2. Second layer: animals
  animals.forEach(animal => animal.draw());
  
  // 3. Third layer: castles
  castles.forEach(castle => castle.draw());
  
  // 4. Fourth layer: draw all arrows from all units
  units.forEach(unit => {
    unit.arrows.forEach(arrow => arrow.draw());
  });
  
  // 5. Draw attack range visualization for selected units
  units.forEach(unit => {
    // Only draw attack ranges for selected units that are aiming
    if (unit.selected && unit.aiming && unit.skills.fighter > 0) {
      // Inner optimal range
      ctx.beginPath();
      ctx.arc(unit.x, unit.y, OPTIMAL_ATTACK_RANGE, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${parseInt(unit.color.slice(4, unit.color.indexOf(',')))}, 
                        ${parseInt(unit.color.slice(unit.color.indexOf(',')+1, unit.color.lastIndexOf(',')))}, 
                        ${parseInt(unit.color.slice(unit.color.lastIndexOf(',')+1, unit.color.indexOf(')')))}, 
                        0.3)`;
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Outer maximum range
      ctx.beginPath();
      ctx.arc(unit.x, unit.y, MAX_ATTACK_RANGE, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${parseInt(unit.color.slice(4, unit.color.indexOf(',')))}, 
                        ${parseInt(unit.color.slice(unit.color.indexOf(',')+1, unit.color.lastIndexOf(',')))}, 
                        ${parseInt(unit.color.slice(unit.color.lastIndexOf(',')+1, unit.color.indexOf(')')))}, 
                        0.15)`;
      ctx.setLineDash([2, 8]);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);
    }
  });
  
  // 6. Fifth layer: units themselves
  units.forEach(unit => unit.draw());
  
  // 7. Draw the strategic resource center indicator (visible to players)
  const treeCenter = calculateTreeCenter();
  
  // Ensure tree center visualization stays in bounds
  const displayX = Math.max(SCREEN_MARGIN, Math.min(canvas.width - SCREEN_MARGIN, treeCenter.x));
  const displayY = Math.max(SCREEN_MARGIN, Math.min(canvas.height - SCREEN_MARGIN, treeCenter.y));
  
  ctx.beginPath();
  ctx.arc(displayX, displayY, 20, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255, 215, 0, 0.4)"; // Gold color
  ctx.lineWidth = 2;
  ctx.stroke();
  
  // Pulsing effect
  const pulseSize = 30 + Math.sin(Date.now() * 0.003) * 10;
  ctx.beginPath();
  ctx.arc(displayX, displayY, pulseSize, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255, 215, 0, 0.2)";
  ctx.stroke();
  
  // 8. Draw boundary visualization
  ctx.beginPath();
  ctx.rect(SCREEN_MARGIN, SCREEN_MARGIN, canvas.width - SCREEN_MARGIN * 2, canvas.height - SCREEN_MARGIN * 2);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Draw energy system indicator line
  const margin = 40;
  const spacing = 15;
  const width = 150;
  
  // Title
  ctx.save();
  ctx.font = "14px serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
  
  // Energy system info on right
  ctx.textAlign = "right";
  ctx.fillText(`Energy System v2.1.0`, canvas.width - 10, canvas.height - 20);
  ctx.restore();

  // Update statistics display in UI panels
  updateStatsDisplay();

  // Continue animation loop
  requestAnimationFrame(animate);
}

// ========================================================
// LOW ENERGY WARNING SYSTEM
// ========================================================
function checkLowEnergyWarnings() {
  // Count units with critically low energy
  const criticalEnergyUnits = units.filter(unit => unit.energy < CRITICAL_ENERGY_THRESHOLD);
  
  // Check if any unit has critical energy
  if (criticalEnergyUnits.length > 0) {
    // Add pulsing energy warning to the UI
    const blueCount = criticalEnergyUnits.filter(u => u.team === "blue").length;
    const redCount = criticalEnergyUnits.filter(u => u.team === "red").length;
    
    if (blueCount > 0) {
      document.getElementById('leftStats').classList.add('energy-critical');
    } else {
      document.getElementById('leftStats').classList.remove('energy-critical');
    }
    
    if (redCount > 0) {
      document.getElementById('rightStats').classList.add('energy-critical');
    } else {
      document.getElementById('rightStats').classList.remove('energy-critical');
    }
  } else {
    // Remove warning effects
    document.getElementById('leftStats').classList.remove('energy-critical');
    document.getElementById('rightStats').classList.remove('energy-critical');
  }
  
  // Check again in one second
  setTimeout(checkLowEnergyWarnings, 1000);
}

// ========================================================
// INITIALIZE AND START THE GAME
// ========================================================

// Initialize the game world
initializeWorld();

// Start the low energy warning system
checkLowEnergyWarnings();

// Start the animation loop
animate();