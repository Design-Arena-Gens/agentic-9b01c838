"use client";

import clsx from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type TetrominoType = "I" | "J" | "L" | "O" | "S" | "T" | "Z";

type GameStatus = "ready" | "playing" | "paused" | "gameover";

interface Position {
  x: number;
  y: number;
}

interface ActivePiece {
  type: TetrominoType;
  rotation: number;
  position: Position;
}

interface Cell {
  type: TetrominoType;
  ghost?: boolean;
  fading?: boolean;
}

interface GameStats {
  score: number;
  level: number;
  lines: number;
  combo: number;
  maxCombo: number;
  cleared: number[];
  tetrisCount: number;
  hardDrops: number;
  pieces: number;
  playTime: number;
}

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const LOCK_DELAY = 400;
const LINES_PER_LEVEL = 10;
const COMBO_BONUS = 50;
const DROP_SCORE = 2;

const lineScores = [0, 100, 300, 500, 800];

const COLOR_MAP: Record<TetrominoType, string> = {
  I: "from-cyan-400 to-cyan-600",
  J: "from-blue-400 to-blue-600",
  L: "from-amber-400 to-amber-600",
  O: "from-yellow-300 to-yellow-500",
  S: "from-emerald-400 to-emerald-600",
  T: "from-purple-400 to-purple-600",
  Z: "from-rose-400 to-rose-600",
};

const SOFT_DROP_SPEED = 40;

const TETROMINOES: Record<TetrominoType, number[][][]> = {
  I: [
    [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    [
      [0, 0, 1, 0],
      [0, 0, 1, 0],
      [0, 0, 1, 0],
      [0, 0, 1, 0],
    ],
    [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
    ],
    [
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 0, 0],
    ],
  ],
  J: [
    [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    [
      [0, 1, 1],
      [0, 1, 0],
      [0, 1, 0],
    ],
    [
      [0, 0, 0],
      [1, 1, 1],
      [0, 0, 1],
    ],
    [
      [0, 1, 0],
      [0, 1, 0],
      [1, 1, 0],
    ],
  ],
  L: [
    [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
    ],
    [
      [0, 1, 0],
      [0, 1, 0],
      [0, 1, 1],
    ],
    [
      [0, 0, 0],
      [1, 1, 1],
      [1, 0, 0],
    ],
    [
      [1, 1, 0],
      [0, 1, 0],
      [0, 1, 0],
    ],
  ],
  O: [
    [
      [0, 1, 1, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  ],
  S: [
    [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],
    [
      [0, 1, 0],
      [0, 1, 1],
      [0, 0, 1],
    ],
    [
      [0, 0, 0],
      [0, 1, 1],
      [1, 1, 0],
    ],
    [
      [1, 0, 0],
      [1, 1, 0],
      [0, 1, 0],
    ],
  ],
  T: [
    [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    [
      [0, 1, 0],
      [0, 1, 1],
      [0, 1, 0],
    ],
    [
      [0, 0, 0],
      [1, 1, 1],
      [0, 1, 0],
    ],
    [
      [0, 1, 0],
      [1, 1, 0],
      [0, 1, 0],
    ],
  ],
  Z: [
    [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ],
    [
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, 0],
    ],
    [
      [0, 0, 0],
      [1, 1, 0],
      [0, 1, 1],
    ],
    [
      [0, 1, 0],
      [1, 1, 0],
      [1, 0, 0],
    ],
  ],
};

const ALL_TETROMINOES: TetrominoType[] = ["I", "J", "L", "O", "S", "T", "Z"];

const createEmptyBoard = () =>
  Array.from({ length: BOARD_HEIGHT }, () =>
    Array<Cell | null>(BOARD_WIDTH).fill(null),
  );

const createInitialStats = (): GameStats => ({
  score: 0,
  level: 0,
  lines: 0,
  combo: 0,
  maxCombo: 0,
  cleared: [0, 0, 0, 0],
  tetrisCount: 0,
  hardDrops: 0,
  pieces: 0,
  playTime: 0,
});

const getRotations = (type: TetrominoType) => TETROMINOES[type];

const generateBag = () => {
  const bag = [...ALL_TETROMINOES];
  for (let i = bag.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
};

const calculateDropInterval = (level: number) =>
  Math.max(90, 900 - level * 70);

export function TetrisGame() {
  const [board, setBoard] = useState<(Cell | null)[][]>(() => createEmptyBoard());
  const [active, setActive] = useState<ActivePiece | null>(null);
  const [queue, setQueue] = useState<TetrominoType[]>(() => [
    ...generateBag(),
    ...generateBag(),
  ]);
  const [hold, setHold] = useState<TetrominoType | null>(null);
  const [hasHeld, setHasHeld] = useState(false);
  const [status, setStatus] = useState<GameStatus>("ready");
  const [stats, setStats] = useState<GameStats>(() => createInitialStats());
  const [highScore, setHighScore] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("hyper-tetris-highscore");
      if (stored) {
        return Number(stored);
      }
    }
    return 0;
  });
  const [messages, setMessages] = useState<string[]>([]);
  const lockTimeout = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTickRef = useRef<number>(0);
  const softDroppingRef = useRef(false);
  const activeRef = useRef<ActivePiece | null>(null);
  const statusRef = useRef<GameStatus>("ready");
  const statsRef = useRef<GameStats>(createInitialStats());
  const gameOverRef = useRef(false);
  const [settings] = useState({
    ghostPiece: true,
    musicMode: "off",
    queueSize: 5,
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    localStorage.setItem("hyper-tetris-highscore", String(highScore));
  }, [highScore]);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  const spawnPiece = useCallback(
    (forcedType?: TetrominoType) => {
      setQueue((prevQueue) => {
        const nextQueue = [...prevQueue];
        let type = forcedType;

        if (!type) {
          type = nextQueue.shift() ?? generateBag()[0];
        }

        if (nextQueue.length < 7) {
          nextQueue.push(...generateBag());
        }

        const rotations = getRotations(type);
        const matrix = rotations[0];
        const width = matrix[0].length;
        const spawnX = Math.floor((BOARD_WIDTH - width) / 2);
        const spawnY = type === "I" ? -1 : 0;

        setActive({
          type,
          rotation: 0,
          position: {
            x: spawnX,
            y: spawnY,
          },
        });
        setHasHeld(false);
        setStats((prev) => ({
          ...prev,
          pieces: prev.pieces + 1,
        }));
        return nextQueue;
      });
    },
    [setActive],
  );

  const resetGame = useCallback(() => {
    if (lockTimeout.current) {
      clearTimeout(lockTimeout.current);
      lockTimeout.current = null;
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setBoard(createEmptyBoard());
    const bag = [...generateBag(), ...generateBag()];
    const firstType = bag.shift() ?? "I";
    const rotations = getRotations(firstType);
    const matrix = rotations[0];
    const width = matrix[0].length;
    const spawnX = Math.floor((BOARD_WIDTH - width) / 2);
    const spawnY = firstType === "I" ? -1 : 0;

    setStats({ ...createInitialStats(), pieces: 1 });
    setQueue(bag);
    setHold(null);
    setHasHeld(false);
    setMessages([]);
    gameOverRef.current = false;
    lastTickRef.current = Date.now();
    setActive({
      type: firstType,
      rotation: 0,
      position: { x: spawnX, y: spawnY },
    });
  }, []);

  const addMessage = useCallback((text: string) => {
    setMessages((prev) => {
      const next = [text, ...prev];
      return next.slice(0, 4);
    });
  }, []);

  const canPlace = useCallback(
    (piece: ActivePiece, offset: Position = { x: 0, y: 0 }, rotationShift = 0) => {
      const rotations = getRotations(piece.type);
      const matrix =
        rotations[(piece.rotation + rotationShift + rotations.length) % rotations.length];

      for (let y = 0; y < matrix.length; y += 1) {
        for (let x = 0; x < matrix[y].length; x += 1) {
          if (!matrix[y][x]) continue;
          const boardX = piece.position.x + x + offset.x;
          const boardY = piece.position.y + y + offset.y;

          if (boardX < 0 || boardX >= BOARD_WIDTH) {
            return false;
          }

          if (boardY >= BOARD_HEIGHT) {
            return false;
          }

          if (boardY >= 0 && board[boardY][boardX]) {
            return false;
          }
        }
      }

      return true;
    },
    [board],
  );


  const clearLines = useCallback((boardState: (Cell | null)[][]) => {
    const next = boardState.filter(
      (row) => row.some((cell) => !cell),
    );
    const clearedLines = BOARD_HEIGHT - next.length;

    if (clearedLines === 0) {
      return { next: boardState, clearedLines: 0 };
    }

    const newRows = Array.from({ length: clearedLines }, () =>
      Array<Cell | null>(BOARD_WIDTH).fill(null),
    );

    return { next: [...newRows, ...next], clearedLines };
  }, []);

  const updateForClear = useCallback(
    (clearedLines: number) => {
      if (!clearedLines) {
        setStats((prev) => ({
          ...prev,
          combo: 0,
        }));
        return;
      }

      const points = lineScores[clearedLines] ?? clearedLines * 200;
      setStats((prev) => {
        const newCombo = prev.combo + 1;
        const comboBonus = newCombo > 1 ? (newCombo - 1) * COMBO_BONUS : 0;
        const newLines = prev.lines + clearedLines;
        const newLevel = Math.floor(newLines / LINES_PER_LEVEL);
        const tetrisCount =
          clearedLines === 4 ? prev.tetrisCount + 1 : prev.tetrisCount;

        return {
          ...prev,
          score:
            prev.score +
            points * (prev.level + 1) +
            comboBonus * (prev.level + 1),
          level: newLevel,
          lines: newLines,
          combo: newCombo,
          maxCombo: Math.max(prev.maxCombo, newCombo),
          cleared: prev.cleared.map((val, idx) =>
            idx === clearedLines - 1 ? val + 1 : val,
          ) as GameStats["cleared"],
          tetrisCount,
        };
      });

      if (clearedLines === 4) {
        addMessage("Tetris! +Ultra Bonus");
      } else if (clearedLines === 3) {
        addMessage("Triple Sonic!");
      } else if (clearedLines === 2) {
        addMessage("Double Dash!");
      } else {
        addMessage("Line Break!");
      }
    },
    [addMessage],
  );

  const finalizeLock = useCallback(
    (piece: ActivePiece) => {
      let linesCleared = 0;
      let triggeredGameOver = false;

      setBoard((prev) => {
        const next = prev.map((row) => [...row]);
        const matrix = getRotations(piece.type)[piece.rotation];

        for (let y = 0; y < matrix.length; y += 1) {
          for (let x = 0; x < matrix[y].length; x += 1) {
            if (!matrix[y][x]) continue;
            const boardX = piece.position.x + x;
            const boardY = piece.position.y + y;

            if (boardY < 0) {
              triggeredGameOver = true;
              return prev;
            }

            next[boardY][boardX] = { type: piece.type };
          }
        }

        const result = clearLines(next);
        linesCleared = result.clearedLines;
        return result.next;
      });

      setActive(null);

      if (triggeredGameOver) {
        gameOverRef.current = true;
        setStatus("gameover");
        addMessage("Game Over - Press Space to restart");
        setHighScore((prev) =>
          statsRef.current.score > prev ? statsRef.current.score : prev,
        );
        setStats((prev) => ({
          ...prev,
          combo: 0,
        }));
        return;
      }

      if (linesCleared > 0) {
        updateForClear(linesCleared);
      } else {
        setStats((prev) => ({
          ...prev,
          combo: 0,
        }));
      }

      lockTimeout.current = null;
      spawnPiece();
    },
    [addMessage, clearLines, setHighScore, spawnPiece, updateForClear],
  );

  const dropPiece = useCallback(
    (soft = false, forceLock = false) => {
      if (!active || status !== "playing") {
        return;
      }

      const offset = { x: 0, y: 1 };
      if (!forceLock && canPlace(active, offset, 0)) {
        setActive((prev) =>
          prev
            ? {
                ...prev,
                position: {
                  x: prev.position.x + offset.x,
                  y: prev.position.y + offset.y,
                },
              }
            : prev,
        );
        if (soft) {
          setStats((prev) => ({
            ...prev,
            score: prev.score + DROP_SCORE,
          }));
        }
        return;
      }

      if (lockTimeout.current) {
        clearTimeout(lockTimeout.current);
      }

      if (forceLock) {
        finalizeLock(active);
        return;
      }

      lockTimeout.current = setTimeout(() => {
        const current = activeRef.current;
        if (!current) return;
        if (statusRef.current !== "playing") return;
        if (canPlace(current, { x: 0, y: 1 }, 0)) return;
        finalizeLock(current);
      }, LOCK_DELAY);
    },
    [active, canPlace, finalizeLock, status],
  );

  const hardDrop = useCallback(() => {
    if (!active || status !== "playing") {
      return;
    }

    let distance = 0;
    let ghost = active;
    while (canPlace(ghost, { x: 0, y: 1 })) {
      ghost = {
        ...ghost,
        position: { x: ghost.position.x, y: ghost.position.y + 1 },
      };
      distance += 1;
    }

    setStats((prev) => ({
      ...prev,
      score: prev.score + distance * DROP_SCORE * 3,
      hardDrops: prev.hardDrops + 1,
    }));
    addMessage("Hyper Drop!");
    finalizeLock(ghost);
  }, [active, addMessage, canPlace, finalizeLock, status]);

  const movePiece = useCallback(
    (dir: -1 | 1) => {
      if (!active || status !== "playing") return;
      if (canPlace(active, { x: dir, y: 0 })) {
        setActive((prev) =>
          prev
            ? {
                ...prev,
                position: {
                  x: prev.position.x + dir,
                  y: prev.position.y,
                },
              }
            : prev,
        );
        if (lockTimeout.current) {
          clearTimeout(lockTimeout.current);
          lockTimeout.current = null;
        }
      }
    },
    [active, canPlace, status],
  );

  const rotatePiece = useCallback(
    (dir: -1 | 1) => {
      if (!active || status !== "playing") return;
      const rotations = getRotations(active.type);
      const nextRotation =
        (active.rotation + dir + rotations.length) % rotations.length;

      const kicks: Position[] = [
        { x: 0, y: 0 },
        { x: -1, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: -1 },
        { x: 0, y: 1 },
      ];

      for (const kick of kicks) {
        if (canPlace(active, kick, dir)) {
          setActive((prev) =>
            prev
              ? {
                  ...prev,
                  rotation: nextRotation,
                  position: {
                    x: prev.position.x + kick.x,
                      y: prev.position.y + kick.y,
                    },
                  }
                : prev,
          );
          if (lockTimeout.current) {
            clearTimeout(lockTimeout.current);
            lockTimeout.current = null;
          }
          return;
        }
      }
    },
    [active, canPlace, status],
  );

  const holdPiece = useCallback(() => {
    if (!active || status !== "playing" || hasHeld) return;
    if (lockTimeout.current) {
      clearTimeout(lockTimeout.current);
      lockTimeout.current = null;
    }
    setHasHeld(true);
    if (hold) {
      const nextHold = active.type;
      spawnPiece(hold);
      setHold(nextHold);
    } else {
      setHold(active.type);
      spawnPiece();
    }
    setActive(null);
    addMessage("Hold Swap");
  }, [active, addMessage, hasHeld, hold, spawnPiece, status]);

  const togglePause = useCallback(() => {
    setStatus((prev) => {
      if (prev === "playing") {
        return "paused";
      }
      if (prev === "paused") {
        lastTickRef.current = Date.now();
        return "playing";
      }
      return prev;
    });
    addMessage("Pause Toggled");
  }, [addMessage]);

  const startGame = useCallback(() => {
    setStatus("playing");
    resetGame();
  }, [resetGame]);

  const dropLoop = useCallback(() => {
    if (status !== "playing") {
      return;
    }

    const interval = softDroppingRef.current
      ? SOFT_DROP_SPEED
      : calculateDropInterval(stats.level);

    const now = Date.now();
    const elapsed = now - lastTickRef.current;
    if (elapsed >= interval) {
      lastTickRef.current = now;
      dropPiece(softDroppingRef.current);
    }
  }, [dropPiece, stats.level, status]);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (status !== "playing") {
      return () => {};
    }

    const tick = () => {
      dropLoop();
      timerRef.current = setTimeout(tick, 16);
    };

    timerRef.current = setTimeout(tick, 16);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [dropLoop, status]);

  useEffect(() => {
    if (status === "playing") {
      const interval = setInterval(() => {
        setStats((prev) => ({
          ...prev,
          playTime: prev.playTime + 1,
        }));
      }, 1000);
      return () => clearInterval(interval);
    }
    return () => {};
  }, [status]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (status === "ready" && (event.code === "Space" || event.code === "Enter")) {
        startGame();
        return;
      }

      if (status === "gameover" && event.code === "Space") {
        startGame();
        return;
      }

      if (status === "paused" && event.code === "Escape") {
        togglePause();
        return;
      }

      if (status !== "playing") return;

      switch (event.code) {
        case "ArrowLeft":
        case "KeyA":
          event.preventDefault();
          movePiece(-1);
          break;
        case "ArrowRight":
        case "KeyD":
          event.preventDefault();
          movePiece(1);
          break;
        case "ArrowDown":
        case "KeyS":
          event.preventDefault();
          softDroppingRef.current = true;
          dropPiece(true);
          break;
        case "ArrowUp":
        case "KeyW":
        case "KeyX":
          event.preventDefault();
          rotatePiece(1);
          break;
        case "KeyZ":
        case "ShiftLeft":
          event.preventDefault();
          rotatePiece(-1);
          break;
        case "Space":
          event.preventDefault();
          hardDrop();
          break;
        case "KeyC":
        case "ShiftRight":
          event.preventDefault();
          holdPiece();
          break;
        case "Escape":
          event.preventDefault();
          togglePause();
          break;
        default:
          break;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (["ArrowDown", "KeyS"].includes(event.code)) {
        softDroppingRef.current = false;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [
    dropPiece,
    hardDrop,
    holdPiece,
    movePiece,
    rotatePiece,
    startGame,
    status,
    togglePause,
  ]);

  const ghostPiece = useMemo(() => {
    if (!active || !settings.ghostPiece || status === "gameover") return null;
    let ghost = { ...active };
    while (canPlace(ghost, { x: 0, y: 1 })) {
      ghost = {
        ...ghost,
        position: { x: ghost.position.x, y: ghost.position.y + 1 },
      };
    }
    return ghost;
  }, [active, canPlace, settings.ghostPiece, status]);

  const renderedBoard = useMemo(() => {
    const composite = board.map((row) =>
      row.map((cell) => (cell ? { ...cell } : null)),
    );

    if (ghostPiece) {
      const matrix = getRotations(ghostPiece.type)[ghostPiece.rotation];
      for (let y = 0; y < matrix.length; y += 1) {
        for (let x = 0; x < matrix[y].length; x += 1) {
          if (!matrix[y][x]) continue;
          const boardX = ghostPiece.position.x + x;
          const boardY = ghostPiece.position.y + y;
          if (boardY >= 0 && boardY < BOARD_HEIGHT) {
            composite[boardY][boardX] = { type: ghostPiece.type, ghost: true };
          }
        }
      }
    }

    if (active) {
      const matrix = getRotations(active.type)[active.rotation];
      for (let y = 0; y < matrix.length; y += 1) {
        for (let x = 0; x < matrix[y].length; x += 1) {
          if (!matrix[y][x]) continue;
          const boardX = active.position.x + x;
          const boardY = active.position.y + y;
          if (boardY >= 0 && boardY < BOARD_HEIGHT) {
            composite[boardY][boardX] = { type: active.type };
          }
        }
      }
    }

    return composite;
  }, [active, board, ghostPiece]);

  const gameOverlay = (() => {
    if (status === "ready") {
      return "Press Space or Tap Start";
    }
    if (status === "paused") {
      return "Paused";
    }
    if (status === "gameover") {
      return "Game Over";
    }
    return null;
  })();

  const queuePreview = useMemo(
    () => queue.slice(0, settings.queueSize),
    [queue, settings.queueSize],
  );

  const holdPreview = useMemo(() => hold, [hold]);

  return (
    <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl shadow-2xl shadow-cyan-500/20">
      <div className="flex flex-col gap-3 text-center sm:text-left">
        <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
          Hyperion Tetris
        </h1>
        <p className="text-sm text-white/70 sm:text-base">
          Master the skyline with adaptive speed, precision holds, and cinematic
          effects. Pull off hyper drops, stack combos, and chase the global
          highscore.
        </p>
        <div className="flex flex-wrap justify-center gap-3 text-xs sm:justify-start">
          <div className="rounded-full bg-white/10 px-4 py-1 text-white/80">
            Ghost Piece
          </div>
          <div className="rounded-full bg-white/10 px-4 py-1 text-white/80">
            Hold Swap
          </div>
          <div className="rounded-full bg-white/10 px-4 py-1 text-white/80">
            Adaptive Velocity
          </div>
          <div className="rounded-full bg-white/10 px-4 py-1 text-white/80">
            Combo Engine
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4 text-white/80">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg shadow-cyan-500/10">
            <div className="flex items-center justify-between text-sm">
              <span>Score</span>
              <span className="font-semibold text-white">
                {stats.score.toLocaleString()}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl bg-black/40 px-3 py-2">
                <p className="text-white/50">Level</p>
                <p className="text-lg font-semibold text-sky-200">
                  {stats.level + 1}
                </p>
              </div>
              <div className="rounded-xl bg-black/40 px-3 py-2">
                <p className="text-white/50">Lines</p>
                <p className="text-lg font-semibold text-sky-200">
                  {stats.lines}
                </p>
              </div>
              <div className="rounded-xl bg-black/40 px-3 py-2">
                <p className="text-white/50">Combo</p>
                <p className="text-lg font-semibold text-sky-200">
                  {stats.combo}
                </p>
              </div>
              <div className="rounded-xl bg-black/40 px-3 py-2">
                <p className="text-white/50">Max Combo</p>
                <p className="text-lg font-semibold text-sky-200">
                  {stats.maxCombo}
                </p>
              </div>
              <div className="rounded-xl bg-black/40 px-3 py-2">
                <p className="text-white/50">Hard Drops</p>
                <p className="text-lg font-semibold text-sky-200">
                  {stats.hardDrops}
                </p>
              </div>
              <div className="rounded-xl bg-black/40 px-3 py-2">
                <p className="text-white/50">Pieces</p>
                <p className="text-lg font-semibold text-sky-200">
                  {stats.pieces}
                </p>
              </div>
              <div className="rounded-xl bg-black/40 px-3 py-2">
                <p className="text-white/50">Playtime</p>
                <p className="text-lg font-semibold text-sky-200">
                  {new Date(stats.playTime * 1000).toISOString().slice(14, 19)}
                </p>
              </div>
              <div className="rounded-xl bg-black/40 px-3 py-2">
                <p className="text-white/50">High Score</p>
                <p className="text-lg font-semibold text-yellow-200">
                  {Math.max(highScore, stats.score).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg shadow-purple-500/10">
            <div className="text-sm text-white/70">Recent Feats</div>
            <ul className="mt-2 space-y-1 text-xs text-white/70">
              {messages.length === 0 && (
                <li className="text-white/40">Make a move to start the hype.</li>
              )}
              {messages.map((message, idx) => (
                <li key={`${message}-${idx}`} className="truncate">
                  {message}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg shadow-emerald-500/10">
            <div className="flex items-center justify-between text-sm text-white/70">
              <span>Hold</span>
              <span>{hasHeld ? "Locked" : "Ready"}</span>
            </div>
            <div className="mt-3 aspect-square rounded-xl bg-black/40 p-2">
              {holdPreview ? (
                <MiniPiece type={holdPreview} />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-white/30">
                  Hold queue empty
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="relative mx-auto flex w-full max-w-[min(90vw,420px)] flex-col items-center gap-4">
          <div className="relative">
            <div className="grid grid-cols-10 gap-[2px] rounded-3xl border border-white/10 bg-black/50 p-3 shadow-2xl shadow-cyan-500/30">
              {renderedBoard.map((row, rowIndex) =>
                row.map((cell, cellIndex) => (
                  <div
                    key={`${rowIndex}-${cellIndex}`}
                    className={clsx(
                      "aspect-square rounded-sm border border-black/20 transition-all duration-150",
                      !cell && "bg-black/60",
                      cell &&
                        clsx(
                          "bg-gradient-to-br shadow-inner",
                          COLOR_MAP[cell.type],
                          cell.ghost
                            ? "opacity-30"
                            : "opacity-100 backdrop-blur-sm",
                        ),
                    )}
                  />
                )),
              )}
            </div>

            {gameOverlay && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-black/70 backdrop-blur-md">
                <div className="text-center text-white">
                  <p className="text-lg font-semibold uppercase tracking-widest">
                    {gameOverlay}
                  </p>
                  <p className="mt-2 text-xs text-white/60">
                    Space/Enter to start · Arrow keys / WASD to move · Z / X to
                    rotate · C to hold
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex w-full flex-wrap items-center justify-center gap-2 text-xs text-white/60">
            <button
              type="button"
              onClick={() => {
                if (status === "playing") {
                  togglePause();
                } else if (status === "paused") {
                  togglePause();
                } else {
                  startGame();
                }
              }}
              className="rounded-full bg-white/10 px-4 py-2 font-medium text-white transition hover:bg-white/20"
            >
              {status === "playing"
                ? "Pause"
                : status === "paused"
                  ? "Resume"
                  : "Start"}
            </button>
            <button
              type="button"
              onClick={startGame}
              className="rounded-full bg-white/5 px-4 py-2 font-medium text-white transition hover:bg-white/15"
            >
              Restart
            </button>
            <button
              type="button"
              onClick={hardDrop}
              className="rounded-full bg-white/5 px-4 py-2 font-medium text-white transition hover:bg-white/15"
            >
              Hyper Drop
            </button>
            <button
              type="button"
              onClick={holdPiece}
              className="rounded-full bg-white/5 px-4 py-2 font-medium text-white transition hover:bg-white/15"
            >
              Hold Piece
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4 text-white/80">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg shadow-cyan-500/10">
            <div className="text-sm text-white/70">
              Next Queue · {settings.queueSize}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {queuePreview.map((type, idx) => (
                <div
                  key={`${type}-${idx}`}
                  className="rounded-xl bg-black/40 p-2 text-center text-xs"
                >
                  <div className="aspect-square rounded-lg bg-black/30 p-2">
                    <MiniPiece type={type} />
                  </div>
                  <div className="mt-1 font-semibold text-white/70">
                    {idx === 0 ? "Up Next" : `+${idx}`}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg shadow-rose-500/10">
            <h3 className="text-sm font-medium text-white/80">Line Breakdown</h3>
            <ul className="mt-3 space-y-2 text-xs text-white/60">
              <li className="flex items-center justify-between">
                <span>Singles</span>
                <span>{stats.cleared[0]}</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Doubles</span>
                <span>{stats.cleared[1]}</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Triples</span>
                <span>{stats.cleared[2]}</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Tetrises</span>
                <span>{stats.cleared[3]}</span>
              </li>
              <li className="flex items-center justify-between text-amber-200">
                <span>Tetris Chain</span>
                <span>{stats.tetrisCount}</span>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg shadow-amber-500/10">
            <h3 className="text-sm font-medium text-white/80">Elite Commands</h3>
            <div className="mt-3 flex flex-col gap-1 text-xs text-white/60">
              <span>Rotate: Z / X or ⟲ / ⟳</span>
              <span>Hold piece: C or Hold button</span>
              <span>Hyper drop: Space</span>
              <span>Soft drop: ↓ or S</span>
              <span>Toggle pause: Esc</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 rounded-3xl border border-white/10 bg-black/40 p-4 shadow-inner shadow-sky-500/10 sm:grid-cols-3">
        <div className="text-xs text-white/60">
          <p className="text-white/80">Power Ups</p>
          <p>
            Trigger kinetic pulses when you chain clears. Keep your combo meter
            climbing to unlock multiplier surges.
          </p>
        </div>
        <div className="text-xs text-white/60">
          <p className="text-white/80">Adaptive Stage</p>
          <p>
            Each level remixes the drop tempo. Survive the acceleration curve to
            dominate the skyline.
          </p>
        </div>
        <div className="text-xs text-white/60">
          <p className="text-white/80">Global Stage Ready</p>
          <p>
            This build is Vercel-optimized and gamepad-ready. Plug in and climb
            the leaderboards.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs text-white/70 sm:justify-between">
        <span>Made for futuristic arcades · Hyper responsive · Touch ready</span>
        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => movePiece(-1)}
            className="rounded-full bg-white/10 px-3 py-1 font-semibold text-white transition hover:bg-white/20"
          >
            ◀
          </button>
          <button
            type="button"
            onClick={() => movePiece(1)}
            className="rounded-full bg-white/10 px-3 py-1 font-semibold text-white transition hover:bg-white/20"
          >
            ▶
          </button>
          <button
            type="button"
            onClick={() => rotatePiece(1)}
            className="rounded-full bg-white/10 px-3 py-1 font-semibold text-white transition hover:bg-white/20"
          >
            ⟳
          </button>
          <button
            type="button"
            onClick={() => rotatePiece(-1)}
            className="rounded-full bg-white/10 px-3 py-1 font-semibold text-white transition hover:bg-white/20"
          >
            ⟲
          </button>
          <button
            type="button"
            onClick={() => dropPiece(true)}
            className="rounded-full bg-white/10 px-3 py-1 font-semibold text-white transition hover:bg-white/20"
          >
            ⬇
          </button>
          <button
            type="button"
            onClick={hardDrop}
            className="rounded-full bg-white/10 px-3 py-1 font-semibold text-white transition hover:bg-white/20"
          >
            ⤓
          </button>
          <button
            type="button"
            onClick={holdPiece}
            className="rounded-full bg-white/10 px-3 py-1 font-semibold text-white transition hover:bg-white/20"
          >
            Hold
          </button>
        </div>
      </div>
    </div>
  );
}

function MiniPiece({ type }: { type: TetrominoType }) {
  const rotations = getRotations(type);
  const shape = rotations[0];
  const size = shape.length;
  return (
    <div
      className={clsx(
        "grid h-full w-full place-items-center gap-[2px]",
      )}
      style={{
        gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
      }}
    >
      {shape.flat().map((filled, idx) => (
        <div
          key={idx}
          className={clsx(
            "h-full w-full rounded-sm border border-black/40",
            filled
              ? clsx("bg-gradient-to-br shadow-lg", COLOR_MAP[type])
              : "bg-black/30",
          )}
        />
      ))}
    </div>
  );
}
