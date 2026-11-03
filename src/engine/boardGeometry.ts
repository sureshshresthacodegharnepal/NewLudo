import { PlayerColor, Token } from '../models/gameModels';

export interface GridCoord {
  row: number;
  col: number;
}

/**
 * 52-cell clockwise main Ludo track on a 15x15 grid (rows 0..14, cols 0..14).
 * Neo Classic Corner Layout:
 * - BLUE (Top-Left): starts at index 0 -> (6, 1)
 * - YELLOW (Top-Right): starts at index 13 -> (1, 8)
 * - GREEN (Bottom-Right): starts at index 26 -> (8, 13)
 * - RED (Bottom-Left): starts at index 39 -> (13, 6)
 */
export const MAIN_TRACK_COORDS: GridCoord[] = [
  // 0..4: Top-Left (Blue) arm top row moving right
  { row: 6, col: 1 }, // 0 - BLUE START (Safe)
  { row: 6, col: 2 }, // 1
  { row: 6, col: 3 }, // 2
  { row: 6, col: 4 }, // 3
  { row: 6, col: 5 }, // 4
  // 5..10: Top-Right (Yellow) arm left col moving up
  { row: 5, col: 6 }, // 5
  { row: 4, col: 6 }, // 6
  { row: 3, col: 6 }, // 7
  { row: 2, col: 6 }, // 8 - STAR SAFE
  { row: 1, col: 6 }, // 9
  { row: 0, col: 6 }, // 10
  // 11..12: Top edge moving right
  { row: 0, col: 7 }, // 11 - Yellow home turn
  { row: 0, col: 8 }, // 12
  // 13..17: Top-Right (Yellow) arm right col moving down
  { row: 1, col: 8 }, // 13 - YELLOW START (Safe)
  { row: 2, col: 8 }, // 14
  { row: 3, col: 8 }, // 15
  { row: 4, col: 8 }, // 16
  { row: 5, col: 8 }, // 17
  // 18..23: Bottom-Right (Green) arm top row moving right
  { row: 6, col: 9 }, // 18
  { row: 6, col: 10 }, // 19
  { row: 6, col: 11 }, // 20
  { row: 6, col: 12 }, // 21 - STAR SAFE
  { row: 6, col: 13 }, // 22
  { row: 6, col: 14 }, // 23
  // 24..25: Right edge moving down
  { row: 7, col: 14 }, // 24 - Green home turn
  { row: 8, col: 14 }, // 25
  // 26..30: Bottom-Right (Green) arm bottom row moving left
  { row: 8, col: 13 }, // 26 - GREEN START (Safe)
  { row: 8, col: 12 }, // 27
  { row: 8, col: 11 }, // 28
  { row: 8, col: 10 }, // 29
  { row: 8, col: 9 }, // 30
  // 31..36: Bottom-Left (Red) arm right col moving down
  { row: 9, col: 8 }, // 31
  { row: 10, col: 8 }, // 32
  { row: 11, col: 8 }, // 33
  { row: 12, col: 8 }, // 34 - STAR SAFE
  { row: 13, col: 8 }, // 35
  { row: 14, col: 8 }, // 36
  // 37..38: Bottom edge moving left
  { row: 14, col: 7 }, // 37 - Red home turn
  { row: 14, col: 6 }, // 38
  // 39..43: Bottom-Left (Red) arm left col moving up
  { row: 13, col: 6 }, // 39 - RED START (Safe)
  { row: 12, col: 6 }, // 40
  { row: 11, col: 6 }, // 41
  { row: 10, col: 6 }, // 42
  { row: 9, col: 6 }, // 43
  // 44..49: Top-Left (Blue) arm bottom row moving left
  { row: 8, col: 5 }, // 44
  { row: 8, col: 4 }, // 45
  { row: 8, col: 3 }, // 46
  { row: 8, col: 2 }, // 47 - STAR SAFE
  { row: 8, col: 1 }, // 48
  { row: 8, col: 0 }, // 49
  // 50..51: Left edge moving up
  { row: 7, col: 0 }, // 50 - Blue home turn
  { row: 6, col: 0 }, // 51
];

export const COLOR_START_TRACK_INDEX: Record<PlayerColor, number> = {
  [PlayerColor.BLUE]: 0,
  [PlayerColor.YELLOW]: 13,
  [PlayerColor.GREEN]: 26,
  [PlayerColor.RED]: 39,
};

export const START_SAFE_INDICES: Record<number, PlayerColor> = {
  0: PlayerColor.BLUE,
  13: PlayerColor.YELLOW,
  26: PlayerColor.GREEN,
  39: PlayerColor.RED,
};

export const STAR_SAFE_INDICES = new Set<number>([8, 21, 34, 47]);

export const ALL_SAFE_TRACK_INDICES = new Set<number>([
  0, 8, 13, 21, 26, 34, 39, 47,
]);

export const HOME_STRETCH_COORDS: Record<PlayerColor, GridCoord[]> = {
  [PlayerColor.BLUE]: [
    { row: 7, col: 1 },
    { row: 7, col: 2 },
    { row: 7, col: 3 },
    { row: 7, col: 4 },
    { row: 7, col: 5 },
  ],
  [PlayerColor.YELLOW]: [
    { row: 1, col: 7 },
    { row: 2, col: 7 },
    { row: 3, col: 7 },
    { row: 4, col: 7 },
    { row: 5, col: 7 },
  ],
  [PlayerColor.GREEN]: [
    { row: 7, col: 13 },
    { row: 7, col: 12 },
    { row: 7, col: 11 },
    { row: 7, col: 10 },
    { row: 7, col: 9 },
  ],
  [PlayerColor.RED]: [
    { row: 13, col: 7 },
    { row: 12, col: 7 },
    { row: 11, col: 7 },
    { row: 10, col: 7 },
    { row: 9, col: 7 },
  ],
};

export const FINAL_HOME_SLOTS: Record<PlayerColor, GridCoord[]> = {
  [PlayerColor.BLUE]: [
    { row: 6.65, col: 6.22 },
    { row: 7.35, col: 6.22 },
    { row: 7.0, col: 6.52 },
    { row: 7.0, col: 6.08 },
  ],
  [PlayerColor.YELLOW]: [
    { row: 6.22, col: 6.65 },
    { row: 6.22, col: 7.35 },
    { row: 6.52, col: 7.0 },
    { row: 6.08, col: 7.0 },
  ],
  [PlayerColor.GREEN]: [
    { row: 6.65, col: 7.78 },
    { row: 7.35, col: 7.78 },
    { row: 7.0, col: 7.48 },
    { row: 7.0, col: 7.92 },
  ],
  [PlayerColor.RED]: [
    { row: 7.78, col: 6.65 },
    { row: 7.78, col: 7.35 },
    { row: 7.48, col: 7.0 },
    { row: 7.92, col: 7.0 },
  ],
};

export const YARD_TOKEN_SLOTS: Record<PlayerColor, GridCoord[]> = {
  // Top-Left: BLUE
  [PlayerColor.BLUE]: [
    { row: 1.65, col: 1.75 },
    { row: 1.65, col: 3.25 },
    { row: 3.05, col: 1.75 },
    { row: 3.05, col: 3.25 },
  ],
  // Top-Right: YELLOW
  [PlayerColor.YELLOW]: [
    { row: 1.65, col: 10.75 },
    { row: 1.65, col: 12.25 },
    { row: 3.05, col: 10.75 },
    { row: 3.05, col: 12.25 },
  ],
  // Bottom-Left: RED
  [PlayerColor.RED]: [
    { row: 10.65, col: 1.75 },
    { row: 10.65, col: 1.75 + 1.5 },
    { row: 12.05, col: 1.75 },
    { row: 12.05, col: 1.75 + 1.5 },
  ],
  // Bottom-Right: GREEN
  [PlayerColor.GREEN]: [
    { row: 10.65, col: 10.75 },
    { row: 10.65, col: 12.25 },
    { row: 12.05, col: 10.75 },
    { row: 12.05, col: 12.25 },
  ],
};

export const COLOR_PALETTE: Record<
  PlayerColor,
  {
    name: string;
    primary: string;
    dark: string;
    highlight: string;
    light: string;
    glow: string;
    textAccent: string;
  }
> = {
  [PlayerColor.BLUE]: {
    name: 'Blue',
    primary: '#1E5AA8',
    dark: '#103466',
    highlight: '#5591DF',
    light: '#DCE9F9',
    glow: 'rgba(30, 90, 168, 0.42)',
    textAccent: '#1E5AA8',
  },
  [PlayerColor.YELLOW]: {
    name: 'Yellow',
    primary: '#E2A316',
    dark: '#966604',
    highlight: '#FAD264',
    light: '#FCF1CF',
    glow: 'rgba(226, 163, 22, 0.45)',
    textAccent: '#B57D08',
  },
  [PlayerColor.RED]: {
    name: 'Red',
    primary: '#C82E29',
    dark: '#7D1613',
    highlight: '#EB6A65',
    light: '#FADEDD',
    glow: 'rgba(200, 46, 41, 0.42)',
    textAccent: '#C82E29',
  },
  [PlayerColor.GREEN]: {
    name: 'Green',
    primary: '#267D39',
    dark: '#144A20',
    highlight: '#59B56D',
    light: '#DDF2E2',
    glow: 'rgba(38, 125, 57, 0.42)',
    textAccent: '#267D39',
  },
};

export function getGlobalTrackIndex(
  color: PlayerColor,
  progress: number
): number | null {
  if (progress < 0 || progress > 50) return null;
  return (COLOR_START_TRACK_INDEX[color] + progress) % 52;
}

export function isSafeTrackProgress(
  color: PlayerColor,
  progress: number
): boolean {
  if (progress < 0 || progress > 50) return true;
  const globalIdx = getGlobalTrackIndex(color, progress);
  return globalIdx !== null && ALL_SAFE_TRACK_INDICES.has(globalIdx);
}

export function getProgressGridCoord(
  color: PlayerColor,
  progress: number,
  tokenIndex: number
): GridCoord {
  if (progress === -1) {
    return YARD_TOKEN_SLOTS[color][tokenIndex % 4];
  }
  if (progress >= 0 && progress <= 50) {
    const idx = (COLOR_START_TRACK_INDEX[color] + progress) % 52;
    return MAIN_TRACK_COORDS[idx];
  }
  if (progress >= 51 && progress <= 55) {
    return HOME_STRETCH_COORDS[color][progress - 51];
  }
  return FINAL_HOME_SLOTS[color][tokenIndex % 4];
}

export function getTokenGridCoord(token: Token): GridCoord {
  return getProgressGridCoord(token.ownerColor, token.progress, token.tokenIndex);
}

export function getStepPathCoords(
  color: PlayerColor,
  fromProgress: number,
  toProgress: number,
  tokenIndex: number
): GridCoord[] {
  const coords: GridCoord[] = [];
  if (fromProgress === -1 && toProgress >= 0) {
    coords.push(getProgressGridCoord(color, 0, tokenIndex));
    for (let p = 1; p <= toProgress; p++) {
      coords.push(getProgressGridCoord(color, p, tokenIndex));
    }
    return coords;
  }
  for (let p = fromProgress + 1; p <= toProgress; p++) {
    coords.push(getProgressGridCoord(color, p, tokenIndex));
  }
  return coords;
}
