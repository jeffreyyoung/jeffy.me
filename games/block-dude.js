/**  @type {HTMLCanvasElement} */
// @ts-ignore
const canvas = document.getElementById("canvas");

console.log("canvas", canvas);

let curLevel = 0;
const levels = [
  `
==============================
=                            =
=                            =
=                            =
=                            =
=                            =
=                            =
=                            =
=                            =
=                            =
=E                           =
==       =                   =
==       =       =   BB     M=
==============================
`,
  `
==============================
=                            =
=                            =
=                            =
=                            =
=                            =
=                            =
=                            =
=                            =
=E                           =
==                           =
==       =                   =
==   BB  =       =   BB     M=
==============================
`,
];

/** @type {Coord & { dir: -1 | 1}} */
let manCoords;
/** @type Coord */
let doorCoords;
/** @type {string[][]} */
let rows;

function resetTo(level = 0) {
  curLevel = level;
  rows = levels[curLevel]
    .split("\n")
    .filter((row) => row.length > 0)
    .map((row) => row.split(""));
  manCoords = undefined;
  doorCoords = undefined;
}

resetTo(0);

/**
 * @typedef Coord
 * @type {{x: number, y: number}}
 */

window.addEventListener("resize", () => {
  requestAnimationFrame(paint);
});

window.addEventListener("keydown", (event) => {
  if (!manCoords) {
    return;
  }

  if (event.key === "ArrowLeft") {
    if (manCoords.dir === 1) {
      manCoords.dir = -1;
      paint();
      return;
    }
    moveMan(-1);
  }
  if (event.key === "ArrowRight") {
    if (manCoords.dir === -1) {
      manCoords.dir = 1;
      paint();
      return;
    }
    moveMan(1);
  }
  if (event.key === "ArrowUp" || event.key === "ArrowDown") {
    if (canPickUpBlock()) {
      rows[manCoords.y][manCoords.x] = "B";
      manCoords.y++;
      rows[manCoords.y][manCoords.x] = "M";
      paint();
    } else if (hasBlock()) {
      rows[manCoords.y][manCoords.x] = "B";
      manCoords.y--;
      rows[manCoords.y][manCoords.x] = "M";
      paint();
    }
  }
});

function isOpenSpace(x, y) {
  return rows[y][x] === " " || rows[y][x] === "M";
}
function isSolidSpace(x, y) {
  return rows[y][x] === "=" || rows[y][x] === "B";
}

function canPickUpBlock() {
  if (hasBlock()) {
    return false;
  }
  if (!manCoords) {
    return false;
  }

  return rows[manCoords.y + 1][manCoords.x] === "B";
}

function hasBlock() {
  if (!manCoords) {
    return false;
  }

  return rows[manCoords.y - 1][manCoords.x] === "B";
}

function moveMan(dx) {
  if (!manCoords) {
    return;
  }

  const newX = manCoords.x + dx;
  let y = manCoords.y - 1;
  while (y < rows.length) {
    if (isOpenSpace(newX, y) && isSolidSpace(newX, y + 1)) {
      const holdingBlock = hasBlock();

      // remove block
      if (holdingBlock) {
        rows[manCoords.y - 1][manCoords.x] = " ";
      }

      manCoords.y = y;
      manCoords.x = newX;

      if (holdingBlock) {
        rows[manCoords.y - 1][manCoords.x] = "B";
      }
      paint();
      return;
    }
    y++;
  }
}

function _paint() {
  const ctx = canvas.getContext("2d");
  const blockSize = window.innerWidth / rows[0].length;
  console.log("blockSize", blockSize);
  canvas.width = window.innerWidth;
  canvas.height = blockSize * rows.length;
  ctx.fillStyle = "blue";
  console.log("manDir", manCoords?.dir);
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const char = row[x];

      if (char === "M") {
        row[x] = " ";
        manCoords = { x, y, dir: manCoords?.dir ?? 1 };
      }
      if (char === "E") {
        row[x] = " ";
        doorCoords = { x, y };
      }

      if (doorCoords?.x === x && doorCoords?.y === y) {
        ctx.fillStyle = "red";
        ctx.fillRect(x * blockSize, y * blockSize, blockSize, blockSize);
      }
      if (char === "B") {
        ctx.fillStyle = "purple";
        ctx.fillRect(x * blockSize, y * blockSize, blockSize, blockSize);
      }

      if (char === "=") {
        ctx.fillStyle = "green";
        ctx.fillRect(x * blockSize, y * blockSize, blockSize, blockSize);
      }

      if (manCoords?.x === x && manCoords?.y === y) {
        ctx.fillStyle = "pink";
        ctx.fillRect(x * blockSize, y * blockSize, blockSize, blockSize);
        // add hair
        ctx.fillStyle = "brown";
        ctx.fillRect(x * blockSize, y * blockSize, blockSize, blockSize / 4);
        // add eye
        ctx.fillStyle = "black";
        const eyeWidth = blockSize / 8;
        const eyeX =
          manCoords.dir === -1
            ? x * blockSize
            : x * blockSize + blockSize - eyeWidth;
        ctx.fillRect(
          eyeX,
          y * blockSize + blockSize * 0.4,
          blockSize / 8,
          blockSize / 8
        );

        // add mouth
        const mouthWidth = blockSize / 2;
        const mouthX =
          manCoords.dir === -1
            ? x * blockSize
            : x * blockSize + blockSize - mouthWidth;
        ctx.fillRect(
          mouthX,
          y * blockSize + blockSize * 0.8,
          mouthWidth,
          blockSize / 16
        );
      }
    }
  }
}
let animationFrame = 0;
function paint() {
  cancelAnimationFrame(animationFrame);
  animationFrame = requestAnimationFrame(_paint);
}
paint();
