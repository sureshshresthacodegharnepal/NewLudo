import React, { useEffect, useRef, useState } from 'react';
import { DiceRollState, PlayerColor } from '../models/gameModels';
import { soundManager } from '../audio/soundManager';

const PIP_POSITIONS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [
    [28, 28],
    [72, 72],
  ],
  3: [
    [26, 26],
    [50, 50],
    [74, 74],
  ],
  4: [
    [28, 28],
    [72, 28],
    [28, 72],
    [72, 72],
  ],
  5: [
    [26, 26],
    [74, 26],
    [50, 50],
    [26, 74],
    [74, 74],
  ],
  6: [
    [28, 23],
    [72, 23],
    [28, 50],
    [72, 50],
    [28, 77],
    [72, 77],
  ],
};

/**
 * Exact target Euler rotations (rx, ry) so that in CSS right-handed 3D space:
 * transform: rotateZ(rz) rotateX(rx) rotateY(ry)
 * brings the desired face's normal straight toward +Z (facing upward to the player).
 */
function getTargetFaceEuler(value: number): { rx: number; ry: number } {
  switch (value) {
    case 1: // Front (+Z)
      return { rx: 0, ry: 0 };
    case 2: // Top (-Y) -> rx = -90deg brings -Y to +Z
      return { rx: -90, ry: 0 };
    case 3: // Right (+X) -> ry = -90deg brings +X to +Z
      return { rx: 0, ry: -90 };
    case 4: // Left (-X) -> ry = +90deg brings -X to +Z
      return { rx: 0, ry: 90 };
    case 5: // Bottom (+Y) -> rx = +90deg brings +Y to +Z
      return { rx: 90, ry: 0 };
    case 6: // Back (-Z) -> ry = 180deg brings -Z to +Z
      return { rx: 0, ry: 180 };
    default:
      return { rx: 0, ry: 0 };
  }
}

function getCornerLaunchVector(color: PlayerColor): { x: number; y: number } {
  switch (color) {
    case PlayerColor.BLUE: // Top-Left
      return { x: -115, y: -120 };
    case PlayerColor.YELLOW: // Top-Right
      return { x: 115, y: -120 };
    case PlayerColor.RED: // Bottom-Left
      return { x: -115, y: 120 };
    case PlayerColor.GREEN: // Bottom-Right
      return { x: 115, y: 120 };
  }
}

/**
 * Piecewise parabolic gravity bounce curve (0..1 normalized height above wooden board).
 * Impacts occur at t = 0.42, t = 0.70, t = 0.89, and final settle at t = 1.00.
 */
function evaluateBounceHeight(t: number): number {
  if (t <= 0) return 1;
  if (t < 0.42) {
    const u = t / 0.42;
    // Slight initial upward arc from hand toss, then quadratic gravity drop
    return Math.max(0, 1 + 0.18 * u - 1.18 * u * u);
  }
  if (t < 0.70) {
    const u = (t - 0.42) / 0.28;
    return 0.42 * 4 * u * (1 - u);
  }
  if (t < 0.89) {
    const u = (t - 0.70) / 0.19;
    return 0.16 * 4 * u * (1 - u);
  }
  if (t < 1.0) {
    const u = (t - 0.89) / 0.11;
    return 0.04 * 4 * u * (1 - u);
  }
  return 0;
}

function DieFacePips({ value }: { value: number }) {
  const pips = PIP_POSITIONS[value] || PIP_POSITIONS[1];
  const isAce = value === 1;
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      {pips.map(([cx, cy], idx) => (
        <g key={idx}>
          {/* Recessed bevel highlight */}
          <circle
            cx={cx}
            cy={cy + 1.6}
            r={isAce ? 13.5 : 9.6}
            fill="rgba(255,255,255,0.65)"
          />
          {/* Deep carved pip */}
          <circle
            cx={cx}
            cy={cy}
            r={isAce ? 13 : 9.2}
            fill={isAce ? '#B82520' : '#241409'}
          />
          <circle
            cx={cx - 2.2}
            cy={cy - 2.2}
            r={isAce ? 3.5 : 2.3}
            fill="rgba(255,255,255,0.22)"
          />
        </g>
      ))}
    </svg>
  );
}

interface CubePose {
  x: number;
  y: number;
  heightZ: number;
  rx: number;
  ry: number;
  rz: number;
}

function PhysicalCube3D({
  pose,
  sizePx,
  golden,
}: {
  pose: CubePose;
  sizePx: number;
  golden: boolean;
}) {
  const half = sizePx / 2;
  const scale = 1 + pose.heightZ * 0.46;
  const liftY = -pose.heightZ * 72;
  const shadowOffsetX = 4 + pose.heightZ * 24;
  const shadowOffsetY = 6 + pose.heightZ * 30;
  const shadowBlur = 3 + pose.heightZ * 13;
  const shadowOpacity = Math.max(0.16, 0.48 - pose.heightZ * 0.28);

  const faceClass = golden ? 'dice-face-3d dice-face-3d-gold' : 'dice-face-3d';

  return (
    <div
      className="absolute left-1/2 top-1/2 pointer-events-none"
      style={{
        width: sizePx,
        height: sizePx,
        marginLeft: -half,
        marginTop: -half,
        transform: `translate3d(${pose.x}px, ${pose.y}px, 0)`,
      }}
    >
      {/* Realistic Ground Shadow on the Wooden Surface */}
      <div
        className="absolute inset-1 rounded-xl pointer-events-none"
        style={{
          backgroundColor: `rgba(32, 16, 4, ${shadowOpacity.toFixed(3)})`,
          transform: `translate3d(${shadowOffsetX}px, ${shadowOffsetY}px, 0) rotateZ(${pose.rz}deg) scale(${
            0.94 + pose.heightZ * 0.16
          })`,
          filter: `blur(${shadowBlur.toFixed(1)}px)`,
        }}
      />

      {/* 3D Rigid Cube */}
      <div
        className="dice-cube-3d w-full h-full"
        style={{
          transform: `translate3d(0px, ${liftY.toFixed(1)}px, 0px) scale(${scale.toFixed(
            3
          )}) rotateZ(${pose.rz.toFixed(1)}deg) rotateX(${pose.rx.toFixed(
            1
          )}deg) rotateY(${pose.ry.toFixed(1)}deg)`,
        }}
      >
        {/* Face 1: Front (+Z) */}
        <div
          className={faceClass}
          style={{ transform: `translateZ(${half}px)` }}
        >
          <DieFacePips value={1} />
        </div>
        {/* Face 6: Back (-Z) */}
        <div
          className={faceClass}
          style={{ transform: `rotateY(180deg) translateZ(${half}px)` }}
        >
          <DieFacePips value={6} />
        </div>
        {/* Face 3: Right (+X) */}
        <div
          className={faceClass}
          style={{ transform: `rotateY(90deg) translateZ(${half}px)` }}
        >
          <DieFacePips value={3} />
        </div>
        {/* Face 4: Left (-X) */}
        <div
          className={faceClass}
          style={{ transform: `rotateY(-90deg) translateZ(${half}px)` }}
        >
          <DieFacePips value={4} />
        </div>
        {/* Face 2: Top (-Y) */}
        <div
          className={faceClass}
          style={{ transform: `rotateX(90deg) translateZ(${half}px)` }}
        >
          <DieFacePips value={2} />
        </div>
        {/* Face 5: Bottom (+Y) */}
        <div
          className={faceClass}
          style={{ transform: `rotateX(-90deg) translateZ(${half}px)` }}
        >
          <DieFacePips value={5} />
        </div>
      </div>
    </div>
  );
}

export interface BoardPhysicalDiceOverlayProps {
  /** Engine-generated roll currently being thrown or settled on the board */
  activeRoll: DiceRollState | null;
  isRolling: boolean;
  doubleDicePrimed: boolean;
  canRoll: boolean;
  activeColor: PlayerColor;
  onTriggerRoll: () => void;
  onRollAnimationComplete: () => void;
}

export const BoardPhysicalDiceOverlay: React.FC<
  BoardPhysicalDiceOverlayProps
> = ({
  activeRoll,
  isRolling,
  doubleDicePrimed,
  canRoll,
  activeColor,
  onTriggerRoll,
  onRollAnimationComplete,
}) => {
  const showTwoCubes =
    doubleDicePrimed || (activeRoll?.isDoubleDice ?? false);

  const val1 = activeRoll?.values[0] ?? 1;
  const val2 = activeRoll?.values[1] ?? 6;

  const buildSettledPoses = (
    v1: number,
    v2: number,
    two: boolean,
    yaw1 = -8,
    yaw2 = 12
  ): CubePose[] => {
    const e1 = getTargetFaceEuler(v1);
    if (!two) {
      return [
        {
          x: 0,
          y: 0,
          heightZ: 0,
          rx: e1.rx,
          ry: e1.ry,
          rz: yaw1,
        },
      ];
    }
    const e2 = getTargetFaceEuler(v2);
    return [
      {
        x: -26,
        y: -4,
        heightZ: 0,
        rx: e1.rx,
        ry: e1.ry,
        rz: yaw1,
      },
      {
        x: 26,
        y: 5,
        heightZ: 0,
        rx: e2.rx,
        ry: e2.ry,
        rz: yaw2,
      },
    ];
  };

  const [poses, setPoses] = useState<CubePose[]>(() =>
    buildSettledPoses(val1, val2, showTwoCubes)
  );

  const completeCallbackRef = useRef(onRollAnimationComplete);
  completeCallbackRef.current = onRollAnimationComplete;

  // Keep resting pose synced when not rolling
  useEffect(() => {
    if (!isRolling) {
      setPoses(buildSettledPoses(val1, val2, showTwoCubes));
    }
  }, [isRolling, val1, val2, showTwoCubes]);

  // Run 60fps physical rigid-body throw, multi-axis rotation, bounce & synchronized wood impacts
  useEffect(() => {
    if (!isRolling || !activeRoll) return;

    const launch = getCornerLaunchVector(activeColor);
    const two = activeRoll.isDoubleDice;
    const target1 = getTargetFaceEuler(activeRoll.values[0]);
    const target2 = getTargetFaceEuler(activeRoll.values[1] ?? 6);

    const endYaw1 = (activeRoll.rollId % 2 === 0 ? 1 : -1) * (6 + (activeRoll.rollId % 9));
    const endYaw2 = -endYaw1 + 7;

    // Multi-axis full 360° revolutions added so final settled face matches target1/target2 100%
    const spinDirX = launch.y > 0 ? 1 : -1;
    const spinDirY = launch.x > 0 ? -1 : 1;

    const startRx1 = target1.rx + spinDirX * 1080;
    const startRy1 = target1.ry + spinDirY * 720;
    const startRz1 = endYaw1 + 540;

    const startRx2 = target2.rx - spinDirX * 720;
    const startRy2 = target2.ry + spinDirY * 1080;
    const startRz2 = endYaw2 - 540;

    const durationMs = 980;
    const startTime = performance.now();

    let firedBounce1 = false;
    let firedBounce2 = false;
    let firedBounce3 = false;
    let rafId = 0;

    soundManager.playDiceThrowRelease();

    const step = (now: number) => {
      const rawT = Math.min(1, (now - startTime) / durationMs);

      // Synchronized wooden impact sounds at exact bounce contact timestamps
      if (!firedBounce1 && rawT >= 0.42) {
        firedBounce1 = true;
        soundManager.playDiceWoodImpact(1.0);
      }
      if (!firedBounce2 && rawT >= 0.70) {
        firedBounce2 = true;
        soundManager.playDiceWoodImpact(0.54);
      }
      if (!firedBounce3 && rawT >= 0.89) {
        firedBounce3 = true;
        soundManager.playDiceWoodImpact(0.25);
      }

      // Smooth forward deceleration across the wooden board
      const posEase = 1 - Math.pow(1 - rawT, 3.4);
      // Rotational angular friction settling into exact top face
      const rotEase = 1 - Math.pow(1 - rawT, 3.1);
      const heightZ = evaluateBounceHeight(rawT);

      const endX1 = two ? -26 : 0;
      const endY1 = two ? -4 : 0;
      const curX1 = launch.x * (1 - posEase) + endX1 * posEase;
      const curY1 = launch.y * (1 - posEase) + endY1 * posEase;

      const cube1: CubePose = {
        x: curX1,
        y: curY1,
        heightZ,
        rx: startRx1 + (target1.rx - startRx1) * rotEase,
        ry: startRy1 + (target1.ry - startRy1) * rotEase,
        rz: startRz1 + (endYaw1 - startRz1) * rotEase,
      };

      if (!two) {
        setPoses([cube1]);
      } else {
        const heightZ2 = evaluateBounceHeight(Math.min(1, rawT * 1.03));
        const endX2 = 26;
        const endY2 = 5;
        const curX2 = (launch.x + 28) * (1 - posEase) + endX2 * posEase;
        const curY2 = (launch.y - 22) * (1 - posEase) + endY2 * posEase;

        const cube2: CubePose = {
          x: curX2,
          y: curY2,
          heightZ: heightZ2,
          rx: startRx2 + (target2.rx - startRx2) * rotEase,
          ry: startRy2 + (target2.ry - startRy2) * rotEase,
          rz: startRz2 + (endYaw2 - startRz2) * rotEase,
        };
        setPoses([cube1, cube2]);
      }

      if (rawT < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        completeCallbackRef.current();
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [isRolling, activeRoll, activeColor]);

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
      {/* Central Board Dice Interactive Tap Target (active only when player can roll) */}
      <button
        type="button"
        disabled={!canRoll || isRolling}
        onClick={() => {
          if (canRoll && !isRolling) {
            onTriggerRoll();
          }
        }}
        aria-label={canRoll ? 'Roll 3D Dice on Board' : 'Board Center Dice'}
        className={`relative w-[22%] h-[22%] rounded-full flex items-center justify-center transition-transform ${
          canRoll && !isRolling
            ? 'pointer-events-auto cursor-pointer hover:scale-105 active:scale-95'
            : 'pointer-events-none'
        }`}
      >
        {canRoll && !isRolling && (
          <span className="absolute inset-1 rounded-full border-2 border-amber-300/90 bg-amber-400/15 animate-ping pointer-events-none" />
        )}
      </button>

      {/* 3D Perspective Layer Covering Board Throw Trajectory */}
      <div className="dice-scene-3d absolute inset-0 pointer-events-none">
        {poses.map((pose, idx) => (
          <PhysicalCube3D
            key={idx}
            pose={pose}
            sizePx={showTwoCubes ? 42 : 48}
            golden={doubleDicePrimed || (activeRoll?.isDoubleDice ?? false)}
          />
        ))}
      </div>
    </div>
  );
};

interface GoldenDiceButtonProps {
  lastRoll: DiceRollState | null;
  isRolling: boolean;
  doubleDicePrimed: boolean;
  canRoll: boolean;
  onRoll: () => void;
}

/**
 * Neo Classic Golden Circular 3D Dice Button for the bottom control bar.
 */
export const DiceWidget: React.FC<GoldenDiceButtonProps> = ({
  lastRoll,
  isRolling,
  doubleDicePrimed,
  canRoll,
  onRoll,
}) => {
  const displayVal = lastRoll?.values[0] ?? 1;

  return (
    <button
      type="button"
      disabled={!canRoll || isRolling}
      onClick={() => {
        if (canRoll && !isRolling) {
          onRoll();
        }
      }}
      aria-label="Roll Dice"
      className={`gold-circle-btn relative w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full flex flex-col items-center justify-center cursor-pointer shrink-0 ${
        canRoll && !isRolling ? 'ring-4 ring-amber-200/70' : ''
      }`}
    >
      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#FFFDF7] border border-[#8C6223] shadow-inner p-0.5">
        <DieFacePips value={displayVal} />
      </div>
      <span className="text-[9px] font-extrabold tracking-tight text-[#3A2004] mt-0.5 leading-none whitespace-nowrap">
        {isRolling
          ? 'ROLLING'
          : canRoll
            ? doubleDicePrimed
              ? '2x ROLL'
              : 'ROLL'
            : lastRoll
              ? `= ${lastRoll.total}`
              : 'WAIT'}
      </span>
    </button>
  );
};
