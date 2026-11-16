/**
 * Textures for Oxeli board + pieces.
 * Board colours sampled from reference photo
 * oxeli-chess/reference/images/ref-board-photo-full.png
 *   bg white ≈ #F4EFE9 (244,239,233)
 *   play wood ≈ #C8A86F (200,168,111)
 *   warm light ≈ #E2CA67–#E9CA7A
 *   frame ≈ #BDA583 (189,165,131)
 */

const COLORS = {
  ink: '#68360a',
  face: '#faf1e8',
  light: '#faf1e8',
  // Locked to OXELI hero tone (ref: warm honey + walnut hatch)
  photoBg: '#f4efe9',
  photoWood: '#cc9c5a', // plain square
  photoWoodLight: '#d8b070',
  photoWoodWarm: '#c89853', // overall mid
  photoFrame: '#b98a4f', // piece rim / frame
  photoFrameDark: '#68360a', // hatch / dark grain
  woodLight: '#d8b070',
  woodMid: '#cc9c5a',
  woodDark: '#68360a',
  faceDark: '#69320b', // Neg recessed field
  letterWood: '#b98c51', // raised Neg letter
  rim: '#8a5a2e',
  table: '#3a1f12',
  hatch: '#68360a',
};

function makeCanvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return { canvas: c, ctx: c.getContext('2d') };
}

function noise(x, y) {
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

function canvasToTexture(canvas, repeat = 1) {
  return { canvas, repeat };
}

/** Horizontal wood grain. */
export function makeWoodTexture(size = 1024, opts = {}) {
  const { canvas, ctx } = makeCanvas(size);
  const base = opts.base || COLORS.photoWood;
  const dark = opts.dark || COLORS.photoFrameDark;
  const light = opts.light || COLORS.photoWoodWarm;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y++) {
    const wave = Math.sin(y * 0.035) * 18 + Math.sin(y * 0.011) * 40;
    const n = noise(y * 0.2, 1.7);
    ctx.strokeStyle = n > 0.55 ? dark : light;
    ctx.globalAlpha = 0.07 + n * 0.1;
    ctx.lineWidth = 1 + n * 1.4;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= size; x += 8) {
      const j = (noise(x * 0.02, y * 0.05) - 0.5) * 6;
      ctx.lineTo(x, y + Math.sin((x + wave) * 0.02) * 2 + j);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  return canvasToTexture(canvas, opts.repeat || 1);
}

/**
 * Board play surface from prototype photo language:
 * one continuous pale wood; dark squares = fine laser hatch only (R-02: 11 dark).
 */
export function makeCheckerboardTexture(size = 2048) {
  const { canvas, ctx } = makeCanvas(size);
  const { canvas: height, ctx: hctx } = makeCanvas(size);
  const cell = size / 8;

  // Continuous honey birch like the photo play surface
  const wood = makeWoodTexture(size, {
    base: COLORS.photoWood,
    light: COLORS.photoWoodWarm,
    dark: COLORS.photoFrameDark,
  }).canvas;
  ctx.drawImage(wood, 0, 0);

  // Slight warm varnish — keep photo mid-tone, no bleach
  ctx.fillStyle = 'rgba(120,80,30,0.06)';
  ctx.fillRect(0, 0, size, size);

  hctx.fillStyle = '#808080';
  hctx.fillRect(0, 0, size, size);

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const file = c + 1;
      const rank = 8 - r;
      const dark = (file + rank) % 2 === 0;
      const x0 = c * cell;
      const y0 = r * cell;

      // Hairline grid (laser), subtle
      ctx.strokeStyle = 'rgba(90,55,20,0.22)';
      ctx.lineWidth = Math.max(1, cell * 0.01);
      ctx.strokeRect(x0 + 0.5, y0 + 0.5, cell - 1, cell - 1);

      if (!dark) continue;

      // Fine diagonal hatch — same wood, engraved (photo / oxeli_setup)
      ctx.save();
      ctx.beginPath();
      ctx.rect(x0 + 1, y0 + 1, cell - 2, cell - 2);
      ctx.clip();
      ctx.strokeStyle = 'rgba(95,55,20,0.38)';
      ctx.lineWidth = Math.max(1, cell / 55);
      const step = cell / 14;
      for (let i = -cell * 2; i < cell * 2; i += step) {
        ctx.beginPath();
        ctx.moveTo(x0 + i, y0);
        ctx.lineTo(x0 + i + cell, y0 + cell);
        ctx.stroke();
      }
      ctx.restore();

      hctx.save();
      hctx.beginPath();
      hctx.rect(x0 + 1, y0 + 1, cell - 2, cell - 2);
      hctx.clip();
      hctx.strokeStyle = '#3a3a3a';
      hctx.lineWidth = Math.max(1, cell / 55);
      for (let i = -cell * 2; i < cell * 2; i += step) {
        hctx.beginPath();
        hctx.moveTo(x0 + i, y0);
        hctx.lineTo(x0 + i + cell, y0 + cell);
        hctx.stroke();
      }
      hctx.restore();
    }
  }

  return { ...canvasToTexture(canvas), heightCanvas: height };
}

/** Thick tray / frame wood — photo frame sample #BDA583. */
export function makeFrameTexture(size = 1024) {
  return makeWoodTexture(size, {
    base: COLORS.photoFrame,
    light: COLORS.photoWoodWarm,
    dark: COLORS.photoFrameDark,
  });
}

/** Soft elliptical contact shadow (studio white ground, matches photo). */
export function makeContactShadowTexture(size = 1024) {
  const { canvas, ctx } = makeCanvas(size);
  ctx.clearRect(0, 0, size, size);
  const g = ctx.createRadialGradient(
    size * 0.5, size * 0.52, size * 0.12,
    size * 0.5, size * 0.52, size * 0.48
  );
  g.addColorStop(0, 'rgba(40,30,20,0.28)');
  g.addColorStop(0.45, 'rgba(40,30,20,0.12)');
  g.addColorStop(1, 'rgba(40,30,20,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return canvasToTexture(canvas);
}

export function heightToNormalCanvas(heightCanvas, strength = 2.4) {
  const size = heightCanvas.width;
  const { canvas, ctx } = makeCanvas(size);
  const src = heightCanvas.getContext('2d').getImageData(0, 0, size, size).data;
  const out = ctx.createImageData(size, size);
  const at = (x, y) => {
    const xi = (x + size) % size;
    const yi = (y + size) % size;
    return src[(yi * size + xi) * 4] / 255;
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1) || 1;
      const i = (y * size + x) * 4;
      out.data[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      out.data[i + 1] = ((-dy / len) * 0.5 + 0.5) * 255;
      out.data[i + 2] = (1 / len) * 0.5 * 255 + 128;
      out.data[i + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
  return canvas;
}

/** Shared piece-body wood — same photo mid-tone as the board. */
const PIECE_WOOD = {
  base: '#b98a4f',
  light: '#cc9c5a',
  dark: '#68360a',
};

let _sideWood = null;
let _darkWood = null;

export function getSideWoodCanvas(size = 1024) {
  if (!_sideWood || _sideWood.width !== size) {
    _sideWood = makeWoodTexture(size, PIECE_WOOD).canvas;
  }
  return _sideWood;
}

/** Cork / rough-sawn Neg field — matches topview_ref recessed plate. */
export function getDarkerWoodCanvas(size = 1024) {
  if (!_darkWood || _darkWood.width !== size) {
    const { canvas, ctx } = makeCanvas(size);
    ctx.fillStyle = COLORS.faceDark; // #69320b
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < size * 28; i++) {
      const x = noise(i * 0.17, 2.1) * size;
      const y = noise(i * 0.31, 4.7) * size;
      const n = noise(x * 0.08, y * 0.08);
      ctx.fillStyle = n > 0.55 ? '#3a1804' : n > 0.35 ? '#7a3c14' : '#5a2810';
      ctx.globalAlpha = 0.35 + n * 0.45;
      ctx.fillRect(x, y, 1 + n * 2.5, 1 + n * 2.5);
    }
    // Soft pits
    for (let i = 0; i < 900; i++) {
      const x = noise(i * 1.9, 8.2) * size;
      const y = noise(i * 2.3, 3.4) * size;
      ctx.fillStyle = 'rgba(20,8,2,0.35)';
      ctx.beginPath();
      ctx.arc(x, y, 0.8 + noise(i, 1) * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    _darkWood = canvas;
  }
  return _darkWood;
}

function diagramChar(kind, positive) {
  const map = {
    O: ['o', 'O'],
    X: ['x', 'X'],
    E: ['e', 'E'],
    L: ['l', 'L'],
    I: ['i', 'I'],
    Dot: ['.', '>'],
    Q: ['q', 'Q'],
  };
  const pair = map[kind] || ['o', 'O'];
  return positive ? pair[0] : pair[1];
}

function inkBounds(ctx, size) {
  const { data } = ctx.getImageData(0, 0, size, size);
  let x0 = size, y0 = size, x1 = -1, y1 = -1;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (data[(y * size + x) * 4 + 3] < 12) continue;
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) return null;
  return { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

async function bakeCenteredGlyphMask(kind, side, size) {
  const positive = side === 'pos';
  const glyph = diagramChar(kind, positive);
  const fontPx = size * 1.15;
  await document.fonts.load(`${fontPx}px "Oxeli Diagram"`);

  const { canvas: raw, ctx: r } = makeCanvas(size);
  r.fillStyle = '#ffffff';
  r.textAlign = 'center';
  r.textBaseline = 'alphabetic';
  r.font = `${fontPx}px "Oxeli Diagram"`;
  const m = r.measureText(glyph);
  const midY =
    size / 2 + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
  r.fillText(glyph, size / 2, midY);

  const b = inkBounds(r, size);
  const { canvas, ctx } = makeCanvas(size);
  if (!b) {
    ctx.drawImage(raw, 0, 0);
    return canvas;
  }
  const cx = (b.x0 + b.x1) / 2;
  const cy = (b.y0 + b.y1) / 2;
  ctx.drawImage(raw, size / 2 - cx, size / 2 - cy);
  return canvas;
}

export async function makeSymbolTexture(kind, side, woodCanvas, size = 1024) {
  const mask = await bakeCenteredGlyphMask(kind, side, size);
  const { canvas, ctx } = makeCanvas(size);
  ctx.drawImage(woodCanvas, 0, 0);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(mask, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  return canvasToTexture(canvas);
}

/**
 * Pos (oxeli.q): honey field + dark stroke grooves.
 * Neg (OXELI>Q): Diagram filled disc w/ letter holes —
 *   honey rim+letters show through holes; cork dark wood fills the plate.
 *   = invert of Pos (dark plate / light letter).
 */
export async function makePieceFaceTexture(kind, side, size = 1024) {
  const { canvas, ctx } = makeCanvas(size);
  const sideWood = getSideWoodCanvas(size);
  const darkWood = getDarkerWoodCanvas(size);
  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.5;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.clip();

  // Honey everywhere first (rim + letter wood)
  ctx.drawImage(sideWood, 0, 0);

  if (side === 'neg') {
    // Neg Diagram glyph = solid disc with letter-shaped holes
    const negMask = await bakeCenteredGlyphMask(kind, 'neg', size);
    // Shrink plate slightly so honey rim reads like topview_ref
    const { canvas: maskFit, ctx: mf } = makeCanvas(size);
    mf.translate(cx, cy);
    mf.scale(0.86, 0.86);
    mf.translate(-cx, -cy);
    mf.drawImage(negMask, 0, 0);
    const { canvas: plate, ctx: p } = makeCanvas(size);
    p.drawImage(darkWood, 0, 0);
    p.globalCompositeOperation = 'destination-in';
    p.drawImage(maskFit, 0, 0); // cork plate; letter holes transparent
    ctx.drawImage(plate, 0, 0); // honey letters + rim show through
  } else {
    const posMask = await bakeCenteredGlyphMask(kind, 'pos', size);
    const { canvas: groove, ctx: g } = makeCanvas(size);
    g.drawImage(darkWood, 0, 0);
    g.globalCompositeOperation = 'destination-in';
    g.drawImage(posMask, 0, 0);
    ctx.drawImage(groove, 0, 0);
  }
  ctx.restore();

  const { canvas: heightCanvas, ctx: h } = makeCanvas(size);
  h.fillStyle = '#d8d8d8';
  h.beginPath();
  h.arc(cx, cy, R, 0, Math.PI * 2);
  h.fill();

  if (side === 'neg') {
    const negMask = await bakeCenteredGlyphMask(kind, 'neg', size);
    const { canvas: maskFit, ctx: mf } = makeCanvas(size);
    mf.translate(cx, cy);
    mf.scale(0.86, 0.86);
    mf.translate(-cx, -cy);
    mf.drawImage(negMask, 0, 0);
    // Plate down; letter holes stay high (raised honey)
    const { canvas: down, ctx: d } = makeCanvas(size);
    d.drawImage(maskFit, 0, 0);
    d.globalCompositeOperation = 'source-in';
    d.fillStyle = '#303030';
    d.fillRect(0, 0, size, size);
    h.drawImage(down, 0, 0);
  } else {
    const posMask = await bakeCenteredGlyphMask(kind, 'pos', size);
    const { canvas: groove, ctx: g } = makeCanvas(size);
    g.drawImage(posMask, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = '#282828';
    g.fillRect(0, 0, size, size);
    h.drawImage(groove, 0, 0);
  }

  const grd = h.createRadialGradient(cx, cy, R * 0.82, cx, cy, R);
  grd.addColorStop(0, 'rgba(0,0,0,0)');
  grd.addColorStop(1, 'rgba(0,0,0,0.3)');
  h.globalCompositeOperation = 'source-atop';
  h.fillStyle = grd;
  h.fillRect(0, 0, size, size);

  return {
    ...canvasToTexture(canvas),
    heightCanvas,
    normalCanvas: heightToNormalCanvas(heightCanvas, side === 'neg' ? 6.2 : 4.8),
  };
}

export { COLORS };
