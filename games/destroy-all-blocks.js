import kaboom from "https://unpkg.com/kaboom@3000.0.1/dist/kaboom.mjs";
import { addNotificationText } from "./utils/addNotificationText.js";

// initialize context
kaboom({
  background: [51, 204, 255],
});

loadSprite("bean", "https://kaboomjs.com/sprites/bean.png");
loadSprite("watermelon", "https://kaboomjs.com/sprites/watermelon.png");

const block_size = 50;

scene("start", (isEnd = false) => {
  let clicks = 5;
  let getText = () =>
    `${
      isEnd ? "You completed the game!!!!!\n" : ""
    }Tap ${clicks} times to start again`;

  let titleText = add([
    text(getText(), { size: 14 }),
    pos(center()),
    anchor("center"),
  ]);

  function handleClick() {
    clicks--;
    titleText.text = getText();
    if (clicks === 0) {
      go("game", 0);
    }
  }
  onClick(handleClick);
  onKeyPress(handleClick);
});

let levels = [
  [
    "==========================",
    "L************************R",
    "L************************R",
    "L************************R",
    "L************************R",
    "L************************R",
    "L************************R",
    "L    B                   R",
    "==========================",
  ],
  [
    "==========================",
    "L**********=*************R",
    "L**********=*************R",
    "L********** *************R",
    "L********** *************R",
    "L**********=*************R",
    "L**********=*************R",
    "L    B     =             R",
    "==========================",
  ],
  [
    "==========================",
    "L******=***=*******=*****R",
    "L******=***=*******=*****R",
    "L**=***=***=***=***=*****R",
    "L**=***=*** ***=***=*****R",
    "L**=***=*** ***=***=*****R",
    "L**=***=***=***=*********R",
    "L  = B     =   =         R",
    "==========================",
  ],
];

scene("game", (levelIdx = 0) => {
  setGravity(3000);
  console.log("level", levelIdx);
  let isLastLevel = levelIdx === levels.length - 1;
  let level = addLevel(levels[levelIdx], {
    tileHeight: block_size,
    tileWidth: block_size,
    tiles: {
      "=": () => [
        rect(block_size, block_size),
        color(100, 100, 100),
        area(),
        body({ isStatic: true }),
        "wall",
      ],
      L: () => [
        rect(block_size, block_size),
        color(100, 100, 100),
        area(),
        body({ isStatic: true }),
        "left-wall",
      ],
      R: () => [
        rect(block_size, block_size),
        color(100, 100, 100),
        area(),
        body({ isStatic: true }),
        "right-wall",
      ],
      B: () => [
        sprite("bean"),
        area(),
        offscreen({ destroy: false }),
        body(),
        "bean",
      ],
      "*": () => [sprite("watermelon"), area(), "watermelon"],
    },
  });

  let bean = level.get("bean")[0];

  bean.onExitScreen(() => {
    bean.moveTo(level.pos);
  });

  let direction = 1;
  bean.onUpdate(() => {
    if (!bean.isGrounded()) {
      bean.move(200 * direction, 0);
    }
    camPos(bean.pos);
  });

  onCollide("bean", "watermelon", (bean, watermelon) => {
    destroy(watermelon);
    let remaining = level.get("watermelon").length;

    if (remaining > 0) {
      addNotificationText("+1", watermelon.pos);
    } else {
      addNotificationText("You win!", watermelon.pos);
      wait(1, () => {
        if (isLastLevel) {
          go("start", true);
        } else {
          go("game", levelIdx + 1);
        }
      });
    }
  });

  onCollide("bean", "left-wall", (bean) => {
    direction = 1;
  });
  onCollide("bean", "right-wall", (bean) => {
    direction = -1;
  });

  // add a kaboom on mouse click
  onClick(() => {
    let { x } = mousePos();
    let beanX = toScreen(bean.pos).x;
    debug.log(`x: ${x}, beanX: ${beanX}`);
    if (x < beanX) {
      direction = -1;
    } else {
      direction = 1;
    }
    bean.jump(1000);
  });
  onKeyPress(() => {
    bean.jump(1000);
  });
});

go("game");
