// ==========================================================
// bot-3d.js
// 3D Bot Animation - Three.js භාවිතයෙන්
// Mouse එකෙන් drag කරලා bot කෙනා කරකවන්න පුළුවන්
// ==========================================================

let scene, camera, renderer, botGroup;
let isDragging = false;
let previousMouseX = 0;
let previousMouseY = 0;
let rotationSpeedY = 0.005;

function initBot3D() {
  const container = document.getElementById('bot3d-container');
  if (!container) return;

  // Scene
  scene = new THREE.Scene();

  // Camera
  camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
  camera.position.z = 5;

  // Renderer
  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const pointLight = new THREE.PointLight(0x4ade80, 1.2);
  pointLight.position.set(3, 3, 3);
  scene.add(pointLight);

  const pointLight2 = new THREE.PointLight(0x22c55e, 0.8);
  pointLight2.position.set(-3, -2, 2);
  scene.add(pointLight2);

  // Bot Group (හැම කොටසක්ම එකට gather කරන්න)
  botGroup = new THREE.Group();

  // Head
  const headGeo = new THREE.SphereGeometry(1, 32, 32);
  const headMat = new THREE.MeshStandardMaterial({
    color: 0x16a34a,
    metalness: 0.4,
    roughness: 0.3,
    emissive: 0x0d5c2e,
    emissiveIntensity: 0.2
  });
  const head = new THREE.Mesh(headGeo, headMat);
  botGroup.add(head);

  // Eyes
  const eyeGeo = new THREE.SphereGeometry(0.15, 16, 16);
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0x4ade80,
    emissiveIntensity: 1
  });
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.35, 0.1, 0.85);
  botGroup.add(leftEye);

  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.35, 0.1, 0.85);
  botGroup.add(rightEye);

  // Antenna
  const antennaGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8);
  const antennaMat = new THREE.MeshStandardMaterial({ color: 0x86efac });
  const antenna = new THREE.Mesh(antennaGeo, antennaMat);
  antenna.position.set(0, 1.2, 0);
  botGroup.add(antenna);

  const antennaTipGeo = new THREE.SphereGeometry(0.1, 16, 16);
  const antennaTipMat = new THREE.MeshStandardMaterial({
    color: 0x4ade80,
    emissive: 0x4ade80,
    emissiveIntensity: 1
  });
  const antennaTip = new THREE.Mesh(antennaTipGeo, antennaTipMat);
  antennaTip.position.set(0, 1.5, 0);
  botGroup.add(antennaTip);

  // Mouth (curved line - simple torus segment)
  const mouthGeo = new THREE.TorusGeometry(0.3, 0.04, 8, 20, Math.PI);
  const mouthMat = new THREE.MeshStandardMaterial({
    color: 0x86efac,
    emissive: 0x4ade80,
    emissiveIntensity: 0.5
  });
  const mouth = new THREE.Mesh(mouthGeo, mouthMat);
  mouth.position.set(0, -0.25, 0.85);
  mouth.rotation.z = Math.PI;
  botGroup.add(mouth);

  scene.add(botGroup);

  // Mouse/Touch Events - bot කරකවන්න
  container.addEventListener('mousedown', onDragStart);
  container.addEventListener('mousemove', onDragMove);
  container.addEventListener('mouseup', onDragEnd);
  container.addEventListener('mouseleave', onDragEnd);

  container.addEventListener('touchstart', onTouchStart);
  container.addEventListener('touchmove', onTouchMove);
  container.addEventListener('touchend', onDragEnd);

  animate();
}

function onDragStart(e) {
  isDragging = true;
  previousMouseX = e.clientX;
  previousMouseY = e.clientY;
}

function onDragMove(e) {
  if (!isDragging) return;
  const deltaX = e.clientX - previousMouseX;
  const deltaY = e.clientY - previousMouseY;

  botGroup.rotation.y += deltaX * 0.01;
  botGroup.rotation.x += deltaY * 0.01;

  previousMouseX = e.clientX;
  previousMouseY = e.clientY;
}

function onDragEnd() {
  isDragging = false;
}

function onTouchStart(e) {
  isDragging = true;
  previousMouseX = e.touches[0].clientX;
  previousMouseY = e.touches[0].clientY;
}

function onTouchMove(e) {
  if (!isDragging) return;
  const deltaX = e.touches[0].clientX - previousMouseX;
  const deltaY = e.touches[0].clientY - previousMouseY;

  botGroup.rotation.y += deltaX * 0.01;
  botGroup.rotation.x += deltaY * 0.01;

  previousMouseX = e.touches[0].clientX;
  previousMouseY = e.touches[0].clientY;
}

function animate() {
  requestAnimationFrame(animate);

  // Auto-rotate slowly ඉතුරු වෙලාවක drag නොකරද්දී
  if (!isDragging) {
    botGroup.rotation.y += rotationSpeedY;
  }

  renderer.render(scene, camera);
}

// Page load වෙනකොට bot එක initialize කරන්න
window.addEventListener('DOMContentLoaded', initBot3D);
