// classes.js - Game entity classes (v2.1.0 - Energy System)
// ========================================================
// ARROW CLASS
// ========================================================
class Arrow {
  constructor(x, y, angle, speed, color, team, shooter) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.speed = speed;
    this.initialSpeed = speed;
    this.color = color;  
    this.team = team;
    this.shooter = shooter; // Reference to the shooting unit
    
    // Visual properties
    this.radius = 2;
    this.length = 8; // Arrow length for drawing
    
    // Tracking properties
    this.hit = false;
    this.distanceTraveled = 0;
    this.maxRange = 450; // Increased range	
    this.creationTime = performance.now();
    
    // Trail effect (store previous positions)
    this.trail = [];
    this.maxTrailLength = 5;
    
    // Physics properties
    this.gravity = 0.03; // Slight gravity effect
    this.verticalVelocity = 0;
    
    // For arc trajectory
    this.initialHeight = 0;
    this.height = 0;
    this.arcHeight = Math.min(this.distanceTraveled / 10, 20); // Scale arc height with distance
  }
  
  update() {
    // Store current position for trail
    this.trail.push({x: this.x, y: this.y});
    if (this.trail.length > this.maxTrailLength) {
      this.trail.shift();
    }
    
    // Update speed with air resistance
    this.speed *= ARROW_AIR_RESISTANCE;
    
    // Apply movement based on angle and speed
    const dx = Math.cos(this.angle) * this.speed;
    const dy = Math.sin(this.angle) * this.speed;
    
    this.x += dx;
    this.y += dy;
    
    // Apply gravity effect to modify trajectory slightly
    this.verticalVelocity += this.gravity;
    this.y += this.verticalVelocity;
    
    // Update distance traveled
    this.distanceTraveled += Math.hypot(dx, dy);
    
    // Check if arrow has traveled its maximum range or is too slow
    if (this.distanceTraveled > this.maxRange || this.speed < 0.5) {
      this.hit = true;
      if (this.shooter && this.shooter.team) {
        combatStats[this.shooter.team].arrowsMissed++;
      }
    }
  }
  
  isInBounds() {
    return this.x >= 0 && this.x <= canvas.width && 
           this.y >= 0 && this.y <= canvas.height;
  }
  
  draw() {
    ctx.save();
    
    // Draw trail effect
    for (let i = 0; i < this.trail.length - 1; i++) {
      const alpha = i / this.trail.length;
      ctx.beginPath();
      ctx.moveTo(this.trail[i].x, this.trail[i].y);
      ctx.lineTo(this.trail[i+1].x, this.trail[i+1].y);
      ctx.strokeStyle = `rgba(${parseInt(this.color.slice(4, this.color.indexOf(',')))}, 
                          ${parseInt(this.color.slice(this.color.indexOf(',')+1, this.color.lastIndexOf(',')))}, 
                          ${parseInt(this.color.slice(this.color.lastIndexOf(',')+1, this.color.indexOf(')')))}, 
                          ${alpha * 0.7})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    
    // Draw the arrow itself
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    
    // Arrow body
    ctx.beginPath();
    ctx.moveTo(-this.length, 0);
    ctx.lineTo(0, 0);
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Arrow head
    ctx.beginPath();
    ctx.moveTo(4, 0);
    ctx.lineTo(0, -2);
    ctx.lineTo(0, 2);
    ctx.closePath();
    ctx.fillStyle = this.color;
    ctx.fill();
    
    ctx.restore();
  }
}

// ========================================================
// UNIT CLASS
// ========================================================
class Unit {
  constructor(x, y, size, team, initialSkills = { fighter: 0, worker: 0, leader: 0, trainer: 0 }) {
    this.id = unitIdCounter++;
    this.affinities = {};
    this.randomName = randomNames[Math.floor(Math.random() * randomNames.length)];

    this.x = x;
    this.y = y;
    this.angle = Math.random() * Math.PI * 2;
    this.size = size;
    this.team = team;
    this.speed = 1.0;

    // Momentum system
    this.velocityX = 0;
    this.velocityY = 0;
    this.targetVelocityX = 0;
    this.targetVelocityY = 0;
    this.isMoving = false;

    this.colorChannels = getTeamColorChannels(team);
    this.color = channelsToCSS(this.colorChannels);

    this.skills = {
      fighter: initialSkills.fighter || 0,
      worker: initialSkills.worker || 0,
      leader: initialSkills.leader || 0,
      trainer: initialSkills.trainer || 0
    };

    this.arrows = [];
    this.fireCooldown = Math.floor(Math.random() * 100 + 50);
    this.hp = 100;
    this.maxHp = 100;

    // Inventory system
    this.rightHand = null;
    this.leftHand = null;
    this.carrying = 0;
    this.buildTimer = 200;
    this.state = "idle"; 

    this.isResting = false;
    this.restTimer = 0;
    this.timeUntilRest = Math.floor(Math.random() * 600) + 300;

    this.currentOrder = null;
    this.orderWeights = { rally: 1, rest: 1, attack: 1 };
    this.orderTimer = 300;
    this.trainCooldown = 300;

    // Waypoints
    this.currentWaypoint = { x: this.x, y: this.y };
    this.altWaypoint = generateVisionConedWaypoint(this, 200);
    this.currentValue = enhancedScoreWaypoint(this.currentWaypoint, this);
    this.altValue = enhancedScoreWaypoint(this.altWaypoint, this);

    this.personality = ["aggressive", "defensive", "friendly", "neutral"][Math.floor(Math.random() * 4)];
    this.message = "";
    this.messageTimer = 0;
    
    // Movement direction indicators for visualization
    this.movementDirection = "forward";
    this.speedMultiplier = 1.0;
    
    // Combat tracking
    this.currentTarget = null;
    this.targetHistory = [];
    this.targetLockTimer = 0;
    this.aiming = false;
    this.aimingTimer = 0;
    
    // Selection status
    this.selected = false;
    
    // Energy system properties
    this.energy = MAX_ENERGY;                    // Current energy level
    this.maxEnergy = MAX_ENERGY;                 // Maximum energy capacity
    this.movementMode = "walk";                  // "walk", "run", or "idle"
    this.isSleeping = false;                     // Sleep state
    this.sleepTimer = 0;                         // Frames left to sleep
    this.sleepCooldown = 300;                    // Minimum time between sleep periods
    this.lastSleepTime = 0;                      // Track when unit last slept
  }

  communicate(msg) {
    this.message = msg;
    this.messageTimer = 60;
  }

  incrementSkill(skillName, amount = 0.1) {
    if (this.skills[skillName] === undefined) return;
    this.skills[skillName] += amount;
  }

  broadcast(msg) {
    units.forEach(u => {
      if (u.team === this.team && Math.hypot(u.x - this.x, u.y - this.y) < 100) {
        u.communicate(msg);
      }
    });
  }

  evaluateWaypoints() {
    // Check if current waypoint is in bounds, adjust if needed
    if (!isWaypointInBounds(this.currentWaypoint)) {
      const oldWaypoint = {...this.currentWaypoint};
      this.currentWaypoint = adjustWaypointToBounds(this.currentWaypoint);
      this.currentValue = enhancedScoreWaypoint(this.currentWaypoint, this);
      
      // Only communicate this if there was a significant adjustment
      if (Math.hypot(oldWaypoint.x - this.currentWaypoint.x, oldWaypoint.y - this.currentWaypoint.y) > 10) {
        this.communicate("Staying in bounds!");
      }
    }
    
    // Check if current waypoint is in vision cone
    if (!isPointInVisionCone(this, this.currentWaypoint.x, this.currentWaypoint.y)) {
      // Current waypoint not visible, generate new one in vision cone
      const newWaypoint = generateVisionConedWaypoint(this);
      this.currentWaypoint = newWaypoint;
      this.currentValue = enhancedScoreWaypoint(this.currentWaypoint, this);
      
      if (Math.random() < 0.3) {  // Don't communicate every time
        this.communicate("Can't see that way!");
      }
    } else {
      // Re-evaluate current waypoint with enhanced scoring
      this.currentValue = enhancedScoreWaypoint(this.currentWaypoint, this);
    }
    
    // Generate and evaluate alternative waypoint
    this.altWaypoint = generateVisionConedWaypoint(this);
    this.altValue = enhancedScoreWaypoint(this.altWaypoint, this);
    
    // Switch to alternative waypoint if it scores better
    if (this.altValue > this.currentValue) {
      this.currentWaypoint = { ...this.altWaypoint };
      this.currentValue = this.altValue;
      
      if (Math.random() < 0.3) {  // Occasionally communicate
        this.communicate("Found better path!");
      }
    }
  }

  updateEnergy() {
    // Energy consumption based on activity
    if (this.isSleeping) {
      // Recover energy while sleeping
      this.energy = Math.min(this.maxEnergy, this.energy + ENERGY_RECOVERY_RATE);
      
      // Decrement sleep timer
      this.sleepTimer--;
      
      if (this.sleepTimer <= 0 || this.energy >= this.maxEnergy) {
        this.isSleeping = false;
        this.sleepCooldown = 300;
        this.lastSleepTime = performance.now();
        this.communicate("Refreshed!");
      }
      
      // Apply friction to velocity while sleeping
      this.velocityX *= FRICTION * 0.8;
      this.velocityY *= FRICTION * 0.8;
      
      // Apply momentum even while sleeping
      this.x += this.velocityX;
      this.y += this.velocityY;
      
      // Ensure unit stays in bounds
      this.x = Math.max(SCREEN_MARGIN, Math.min(canvas.width - SCREEN_MARGIN, this.x));
      this.y = Math.max(SCREEN_MARGIN, Math.min(canvas.height - SCREEN_MARGIN, this.y));
      
      return true; // Skip other updates when sleeping
    }
    
    // Consume energy based on movement mode
    if (this.isMoving) {
      if (this.movementMode === "run") {
        this.energy -= RUN_ENERGY_COST;
      } else { // walking
        this.energy -= WALK_ENERGY_COST;
      }
    } else {
      // Minimal energy consumption when idle
      this.energy -= IDLE_ENERGY_COST;
    }
    
    // Additional energy costs based on activities
    if (this.skills.fighter > 0 && this.aiming) {
      this.energy -= IDLE_ENERGY_COST * 2; // Aiming takes energy
    }
    
    if (this.skills.worker > 0 && this.state !== "idle") {
      this.energy -= WORK_ENERGY_COST; // Working takes energy
    }
    
    // Ensure energy doesn't go below zero
    this.energy = Math.max(0, this.energy);
    
    // Consider sleeping if energy is low
    if (!this.isResting && 
        this.sleepCooldown <= 0 && 
        this.energy < SLEEP_ENERGY_THRESHOLD && 
        Math.random() < SLEEP_PROBABILITY) {
      this.startSleeping();
      return true;
    }
    
    // Decrement sleep cooldown
    if (this.sleepCooldown > 0) {
      this.sleepCooldown--;
    }
    
    // Automatically switch to walking if energy is too low for running
    if (this.movementMode === "run" && this.energy < LOW_ENERGY_THRESHOLD) {
      this.movementMode = "walk";
      if (Math.random() < 0.3) {
        this.communicate("Too tired to run...");
      }
    }
    
    // Movement is severely impaired at critical energy levels
    if (this.energy < CRITICAL_ENERGY_THRESHOLD) {
      this.speedMultiplier *= 0.6; // Slow down drastically
      if (Math.random() < 0.05) {
        this.communicate("Exhausted...");
      }
    }
    
    return false; // Continue with other updates
  }

  startSleeping() {
    this.isSleeping = true;
    this.sleepTimer = MIN_SLEEP_DURATION + Math.floor(Math.random() * (MAX_SLEEP_DURATION - MIN_SLEEP_DURATION));
    this.communicate("Sleeping to recover energy...");
  }

  determineMovementMode() {
    // Only units with enough energy can run
    if (this.energy > LOW_ENERGY_THRESHOLD) {
      // Personality and situation-based movement mode selection
      if (this.personality === "aggressive" || this.currentOrder === "attack") {
        // Aggressive units prefer to run in combat situations
        this.movementMode = "run";
      } else if (this.personality === "defensive") {
        // Defensive units conserve energy when possible
        if (this.energy < 70) {
          this.movementMode = "walk";
        } else {
          // Even defensive units run when having high energy
          this.movementMode = Math.random() < 0.3 ? "run" : "walk";
        }
      } else {
        // Neutral units balance walking and running
        this.movementMode = Math.random() < 0.5 ? "run" : "walk";
      }
    } else {
      // Force walking when energy is low
      this.movementMode = "walk";
    }
    
    // Leaders with high leadership skills are more strategic with energy
    if (this.skills.leader > 1.0) {
      // Strategic leaders walk during peace to conserve energy
      const combatActivity = combatStats[this.team].attacksLaunched > 0 && 
                           (performance.now() - combatStats[this.team].lastCombatTime < 10000);
      
      if (!combatActivity && this.energy < 80) {
        this.movementMode = "walk";
      }
    }
  }

  update() {
    updateColorTowardsHumanity(this.colorChannels);
    this.color = channelsToCSS(this.colorChannels);

    // Check if unit is resting (old system)
    if (!this.isResting) {
      this.timeUntilRest--;
      if (this.timeUntilRest <= 0) {
        this.isResting = true;
        this.restTimer = Math.floor(Math.random() * 180) + 120;
        this.communicate("Taking a break...");
      }
    } else {
      this.restTimer--;
      if (this.restTimer <= 0) {
        this.isResting = false;
        this.timeUntilRest = Math.floor(Math.random() * 600) + 300;
        this.communicate("Back to work/fight!");
      } else {
        applySeparation(this);
        // Apply friction to velocity while resting
        this.velocityX *= FRICTION;
        this.velocityY *= FRICTION;
        
        // Apply momentum even while resting
        this.x += this.velocityX;
        this.y += this.velocityY;
        
        // Ensure unit stays in bounds
        this.x = Math.max(SCREEN_MARGIN, Math.min(canvas.width - SCREEN_MARGIN, this.x));
        this.y = Math.max(SCREEN_MARGIN, Math.min(canvas.height - SCREEN_MARGIN, this.y));
        return;
      }
    }

    // ENERGY SYSTEM INTEGRATION: Update energy and handle sleep state
    if (this.updateEnergy()) {
      return; // Skip the rest of the update if sleeping
    }

    this.maybeTrainRookie();

    // Evaluate waypoints more frequently for more responsive movement
    if (Math.random() < 0.03) {
      this.evaluateWaypoints();
    } 
    // Occasionally force a re-evaluation if target is out of vision cone
    else if (Math.random() < 0.05 && !isPointInVisionCone(this, this.currentWaypoint.x, this.currentWaypoint.y)) {
      this.evaluateWaypoints();
    }

    let dx = this.currentWaypoint.x - this.x;
    let dy = this.currentWaypoint.y - this.y;
    let distance = Math.hypot(dx, dy);
    let targetAngle = Math.atan2(dy, dx);
    let diffAngle = targetAngle - this.angle;
    diffAngle = ((diffAngle + Math.PI) % (2 * Math.PI)) - Math.PI;
    this.angle += diffAngle * 0.05;

    if (this.skills.leader > 0) {
      this.updateLeadership();
    }
    if (this.skills.fighter > 0) {
      this.updateFighter();
    }
    if (this.skills.worker > 0) {
      this.updateWorker();
    }

    addCenterBias(this);
    applySeparation(this);

    // ENERGY SYSTEM INTEGRATION: Determine movement mode before calculating speed
    this.determineMovementMode();

    // Momentum-based movement system
    this.isMoving = (distance > 3);
    
    if (this.isMoving) {
      this.angle = adjustAngleForEnemies(this.x, this.y, this.angle, this.speed, this.team);
      this.angle = adjustAngleForEdges(this.x, this.y, this.angle, this.speed);
      
      // Determine movement direction and apply appropriate speed multiplier
      this.movementDirection = calculateMovementDirection(this.angle, targetAngle);
      
      // ENERGY SYSTEM INTEGRATION: Apply movement multipliers
      let movementSpeedMultiplier;
      if (this.movementMode === "run") {
        movementSpeedMultiplier = RUN_SPEED_MULTIPLIER;
      } else { // "walk"
        movementSpeedMultiplier = WALK_SPEED_MULTIPLIER;
      }
      
      // Apply direction-based multipliers
      if (this.movementDirection === "forward") {
        this.speedMultiplier = FORWARD_SPEED_MULTIPLIER * movementSpeedMultiplier;
      } else if (this.movementDirection === "backward") {
        this.speedMultiplier = BACKWARD_SPEED_MULTIPLIER * movementSpeedMultiplier;
      } else {
        this.speedMultiplier = SIDEWAYS_SPEED_MULTIPLIER * movementSpeedMultiplier;
      }
      
      // Set target velocity based on angle and speed multiplier
      this.targetVelocityX = Math.cos(this.angle) * this.speed * this.speedMultiplier;
      this.targetVelocityY = Math.sin(this.angle) * this.speed * this.speedMultiplier;
    } else {
      // Gradually reduce target velocity when not actively moving
      this.targetVelocityX *= 0.9;
      this.targetVelocityY *= 0.9;
      
      // When idle, recover a tiny bit of energy
      this.energy = Math.min(this.maxEnergy, this.energy + IDLE_ENERGY_COST * 0.5);
    }
    
    // Gradually adjust actual velocity toward target (momentum)
    this.velocityX += (this.targetVelocityX - this.velocityX) * MOMENTUM_FACTOR;
    this.velocityY += (this.targetVelocityY - this.velocityY) * MOMENTUM_FACTOR;
    
    // Apply friction
    this.velocityX *= FRICTION;
    this.velocityY *= FRICTION;
    
    // Cap maximum velocity
    const currentSpeed = Math.hypot(this.velocityX, this.velocityY);
    if (currentSpeed > MAX_VELOCITY) {
      const scaleFactor = MAX_VELOCITY / currentSpeed;
      this.velocityX *= scaleFactor;
      this.velocityY *= scaleFactor;
    }
    
    // Apply velocity (momentum)
    this.x += this.velocityX;
    this.y += this.velocityY;
    
    // Strictly enforce boundaries - never allow positions outside margins
    this.x = Math.max(SCREEN_MARGIN, Math.min(canvas.width - SCREEN_MARGIN, this.x));
    this.y = Math.max(SCREEN_MARGIN, Math.min(canvas.height - SCREEN_MARGIN, this.y));
  }

  maybeTrainRookie() {
    if (this.skills.trainer < 1.0) return;
    if (this.trainCooldown > 0) {
      this.trainCooldown--;
      return;
    }
    if (Math.random() < 0.02) {
      let { castle: nearestCastle } = getNearestCastle(this.team, this.x, this.y);
      if (nearestCastle && nearestCastle.food >= 10) {
        nearestCastle.food -= 10;
        let rx = this.x + (Math.random()-0.5)*30;
        let ry = this.y + (Math.random()-0.5)*30;
        let rookie = new Unit(rx, ry, 10, this.team, { fighter:0, worker:0, leader:0, trainer:0 });
        units.push(rookie);
        this.communicate("Trained a new rookie!");
        this.incrementSkill("trainer", 0.05);
      }
    }
    this.trainCooldown = 300;
  }

  updateLeadership() {
    this.orderTimer--;
    if (this.orderTimer <= 0) {
      const stats = combatStats[this.team];
      
      // Strategic leaders with trait > 1.0 ignore unit deaths
      if (this.skills.leader <= 1.0) {
        let diff = (stats.unitsKilled || 0) - (stats.unitsLost || 0);
        this.orderWeights.attack += 0.5 * diff;
        if (this.orderWeights.attack < 0) this.orderWeights.attack = 0;
      } else {
        // High-level leaders are more aggressive and strategic
        this.orderWeights.attack = Math.max(2.0, this.orderWeights.attack);
        
        // Prioritize resource control (trees)
        this.moveTowardResourceControl();
      }
      
      for (let key in this.orderWeights) {
        this.orderWeights[key] += 0.1 * (1 - this.orderWeights[key]); 
      }
      let total = this.orderWeights.rally + this.orderWeights.rest + this.orderWeights.attack;
      let r = Math.random() * total;
      if (r < this.orderWeights.rally) {
        this.currentOrder = "rally";
      } else if (r < this.orderWeights.rally + this.orderWeights.rest) {
        this.currentOrder = "rest";
      } else {
        this.currentOrder = "attack";
      }
      this.orderTimer = 300;
      this.incrementSkill("leader", 0.05);
    }

    if (this.currentOrder === "attack") {
      let enemyTeam = (this.team === "blue") ? "red" : "blue";
      let myThreat = computeTeamThreat(this.team);
      let enemyThreat = computeTeamThreat(enemyTeam);
      if (enemyThreat > myThreat) {
        let enemyCastleObj = castles.find(c => c.team === enemyTeam);
        if (enemyCastleObj) {
          let dx = this.x - enemyCastleObj.x;
          let dy = this.y - enemyCastleObj.y;
          let mag = Math.hypot(dx, dy) || 1;
          
          // Try to find retreat direction within vision cone
          const retreatAngle = Math.atan2(dy, dx);
          
          // Test multiple retreat distances
          for (let retreatDistance = 60; retreatDistance <= 150; retreatDistance += 30) {
            const potentialWaypoint = {
              x: this.x + (dx / mag) * retreatDistance,
              y: this.y + (dy / mag) * retreatDistance
            };
            
            // Ensure point is in bounds
            potentialWaypoint.x = Math.max(SCREEN_MARGIN, Math.min(canvas.width - SCREEN_MARGIN, potentialWaypoint.x));
            potentialWaypoint.y = Math.max(SCREEN_MARGIN, Math.min(canvas.height - SCREEN_MARGIN, potentialWaypoint.y));
            
            // If this retreat point is in vision cone, use it
            if (isPointInVisionCone(this, potentialWaypoint.x, potentialWaypoint.y)) {
              this.currentWaypoint = potentialWaypoint;
              this.currentValue = enhancedScoreWaypoint(this.currentWaypoint, this);
              this.communicate("Retreating from threat!");
              break;
            }
          }
          
          // If no valid retreat point in vision cone, generate one
          if (!isPointInVisionCone(this, this.currentWaypoint.x, this.currentWaypoint.y)) {
            const newWaypoint = generateVisionConedWaypoint(this);
            this.currentWaypoint = newWaypoint;
            this.currentValue = enhancedScoreWaypoint(this.currentWaypoint, this);
            this.communicate("Need to reposition!");
          }
        }
      }
    }
    
    // Advanced leaders (>1.0) always try to control resource center
    if (this.skills.leader > 1.0 && Math.random() < 0.1) {
      this.moveTowardResourceControl();
    }
  }
  
  moveTowardResourceControl() {
    const treeCenter = calculateTreeCenter();
    const distToTreeCenter = Math.hypot(this.x - treeCenter.x, this.y - treeCenter.y);
    
    // If we're not already at the tree center
    if (distToTreeCenter > 50) {
      // Create a waypoint toward tree center that's within vision cone
      let attempts = 0;
      let newWaypoint = null;
      let bestScore = -Infinity;

      while (attempts < 5) {
        // Create a waypoint in the general direction of the tree center
        const angle = Math.atan2(treeCenter.y - this.y, treeCenter.x - this.x);
        // Add some randomness to angle
        const randomAngle = angle + (Math.random() - 0.5) * Math.PI/4;
        
        // Distance with some randomness
        const dist = Math.min(VISION_CONE_RADIUS * 0.9, 
                             Math.random() * 40 + distToTreeCenter * 0.5);
        
        let candidate = {
          x: this.x + Math.cos(randomAngle) * dist,
          y: this.y + Math.sin(randomAngle) * dist
        };
        
        // Ensure it's in bounds
        candidate.x = Math.max(SCREEN_MARGIN, Math.min(canvas.width - SCREEN_MARGIN, candidate.x));
        candidate.y = Math.max(SCREEN_MARGIN, Math.min(canvas.height - SCREEN_MARGIN, candidate.y));
        
        // Only consider if in vision cone
        if (isPointInVisionCone(this, candidate.x, candidate.y)) {
          const score = enhancedScoreWaypoint(candidate, this);
          if (score > bestScore) {
            bestScore = score;
            newWaypoint = candidate;
          }
        }
        
        attempts++;
      }

      // If we found a valid waypoint in vision cone, use it
      if (newWaypoint) {
        this.currentWaypoint = newWaypoint;
        // Assign extremely high value to this waypoint so it's preferred
        this.currentValue = 100 + bestScore;
        
        // Communicate strategic intent
        if (Math.random() < 0.3) {
          this.communicate("Moving toward resources!");
        }
      }
    }
  }

  updateFighter() {
    const inAttackMode = teamAttackMode[this.team] || false;
    
    // Update target lock timer
    if (this.targetLockTimer > 0) {
      this.targetLockTimer--;
    } else {
      // Select new target if needed
      this.findNewTarget(inAttackMode);
    }
    
    // Update aiming timer if currently aiming
    if (this.aiming) {
      this.aimingTimer--;
      if (this.aimingTimer <= 0) {
        this.aiming = false;
        // Fire the arrow after aiming
        if (this.currentTarget) {
          this.fireArrow(this.currentTarget);
          combatStats[this.team].attacksLaunched++;
          combatStats[this.team].lastCombatTime = performance.now();
          this.fireCooldown = Math.floor(Math.random() * 80 + 40);
          this.incrementSkill("fighter", 0.05);
        }
      }
    }
    
    // Handle target if we have one
    if (this.currentTarget) {
      // Calculate distance to target
      const distanceToTarget = Math.hypot(
        this.currentTarget.x - this.x, 
        this.currentTarget.y - this.y
      );
      
      // If target is still in range
      if (distanceToTarget <= MAX_ATTACK_RANGE) {
        // Turn toward target gradually
        let targetAngle = Math.atan2(
          this.currentTarget.y - this.y, 
          this.currentTarget.x - this.x
        );
        
        let diff = ((targetAngle - this.angle) + Math.PI) % (2*Math.PI) - Math.PI;
        
        // Turning behavior based on personality
        if (this.personality === "aggressive" || inAttackMode) {
          // Aggressive units turn quickly toward target
          this.angle += diff * (0.08 + (this.skills.fighter * 0.03));
          
          // Move toward target if too far away for optimal firing
          if (distanceToTarget > OPTIMAL_ATTACK_RANGE && !this.aiming) {
            this.communicate("Closing in!");
            
            // Set waypoint near the target for optimal range
            const dirX = this.currentTarget.x - this.x;
            const dirY = this.currentTarget.y - this.y;
            const dirLength = Math.hypot(dirX, dirY);
            
            if (dirLength > 0) {
              const normX = dirX / dirLength;
              const normY = dirY / dirLength;
              
              // Try multiple distances to find one in vision cone
              let foundValidPoint = false;
              
              // Try distances from 80% to 120% of optimal range
              for (let rangeFactor = 0.8; rangeFactor <= 1.2; rangeFactor += 0.1) {
                const testRange = OPTIMAL_ATTACK_RANGE * rangeFactor;
                
                const testPoint = {
                  x: this.currentTarget.x - normX * testRange,
                  y: this.currentTarget.y - normY * testRange
                };
                
                // Adjust to screen bounds
                testPoint.x = Math.max(SCREEN_MARGIN, Math.min(canvas.width - SCREEN_MARGIN, testPoint.x));
                testPoint.y = Math.max(SCREEN_MARGIN, Math.min(canvas.height - SCREEN_MARGIN, testPoint.y));
                
                // Check if this point is in vision cone
                if (isPointInVisionCone(this, testPoint.x, testPoint.y)) {
                  this.currentWaypoint = testPoint;
                  this.currentValue = 100 + enhancedScoreWaypoint(this.currentWaypoint, this);
                  foundValidPoint = true;
                  break;
                }
              }
              
              // If no valid point found, generate one that lets us see the target
              if (!foundValidPoint) {
                // Try to find a point that keeps target in view
                for (let attempt = 0; attempt < 5; attempt++) {
                  // Generate point with bias toward direction of target
                  const targetAngle = Math.atan2(dirY, dirX);
                  const angleSpread = Math.PI/6; // 30 degrees
                  const randomAngle = targetAngle + (Math.random() - 0.5) * angleSpread;
                  
                  // Random distance within vision cone radius
                  const dist = Math.random() * VISION_CONE_RADIUS * 0.7 + VISION_CONE_RADIUS * 0.2;
                  
                  const potentialPoint = {
                    x: this.x + Math.cos(randomAngle) * dist,
                    y: this.y + Math.sin(randomAngle) * dist
                  };
                  
                  // Ensure it's in bounds
                  potentialPoint.x = Math.max(SCREEN_MARGIN, Math.min(canvas.width - SCREEN_MARGIN, potentialPoint.x));
                  potentialPoint.y = Math.max(SCREEN_MARGIN, Math.min(canvas.height - SCREEN_MARGIN, potentialPoint.y));
                  
                  // Check if this would let us see the target
                  if (isPointInVisionCone(this, potentialPoint.x, potentialPoint.y)) {
                    this.currentWaypoint = potentialPoint;
                    this.currentValue = 100;
                    break;
                  }
                }
              }
            }
          }
          // If in optimal range, aim and fire
          else if (!this.aiming && this.fireCooldown <= 0) {
            this.startAiming();
          } else {
            this.fireCooldown--;
          }
        } 
        else if (this.personality === "defensive") {
          // Defensive units maintain distance
          if (distanceToTarget < OPTIMAL_ATTACK_RANGE - 30) {
            // Retreat if too close
            let retreatAngle = Math.atan2(this.y - this.currentTarget.y, this.x - this.currentTarget.x);
            let diff2 = ((retreatAngle - this.angle) + Math.PI) % (2*Math.PI) - Math.PI;
            this.angle += diff2 * 0.1;
            this.communicate("Maintaining distance!");
            
            // Set retreat waypoint
            const dirX = this.x - this.currentTarget.x;
            const dirY = this.y - this.currentTarget.y;
            const dirLength = Math.hypot(dirX, dirY);
            
            if (dirLength > 0) {
              const normX = dirX / dirLength;
              const normY = dirY / dirLength;
              
              // Try multiple retreat distances to find one in vision cone
              let foundValidPoint = false;
              
              for (let retreatDistance = 30; retreatDistance <= 60; retreatDistance += 10) {
                const testPoint = {
                  x: this.x + normX * retreatDistance,
                  y: this.y + normY * retreatDistance
                };
                
                // Adjust to screen bounds
                testPoint.x = Math.max(SCREEN_MARGIN, Math.min(canvas.width - SCREEN_MARGIN, testPoint.x));
                testPoint.y = Math.max(SCREEN_MARGIN, Math.min(canvas.height - SCREEN_MARGIN, testPoint.y));
                
                // Check if this point is in vision cone
                if (isPointInVisionCone(this, testPoint.x, testPoint.y)) {
                  this.currentWaypoint = testPoint;
                  this.currentValue = 100;
                  foundValidPoint = true;
                  break;
                }
              }
              
              // If no valid retreat point in vision cone, generate one
              if (!foundValidPoint) {
                this.currentWaypoint = generateVisionConedWaypoint(this);
                this.currentValue = enhancedScoreWaypoint(this.currentWaypoint, this);
              }
            }
          }
          // Aim and fire if in good range
          else if (distanceToTarget < MAX_ATTACK_RANGE && 
                  distanceToTarget > MIN_ATTACK_RANGE && 
                  !this.aiming && 
                  this.fireCooldown <= 0) {
            this.startAiming();
          } else {
            this.fireCooldown--;
            this.angle += diff * 0.03; // Slower turning
          }
        } 
        else {
          // Neutral units
          this.angle += diff * 0.05;
          
          // Fire if in range and cooldown expired
          if (distanceToTarget < MAX_ATTACK_RANGE && 
              !this.aiming && 
              this.fireCooldown <= 0) {
            this.startAiming();
          } else {
            this.fireCooldown--;
          }
        }
      }
      // Target out of range, release target lock
      else {
        this.currentTarget = null;
        this.targetLockTimer = 0;
        this.aiming = false;
      }
    }
    
    // Update arrows
    this.arrows.forEach(arrow => arrow.update());
    
    // Filter out arrows that are no longer relevant
    this.arrows = this.arrows.filter(arrow => arrow.isInBounds() && !arrow.hit);
  }

  findNewTarget(inAttackMode) {
    // Don't seek target if not a fighter or not aggressive
    if (this.skills.fighter < 0.5 && 
        this.personality !== "aggressive" && 
        !inAttackMode) {
      return;
    }
    
    let closestEnemy = null;
    let closestDistance = Infinity;
    
    // Find closest enemy within attack range
    units.forEach(unit => {
      if (unit !== this && unit.team !== this.team) {
        const distance = Math.hypot(unit.x - this.x, unit.y - this.y);
        
        // Only consider units within maximum attack range
        if (distance <= MAX_ATTACK_RANGE) {
          if (distance < closestDistance) {
            closestDistance = distance;
            closestEnemy = unit;
          }
        }
      }
    });
    
    // Set new target if found
    if (closestEnemy) {
      this.currentTarget = closestEnemy;
      
      // More skilled fighters keep target lock longer
      this.targetLockTimer = 100 + Math.floor(this.skills.fighter * 50);
      
      // Brief aiming message
      if (closestDistance < OPTIMAL_ATTACK_RANGE && Math.random() < 0.3) {
        this.communicate("Target spotted!");
      }
    }
  }
  
  startAiming() {
    this.aiming = true;
    // More skilled fighters aim faster
    this.aimingTimer = Math.max(5, 30 - Math.floor(this.skills.fighter * 10));
    
    if (Math.random() < 0.5) {
      this.communicate("Aiming...");
    }
  }

  updateWorker() {
    if (this.state === "idle") {
      this.state = "gather";
    }

    // Check for apples to gather
    if (this.state === "gather" && this.carrying === 0 && !this.leftHand && !this.rightHand) {
      let closestApple = null;
      let closestDistance = Infinity;
      
      apples.forEach(apple => {
        const distance = Math.hypot(this.x - apple.x, this.y - apple.y);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestApple = apple;
        }
      });
      
      if (closestApple && closestDistance < 15) {
        // Pick up the apple with preferred hand (right first)
        const appleIndex = apples.indexOf(closestApple);
        if (appleIndex !== -1) {
          // Store the apple data
          const apple = apples[appleIndex];
          
          if (!this.rightHand) {
            this.rightHand = {
              type: "apple",
              value: 10,
              originalObject: apple
            };
          } else if (!this.leftHand) {
            this.leftHand = {
              type: "apple",
              value: 10,
              originalObject: apple
            };
          }
          
          apples.splice(appleIndex, 1);
          this.carrying = 10;
          this.state = "return";
          this.communicate("Got an apple!");
        }
      }
    }
    else if (this.state === "return") {
      let nearest = getNearestCastle(this.team, this.x, this.y);
      if (nearest.castle) {
        let d = Math.hypot(this.x - nearest.castle.x, this.y - nearest.castle.y);
        if (d < 15) {
          // Deposit the carried food
          const foodAmount = this.carrying;
          nearest.castle.food += foodAmount;
          
          // Trigger visual food deposit effect
          nearest.castle.addFoodVisual(foodAmount);
          
          // Clear inventory
          this.carrying = 0;
          this.rightHand = null;
          this.leftHand = null;
          
          // Show deposit animation above unit
          this.communicate("+" + foodAmount + " food!");
          
          this.state = "gather";
          this.incrementSkill("worker", 0.05);
        }
      } else {
        this.state = "build";
        this.communicate("No castle found, let's build!");
      }
    } 
    else if (this.state === "build") {
      if (this.carrying < 50) {
        this.state = "gather";
        this.communicate("Not enough food, gather more!");
      } else {
        this.buildTimer--;
        this.communicate("Building in progress...");
        if (this.buildTimer <= 0 && this.carrying >= 50) {
          if (canBuildCastle(this.x, this.y)) {
            this.carrying -= 50;
            // Clear hands when building a castle
            this.rightHand = null;
            this.leftHand = null;
            
            castles.push(new Castle(this.x, this.y, this.team));
            this.buildTimer = 200;
            this.state = "gather";
            this.communicate("Castle built!");
            this.incrementSkill("worker", 0.2);
          } else {
            this.state = "gather";
            this.communicate("Too close to another castle, gather again!");
          }
        }
      }
    }
  }

  fireArrow(target) {
    if (!target) return;
    
    // Check if unit has enough energy to fire
    if (this.energy < ATTACK_ENERGY_COST) {
      this.communicate("Too tired to shoot!");
      return;
    }
    
    // Consume energy for the attack
    this.energy -= ATTACK_ENERGY_COST;

    // Calculate distance to target
    const distance = Math.hypot(target.x - this.x, target.y - this.y);
    
    // Calculate accuracy based on distance and skill
    const accuracy = calculateAccuracy(distance, this.skills.fighter);
    
    // Get predicted position based on target movement
    let arrowSpeed = MIN_ARROW_SPEED + 
                    (MAX_ARROW_SPEED - MIN_ARROW_SPEED) * 
                    (1 - (distance / MAX_ATTACK_RANGE));
    
    // Cap arrow speed
    arrowSpeed = Math.min(MAX_ARROW_SPEED, Math.max(MIN_ARROW_SPEED, arrowSpeed));
    
    // Predict target position
    const predictedPos = predictTargetPosition(target, arrowSpeed, this);
    
    // Add accuracy-based variation
    let aimX, aimY;
    if (predictedPos) {
      // Apply accuracy - higher accuracy means less random variation
      const maxError = (1 - accuracy) * distance * 0.5;
      aimX = predictedPos.x + (Math.random() * 2 - 1) * maxError;
      aimY = predictedPos.y + (Math.random() * 2 - 1) * maxError;
    } else {
      // Fallback if prediction fails
      aimX = target.x + (Math.random() * 2 - 1) * (1 - accuracy) * distance * 0.3;
      aimY = target.y + (Math.random() * 2 - 1) * (1 - accuracy) * distance * 0.3;
    }
    
    // Calculate angle to aim position
    const aimAngle = Math.atan2(aimY - this.y, aimX - this.x);
    
    // Create and fire the arrow
    const arrow = new Arrow(this.x, this.y, aimAngle, arrowSpeed, this.color, this.team, this);
    
    // Set arrow properties based on distance
    arrow.maxRange = Math.min(550, distance * 1.5);
    
    // Push to arrows array
    this.arrows.push(arrow);
    
    // Visual/audio feedback
    if (Math.random() < 0.3) {
      if (accuracy > 0.8) {
        this.communicate("Perfect shot!");
      } else if (accuracy > 0.5) {
        this.communicate("Fire!");
      } else {
        this.communicate("Shooting...");
      }
    }
  }

  // Check if point is inside unit for selection
  isPointInside(x, y) {
    const distance = Math.hypot(this.x - x, this.y - y);
    return distance <= this.size;
  }

  draw() {
    // 1) Translate/rotate so we can draw from this unit's frame of reference
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

/*
ctx.save();
ctx.rotate(-Math.PI/2);
ctx.beginPath();
ctx.moveTo(0, 0);
ctx.arc(0, 0, 80, -Math.PI/6, Math.PI/6);
ctx.closePath();
ctx.globalAlpha = 0.1;
ctx.fillStyle = this.color;
ctx.fill();
ctx.globalAlpha = 0.3;
ctx.strokeStyle = this.color;
ctx.stroke();
ctx.restore();
*/

    const R = this.size * 0.5;
    ctx.fillStyle = this.color;
    ctx.strokeStyle = this.color;

    // If leader skill is high enough, outline the circle
    if (this.skills.leader >= 1) {
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Fighter shape
    if (this.skills.fighter >= 1) {
      ctx.beginPath();
      ctx.moveTo(0, -R);
      ctx.lineTo(R, R);
      ctx.lineTo(-R, R);
      ctx.closePath();
      ctx.fill();
    } else if (this.skills.fighter > 0) {
      ctx.beginPath();
      ctx.moveTo(0, -R);
      ctx.lineTo(0, R);
      ctx.moveTo(-R, 0);
      ctx.lineTo(R, 0);
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Worker shape
    if (this.skills.worker >= 1) {
      const hexRadius = R * 0.6;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const px = hexRadius * Math.cos(angle);
        const py = hexRadius * Math.sin(angle);
        if (i === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.closePath();
      ctx.fill();
    }

    // Trainer skill shape (small gold circle above)
    if (this.skills.trainer >= 1) {
      ctx.beginPath();
      ctx.arc(0, -R*0.9, R*0.2, 0, Math.PI*2);
      ctx.fillStyle = "#FFD700";
      ctx.fill();
      ctx.fillStyle = this.color;
    }

    // If zero total skill, just a square
    let totalSkill = this.skills.fighter + this.skills.worker + this.skills.leader + this.skills.trainer;
    if (totalSkill === 0) {
      ctx.beginPath();
      ctx.rect(-R, -R, 2*R, 2*R);
      ctx.fill();
    }

    // Arms/hands with inventory
    let handOffset = 5;
    let handCenterXRight = R + handOffset;
    let handCenterXLeft  = -R - handOffset;
    let handRadius = R * 0.25;

    // Draw right hand/arm
    ctx.beginPath();
    ctx.arc(handCenterXRight, 0, handRadius, 0, Math.PI*2);
    ctx.fill();
    
    // Draw left hand/arm
    ctx.beginPath();
    ctx.arc(handCenterXLeft, 0, handRadius, 0, Math.PI*2);
    ctx.fill();

    ctx.restore(); // revert translation/rotation to normal

    // Draw selection highlight if selected
    if (this.selected) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 0.7, 0, Math.PI * 2);
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw movement direction indicator
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.font = "10px serif";
    
    // Draw movement direction and speed indicator
    let dirColor;
    if (this.movementDirection === "forward") {
      dirColor = "green";
    } else if (this.movementDirection === "backward") {
      dirColor = "red";
    } else {
      dirColor = "yellow";
    }
    
    ctx.beginPath();
    ctx.arc(this.x, this.y + this.size + 5, 4, 0, Math.PI * 2);
    ctx.fillStyle = dirColor;
    ctx.fill();
    
    ctx.restore();

    // Draw aiming indicator
    if (this.aiming) {
      ctx.beginPath();
      ctx.arc(this.x, this.y - this.size - 10, 4, 0, Math.PI * 2);
      ctx.fillStyle = "yellow";
      ctx.fill();
      
      // Draw small target symbol if target exists
      if (this.currentTarget) {
        const targetX = this.currentTarget.x;
        const targetY = this.currentTarget.y;
        
        ctx.beginPath();
        ctx.arc(targetX, targetY, 10, 0, Math.PI * 2);
        ctx.strokeStyle = this.color;
        ctx.setLineDash([2, 2]);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Line between archer and target
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(targetX, targetY);
        ctx.strokeStyle = `rgba(${parseInt(this.color.slice(4, this.color.indexOf(',')))}, 
                          ${parseInt(this.color.slice(this.color.indexOf(',')+1, this.color.lastIndexOf(',')))}, 
                          ${parseInt(this.color.slice(this.color.lastIndexOf(',')+1, this.color.indexOf(')')))}, 
                          0.3)`;
        ctx.setLineDash([2, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Possibly show a "resting" bubble
    if (this.isResting) {
      ctx.beginPath();
      ctx.arc(this.x, this.y - this.size - 5, 3, 0, Math.PI * 2);
      ctx.fillStyle = "#FFFF00";
      ctx.fill();
    }

    // Only show waypoint lines for selected units
    if (this.selected) {
      ctx.save();
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y); 
      ctx.lineTo(this.currentWaypoint.x, this.currentWaypoint.y);
      ctx.strokeStyle = "green";
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.altWaypoint.x, this.altWaypoint.y);
      ctx.strokeStyle = "yellow";
      ctx.stroke();
      ctx.restore();
    }

    // Draw momentum vector only for selected units
    if (this.selected && (Math.abs(this.velocityX) > 0.05 || Math.abs(this.velocityY) > 0.05)) {
      const momentumScale = 10;
      const mx = this.x + this.velocityX * momentumScale;
      const my = this.y + this.velocityY * momentumScale;
      
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(mx, my);
      ctx.strokeStyle = "rgba(0, 255, 255, 0.7)";
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Arrow head for momentum vector
      const angle = Math.atan2(this.velocityY, this.velocityX);
      const headLen = 5;
      ctx.beginPath();
      ctx.moveTo(mx, my);
      ctx.lineTo(mx - headLen * Math.cos(angle - Math.PI/6), my - headLen * Math.sin(angle - Math.PI/6));
      ctx.lineTo(mx - headLen * Math.cos(angle + Math.PI/6), my - headLen * Math.sin(angle + Math.PI/6));
      ctx.closePath();
      ctx.fillStyle = "rgba(0, 255, 255, 0.7)";
      ctx.fill();
    }

    // Add energy bar display for selected or low-energy units
    if (this.selected || this.energy < LOW_ENERGY_THRESHOLD) {
      const barWidth = this.size * 1.5;
      const barHeight = 4;
      const barX = this.x - barWidth / 2;
      const barY = this.y - this.size - 35; // Position above the unit
      
      // Draw energy bar background
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(barX, barY, barWidth, barHeight);
      
      // Draw energy level
      let energyColor;
      if (this.energy > 70) {
        energyColor = "rgba(0, 255, 0, 0.8)"; // Green for high energy
      } else if (this.energy > LOW_ENERGY_THRESHOLD) {
        energyColor = "rgba(255, 255, 0, 0.8)"; // Yellow for medium energy
      } else {
        energyColor = "rgba(255, 0, 0, 0.8)"; // Red for low energy
      }
      
      const energyWidth = (this.energy / this.maxEnergy) * barWidth;
      ctx.fillStyle = energyColor;
      ctx.fillRect(barX, barY, energyWidth, barHeight);
    }

    // Add visual indicators for sleep state
    if (this.isSleeping) {
      // Draw sleep indicator (Zzz)
      ctx.fillStyle = "#ADD8E6"; // Light blue
      ctx.font = "10px Arial";
      ctx.fillText("Zzz", this.x + this.size/2, this.y - this.size - 10);
      
      // Draw sleep animation: small bubbles rising
      const bubbleCount = 3;
      for (let i = 0; i < bubbleCount; i++) {
        const offset = (performance.now() / 200 + i * 1.5) % 10;
        const bubbleSize = 2 + i * 0.8;
        const bubbleX = this.x + this.size/2 + 4 + i * 3;
        const bubbleY = this.y - this.size - 12 - offset * 2;
        
        ctx.beginPath();
        ctx.arc(bubbleX, bubbleY, bubbleSize, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(173, 216, 230, " + (0.8 - offset / 10) + ")";
        ctx.fill();
      }
    }

    // Add movement mode indicator
    let modeColor;
    if (this.movementMode === "run") {
      modeColor = "rgba(255, 165, 0, 0.8)"; // Orange for running
    } else if (this.isMoving) {
      modeColor = "rgba(144, 238, 144, 0.8)"; // Light green for walking
    } else {
      modeColor = "rgba(169, 169, 169, 0.8)"; // Gray for idle
    }

    // Draw movement mode indicator as a small dot
    ctx.beginPath();
    ctx.arc(this.x, this.y + this.size + 10, 3, 0, Math.PI * 2);
    ctx.fillStyle = modeColor;
    ctx.fill();

    // Show mode text for selected units
    if (this.selected) {
      ctx.fillStyle = "#fff";
      ctx.font = "10px serif";
      
      let modeText = this.isMoving ? 
                  (this.movementMode === "run" ? "Running" : "Walking") : 
                  "Idle";
      
      if (this.isSleeping) {
        modeText = "Sleeping";
      }
      
      ctx.fillText(modeText, this.x - this.size/2, this.y + this.size + 20);
      ctx.fillText(`Energy: ${Math.floor(this.energy)}/${this.maxEnergy}`, this.x - this.size/2, this.y + this.size + 30);
    }

    // Text info about the unit - only shown when selected
    if (this.selected) {
      ctx.fillStyle = "#fff";
      ctx.font = "10px serif";
      ctx.fillText(
        this.randomName + " (F:" + this.skills.fighter.toFixed(1) + 
        " W:" + this.skills.worker.toFixed(1) + 
        " L:" + this.skills.leader.toFixed(1) +
        " T:" + this.skills.trainer.toFixed(1) + ")",
        this.x - this.size, 
        this.y - this.size - 20
      );
      ctx.fillText("HP: " + this.hp, this.x - this.size, this.y - this.size - 10);
    } else {
      // When not selected, just show the name above the unit
      ctx.fillStyle = "#fff";
      ctx.font = "10px serif";
      ctx.fillText(this.randomName, this.x - this.size/2, this.y - this.size - 5);
    }

    // Speech bubble / message
    if (this.messageTimer > 0) {
      ctx.fillStyle = "#ff0";
      ctx.font = "10px serif";
      ctx.fillText(this.message, this.x - this.size, this.y - this.size - 30);
      this.messageTimer--;
    }
    
    // Draw vision cone waypoints for debugging if selected
    if (this.selected) {
      drawVisionConeWaypoints(this);
    }
  }
}

// ========================================================
// CASTLE CLASS
// ========================================================
class Castle {
  constructor(x, y, team, food = 0, special = false, townName = "") {
    this.x = x;
    this.y = y;
    this.team = team;
    this.colorChannels = getTeamColorChannels(team);
    this.color = channelsToCSS(this.colorChannels);

    this.food = food;  
    this.foodVisuals = []; // For visual food deposit effects
    this.spawnTimer = 300;
    this.hp = 200;
    this.special = special;
    this.townName = townName;
  }
  
  // Method to handle visual food deposits
  addFoodVisual(amount) {
    for (let i = 0; i < Math.min(5, amount/2); i++) {
      this.foodVisuals.push({
        x: this.x + (Math.random() - 0.5) * 30,
        y: this.y + (Math.random() - 0.5) * 30,
        size: 4 + Math.random() * 4,
        opacity: 1.0,
        color: 'red',
        growTimer: 60 // Frames before disappearing
      });
    }
  }
  
  calculateUnitWeights() {
    const stats = combatStats[this.team];
    const currentTime = performance.now();
    const timeSinceLastCombat = (currentTime - stats.lastCombatTime) / 1000;
    let leaderWeight = 0.1;
    let fighterWeight = 0.5;
    let workerWeight = 0.4;

    fighterWeight *= stats.knightEffectiveness;
    workerWeight *= stats.workerEffectiveness;

    if (this.food > 200) {
      leaderWeight *= 2;
    }
    if (timeSinceLastCombat < 10) {
      fighterWeight *= 1.5;
      workerWeight *= 0.5;
    } else if (timeSinceLastCombat > 30) {
      workerWeight *= 1.5;
      fighterWeight *= 0.8;
    }
    return { leader: leaderWeight, fighter: fighterWeight, worker: workerWeight };
  }
  
  update() {
    this.spawnTimer--;

    let currentArmySize = units.filter(u => u.team === this.team).length;
    let growthFactor = Math.max(0, (UNIT_CAP - currentArmySize) / UNIT_CAP);
    let weights = this.calculateUnitWeights();
    weights.leader *= growthFactor;
    weights.fighter *= growthFactor;
    weights.worker *= growthFactor;

    let workerCount = units.filter(u => u.team === this.team && u.skills.worker > 0.5).length;
    if (workerCount >= 5) {
      weights.worker = 0;
    }

    let totalWeight = weights.leader + weights.fighter + weights.worker;
    let norm = {
      leader: weights.leader / totalWeight,
      fighter: weights.fighter / totalWeight,
      worker: weights.worker / totalWeight
    };

    if (this.spawnTimer <= 0) {
      let r = Math.random();
      let chosenSkill = null;
      if (r < norm.leader && this.food >= 100) {
        chosenSkill = "leader";
        this.food -= 100;
      } else if (r < norm.leader + norm.fighter && this.food >= 50) {
        chosenSkill = "fighter";
        this.food -= 50;
      } else if (this.food >= 25) {
        chosenSkill = "worker";
        this.food -= 25;
      }

      if (!chosenSkill && Math.random() < 0.25) {
        chosenSkill = "none";
      }

      let skillSet = { fighter: 0, worker: 0, leader: 0, trainer: 0 };
      if (chosenSkill === "leader") {
        skillSet.leader = 1.0;
      } else if (chosenSkill === "fighter") {
        skillSet.fighter = 1.0;
      } else if (chosenSkill === "worker") {
        skillSet.worker = 1.0;
      }
      
      if (chosenSkill) {
        let newUnit = new Unit(
          this.x + (Math.random()-0.5)*20,
          this.y + (Math.random()-0.5)*20,
          Math.random()*10+15,
          this.team,
          skillSet
        );
        units.push(newUnit);
      }

      this.spawnTimer = 300;
    }
  }
  
  draw() {
    // Update food visuals
    for (let i = this.foodVisuals.length - 1; i >= 0; i--) {
      const visual = this.foodVisuals[i];
      visual.growTimer--;
      visual.y -= 0.2; // Float upward
      visual.opacity = visual.growTimer / 60;
      
      if (visual.growTimer <= 0) {
        this.foodVisuals.splice(i, 1);
      }
    }
    
    // Draw castle base
    ctx.beginPath();
    ctx.rect(this.x - 20, this.y - 20, 40, 40);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.stroke();
    
    // Draw food pile if has significant food
    if (this.food > 20) {
      const foodPileHeight = Math.min(15, this.food / 20);
      ctx.beginPath();
      ctx.moveTo(this.x - 15, this.y + 20);
      ctx.lineTo(this.x - 5, this.y + 20 - foodPileHeight);
      ctx.lineTo(this.x + 5, this.y + 20 - foodPileHeight);
      ctx.lineTo(this.x + 15, this.y + 20);
      ctx.fillStyle = "#DAA520"; // Golden food pile
      ctx.fill();
    }

    // Draw floating food visuals
    this.foodVisuals.forEach(visual => {
      ctx.beginPath();
      ctx.arc(visual.x, visual.y, visual.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 0, 0, ${visual.opacity})`;
      ctx.fill();
    });

    // Text info
    ctx.fillStyle = "#fff";
    ctx.font = "12px serif";
    ctx.fillText("Food: " + this.food, this.x - 30, this.y - 30);
    ctx.fillText("HP: " + this.hp, this.x - 30, this.y - 15);
    if (this.special) {
      ctx.fillText(this.townName, this.x - 30, this.y - 45);
    }

    // Protection radius
    ctx.beginPath();
    ctx.arc(this.x, this.y, BUILD_PROTECTION_RADIUS, 0, Math.PI * 2);
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.5;
    ctx.stroke();
    ctx.globalAlpha = 1.0;
  }
}

// ========================================================
// RESOURCE NODE CLASS (TREE)
// ========================================================
class ResourceNode {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.appleSpawnTimer = 0;
    this.treeSize = 15;
    this.trunkHeight = 10;
    this.readyToDrop = false;
    this.shakeAmount = 0;
    this.appleGrowthStage = 0; // 0 to 5, with 5 being ready to drop
  }

  update() {
    this.appleSpawnTimer++;
    
    // Apple growth stages (visual cue that apple is coming)
    if (this.appleSpawnTimer % (60 * 12) === 0) { // Every 12 seconds, advance growth
      this.appleGrowthStage = Math.min(5, this.appleGrowthStage + 1);
    }
    
    // Shake when apple is ready to drop
    if (this.appleGrowthStage >= 5) {
      this.readyToDrop = true;
      this.shakeAmount = Math.sin(this.appleSpawnTimer * 0.1) * 0.5;
    } else {
      this.shakeAmount = 0;
    }
    
    // Drop apple after full growth
    if (this.appleSpawnTimer >= 60 * 60) { // Every 60 seconds
      // Add random offset so apple doesn't always land in same spot
      const offsetX = (Math.random() - 0.5) * 20;
      apples.push(new Apple(this.x + offsetX, this.y + 15));
      this.appleSpawnTimer = 0;
      this.appleGrowthStage = 0;
      this.readyToDrop = false;
    }
  }

  draw() {
    // Draw trunk
    ctx.beginPath();
    ctx.rect(this.x - 5, this.y, 10, this.trunkHeight);
    ctx.fillStyle = "#8B4513";
    ctx.fill();
    
    // Draw tree foliage (with slight shake if ready to drop)
    ctx.save();
    ctx.translate(this.x + this.shakeAmount, this.y - 8);
    
    ctx.beginPath();
    ctx.arc(0, 0, this.treeSize, 0, Math.PI * 2);
    ctx.fillStyle = "#228B22";
    ctx.fill();
    
    // Draw apple growth stages
    if (this.appleGrowthStage > 0) {
      const appleSize = this.appleGrowthStage * 1.5;
      const applePosY = this.treeSize * 0.5;
      
      ctx.beginPath();
      ctx.arc(0, applePosY, appleSize, 0, Math.PI * 2);
      
      // Color changes from green to red as it grows
      const redComponent = Math.min(255, 100 + (this.appleGrowthStage * 35));
      const greenComponent = Math.max(0, 150 - (this.appleGrowthStage * 20));
      ctx.fillStyle = `rgb(${redComponent}, ${greenComponent}, 0)`;
      ctx.fill();
      
      // Draw stem if apple is getting bigger
      if (this.appleGrowthStage > 2) {
        ctx.beginPath();
        ctx.moveTo(0, applePosY - appleSize);
        ctx.lineTo(0, applePosY - appleSize - 2);
        ctx.strokeStyle = "#8B4513";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    
    ctx.restore();
  }
}

// ========================================================
// APPLE CLASS
// ========================================================
class Apple {
  constructor(x, y) {
    this.id = Math.random().toString(36).substr(2, 9); // Unique ID for tracking
    this.x = x;
    this.y = y;
    this.life = 30 * 60; // 30s at 60fps
    this.radius = 9;
    this.isPickedUp = false;
    this.heldBy = null;
  }
  update() {
    this.life--;
    
    // If held by someone, update position to follow
    if (this.heldBy) {
      // Position is handled by the unit's draw function
      // This is just a placeholder in case we need to do something
      // with held apples during update
    }
  }
  isExpired() {
    return this.life <= 0;
  }
  pickup(unit) {
    this.isPickedUp = true;
    this.heldBy = unit;
  }
  drop() {
    this.isPickedUp = false;
    this.heldBy = null;
  }
  draw() {
    // Only draw if not being held
    if (!this.isPickedUp) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = "red";
      ctx.fill();
      
      // Small stem
      ctx.beginPath();
      ctx.moveTo(this.x, this.y - this.radius);
      ctx.lineTo(this.x, this.y - this.radius - 4);
      ctx.strokeStyle = "#8B4513";
      ctx.lineWidth = 1;
      ctx.stroke();
      
      ctx.fillStyle = "white";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Apple", this.x, this.y + this.radius + 12);
    }
  }
}

// ========================================================
// ANIMAL CLASS
// ========================================================
class Animal {
  constructor(x, y) {
    // Ensure animals start in bounds
    this.x = Math.max(SCREEN_MARGIN, Math.min(canvas.width - SCREEN_MARGIN, x));
    this.y = Math.max(SCREEN_MARGIN, Math.min(canvas.height - SCREEN_MARGIN, y));
    this.hp = 50;
    this.speed = Math.random() * 1 + 0.5;
    this.angle = Math.random() * Math.PI * 2;
    
    // Momentum for animals
    this.velocityX = Math.cos(this.angle) * this.speed * 0.5;
    this.velocityY = Math.sin(this.angle) * this.speed * 0.5;
  }
  update() {
    const neighborRadius = 50;
    let avgX = 0, avgY = 0, count = 0;
    animals.forEach(other => {
      if (other !== this) {
        let d = Math.hypot(other.x - this.x, other.y - this.y);
        if (d < neighborRadius) {
          avgX += other.x;
          avgY += other.y;
          count++;
        }
      }
    });
    if (count > 0) {
      avgX /= count;
      avgY /= count;
      let desiredAngle = Math.atan2(avgY - this.y, avgX - this.x);
      let diffAngle = desiredAngle - this.angle;
      diffAngle = ((diffAngle + Math.PI) % (2 * Math.PI)) - Math.PI;
      this.angle += diffAngle * 0.05;
    }
    
    // Apply random movement
    this.angle += (Math.random() - 0.5) * 0.1;
    
    // Apply edge avoidance
    if (this.x < SCREEN_MARGIN * 1.5) {
      this.angle = Math.PI - this.angle;
    } else if (this.x > canvas.width - SCREEN_MARGIN * 1.5) {
      this.angle = Math.PI - this.angle;
    }
    if (this.y < SCREEN_MARGIN * 1.5) {
      this.angle = -this.angle;
    } else if (this.y > canvas.height - SCREEN_MARGIN * 1.5) {
      this.angle = -this.angle;
    }
    
    // Update velocity with momentum
    const targetVelocityX = Math.cos(this.angle) * this.speed;
    const targetVelocityY = Math.sin(this.angle) * this.speed;
    
    this.velocityX += (targetVelocityX - this.velocityX) * 0.05;
    this.velocityY += (targetVelocityY - this.velocityY) * 0.05;
    
    // Apply friction
    this.velocityX *= FRICTION;
    this.velocityY *= FRICTION;
    
    // Calculate new position
    let newX = this.x + this.velocityX;
    let newY = this.y + this.velocityY;
    
    // Strictly enforce boundaries
    this.x = Math.max(SCREEN_MARGIN, Math.min(canvas.width - SCREEN_MARGIN, newX));
    this.y = Math.max(SCREEN_MARGIN, Math.min(canvas.height - SCREEN_MARGIN, newY));
  }
  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = "white";
    ctx.fill();
    ctx.fillStyle = "#000";
    ctx.font = "8px serif";
    ctx.fillText("Animal", this.x - 15, this.y - 10);
  }
}