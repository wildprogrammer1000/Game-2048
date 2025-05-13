import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const GRID_SIZE = 4;
const CELL_SIZE = 50;
const CELL_GAP = 8;

let tileId = 0;

function isGameOver(tiles) {
  if (getEmptyCells(tiles).length > 0) return false;

  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const tile = tiles.find((t) => t.row === row && t.col === col);
      if (!tile) continue;

      // Check right
      const right = tiles.find((t) => t.row === row && t.col === col + 1);
      if (right && right.value === tile.value) return false;

      // Check down
      const down = tiles.find((t) => t.row === row + 1 && t.col === col);
      if (down && down.value === tile.value) return false;
    }
  }
  return true;
}

function createTile(row, col, value = 2) {
  return {
    id: tileId++,
    value,
    row,
    col,
    new: true,
  };
}

function getEmptyCells(tiles) {
  const occupied = tiles.map((t) => `${t.row}-${t.col}`);
  const empty = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (!occupied.includes(`${row}-${col}`)) {
        empty.push({ row, col });
      }
    }
  }
  return empty;
}

function Play() {
  const navigate = useNavigate();
  const [tiles, setTiles] = useState([]);
  const [moving, setMoving] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const boardRef = useRef(null);
  const scoreRef = useRef(0);
  const bestScoreRef = useRef(0);
  const dragStartRef = useRef(null);
  const touchStartRef = useRef(null);

  const resetGame = () => {
    const initial = [];
    const empties = getEmptyCells([]);
    const first = empties.splice(
      Math.floor(Math.random() * empties.length),
      1
    )[0];
    const second = empties.splice(
      Math.floor(Math.random() * empties.length),
      1
    )[0];
    initial.push(createTile(first.row, first.col));
    initial.push(createTile(second.row, second.col));
    setTiles(initial);
    scoreRef.current = 0;
    setGameOver(false);
  };

  useEffect(() => {
    // Load best score from localStorage
    const savedBestScore = localStorage.getItem("bestScore");
    if (savedBestScore) {
      bestScoreRef.current = parseInt(savedBestScore);
    }

    const initial = [];
    const empties = getEmptyCells([]);
    const first = empties.splice(
      Math.floor(Math.random() * empties.length),
      1
    )[0];
    const second = empties.splice(
      Math.floor(Math.random() * empties.length),
      1
    )[0];
    initial.push(createTile(first.row, first.col));
    initial.push(createTile(second.row, second.col));
    setTiles(initial);
  }, []);

  useEffect(() => {
    const handleMouseDown = (e) => {
      if (gameOver) return;
      dragStartRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = (e) => {
      if (moving || !dragStartRef.current || gameOver) return;

      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;

      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      if (Math.max(absX, absY) < 30) return; // 최소 드래그 거리 조건

      let direction = null;
      if (absX > absY) {
        direction = dx > 0 ? "right" : "left";
      } else {
        direction = dy > 0 ? "down" : "up";
      }

      moveTiles(direction);
      dragStartRef.current = null;
    };
    const handleTouchStart = (e) => {
      if (gameOver) return;
      const touch = e.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    };

    const handleTouchEnd = (e) => {
      if (moving || !touchStartRef.current || gameOver) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartRef.current.x;
      const dy = touch.clientY - touchStartRef.current.y;
      handleSwipe(dx, dy);
      touchStartRef.current = null;
    };

    const handleSwipe = (dx, dy) => {
      if (gameOver) return;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      if (Math.max(absX, absY) < 30) return;

      let direction = null;
      if (absX > absY) direction = dx > 0 ? "right" : "left";
      else direction = dy > 0 ? "down" : "up";

      moveTiles(direction);
    };

    const handleKeyDown = (e) => {
      if (moving || gameOver) return;
      let direction = null;
      if (e.key === "ArrowUp") direction = "up";
      if (e.key === "ArrowDown") direction = "down";
      if (e.key === "ArrowLeft") direction = "left";
      if (e.key === "ArrowRight") direction = "right";
      if (direction) {
        e.preventDefault();
        moveTiles(direction);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchstart", handleTouchStart, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: false });
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [tiles, moving]);

  function moveTiles(direction) {
    setMoving(true);
    const moved = [...tiles].map((t) => ({
      ...t,
      new: false,
      prevRow: t.row,
      prevCol: t.col,
    }));
    const mergedMap = {};
    let hasMoved = false;

    const traverse = getTraversalOrder(direction);

    for (let i = 0; i < traverse.length; i++) {
      const { row, col } = traverse[i];
      const tile = moved.find((t) => t.row === row && t.col === col);
      if (!tile) continue;

      let [targetRow, targetCol] = [tile.row, tile.col];

      while (true) {
        const nextRow =
          targetRow + (direction === "down" ? 1 : direction === "up" ? -1 : 0);
        const nextCol =
          targetCol +
          (direction === "right" ? 1 : direction === "left" ? -1 : 0);
        const nextTile = moved.find(
          (t) => t.row === nextRow && t.col === nextCol
        );
        if (
          nextRow < 0 ||
          nextRow >= GRID_SIZE ||
          nextCol < 0 ||
          nextCol >= GRID_SIZE
        )
          break;

        if (!nextTile) {
          targetRow = nextRow;
          targetCol = nextCol;
        } else if (
          nextTile.value === tile.value &&
          !mergedMap[`${nextRow}-${nextCol}`]
        ) {
          targetRow = nextRow;
          targetCol = nextCol;
          mergedMap[`${nextRow}-${nextCol}`] = true;
          break;
        } else {
          break;
        }
      }

      if (targetRow !== tile.row || targetCol !== tile.col) {
        hasMoved = true;
        tile.row = targetRow;
        tile.col = targetCol;
        if (mergedMap[`${targetRow}-${targetCol}`]) {
          tile.merging = true;
        }
      }
    }

    setTiles(moved);

    setTimeout(() => {
      const afterMerge = [];
      const mergedValueMap = {};
      moved.forEach((tile) => {
        const key = `${tile.row}-${tile.col}`;
        if (tile.merging) {
          if (!mergedValueMap[key]) {
            mergedValueMap[key] = tile.value * 2;
            afterMerge.push({
              ...createTile(tile.row, tile.col, tile.value * 2),
              isMergedResult: true,
            });
            const newScore = scoreRef.current + tile.value * 2;
            scoreRef.current = newScore;
            if (newScore > bestScoreRef.current) {
              bestScoreRef.current = newScore;
              localStorage.setItem("bestScore", newScore.toString());
            }
          }
        } else {
          if (!mergedMap[key]) {
            afterMerge.push(tile);
          }
        }
      });

      const newTiles = [...afterMerge];
      if (hasMoved) {
        const empties = getEmptyCells(newTiles);
        if (empties.length) {
          const rand = empties[Math.floor(Math.random() * empties.length)];
          newTiles.push(createTile(rand.row, rand.col));
        }
      }

      setTiles(newTiles);
      setMoving(false);

      if (isGameOver(newTiles)) {
        setGameOver(true);
      }
    }, 200);
  }

  function getTraversalOrder(direction) {
    const order = [];
    const range = [...Array(GRID_SIZE).keys()];
    const rowIter =
      direction === "up"
        ? range
        : direction === "down"
        ? [...range].reverse()
        : range;
    const colIter =
      direction === "left"
        ? range
        : direction === "right"
        ? [...range].reverse()
        : range;

    for (let row of rowIter) {
      for (let col of colIter) {
        order.push({ row, col });
      }
    }
    return order;
  }

  return (
    <div className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center bg-blue-50 py-4 px-4 sm:px-6 lg:px-8 select-none">
      <div className="max-w-md mx-auto">
        <div className="w-full flex justify-between items-center mb-4">
          <div className="w-full flex gap-2">
            <div className="flex-1 bg-white rounded-lg p-2 min-w-[100px] shadow-sm text-center">
              <div className="text-sm text-blue-600">SCORE</div>
              <div className="text-xl font-bold text-blue-900">
                {scoreRef.current}
              </div>
            </div>
            <div className="flex-1 bg-white rounded-lg p-2 min-w-[100px] shadow-sm text-center">
              <div className="text-sm text-blue-600">BEST</div>
              <div className="text-xl font-bold text-blue-900">
                {bestScoreRef.current}
              </div>
            </div>
          </div>
        </div>

        <div className="relative">
          <div
            className="relative bg-blue-100 rounded-lg p-2 shadow-md"
            style={{
              width: GRID_SIZE * CELL_SIZE + (GRID_SIZE - 1) * CELL_GAP,
              height: GRID_SIZE * CELL_SIZE + (GRID_SIZE - 1) * CELL_GAP,
            }}
            ref={boardRef}
          >
            {tiles.map((tile) => (
              <div
                key={tile.id}
                className={`absolute rounded-lg flex items-center justify-center font-bold text-lg transition-all duration-200 shadow-sm
                  ${tile.new ? "animate-pop" : ""} 
                  ${tile.merging ? "animate-merge" : ""} 
                  ${tile.isMergedResult ? "animate-merged" : ""}
                  ${getTileColor(tile.value)}`}
                style={{
                  top: tile.row * (CELL_SIZE + CELL_GAP),
                  left: tile.col * (CELL_SIZE + CELL_GAP),
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  lineHeight: `${CELL_SIZE}px`,
                }}
              >
                {tile.value}
              </div>
            ))}
          </div>

          {gameOver && (
            <div className="absolute inset-0 bg-white/90 rounded-lg flex flex-col items-center justify-center gap-4">
              <div className="text-2xl font-bold text-blue-900">Game Over!</div>
              <div className="text-lg text-blue-700">
                Score: {scoreRef.current}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={resetGame}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={() => navigate("/")}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Home
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getTileColor(value) {
  const colors = {
    2: "bg-rose-50 text-rose-600",
    4: "bg-rose-100 text-rose-600",
    8: "bg-orange-50 text-orange-600",
    16: "bg-orange-100 text-orange-600",
    32: "bg-amber-50 text-amber-600",
    64: "bg-amber-100 text-amber-600",
    128: "bg-yellow-50 text-yellow-600",
    256: "bg-yellow-100 text-yellow-600",
    512: "bg-lime-50 text-lime-600",
    1024: "bg-lime-100 text-lime-600",
    2048: "bg-green-50 text-green-600",
  };
  return colors[value] || "bg-blue-50 text-blue-400";
}

export default Play;
