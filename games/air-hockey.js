import kaboom from "https://unpkg.com/kaboom@3000.0.1/dist/kaboom.mjs";
import { addNotificationText } from "./utils/addNotificationText.js";
// initialize context
kaboom({
    background: [51, 204, 255],
});
let RADIUS = 50;
scene("game", () => {
  let bluePaddleScore = 0;
  let redPaddleScore = 0;

  let score = add([
    text(`red: ${redPaddleScore}, blue: ${bluePaddleScore}`),
    anchor('center'),
    pos(center()),
  ])

  function updateScoreText() {
    score.text = `red: ${redPaddleScore}, blue: ${bluePaddleScore}`;
  }

  let bluePaddle = add([
    circle(RADIUS),
    color(Color.BLUE),
    anchor("center"),
    pos(center().x, height() - 10 - RADIUS),
    body(),
    area(),
    "hitter",
    "bluePaddle",
  ]);

  let redPaddle = add([
    circle(RADIUS),
    color(Color.RED),
    anchor("center"),
    pos(center().x, 30),
    body(),
    area(),
    "hitter",
    "bluePaddle",
  ]);

  let puckVelocityScale = 500;

  function moving() {
    let self = {
        xVelocity: 0,
        yVelocity: puckVelocityScale,
        invertYVelocity() {
            self.yVelocity = -self.yVelocity;
        },
        invertXVelocity() {
            self.xVelocity = -self.xVelocity;
        },
        require: [ "pos" ],
        update() {
            if (this.pos.x <= 0 && this.xVelocity < 0) {
                this.xVelocity = -this.xVelocity;
            } else if (this.pos.x >= width() && this.xVelocity > 0) {
                this.xVelocity = -this.xVelocity;
            } else if (this.pos.y <= 0 && this.yVelocity < 0) {
                this.yVelocity = -this.yVelocity;
            } else if (this.pos.y >= height() && this.yVelocity > 0) {
                this.yVelocity = -this.yVelocity;
            }
            this.move(this.xVelocity, this.yVelocity);
        }
    }
    return self;
  }

  let puck = add([
    circle(RADIUS*3/4),
    color(Color.BLACK),
    anchor("center"),
    pos(center().add(0, 10 + RADIUS)),
    body(),
    area(),
    // move(redPaddle.pos.angle(bluePaddle.pos), 1000),
    moving(),
    "puck",
  ]);

  const wallWidth = 10;
  add([
    rect(wallWidth, height()),
    pos(0, 0),
    area(),
    body({ isStatic: true }),
    "wall",
    "leftWall",
  ]);
  add([
    rect(wallWidth, height()),
    pos(width() - wallWidth, 0),
    area(),
    body({ isStatic: true }),
    "wall",
    "rightWall",
  ]);
  add([
    rect(width(), wallWidth),
    pos(0, -wallWidth),
    area(),
    body({ isStatic: true }),
    "wall",
    "topWall",
  ]);
  add([
    rect(width(), wallWidth),
    pos(0, height() + wallWidth),
    area(),
    body({ isStatic: true }),
    "wall",
    "bottomWall",
  ]);

  onCollide("puck", "hitter", (puck, hitter) => {
    let angle = Vec2.fromAngle(puck.pos.angle(hitter.pos)).scale(puckVelocityScale);
    // debugger;
    puck.yVelocity = angle.y;
    puck.xVelocity = angle.x;
  });

  onCollide("puck", "topWall", (puck, wall, collision) => {
    bluePaddleScore += 1;
    updateScoreText();
    addNotificationText("+1", puck.pos);
    puck.invertYVelocity();
  });
  onCollide("puck", "bottomWall", (puck, wall, collision) => {
    redPaddleScore += 1;
    updateScoreText();
    addNotificationText("+1", puck.pos);
    puck.invertYVelocity();
  });
  onCollide("puck", "leftWall", (puck, wall, collision) => {
    puck.invertXVelocity();
  });
  onCollide("puck", "rightWall", (puck, wall, collision) => {
    puck.invertXVelocity();
  });

  function isRedTouch(touch) {
    return touch.y < height() /4;
  }

  function isBlueTouch(touch) {
    return touch.y > (height() - height() /4);
  }

  function handleTouch(touch) {
    if (isBlueTouch(touch)) {
        bluePaddle.moveTo(touch.x, touch.y-50);
    }
    if (isRedTouch(touch)) {
        redPaddle.moveTo(touch.x, touch.y+50);
    }
  }
  onTouchStart(handleTouch);

  onTouchMove(handleTouch);

  onHoverUpdate(() => handleTouch(mousePos()))

  onKeyPress('left', () => {
    bluePaddle.moveBy(-10);
  })
  onKeyPress('right', () => {
    bluePaddle.moveBy(10);
  })

  onKeyPress('a', () => {
    redPaddle.moveBy(-10, 0);
  });
  
  onKeyPress('d', () => {
    redPaddle.moveBy(10, 0);
  })
});

go("game");
