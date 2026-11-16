/** Scripted Oxeli review match. Coordinates = c*10+r (41 = file 4, rank 1). */

export function unpack(cr) {
  return { c: Math.floor(cr / 10), r: cr % 10 };
}

/**
 * Occupancy-checked showcase (own-piece captures rejected).
 * Beats: X colour-shift, E screen-capture, Dot→Q, Q sweep.
 * Start: Pos ILEOXELI + Dots r3 · Neg ILEXOELI + Dots r6
 */
export const DEMO_PLIES = [
  { notation: '1. 44', from: 43, to: 44, note: 'Dot steps one square forward.', camera: 'orbit' },
  { notation: '55', from: 56, to: 55, note: 'Negative Dot answers.', camera: 'orbit' },

  { notation: '2. L42', from: 21, to: 42, note: 'L leaps in an L — jumping freely.', camera: 'orbit' },
  { notation: 'L67', from: 78, to: 67, note: 'Negative L develops.', camera: 'orbit' },

  { notation: '3. 34', from: 33, to: 34, note: 'Opening the cannon’s file.', camera: 'orbit' },
  { notation: '75', from: 76, to: 75, note: 'Negative Dot on the flank.', camera: 'orbit' },

  { notation: '4. X52', from: 51, to: 52, note: 'X colour-shift: one orthogonal step.', camera: 'x-zoom' },
  { notation: 'X47', from: 48, to: 47, note: 'Negative X changes square colour.', camera: 'orbit' },

  { notation: '5. X43', from: 52, to: 43, note: 'X continues on the diagonal.', camera: 'x-zoom' },
  { notation: '65', from: 66, to: 65, note: 'Negative Dot advances.', camera: 'orbit' },

  { notation: '6. I12', from: 11, to: 12, note: 'I slides orthogonally — the rook.', camera: 'orbit' },
  { notation: 'E48', from: 38, to: 48, note: 'E slides freely when not capturing.', camera: 'orbit' },

  { notation: '7. E32', from: 31, to: 32, note: 'Positive E climbs the file.', camera: 'orbit' },
  { notation: '45', from: 46, to: 45, note: 'Negative Dot steps into the centre.', camera: 'orbit' },

  { notation: '8. E33', from: 32, to: 33, note: 'E lines up behind its own Dot screen.', camera: 'orbit' },
  { notation: 'E66', from: 68, to: 66, note: 'Negative E takes the open file.', camera: 'orbit' },

  { notation: '9. E36', from: 33, to: 36, note: 'Cannon shot — E jumps one screen and captures.', camera: 'e-zoom', capture: true },
  { notation: 'E64', from: 66, to: 64, note: 'Negative E presses forward.', camera: 'orbit' },

  { notation: '10. 64', from: 63, to: 64, note: 'Dot captures the cannon.', camera: 'orbit', capture: true },
  { notation: 'L85', from: 67, to: 85, note: 'Negative L hops to the rim.', camera: 'orbit' },

  { notation: '11. 65', from: 64, to: 65, note: 'The Dot keeps racing for promotion.', camera: 'orbit', capture: true },
  { notation: 'O57', from: 58, to: 57, note: 'O steps — never faces the other O.', camera: 'orbit' },

  { notation: '12. 66', from: 65, to: 66, note: 'Promotion is two steps away.', camera: 'orbit' },
  { notation: 'I17', from: 18, to: 17, note: 'Negative I slides along the edge.', camera: 'orbit' },

  { notation: '13. 67', from: 66, to: 67, note: 'One step from the far rank.', camera: 'orbit' },
  { notation: 'I27', from: 17, to: 27, note: 'Negative I repositions.', camera: 'orbit' },

  { notation: '14. 68=Q', from: 67, to: 68, note: 'Dot reaches the end and becomes Q.', camera: 'promote', promote: true },
  { notation: '53', from: 45, to: 53, note: 'Negative Dot captures in the centre.', camera: 'orbit', capture: true },

  { notation: '15. Q48', from: 68, to: 48, note: 'Q slides any distance — and takes the E.', camera: 'q-zoom', capture: true },
  { notation: '42', from: 53, to: 42, note: 'Negative Dot takes the L.', camera: 'orbit', capture: true },

  { notation: '16. Q28', from: 48, to: 28, note: 'Q sweeps the back rank.', camera: 'q-zoom', capture: true },
  { notation: 'O56', from: 57, to: 56, note: 'O steps toward the centre.', camera: 'orbit' },

  { notation: '17. Q24+', from: 28, to: 24, note: 'Q checks along the file.', camera: 'q-zoom' },
  { notation: 'L76', from: 85, to: 76, note: 'Negative L tries to interfere.', camera: 'orbit' },

  { notation: '18. Q26++', from: 24, to: 26, note: 'Q delivers mate — review complete.', camera: 'mate', capture: true },
];
