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
    text(`red: ${redPaddleScore}, blue: ${bluePaddleScore}`, { size: 18 }),
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
  let puckVelocityDelta = 20;
  let maxPuckVelocity = 1000;

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
            if (this.pos.x < 0 || this.pos.x > width() || this.pos.y < 0 || this.pos.y > height()) {
              this.moveTo(center());
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
    offscreen({ destroy: false }),
    // move(redPaddle.pos.angle(bluePaddle.pos), 1000),
    moving(),
    "puck",
  ]);

  const wallWidth = 10;
  add([
    rect(wallWidth, height()),
    pos(0, 0),
    area({ collisionIgnore: ['hitter']}),
    body({ isStatic: true }),
    z(-1),
    "wall",
    "leftWall",
  ]);
  add([
    rect(wallWidth, height()),
    pos(width() - wallWidth, 0),
    area({ collisionIgnore: ['hitter']}),
    body({ isStatic: true }),
    z(-1),
    "wall",
    "rightWall",
  ]);
  add([
    rect(width(), wallWidth),
    pos(0, -wallWidth),
    area(),
    body({ isStatic: true,  }),
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
  add([
    rect(width(), 2),
    pos(0, height()/4),
    z(-1),
    'quarterLine',
  ]);
  add([
    rect(width(), 2),
    pos(0, height()*3/4),
    z(-1),
    'quarterLine',
  ]);


  onCollide("puck", "hitter", (puck, hitter) => {
    puckVelocityScale = Math.min(maxPuckVelocity, puckVelocityScale + puckVelocityDelta);
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

  onKeyDown('left', () => {
    if (bluePaddle.pos.x < -10) {
      return;
    }
    bluePaddle.moveBy(-5, 0);
  })
  onKeyDown('right', () => {
    if (bluePaddle.pos.x > width() + 10) {
      return;
    }
    bluePaddle.moveBy(5, 0);
  })

  onKeyDown('a', () => {
    if (redPaddle.pos.x < -10) {
      return;
    }
    redPaddle.moveBy(-5, 0);
  });
  
  onKeyDown('d', () => {
    if (redPaddle.pos.x > width() + 10) {
      return;
    }
    redPaddle.moveBy(5, 0);
  })
});

go("game");
