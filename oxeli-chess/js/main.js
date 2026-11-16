import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createBoard, squareToWorld, BOARD_TOP_Y } from './board.js';
import { createAllPieces, createPiece } from './pieces.js';
import { DEMO_PLIES, unpack } from './demo.js';

const canvas = document.getElementById('c');
const loading = document.getElementById('loading');
const statusMove = document.querySelector('#status .move');
const statusNote = document.querySelector('#status .note');
const movesEl = document.getElementById('moves');
const btnPlay = document.getElementById('btn-play');
const btnReplay = document.getElementById('btn-replay');

const state = {
  playing: true,
  ply: 0,
  pieces: new Map(), // key cr -> mesh
  anim: null,
  camMode: 'orbit',
  camT: 0,
  view: 'perspective', // 'perspective' | 'top'
  userOrbiting: false,
};

const PERSPECTIVE_POS = new THREE.Vector3(6.5, 8.2, 9.5);
const PERSPECTIVE_TARGET = new THREE.Vector3(0, 0.2, 0);
/** Ortho camera height — look straight down (−Y) at the board centre. */
const TOP_HEIGHT = 20;
/** Half-extent of ortho view at zoom=1 (world units). */
const ORTHO_BASE = 6.2;
/** 85mm on 35mm full-frame → vertical FOV ≈ 16.05° (fallback if ortho unavailable). */
const FOV_85MM = (2 * Math.atan(12 / 85) * 180) / Math.PI;

const STUDIO_WHITE = 0xf4efe9; // sampled from board photo bg

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
/* Was ~1.3 stops hot vs board photo — drop exposure by 2^-1.3 */
renderer.toneMappingExposure = 0.455;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(STUDIO_WHITE);
scene.fog = null;

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.02).texture;

// Perspective demo cam (~wider than 85mm for product orbit)
const perspCamera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 100);
perspCamera.position.copy(PERSPECTIVE_POS);

// True 2D top view — OrthographicCamera, ray parallel to −Y, 90° to the board
const aspect0 = innerWidth / Math.max(innerHeight, 1);
let orthoZoom = 1;
const orthoCamera = new THREE.OrthographicCamera(
  -ORTHO_BASE * aspect0,
  ORTHO_BASE * aspect0,
  ORTHO_BASE,
  -ORTHO_BASE,
  0.1,
  100
);
function fitOrthoFrustum() {
  const aspect = innerWidth / Math.max(innerHeight, 1);
  const h = ORTHO_BASE / orthoZoom;
  const w = h * aspect;
  orthoCamera.left = -w;
  orthoCamera.right = w;
  orthoCamera.top = h;
  orthoCamera.bottom = -h;
  orthoCamera.updateProjectionMatrix();
}
function placeOrthoTop() {
  // Ray ∥ −Y, 90° to the board plane. Screen-up = world −Z (Neg top / Pos bottom).
  orthoCamera.position.set(0, TOP_HEIGHT, 0);
  orthoCamera.up.set(0, 0, -1);
  orthoCamera.lookAt(0, 0, 0);
  orthoCamera.updateMatrixWorld(true);
  fitOrthoFrustum();
}
placeOrthoTop();

let camera = perspCamera;

const controls = new OrbitControls(perspCamera, canvas);
// Maya-like tumble: LMB/one-finger drag orbits around target; wheel/pinch dolly
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.copy(PERSPECTIVE_TARGET);
controls.enablePan = false;
controls.enableZoom = true;
controls.zoomSpeed = 1.1;
controls.rotateSpeed = 0.85;
controls.minDistance = 3.5;
controls.maxDistance = 28;
controls.minPolarAngle = 0.05;
controls.maxPolarAngle = Math.PI * 0.495;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.35;
controls.touches = {
  ONE: THREE.TOUCH.ROTATE,
  TWO: THREE.TOUCH.DOLLY_PAN,
};
controls.mouseButtons = {
  LEFT: THREE.MOUSE.ROTATE,
  MIDDLE: THREE.MOUSE.DOLLY,
  RIGHT: THREE.MOUSE.ROTATE,
};

// Warm honey key (OXELI hero tone) — soft AO-ish fill, not blown white
const hemi = new THREE.HemisphereLight(0xffe8c8, 0xc4a878, 0.48);
scene.add(hemi);
const key = new THREE.DirectionalLight(0xffe0b0, 0.95);
key.position.set(5, 12, 4); // top-right like hero ref
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.near = 1;
key.shadow.camera.far = 40;
key.shadow.camera.left = -12;
key.shadow.camera.right = 12;
key.shadow.camera.top = 12;
key.shadow.camera.bottom = -12;
key.shadow.radius = 5;
key.shadow.bias = -0.0002;
scene.add(key);
const fill = new THREE.DirectionalLight(0xd4b890, 0.22);
fill.position.set(-7, 5, -5);
scene.add(fill);

// Infinite white ground (receives real shadows)
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  new THREE.MeshStandardMaterial({
    color: STUDIO_WHITE,
    roughness: 1,
    metalness: 0,
  })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.25;
ground.receiveShadow = true;
scene.add(ground);

const { root: board } = createBoard(THREE);
scene.add(board);

let pieceRoot = new THREE.Group();
scene.add(pieceRoot);

function crKey(c, r) {
  return c * 10 + r;
}

async function resetPieces() {
  while (pieceRoot.children.length) pieceRoot.remove(pieceRoot.children[0]);
  state.pieces.clear();
  const list = await createAllPieces(THREE);
  for (const mesh of list) {
    pieceRoot.add(mesh);
    const { c, r } = mesh.userData;
    state.pieces.set(crKey(c, r), mesh);
  }
}

function setHud(ply) {
  if (!ply) {
    statusMove.textContent = 'Starting position';
    statusNote.textContent = 'A finished Oxeli game, reviewed in place.';
    return;
  }
  statusMove.textContent = ply.notation;
  statusNote.textContent = ply.note;
}

function rebuildMoveList(upto) {
  const lines = [];
  for (let i = 0; i < upto; i++) {
    const p = DEMO_PLIES[i];
    const n = Math.floor(i / 2) + 1;
    if (i % 2 === 0) lines.push(`<div><b>${n}.</b> ${p.notation.replace(/^\d+\.\s*/, '')}`);
    else lines[lines.length - 1] += `, ${p.notation}</div>`;
  }
  movesEl.innerHTML = lines.join('') || '<div class="muted">…</div>';
  movesEl.scrollTop = movesEl.scrollHeight;
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function animateMove(ply) {
  return new Promise((resolve) => {
    const from = unpack(ply.from);
    const to = unpack(ply.to);
    const mesh = state.pieces.get(ply.from);
    if (!mesh) {
      console.warn('missing piece', ply);
      resolve();
      return;
    }
    const captured = state.pieces.get(ply.to);
    const start = mesh.position.clone();
    const end = squareToWorld(to.c, to.r);
    // Always land on the board top — never sink through the surface
    const baseY = BOARD_TOP_Y;
    start.y = baseY;
    end.y = baseY;
    const lift = 0.55;
    const dur = ply.camera === 'e-zoom' || ply.camera === 'q-zoom' ? 1.35 : 0.85;
    let t0 = null;

    state.pieces.delete(ply.from);
    mesh.userData.c = to.c;
    mesh.userData.r = to.r;

    state.anim = (now) => {
      if (t0 == null) t0 = now;
      const u = Math.min(1, (now - t0) / 1000 / dur);
      const e = easeInOut(u);
      const yArc = Math.sin(e * Math.PI) * lift;
      mesh.position.set(
        start.x + (end.x - start.x) * e,
        baseY + yArc,
        start.z + (end.z - start.z) * e
      );
      if (captured) {
        captured.scale.setScalar(1 - e * 0.85);
        captured.position.y = baseY + yArc * 0.25;
      }
      if (u >= 1) {
        mesh.position.set(end.x, baseY, end.z);
        if (captured) {
          pieceRoot.remove(captured);
          state.pieces.delete(ply.to);
        }
        state.pieces.set(ply.to, mesh);
        state.anim = null;
        resolve();
      }
    };
  });
}

async function promoteAt(cr) {
  const { c, r } = unpack(cr);
  const old = state.pieces.get(cr);
  if (!old) return;
  pieceRoot.remove(old);
  state.pieces.delete(cr);
  const q = await createPiece(THREE, 'Q', old.userData.side, c, r);
  pieceRoot.add(q);
  state.pieces.set(cr, q);
}

function setCameraMode(mode) {
  state.camMode = mode || 'orbit';
  state.camT = 0;
  syncAutoRotate();
}

function syncAutoRotate() {
  controls.autoRotate =
    state.view === 'perspective' &&
    !state.userOrbiting &&
    (state.camMode === 'orbit' || state.camMode === 'mate');
}

function applyTopView() {
  state.view = 'top';
  state.userOrbiting = false;
  controls.autoRotate = false;
  controls.enabled = false;
  placeOrthoTop();
  camera = orthoCamera;
}

function applyPerspectiveView(restore = true) {
  state.view = 'perspective';
  controls.enabled = true;
  controls.enableRotate = true;
  camera = perspCamera;
  if (restore) {
    perspCamera.position.copy(PERSPECTIVE_POS);
    controls.target.copy(PERSPECTIVE_TARGET);
  }
  perspCamera.up.set(0, 1, 0);
  perspCamera.fov = 42;
  perspCamera.updateProjectionMatrix();
  syncAutoRotate();
  controls.update();
}

/** Optional: 85mm perspective looking straight down (same framing idea as ortho). */
function applyTopView85mm() {
  state.view = 'top';
  state.userOrbiting = false;
  controls.autoRotate = false;
  controls.enabled = false;
  perspCamera.fov = FOV_85MM;
  perspCamera.aspect = innerWidth / Math.max(innerHeight, 1);
  perspCamera.position.set(0, TOP_HEIGHT, 0);
  perspCamera.up.set(0, 0, -1);
  perspCamera.lookAt(0, 0, 0);
  perspCamera.rotation.set(-Math.PI / 2, 0, 0);
  perspCamera.updateProjectionMatrix();
  camera = perspCamera;
}

function toggleViewMode() {
  if (state.view === 'top') applyPerspectiveView(true);
  else applyTopView();
}

function updateCinematic(dt) {
  if (state.view === 'top' || state.userOrbiting) return;
  state.camT += dt;
  const t = state.camT;
  if (state.camMode === 'orbit') return;

  const focus = controls.target;
  if (state.camMode === 'e-zoom') {
    camera.position.lerp(new THREE.Vector3(3.2, 4.2, 4.8), 0.04);
    focus.lerp(new THREE.Vector3(-1.2, 0.3, 0.5), 0.04);
  } else if (state.camMode === 'x-zoom') {
    camera.position.lerp(new THREE.Vector3(4.5, 5.5, 6.2), 0.04);
    focus.lerp(new THREE.Vector3(0.8, 0.2, 0.2), 0.04);
  } else if (state.camMode === 'q-zoom' || state.camMode === 'promote') {
    camera.position.lerp(new THREE.Vector3(2.8, 3.6, 5.5), 0.045);
    focus.lerp(new THREE.Vector3(1.5, 0.4, -2.2), 0.045);
  } else if (state.camMode === 'mate') {
    camera.position.lerp(new THREE.Vector3(0.2, 11, 0.2), 0.03);
    focus.lerp(new THREE.Vector3(0, 0, 0), 0.03);
  }
  if (t > 2.8 && state.camMode !== 'mate') {
    setCameraMode('orbit');
  }
}

async function playLoop() {
  while (state.playing && state.ply < DEMO_PLIES.length) {
    const ply = DEMO_PLIES[state.ply];
    setHud(ply);
    rebuildMoveList(state.ply + 1);
    setCameraMode(ply.camera || 'orbit');
    await animateMove(ply);
    if (ply.promote) await promoteAt(ply.to);
    state.ply += 1;
    await wait(ply.camera === 'mate' ? 1600 : 420);
  }
  if (state.ply >= DEMO_PLIES.length) {
    statusNote.textContent = 'Demo complete — replaying shortly.';
    await wait(2800);
    if (state.playing) await replay();
  }
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function replay() {
  state.playing = false;
  state.anim = null;
  state.ply = 0;
  setCameraMode('orbit');
  await resetPieces();
  setHud(null);
  rebuildMoveList(0);
  state.playing = true;
  btnPlay.textContent = 'Pause';
  btnPlay.classList.add('on');
  playLoop();
}

const appEl = document.getElementById('app');
const btnMenu = document.getElementById('btn-menu');

btnMenu.addEventListener('click', (e) => {
  e.stopPropagation();
  const collapsed = appEl.classList.toggle('hud-collapsed');
  btnMenu.setAttribute('aria-expanded', String(!collapsed));
  btnMenu.title = collapsed ? 'Show panels' : 'Hide panels';
});

btnPlay.addEventListener('click', () => {
  state.playing = !state.playing;
  btnPlay.textContent = state.playing ? 'Pause' : 'Play';
  btnPlay.classList.toggle('on', state.playing);
  syncAutoRotate();
  if (state.playing) playLoop();
});

btnReplay.addEventListener('click', () => {
  replay();
});

// --- Maya-like viewport: drag tumble, wheel/pinch zoom, dblclick/tap toggle top ---
controls.addEventListener('start', () => {
  state.userOrbiting = true;
  controls.autoRotate = false;
});
controls.addEventListener('end', () => {
  // Keep auto-rotate off after manual tumble until view toggle / replay
  state.userOrbiting = state.view === 'perspective';
  syncAutoRotate();
});

canvas.addEventListener('dblclick', (e) => {
  e.preventDefault();
  toggleViewMode();
});

let lastTap = 0;
canvas.addEventListener(
  'touchend',
  (e) => {
    if (e.changedTouches.length !== 1) return;
    const now = performance.now();
    if (now - lastTap < 280) {
      e.preventDefault();
      toggleViewMode();
      lastTap = 0;
    } else {
      lastTap = now;
    }
  },
  { passive: false }
);

// Ortho top-view zoom (OrbitControls disabled in top mode)
canvas.addEventListener(
  'wheel',
  (e) => {
    if (state.view !== 'top' || camera !== orthoCamera) return;
    e.preventDefault();
    const factor = Math.exp(e.deltaY * 0.0012);
    orthoZoom = THREE.MathUtils.clamp(orthoZoom / factor, 0.55, 2.8);
    fitOrthoFrustum();
  },
  { passive: false }
);

addEventListener('resize', () => {
  const aspect = innerWidth / Math.max(innerHeight, 1);
  perspCamera.aspect = aspect;
  perspCamera.updateProjectionMatrix();
  if (state.view === 'top') placeOrthoTop();
  else fitOrthoFrustum();
  renderer.setSize(innerWidth, innerHeight, false);
});

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (state.anim) state.anim(now);
  updateCinematic(dt);
  if (state.view === 'perspective') controls.update();
  // Keep ortho locked: position + up + lookAt (true 2D, no perspective drift)
  if (state.view === 'top' && camera === orthoCamera) {
    orthoCamera.position.set(0, TOP_HEIGHT, 0);
    orthoCamera.up.set(0, 0, -1);
    orthoCamera.lookAt(0, 0, 0);
  }
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

(async function boot() {
  try {
    await document.fonts.load('600 64px "Oxeli Diagram"');
    await resetPieces();
    setHud(null);
    rebuildMoveList(0);
    loading.hidden = true;
    requestAnimationFrame(frame);
    btnPlay.classList.add('on');
    playLoop();
  } catch (err) {
    console.error(err);
    loading.querySelector('p').textContent = 'Failed to load — see console';
  }
})();
