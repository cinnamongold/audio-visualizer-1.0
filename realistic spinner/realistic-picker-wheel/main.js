// Ultrarealistic 3D Picker Wheel (configurable items)
// This file is self-contained and relies only on Three.js from CDN loaded by index.html.

(() => {
  // DOM helpers (support both simple and panel layouts)
  const sceneContainer = document.querySelector('#scene-container') || document.querySelector('.scene') || null;
  const itemsList = document.getElementById('items-list') || document.querySelector('.items-list');
  const addItemInput = document.getElementById('new-item') || document.querySelector('#new-item');
  const addItemBtn = document.getElementById('add-item') || document.querySelector('#add-item');
  const updateWheelBtn = document.getElementById('update-wheel') || document.querySelector('#update-wheel');
  const resetDefaultsBtn = document.getElementById('reset-defaults') || document.querySelector('#reset-defaults');

  // 3D scene state
  let scene, camera, renderer, wheel, clock;
  let isDragging = false;
  let spinVelocity = 0;
  const wheelRadius = 4.0;
  const wheelHeight = 0.6;
  let items = [ 'Apple','Banana','Cherry','Date','Elderberry','Fig','Grape','Honeydew' ];
  // Internal texture map to reuse when updating items
  let envMap, currentTexture;

  // Init scene lazily after DOM is ready
  function init() {
    if (!sceneContainer) return;
    // Build container size
    const w = sceneContainer.clientWidth;
    const h = sceneContainer.clientHeight;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    camera.position.set(0, 6, 12);
    camera.lookAt(0, 0, 0);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(5, 10, 5);
    scene.add(dir);

    // Environment map for reflections
    const loader = new THREE.CubeTextureLoader();
    envMap = loader.load([
      'https://threejs.org/examples/textures/cube/Bridge2/posx.jpg',
      'https://threejs.org/examples/textures/cube/Bridge2/negx.jpg',
      'https://threejs.org/examples/textures/cube/Bridge2/posy.jpg',
      'https://threejs.org/examples/textures/cube/Bridge2/negy.jpg',
      'https://threejs.org/examples/textures/cube/Bridge2/posz.jpg',
      'https://threejs.org/examples/textures/cube/Bridge2/negz.jpg'
    ]);
    envMap.encoding = THREE.sRGBEncoding;
    scene.environment = envMap;

    // Ground plane
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 1, metalness: 0.0, side: THREE.DoubleSide })
    );
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -wheelHeight/2 - 0.01;
    plane.receiveShadow = true;
    scene.add(plane);

    // Renderer
    clock = new THREE.Clock();
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(w, h);
    renderer.outputEncoding = THREE.sRGBEncoding;
    sceneContainer.appendChild(renderer.domElement);

    // Drag interactions
    const canvas = renderer.domElement;
    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', (e) => { isDragging = true; spinVelocity = 0; lastX = e.clientX; });
    window.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - lastX; lastX = e.clientX;
      spinVelocity = dx * 0.005;
    });
    window.addEventListener('pointerup', () => { isDragging = false; });
    let lastX = 0;

    // UI wiring
    if (itemsList) renderItems();
    if (addItemBtn) addItemBtn.addEventListener('click', () => {
      const v = (addItemInput && addItemInput.value) ? addItemInput.value.trim() : '';
      if (v) { items.push(v); if (addItemInput) addItemInput.value = ''; renderItems(); buildWheel(); }
    });
    if (updateWheelBtn) updateWheelBtn.addEventListener('click', () => buildWheel());
    if (resetDefaultsBtn) resetDefaultsBtn.addEventListener('click', () => { items = ['Apple','Banana','Cherry','Date','Elderberry','Fig','Grape','Honeydew']; renderItems(); buildWheel(); });

    // Initial build
    buildWheel();
    animate();
  }

  function renderItems() {
    if (!itemsList) return;
    itemsList.innerHTML = '';
    items.forEach((it, idx) => {
      const li = document.createElement('li');
      const span = document.createElement('span'); span.textContent = it;
      const btn = document.createElement('button'); btn.textContent = 'Remove'; btn.onclick = () => { items.splice(idx, 1); renderItems(); buildWheel(); };
      li.appendChild(span); li.appendChild(btn);
      itemsList.appendChild(li);
    });
  }

  function makeWheelTexture(n, labels) {
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    const cx = size/2, cy = size/2;
    const r = size/2 - 20;
    // Background
    const g = ctx.createRadialGradient(cx, cy, r*0.1, cx, cy, r);
    g.addColorStop(0, '#2b2b2b'); g.addColorStop(1, '#141414');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fill();
    const colors = ['#e74c3c','#f1c40f','#2ecc71','#3498db','#9b59b6','#e67e22','#1abc9c','#bdc3c7'];
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2; const a1 = ((i+1) / n) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, a0, a1); ctx.closePath();
      ctx.fillStyle = colors[i % colors.length]; ctx.fill();
      const amid = (a0 + a1) / 2; const tx = cx + Math.cos(amid) * (r * 0.65); const ty = cy + Math.sin(amid) * (r * 0.65);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 40px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.save(); ctx.translate(tx, ty); ctx.rotate(amid); ctx.fillText(labels[i], 0, 0); ctx.restore();
    }
    // center gloss
    ctx.beginPath(); ctx.arc(cx, cy, r*0.18, 0, Math.PI*2); ctx.fillStyle = '#111'; ctx.fill();
    const texture = new THREE.CanvasTexture(canvas); texture.needsUpdate = true; return texture;
  }

  function buildWheel() {
    if (!scene) return;
    // Remove previous wheel if exists
    if (wheel) {
      wheel.parent?.remove(wheel);
      wheel.geometry.dispose();
      if (wheel.material.map) wheel.material.map.dispose();
      wheel.material.dispose();
      wheel = null;
    }
    const n = Math.max(1, items.length);
    const texture = makeWheelTexture(n, items);
    currentTexture = texture;
    const mat = new THREE.MeshStandardMaterial({ map: texture, metalness: 0.9, roughness: 0.08, envMap: envMap, side: THREE.DoubleSide });
    const discGeom = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelHeight, 64, 1, true);
    wheel = new THREE.Mesh(discGeom, mat);
    wheel.rotation.x = Math.PI / 2;
    scene.add(wheel);
  }

  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(0.05, clock.getDelta());
    if (!isDragging && wheel && Math.abs(spinVelocity) > 0.0001) {
      wheel.rotation.y += spinVelocity * dt * 60;
      spinVelocity *= 0.98;
    }
    if (renderer && scene && camera) renderer.render(scene, camera);
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
