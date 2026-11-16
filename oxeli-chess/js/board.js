import * as THREE from 'three';
import {
  makeCheckerboardTexture,
  makeFrameTexture,
  makeContactShadowTexture,
  heightToNormalCanvas,
  COLORS,
} from './textures.js';

const SQ = 1;
/** Play slab: BoxGeometry(8, PLAY_H, 8) centered at y=PLAY_Y → top at PLAY_Y+PLAY_H/2. */
export const PLAY_Y = 0.22;
export const PLAY_H = 0.1;
const PLAY_TOP = PLAY_Y + PLAY_H * 0.5;
/** Piece origin = flat bottom. Small epsilon so bottoms never z-fight into the slab. */
export const BOARD_TOP_Y = PLAY_TOP + 0.02;

export function squareToWorld(c, r) {
  const x = (c - 4.5) * SQ;
  const z = (4.5 - r) * SQ;
  return new THREE.Vector3(x, BOARD_TOP_Y, z);
}

/**
 * Thick recessed wooden tray matching ref-board-photo:
 * pale honey wood box, play surface inset, soft contact shadow on white ground.
 * No coordinate labels (not on the prototype photo).
 */
export function createBoard(THREE_NS = THREE) {
  const root = new THREE_NS.Group();
  root.name = 'board';

  const boardMap = makeCheckerboardTexture(2048);
  const boardTex = toTex(THREE_NS, boardMap.canvas);
  boardTex.wrapS = boardTex.wrapT = THREE_NS.ClampToEdgeWrapping;

  const boardNormal = toTex(
    THREE_NS,
    heightToNormalCanvas(boardMap.heightCanvas, 2.8),
    1,
    1,
    false
  );
  boardNormal.wrapS = boardNormal.wrapT = THREE_NS.ClampToEdgeWrapping;

  const frameTex = toTex(THREE_NS, makeFrameTexture(1024).canvas, 2, 2);

  // Play surface (recessed)
  const top = new THREE_NS.Mesh(
    new THREE_NS.BoxGeometry(8, PLAY_H, 8),
    new THREE_NS.MeshStandardMaterial({
      map: boardTex,
      normalMap: boardNormal,
      normalScale: new THREE_NS.Vector2(0.45, 0.45),
      roughness: 0.62,
      metalness: 0.02,
    })
  );
  top.position.y = PLAY_Y;
  top.receiveShadow = true;
  top.castShadow = true;
  root.add(top);

  // Thick outer box / tray (photo proportions)
  const frameMat = new THREE_NS.MeshStandardMaterial({
    map: frameTex,
    roughness: 0.5,
    metalness: 0.03,
  });
  const outer = 9.4;
  const frameH = 0.48;
  const frame = new THREE_NS.Mesh(new THREE_NS.BoxGeometry(outer, frameH, outer), frameMat);
  frame.position.y = 0;
  frame.receiveShadow = true;
  frame.castShadow = true;
  root.add(frame);

  // Inner recess walls under the play surface lip
  const well = new THREE_NS.Mesh(
    new THREE_NS.BoxGeometry(8.15, 0.16, 8.15),
    new THREE_NS.MeshStandardMaterial({
      color: new THREE_NS.Color(COLORS.photoFrameDark),
      roughness: 0.75,
      metalness: 0,
    })
  );
  well.position.y = 0.12;
  well.receiveShadow = true;
  root.add(well);

  // Soft studio contact shadow on infinite white (photo look)
  const shadowTex = toTex(THREE_NS, makeContactShadowTexture(1024).canvas);
  shadowTex.wrapS = shadowTex.wrapT = THREE_NS.ClampToEdgeWrapping;
  const contact = new THREE_NS.Mesh(
    new THREE_NS.PlaneGeometry(16, 16),
    new THREE_NS.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
    })
  );
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = -frameH * 0.5 + 0.002;
  root.add(contact);

  return { root, squareToWorld, COLORS };
}

function toTex(THREE_NS, canvas, rx = 1, ry = 1, srgb = true) {
  const t = new THREE_NS.CanvasTexture(canvas);
  t.colorSpace = srgb ? THREE_NS.SRGBColorSpace : THREE_NS.NoColorSpace;
  t.anisotropy = 8;
  t.wrapS = t.wrapT = THREE_NS.RepeatWrapping;
  t.repeat.set(rx, ry);
  return t;
}
