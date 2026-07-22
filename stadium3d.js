/**
 * Stadium3D - Ultra-Realistic WebGL 3D Motion Engine for CricScorer
 * Features procedural high-definition grass & pitch textures, multi-tiered grandstands,
 * LED Zings stumps, stadium roof canopy, volumetric night floodlights, floating atmosphere particles,
 * dynamic shadow mapping, and cinematic camera panning.
 */

/* global THREE */

export class Stadium3D {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x02050e);
    this.scene.fog = new THREE.FogExp2(0x02050e, 0.0022);

    this.width = window.innerWidth;
    this.height = window.innerHeight;

    // Camera
    this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 0.1, 1000);
    this.cameraPosTarget = new THREE.Vector3(0, 26, 68);
    this.cameraLookTarget = new THREE.Vector3(0, 2, 0);

    this.camera.position.copy(this.cameraPosTarget);
    this.camera.lookAt(this.cameraLookTarget);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;

    this.container.appendChild(this.renderer.domElement);

    // Camera Motion Controls
    this.isMouseDown = false;
    this.mousePos = { x: 0, y: 0 };
    this.cameraSpherical = { radius: 72, theta: 0, phi: Math.PI / 3.6 };
    this.autoMotionAngle = 0;

    // Objects
    this.stumps = [];
    this.bails = [];
    this.ballMesh = null;
    this.coinMesh = null;
    this.spotlights = [];
    this.stumpLeds = [];

    // Animation state
    this.isAnimatingBall = false;

    // Create Procedural Textures
    this.grassTexture = this.generateGrassTexture();
    this.pitchTexture = this.generatePitchTexture();
    this.boardTexture = this.generateBoardTexture();

    this.initLighting();
    this.buildStadium();
    this.buildPitchAndWickets();
    this.buildBall();
    this.buildTossCoin();
    this.buildAtmosphereParticles();
    this.setupEvents();

    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  // 1. Procedural Grass Texture (Mown Lawn Stripe Patterns & Noise)
  generateGrassTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#184d20';
    ctx.fillRect(0, 0, 1024, 1024);

    // Draw Mown Radial Stripe Rings
    const centerX = 512, centerY = 512;
    for (let r = 50; r < 500; r += 40) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
      ctx.lineWidth = 20;
      ctx.strokeStyle = (r / 40) % 2 === 0 ? 'rgba(34, 115, 48, 0.4)' : 'rgba(15, 60, 24, 0.4)';
      ctx.stroke();
    }

    // Add Organic Noise Grain
    const imgData = ctx.getImageData(0, 0, 1024, 1024);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 18;
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i+1] = Math.min(255, Math.max(0, data[i+1] + noise));
      data[i+2] = Math.min(255, Math.max(0, data[i+2] + noise));
    }
    ctx.putImageData(imgData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  // 2. Procedural Clay Pitch Texture (Turf Clay & Worn Footmarks)
  generatePitchTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Soil base
    ctx.fillStyle = '#cbb06d';
    ctx.fillRect(0, 0, 256, 1024);

    // Wear & tear patches near creases (Z = 100 & 924)
    const grad1 = ctx.createRadialGradient(128, 100, 10, 128, 100, 80);
    grad1.addColorStop(0, '#9e8143');
    grad1.addColorStop(1, 'transparent');
    ctx.fillStyle = grad1;
    ctx.fillRect(0, 0, 256, 200);

    const grad2 = ctx.createRadialGradient(128, 924, 10, 128, 924, 80);
    grad2.addColorStop(0, '#9e8143');
    grad2.addColorStop(1, 'transparent');
    ctx.fillStyle = grad2;
    ctx.fillRect(0, 824, 256, 200);

    // Noise
    const imgData = ctx.getImageData(0, 0, 256, 1024);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * 14;
      data[i] = Math.min(255, Math.max(0, data[i] + n));
      data[i+1] = Math.min(255, Math.max(0, data[i+1] + n));
      data[i+2] = Math.min(255, Math.max(0, data[i+2] + n));
    }
    ctx.putImageData(imgData, 0, 0);

    return new THREE.CanvasTexture(canvas);
  }

  // 3. LED Sponsor Billboards Texture
  generateBoardTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#070f26';
    ctx.fillRect(0, 0, 512, 64);

    ctx.fillStyle = '#00ff88';
    ctx.font = 'bold 24px Rajdhani, sans-serif';
    ctx.fillText('CRICSCOREER 3D  •  WORLD ARENA  •  EMBEDDED ENGINE', 10, 40);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.repeat.set(8, 1);
    return texture;
  }

  initLighting() {
    // Soft Ambient Light
    const ambient = new THREE.AmbientLight(0xb4ccee, 0.6);
    this.scene.add(ambient);

    // Main Directional Moonlight
    const dirLight = new THREE.DirectionalLight(0x78a4ff, 0.9);
    dirLight.position.set(60, 100, 50);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 250;
    dirLight.shadow.camera.left = -75;
    dirLight.shadow.camera.right = 75;
    dirLight.shadow.camera.top = 75;
    dirLight.shadow.camera.bottom = -75;
    this.scene.add(dirLight);
  }

  buildStadium() {
    // 1. Realistic Outfield Grass Mesh
    const fieldGeo = new THREE.CylinderGeometry(88, 88, 0.5, 64);
    const fieldMat = new THREE.MeshStandardMaterial({
      map: this.grassTexture,
      roughness: 0.85,
      metalness: 0.05
    });
    const field = new THREE.Mesh(fieldGeo, fieldMat);
    field.position.y = -0.25;
    field.receiveShadow = true;
    this.scene.add(field);

    // 2. White Boundary Rope
    const ropeGeo = new THREE.TorusGeometry(80, 0.5, 16, 100);
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
    const rope = new THREE.Mesh(ropeGeo, ropeMat);
    rope.rotation.x = Math.PI / 2;
    rope.position.y = 0.4;
    this.scene.add(rope);

    // 3. LED Advertising Hoarding Boards behind boundary rope
    const boardGeo = new THREE.CylinderGeometry(82, 82, 1.2, 64, 1, true);
    const boardMat = new THREE.MeshBasicMaterial({
      map: this.boardTexture,
      side: THREE.BackSide
    });
    const boards = new THREE.Mesh(boardGeo, boardMat);
    boards.position.y = 0.6;
    this.scene.add(boards);

    // 4. Multi-Tiered Stadium Grandstands with Canopy Roof
    const standGeo = new THREE.CylinderGeometry(120, 95, 34, 64, 1, true);
    const standMat = new THREE.MeshStandardMaterial({
      color: 0x091224,
      roughness: 0.7,
      side: THREE.BackSide
    });
    const stand = new THREE.Mesh(standGeo, standMat);
    stand.position.y = 17;
    this.scene.add(stand);

    // Seating Color Rows (Upper & Lower Tier Accent Bands)
    const seatsGeo = new THREE.CylinderGeometry(112, 98, 16, 64, 1, true);
    const seatsMat = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8,
      side: THREE.BackSide
    });
    const seats = new THREE.Mesh(seatsGeo, seatsMat);
    seats.position.y = 14;
    this.scene.add(seats);

    // Stadium Canopy Roof Structure
    const roofGeo = new THREE.TorusGeometry(118, 8, 16, 64);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.3 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.rotation.x = Math.PI / 2;
    roof.position.y = 35;
    this.scene.add(roof);

    // 5. Sight Screens (Batting & Bowling Ends)
    this.createSightScreen(100);
    this.createSightScreen(-100);

    // 6. High-Power LED Floodlight Towers
    const lightPositions = [
      { x: -85, z: -85 },
      { x: 85, z: -85 },
      { x: -85, z: 85 },
      { x: 85, z: 85 }
    ];

    lightPositions.forEach(pos => {
      const poleGeo = new THREE.CylinderGeometry(1.0, 2.2, 70, 8);
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.2 });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(pos.x, 35, pos.z);
      this.scene.add(pole);

      const boardGeo = new THREE.BoxGeometry(18, 10, 2);
      const boardMat = new THREE.MeshStandardMaterial({ color: 0x0f172a });
      const board = new THREE.Mesh(boardGeo, boardMat);
      board.position.set(pos.x, 70, pos.z);
      board.lookAt(0, 5, 0);
      this.scene.add(board);

      const spotLight = new THREE.SpotLight(0xffffff, 3.2);
      spotLight.position.set(pos.x, 70, pos.z);
      spotLight.target.position.set(0, 0, 0);
      spotLight.angle = Math.PI / 3.4;
      spotLight.penumbra = 0.5;
      spotLight.castShadow = true;
      this.scene.add(spotLight);
      this.scene.add(spotLight.target);
      this.spotlights.push(spotLight);

      const bulbGeo = new THREE.SphereGeometry(2.8, 16, 16);
      const bulbMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
      const bulb = new THREE.Mesh(bulbGeo, bulbMat);
      bulb.position.set(pos.x, 70, pos.z);
      this.scene.add(bulb);
    });
  }

  createSightScreen(zPos) {
    const frameGeo = new THREE.BoxGeometry(16, 12, 1);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
    const screen = new THREE.Mesh(frameGeo, frameMat);
    screen.position.set(0, 6, zPos);
    this.scene.add(screen);
  }

  buildPitchAndWickets() {
    // 1. Realistic Clay Pitch
    const pitchGeo = new THREE.PlaneGeometry(3.6, 22.5);
    const pitchMat = new THREE.MeshStandardMaterial({
      map: this.pitchTexture,
      roughness: 0.9,
      metalness: 0.05
    });
    const pitch = new THREE.Mesh(pitchGeo, pitchMat);
    pitch.rotation.x = -Math.PI / 2;
    pitch.position.y = 0.05;
    pitch.receiveShadow = true;
    this.scene.add(pitch);

    // 2. White Crease Markings
    const creaseMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    
    // Batting Crease Line (Z = 9.5)
    const crease1Geo = new THREE.PlaneGeometry(3.6, 0.15);
    const crease1 = new THREE.Mesh(crease1Geo, creaseMat);
    crease1.rotation.x = -Math.PI / 2;
    crease1.position.set(0, 0.06, 9.5);
    this.scene.add(crease1);

    // Bowling Crease Line (Z = -9.5)
    const crease2 = new THREE.Mesh(crease1Geo, creaseMat);
    crease2.rotation.x = -Math.PI / 2;
    crease2.position.set(0, 0.06, -9.5);
    this.scene.add(crease2);

    // 3. Wickets with Modern Zings LED Strip Accents
    this.createWicketSet(9.8);
    this.createWicketSet(-9.8);
  }

  createWicketSet(zPos) {
    const stumpMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.25, metalness: 0.2 });
    const bailMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.2 });
    const ledMat = new THREE.MeshBasicMaterial({ color: 0xff0055 }); // Red Zing LED flash

    const stumpXPositions = [-0.25, 0, 0.25];
    stumpXPositions.forEach(x => {
      const stumpGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.1, 16);
      const stump = new THREE.Mesh(stumpGeo, stumpMat);
      stump.position.set(x, 0.6, zPos);
      stump.castShadow = true;
      this.scene.add(stump);
      this.stumps.push(stump);

      // Subtle Zing LED light line on stump
      const ledGeo = new THREE.BoxGeometry(0.02, 0.9, 0.02);
      const led = new THREE.Mesh(ledGeo, ledMat);
      led.position.set(x, 0.6, zPos + 0.04);
      this.scene.add(led);
      this.stumpLeds.push(led);
    });

    [-0.125, 0.125].forEach(x => {
      const bailGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.24, 8);
      const bail = new THREE.Mesh(bailGeo, bailMat);
      bail.rotation.z = Math.PI / 2;
      bail.position.set(x, 1.18, zPos);
      this.scene.add(bail);
      this.bails.push(bail);
    });
  }

  buildBall() {
    // Detailed Red Leather Cricket Ball with White Seam
    const ballGeo = new THREE.SphereGeometry(0.22, 32, 32);
    const ballMat = new THREE.MeshStandardMaterial({
      color: 0xd90429,
      roughness: 0.15,
      metalness: 0.35
    });
    this.ballMesh = new THREE.Mesh(ballGeo, ballMat);
    this.ballMesh.position.set(0, 0.22, 9.2);
    this.ballMesh.castShadow = true;
    this.scene.add(this.ballMesh);

    // White Stitched Seam Ring
    const seamGeo = new THREE.TorusGeometry(0.221, 0.012, 8, 32);
    const seamMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const seam = new THREE.Mesh(seamGeo, seamMat);
    this.ballMesh.add(seam);
  }

  buildTossCoin() {
    const coinGeo = new THREE.CylinderGeometry(1.3, 1.3, 0.15, 32);
    const coinMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.95,
      roughness: 0.15
    });
    this.coinMesh = new THREE.Mesh(coinGeo, coinMat);
    this.coinMesh.position.set(0, 1.5, 0);
    this.coinMesh.rotation.x = Math.PI / 2;
    this.scene.add(this.coinMesh);
  }

  // Floating Arena Atmosphere Particles (Dust motes under stadium lights)
  buildAtmosphereParticles() {
    const particleCount = 200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 160;
      positions[i+1] = Math.random() * 50 + 2;
      positions[i+2] = (Math.random() - 0.5) * 160;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.6,
      transparent: true,
      opacity: 0.4
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  animateCoinFlip(outcome, onComplete) {
    let startTime = performance.now();
    const duration = 2400;
    const initialY = 1.5;
    const peakY = 17.0;

    const targetRotX = outcome === "Heads" ? Math.PI * 12 : Math.PI * 13;

    const flipStep = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1.0, elapsed / duration);

      const yVal = initialY + Math.sin(progress * Math.PI) * (peakY - initialY);
      this.coinMesh.position.y = yVal;

      this.coinMesh.rotation.x = progress * targetRotX;
      this.coinMesh.rotation.y = progress * Math.PI * 8;

      if (progress < 1.0) {
        requestAnimationFrame(flipStep);
      } else {
        this.coinMesh.position.y = 0.15;
        this.coinMesh.rotation.x = outcome === "Heads" ? 0 : Math.PI;
        if (onComplete) onComplete();
      }
    };

    requestAnimationFrame(flipStep);
  }

  animateShot(runs, isWicket, isWide, isNoBall, onComplete) {
    if (this.isAnimatingBall) return;
    this.isAnimatingBall = true;

    const startPos = new THREE.Vector3(0, 1.8, -9.0);
    const bouncePos = new THREE.Vector3(0, 0.1, 3.0);
    const strikePos = new THREE.Vector3(0, 0.8, 9.0);

    let endPos = new THREE.Vector3(0, 0.2, 9.0);

    if (isWicket) {
      endPos = new THREE.Vector3(0, 0.6, 9.8);
    } else if (runs === 0) {
      endPos = new THREE.Vector3(0.5, 0.1, 10.5);
    } else if (runs === 1 || runs === 2 || runs === 3) {
      const angle = (Math.random() - 0.5) * 1.2;
      endPos = new THREE.Vector3(Math.sin(angle) * 38, 0.1, Math.cos(angle) * 38 + 9);
    } else if (runs === 4) {
      const angle = (Math.random() - 0.5) * 1.5;
      endPos = new THREE.Vector3(Math.sin(angle) * 78, 0.1, Math.cos(angle) * 78 + 9);
    } else if (runs === 6) {
      const angle = (Math.random() - 0.5) * 1.5;
      endPos = new THREE.Vector3(Math.sin(angle) * 95, 20, Math.cos(angle) * 95 + 9);
    }

    let startTime = performance.now();
    const duration = runs === 6 ? 2200 : 1600;

    const animStep = (now) => {
      const elapsed = now - startTime;
      const p = Math.min(1.0, elapsed / duration);

      if (p < 0.35) {
        const subP = p / 0.35;
        this.ballMesh.position.lerpVectors(startPos, bouncePos, subP);
      } else if (p < 0.5) {
        const subP = (p - 0.35) / 0.15;
        this.ballMesh.position.lerpVectors(bouncePos, strikePos, subP);
      } else {
        const subP = (p - 0.5) / 0.5;
        this.ballMesh.position.lerpVectors(strikePos, endPos, subP);

        if (runs === 6) {
          this.ballMesh.position.y += Math.sin(subP * Math.PI) * 16;
        }
      }

      // Ball seam spin rotation
      this.ballMesh.rotation.x += 0.2;
      this.ballMesh.rotation.y += 0.15;

      if (p < 1.0) {
        requestAnimationFrame(animStep);
      } else {
        if (isWicket) {
          this.triggerWicketEffect();
        }
        this.isAnimatingBall = false;
        if (onComplete) onComplete();
      }
    };

    requestAnimationFrame(animStep);
  }

  triggerWicketEffect() {
    this.stumps.slice(0, 3).forEach(stump => {
      stump.position.z += 0.8;
      stump.rotation.x += (Math.random() - 0.5) * 0.8;
    });
    this.bails.slice(0, 2).forEach(bail => {
      bail.position.y += 0.6;
      bail.rotation.z += 1.2;
    });

    // Zing LED flash
    this.stumpLeds.forEach(led => {
      led.material.color.setHex(0xff0000);
    });

    setTimeout(() => {
      this.stumps[0].position.set(-0.25, 0.6, 9.8);
      this.stumps[1].position.set(0, 0.6, 9.8);
      this.stumps[2].position.set(0.25, 0.6, 9.8);
      this.stumps.forEach(s => s.rotation.set(0, 0, 0));

      this.bails[0].position.set(-0.125, 1.18, 9.8);
      this.bails[1].position.set(0.125, 1.18, 9.8);
      this.bails.forEach(b => b.rotation.set(0, 0, Math.PI / 2));

      this.stumpLeds.forEach(led => led.material.color.setHex(0xff0055));
    }, 1500);
  }

  setupEvents() {
    window.addEventListener('resize', () => {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.camera.aspect = this.width / this.height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.width, this.height);
    });

    window.addEventListener('mousedown', (e) => {
      if (e.target.tagName !== 'CANVAS') return;
      this.isMouseDown = true;
      this.mousePos = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isMouseDown) return;
      const dx = e.clientX - this.mousePos.x;
      const dy = e.clientY - this.mousePos.y;

      this.cameraSpherical.theta -= dx * 0.005;
      this.cameraSpherical.phi = Math.max(0.1, Math.min(Math.PI / 2.2, this.cameraSpherical.phi - dy * 0.005));

      this.mousePos = { x: e.clientX, y: e.clientY };

      const r = this.cameraSpherical.radius;
      this.cameraPosTarget.x = r * Math.sin(this.cameraSpherical.phi) * Math.sin(this.cameraSpherical.theta);
      this.cameraPosTarget.y = r * Math.cos(this.cameraSpherical.phi);
      this.cameraPosTarget.z = r * Math.sin(this.cameraSpherical.phi) * Math.cos(this.cameraSpherical.theta);
    });

    window.addEventListener('mouseup', () => {
      this.isMouseDown = false;
    });

    window.addEventListener('wheel', (e) => {
      if (e.target.tagName !== 'CANVAS') return;
      this.cameraSpherical.radius = Math.max(15, Math.min(120, this.cameraSpherical.radius + e.deltaY * 0.05));
      const r = this.cameraSpherical.radius;
      this.cameraPosTarget.x = r * Math.sin(this.cameraSpherical.phi) * Math.sin(this.cameraSpherical.theta);
      this.cameraPosTarget.y = r * Math.cos(this.cameraSpherical.phi);
      this.cameraPosTarget.z = r * Math.sin(this.cameraSpherical.phi) * Math.cos(this.cameraSpherical.theta);
    });
  }

  animate() {
    requestAnimationFrame(this.animate);

    // Continuous smooth cinematic drone orbital camera motion
    if (!this.isMouseDown && !this.isAnimatingBall) {
      this.autoMotionAngle += 0.0012;
      const r = this.cameraSpherical.radius;
      const theta = this.cameraSpherical.theta + this.autoMotionAngle;
      const phi = this.cameraSpherical.phi + Math.sin(this.autoMotionAngle * 2) * 0.03;

      this.cameraPosTarget.x = r * Math.sin(phi) * Math.sin(theta);
      this.cameraPosTarget.y = r * Math.cos(phi);
      this.cameraPosTarget.z = r * Math.sin(phi) * Math.cos(theta);
    }

    // Atmosphere particles gentle float
    if (this.particles) {
      this.particles.rotation.y += 0.0003;
    }

    this.camera.position.lerp(this.cameraPosTarget, 0.04);
    this.camera.lookAt(this.cameraLookTarget);

    if (this.coinMesh && !this.isAnimatingBall) {
      this.coinMesh.rotation.z += 0.01;
    }

    this.renderer.render(this.scene, this.camera);
  }
}
