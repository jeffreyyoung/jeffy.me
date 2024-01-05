/**  @type {HTMLCanvasElement} */
// @ts-ignore
const canvas = document.getElementById("canvas");

let curLevel = 0;

const levels = [
  `
===================
=                 =
=                 =
=                 =
=                 =
=                 =
=                 =
=                 =
=                 =
=                 =
=E                =
==    =           =
==    =    B  B  M=
===================
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

/**
 * @typedef Coord
 * @type {{x: number, y: number}}
 */
window.addEventListener("resize", () => {
  paint();
});

/**
 *
 * @param {"left" | "right" | "pickup"} action
 */
function onInput(action) {
  if (!manCoords) {
    return;
  }

  if (action === "left") {
    if (manCoords.dir === 1) {
      manCoords.dir = -1;
      paint();
      return;
    }
    moveMan(-1);
  }
  if (action === "right") {
    if (manCoords.dir === -1) {
      manCoords.dir = 1;
      paint();
      return;
    }
    moveMan(1);
  }
  if (action === "pickup") {
    if (canPickUpBlock()) {
      const blockCoords = getPickUpBlockCoords();
      rows[blockCoords.y][blockCoords.x] = " ";
      rows[manCoords.y - 1][manCoords.x] = "B";
      paint();
    } else if (hasBlock()) {
      const blockCoords = getPlaceBlockCoords();
      rows[blockCoords.y][blockCoords.x] = "B";
      rows[manCoords.y - 1][manCoords.x] = " ";
      paint();
    }
  }
}

window.addEventListener("keydown", (event) => {
  let keyToAction = {
    ArrowLeft: "left",
    ArrowRight: "right",
    ArrowUp: "pickup",
    ArrowDown: "pickup",
  };

  let action = keyToAction[event.key];
  if (action) {
    onInput(action);
  }
});

window.addEventListener("click", (event) => {
  // click on top 2/3 of window
  if (
    event.clientY < (window.innerHeight * 2) / 3 &&
    (getPickUpBlockCoords() || hasBlock())
  ) {
    onInput("pickup");
    return;
  }

  // click on left side of window
  if (event.clientX < window.innerWidth / 2) {
    onInput("left");
  } else {
    onInput("right");
  }
});

function isOpenSpace(x, y) {
  return rows[y][x] === " " || rows[y][x] === "M" || rows[y][x] === "E";
}

function isSolidSpace(x, y) {
  return rows[y][x] === "=" || rows[y][x] === "B";
}

/**
 * @returns {Coord|null}
 */
function getPickUpBlockCoords() {
  if (hasBlock()) {
    return null;
  }
  if (!manCoords) {
    return null;
  }
  let blockX = manCoords.x + manCoords.dir;
  let blockY = manCoords.y - 1;
  while (blockY <= manCoords.y + 1) {
    if (rows[blockY][blockX] === "B" && rows[blockY - 1][blockX] !== "B") {
      return { x: blockX, y: blockY };
    }
    blockY++;
  }

  return null;
}

/**
 * @returns {Coord|null}
 */
function getPlaceBlockCoords() {
  if (!hasBlock()) {
    return null;
  }
  if (!manCoords) {
    return null;
  }
  let blockX = manCoords.x + manCoords.dir;
  let blockY = manCoords.y;
  while (blockY < rows.length) {
    if (rows[blockY][blockX] === " " && isSolidSpace(blockX, blockY + 1)) {
      return { x: blockX, y: blockY };
    }
    blockY++;
  }
}

function canPickUpBlock() {
  return !!getPickUpBlockCoords();
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

function resetTo(level = 0) {
  if (level >= levels.length) {
    alert("You win!");

    return;
  }
  curLevel = level;
  rows = levels[curLevel]
    .split("\n")
    .filter((row) => row.length > 0)
    .map((row) => row.split(""));
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      if (rows[y][x] === "M") {
        manCoords = { x, y, dir: 1 };
      }
      if (rows[y][x] === "E") {
        doorCoords = { x, y };
      }
    }
  }
  paint();
}

var animationFrame = 0;
function paint() {
  cancelAnimationFrame(animationFrame);
  animationFrame = requestAnimationFrame(_paint);
}

resetTo(0);

function _paint() {
  const ctx = canvas.getContext("2d");
  const blockSize = Math.min(window.innerWidth, window.innerHeight) / 9;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // paint background
  ctx.fillStyle = "skyblue";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let xBlocksInView = Math.ceil(window.innerWidth / blockSize);
  let YBlocksInView = Math.ceil(window.innerHeight / blockSize);
  let dy = Math.round(YBlocksInView / 2);
  let dx = Math.round(xBlocksInView / 2);
  let rootX = manCoords.x - dx;
  let rootY = manCoords.y - dy;

  for (let _y = 0; _y < YBlocksInView; _y++) {
    for (let _x = 0; _x < xBlocksInView; _x++) {
      let x = rootX + _x;
      let y = rootY + _y;
      if (x < 0 || y < 0) {
        continue;
      }
      if (y >= rows.length || x >= rows[y].length) {
        continue;
      }
      let actionCoords = getPickUpBlockCoords() || getPlaceBlockCoords();
      const char = rows[y][x];
      
      let isActionable = actionCoords?.x === x && actionCoords?.y === y;
      if (isActionable) {
        ctx.globalAlpha = 0.6;
      }


      if (char === " " && isActionable) {
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = "purple";
        ctx.fillRect(_x * blockSize, _y * blockSize, blockSize, blockSize);
        ctx.globalAlpha = 1;
      }
      if (doorCoords?.x === x && doorCoords?.y === y) {
        ctx.fillStyle = "red";

        ctx.fillRect(_x * blockSize, _y * blockSize, blockSize, blockSize);
      }
      if (char === "B") {
        if (isActionable) {
          ctx.globalAlpha = 0.6;
        }
        ctx.fillStyle = "purple";
        ctx.fillRect(_x * blockSize, _y * blockSize, blockSize, blockSize);
        ctx.globalAlpha = 1;
      }

      if (char === "=") {
        ctx.fillStyle = "green";
        ctx.fillRect(_x * blockSize, _y * blockSize, blockSize, blockSize);
      }
      ctx.globalAlpha = 1;

      if (manCoords?.x === x && manCoords?.y === y) {
        ctx.fillStyle = "pink";
        ctx.fillRect(_x * blockSize, _y * blockSize, blockSize, blockSize);
        // add hair
        ctx.fillStyle = "brown";
        ctx.fillRect(_x * blockSize, _y * blockSize, blockSize, blockSize / 4);
        if (char === "E") {
          // we did it!
          // draw a smiley face
          ctx.fillStyle = "black";
          const eyeWidth = blockSize / 8;
          ctx.fillRect(
            _x * blockSize + eyeWidth * 2,
            _y * blockSize + blockSize * 0.4,
            eyeWidth,
            eyeWidth
          );
          ctx.fillRect(
            _x * blockSize + blockSize - eyeWidth * 3,
            _y * blockSize + blockSize * 0.4,
            eyeWidth,
            eyeWidth
          );

          // add mouth
          ctx.strokeStyle = "black";
          ctx.lineWidth = blockSize / 16;
          ctx.arc(
            _x * blockSize + blockSize / 2,
            _y * blockSize + blockSize / 2 + blockSize / 4,
            blockSize / 6,
            0,
            Math.PI
          );
          ctx.stroke();
          setTimeout(() => {
            resetTo(curLevel + 1);
          }, 1000);
        } else {
          // add eye
          ctx.fillStyle = "black";
          const eyeWidth = blockSize / 8;
          const eyeX =
            manCoords.dir === -1
              ? _x * blockSize
              : _x * blockSize + blockSize - eyeWidth;
          ctx.fillRect(
            eyeX,
            _y * blockSize + blockSize * 0.4,
            eyeWidth,
            eyeWidth
          );

          // add mouth
          const mouthWidth = blockSize / 2;
          const mouthX =
            manCoords.dir === -1
              ? _x * blockSize
              : _x * blockSize + blockSize - mouthWidth;
          ctx.fillRect(
            mouthX,
            _y * blockSize + blockSize * 0.8,
            mouthWidth,
            blockSize / 16
          );
        }
      }
    }
  }
}
