class CyberCar {
  constructor() {
    this.car = document.getElementById('cyber-car');
    this.engine = Matter.Engine.create();
    this.world = this.engine.world;
    
    // Physics settings
    this.position = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    this.velocity = { x: 0, y: 0 };
    this.rotation = 0;
    this.speed = 0;
    this.driftFactor = 0;
    
    // Car properties
    this.maxSpeed = 15;
    this.acceleration = 0.5;
    this.friction = 0.98;
    this.rotationSpeed = 0.1;
    this.driftThreshold = 3;

    this.keys = {
      up: false,
      down: false,
      left: false,
      right: false
    };

    this.isWrapping = false;
    this.wrapTimeout = null;

    this.setupEventListeners();
    this.animate();
  }

  setupEventListeners() {
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('keyup', (e) => this.handleKeyUp(e));
  }

  handleKeyDown(e) {
    switch(e.key) {
      case 'ArrowUp': this.keys.up = true; break;
      case 'ArrowDown': this.keys.down = true; break;
      case 'ArrowLeft': this.keys.left = true; break;
      case 'ArrowRight': this.keys.right = true; break;
    }
  }

  handleKeyUp(e) {
    switch(e.key) {
      case 'ArrowUp': this.keys.up = false; break;
      case 'ArrowDown': this.keys.down = false; break;
      case 'ArrowLeft': this.keys.left = false; break;
      case 'ArrowRight': this.keys.right = false; break;
    }
  }

  update() {
    // Acceleration
    if (this.keys.up) {
      this.speed += this.acceleration;
    }
    if (this.keys.down) {
      this.speed -= this.acceleration;
    }

    // Speed limits
    this.speed = Math.max(Math.min(this.speed, this.maxSpeed), -this.maxSpeed / 2);
    
    // Rotation and drifting with improved handling
    if (Math.abs(this.speed) > this.driftThreshold) {
      const turnMultiplier = this.speed > 0 ? 1 : -1;
      if (this.keys.left) {
        this.rotation -= this.rotationSpeed * turnMultiplier;
        this.driftFactor -= 0.1;
      }
      if (this.keys.right) {
        this.rotation += this.rotationSpeed * turnMultiplier;
        this.driftFactor += 0.1;
      }
    } else {
      if (this.keys.left) this.rotation -= this.rotationSpeed / 2;
      if (this.keys.right) this.rotation += this.rotationSpeed / 2;
    }

    // Limit drift factor
    this.driftFactor = Math.max(Math.min(this.driftFactor, 1), -1);

    // Apply physics
    this.driftFactor *= 0.95;
    this.speed *= this.friction;

    // Calculate movement with corrected angle
    const moveAngle = this.rotation + (this.driftFactor * Math.PI / 8);
    this.velocity.x = Math.cos(moveAngle) * this.speed;
    this.velocity.y = Math.sin(moveAngle) * this.speed;

    // Update position
    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y;

    // Screen wrapping with buffer zone and fade effect
    const buffer = 100;
    let shouldWrap = false;
    let newX = this.position.x;
    let newY = this.position.y;

    if (this.position.x > window.innerWidth + buffer) {
      newX = -buffer;
      shouldWrap = true;
    }
    if (this.position.x < -buffer) {
      newX = window.innerWidth + buffer;
      shouldWrap = true;
    }
    if (this.position.y > window.innerHeight + buffer) {
      newY = -buffer;
      shouldWrap = true;
    }
    if (this.position.y < -buffer) {
      newY = window.innerHeight + buffer;
      shouldWrap = true;
    }

    if (shouldWrap && !this.isWrapping) {
      this.isWrapping = true;
      this.car.classList.add('teleporting');
      
      clearTimeout(this.wrapTimeout);
      this.wrapTimeout = setTimeout(() => {
        this.position.x = newX;
        this.position.y = newY;
        
        // Small delay before showing the car again
        setTimeout(() => {
          this.car.classList.remove('teleporting');
          this.isWrapping = false;
        }, 200);
      }, 200); // Wait for fade out before teleporting
    } else if (!shouldWrap) {
      this.position.x = newX;
      this.position.y = newY;
    }

    // Visual effects
    this.car.classList.toggle('drifting', Math.abs(this.driftFactor) > 0.5);
  }

  render() {
    this.car.style.transform = `translate(${this.position.x}px, ${this.position.y}px) rotate(${this.rotation}rad)`;
  }

  animate() {
    this.update();
    this.render();
    requestAnimationFrame(() => this.animate());
  }
}

// Initialize when the page loads
window.addEventListener('load', () => {
  new CyberCar();
}); 