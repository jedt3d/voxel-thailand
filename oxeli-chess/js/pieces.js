import * as THREE from 'three';
import { makePieceFaceTexture, getSideWoodCanvas } from './textures.js';
import { squareToWorld, BOARD_TOP_Y } from './board.js';

/**
 * Dot + O/X/E/L/I = identical cylinder.
 * Q = two cylinders stacked.
 */
const SQ = 1;
const R_PIECE = (0.75 * SQ) / 2; // 0.375
const H_PIECE = 0.42;
const H_MAJOR = H_PIECE;
const H_DOT = H_PIECE;
const H_Q_LAYER = H_PIECE * 0.55;

const woodCache = { body: null };

function bodyMaterial(THREE_NS) {
  if (!woodCache.body) {
    const tex = new THREE_NS.CanvasTexture(getSideWoodCanvas(1024));
    tex.colorSpace = THREE_NS.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE_NS.RepeatWrapping;
    tex.anisotropy = 8;
    woodCache.body = new THREE_NS.MeshStandardMaterial({
      map: tex,
      roughness: 0.48,
      metalness: 0.04,
    });
  }
  return woodCache.body;
}

async function faceMaterial(THREE_NS, kind, side) {
  const raw = await makePieceFaceTexture(kind, side, 1024);
  const tex = new THREE_NS.CanvasTexture(raw.canvas);
  tex.colorSpace = THREE_NS.SRGBColorSpace;
  tex.anisotropy = 8;

  const normal = new THREE_NS.CanvasTexture(raw.normalCanvas);
  normal.colorSpace = THREE_NS.NoColorSpace;
  normal.anisotropy = 8;

  const bump = new THREE_NS.CanvasTexture(raw.heightCanvas);
  bump.colorSpace = THREE_NS.NoColorSpace;

  return new THREE_NS.MeshStandardMaterial({
    map: tex,
    normalMap: normal,
    normalScale: new THREE_NS.Vector2(
      side === 'neg' ? 1.6 : 1.25,
      side === 'neg' ? 1.6 : 1.25
    ),
    bumpMap: bump,
    bumpScale: side === 'neg' ? 0.055 : 0.04,
    roughness: 0.45,
    metalness: 0.03,
  });
}

/** Cylinder sits on y0; top face at y0+height. Same geom for Dot and majors. */
function addDisc(THREE_NS, group, radius, height, faceMat, y0) {
  const body = new THREE_NS.Mesh(
    new THREE_NS.CylinderGeometry(radius, radius, height, 64),
    bodyMaterial(THREE_NS)
  );
  // CylinderGeometry is Y-centered → shift so bottom = y0
  body.position.y = y0 + height * 0.5;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const face = new THREE_NS.Mesh(
    new THREE_NS.CircleGeometry(radius * 0.97, 64),
    faceMat
  );
  face.rotation.x = -Math.PI / 2;
  face.rotation.z = Math.PI;
  face.position.y = y0 + height + 0.002;
  face.castShadow = true;
  group.add(face);
  return height;
}

export async function createPiece(THREE_NS, kind, side, c, r) {
  const group = new THREE_NS.Group();
  group.name = `${side}-${kind}`;
  const faceMat = await faceMaterial(THREE_NS, kind === 'Dot' ? 'Dot' : kind, side);

  let h;
  if (kind === 'Q') {
    addDisc(THREE_NS, group, R_PIECE, H_Q_LAYER, faceMat, 0);
    addDisc(THREE_NS, group, R_PIECE, H_Q_LAYER, faceMat, H_Q_LAYER * 0.95);
    h = H_Q_LAYER * 1.95;
  } else {
    h = addDisc(THREE_NS, group, R_PIECE, H_PIECE, faceMat, 0);
  }

  const p = squareToWorld(c, r);
  group.position.set(p.x, BOARD_TOP_Y, p.z);
  group.userData = { kind, side, c, r, height: h, baseY: BOARD_TOP_Y };
  return group;
}

export function startingSetup() {
  const posHome = ['I', 'L', 'E', 'O', 'X', 'E', 'L', 'I'];
  const negHome = ['I', 'L', 'E', 'X', 'O', 'E', 'L', 'I'];
  const list = [];
  for (let c = 1; c <= 8; c++) {
    list.push({ kind: posHome[c - 1], side: 'pos', c, r: 1 });
    list.push({ kind: 'Dot', side: 'pos', c, r: 3 });
    list.push({ kind: 'Dot', side: 'neg', c, r: 6 });
    list.push({ kind: negHome[c - 1], side: 'neg', c, r: 8 });
  }
  return list;
}

export async function createAllPieces(THREE_NS) {
  const setup = startingSetup();
  const pieces = [];
  for (const s of setup) {
    pieces.push(await createPiece(THREE_NS, s.kind, s.side, s.c, s.r));
  }
  return pieces;
}

export function keyCR(c, r) {
  return c * 10 + r;
}

export { BOARD_TOP_Y, H_MAJOR, H_DOT, H_PIECE, R_PIECE };
