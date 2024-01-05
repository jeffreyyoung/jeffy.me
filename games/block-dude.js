/**  @type {HTMLCanvasElement} */
// @ts-ignore
const canvas = document.getElementById('canvas');

console.log('canvas', canvas);

let level = `
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
`

/** @type Coord */
let manCoords;
/** @type Coord */
let doorCoords;
let rows = level.split('\n').filter((row) => row.length > 0).map((row) => row.split(''));

/**
 * @typedef Coord
 * @type {{x: number, y: number}}
 */

window.addEventListener('resize', () => {
    requestAnimationFrame(paint);
})



window.addEventListener('keydown', (event) => {
    if (!manCoords) {
        return;
    }
    
    if (event.key === 'ArrowLeft') {
        moveMan(-1);
    }
    if (event.key === 'ArrowRight') {
        moveMan(1);
    }
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        if (canPickUpBlock()) {
            rows[manCoords.y][manCoords.x] = 'B';
            manCoords.y++;
            rows[manCoords.y][manCoords.x] = 'M';
            paint();
        } else if (hasBlock()) {
            rows[manCoords.y][manCoords.x] = 'B';
            manCoords.y--;
            rows[manCoords.y][manCoords.x] = 'M';
            paint();
        }

    }
});

function isOpenSpace(x, y) {
    return rows[y][x] === ' ' || rows[y][x] === 'M';
}
function isSolidSpace(x, y) {
    return rows[y][x] === '=' || rows[y][x] === 'B';
}

function canPickUpBlock() {
    if (hasBlock()) {
        return false;
    }
    if (!manCoords) {
        return false;
    }

    return rows[manCoords.y+1][manCoords.x] === 'B';
}

function hasBlock() {
    if (!manCoords) {
        return false;
    }

    return rows[manCoords.y-1][manCoords.x] === 'B';
}

function moveMan(dx) {
    if (!manCoords) {
        return;
    }
    const rowUp = rows[manCoords.y - 1];
    const row = rows[manCoords.y];
    const rowDown = rows[manCoords.y + 1];
    const rowX = [-1, 0, 1];
    
    const newX = manCoords.x + dx;
    for (const y of [manCoords.y - 1, manCoords.y, manCoords.y + 1]) {
        if (isOpenSpace(newX, y) && isSolidSpace(newX, y + 1)) {
            const holdingBlock = hasBlock();

            // remove block
            if (holdingBlock) {
                rows[manCoords.y-1][manCoords.x] = ' ';
            }


            manCoords.y = y;
            manCoords.x = newX;

            if (holdingBlock) {
                rows[manCoords.y-1][manCoords.x] = 'B';
            }
            paint();
            return;
        }
    }
}

function _paint() {
    const ctx = canvas.getContext('2d');
    const blockSize = window.innerWidth / rows[0].length;
    console.log('blockSize', blockSize);
    canvas.width = window.innerWidth;
    canvas.height = blockSize * rows.length;
    ctx.fillStyle = 'blue';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < rows.length; y++) {
        const row = rows[y];
        for (let x = 0; x < row.length; x++) {
            const char = row[x];

            if (char === 'M') {
                row[x] = ' ';
                manCoords = { x, y };
            }
            if (char === 'E') {
                row[x] = ' ';
                doorCoords = { x, y };
            }

            if (doorCoords?.x === x && doorCoords?.y === y) {
                ctx.fillStyle = 'red';
                ctx.fillRect(x * blockSize, y * blockSize, blockSize, blockSize);
            }
            if (char === 'B') {
                ctx.fillStyle = 'purple';
                ctx.fillRect(x * blockSize, y * blockSize, blockSize, blockSize);
            }

            if (char === '=') {
                ctx.fillStyle = 'green';
                ctx.fillRect(x * blockSize, y * blockSize, blockSize, blockSize);
            }

            if (manCoords?.x === x && manCoords?.y === y) {
                ctx.fillStyle = 'pink';
                ctx.fillRect(x * blockSize, y * blockSize, blockSize, blockSize);
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