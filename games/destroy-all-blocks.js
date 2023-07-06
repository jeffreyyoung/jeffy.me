import kaboom from "https://unpkg.com/kaboom@3000.0.1/dist/kaboom.mjs";
import { addNotificationText } from "./utils/addNotificationText.js";

// initialize context
kaboom({
  background: [51, 204, 255],
});


loadSprite("bean", "https://kaboomjs.com/sprites/bean.png");
loadSprite("watermelon", "https://kaboomjs.com/sprites/watermelon.png");

const block_size = 50;

scene("start", () => {
    let clicks = 5;
    
    let getText = () => `Tap ${clicks} times to start again`;
    
    let titleText = add([
        text(getText(), { size: 14 }),
        pos(center()),
        anchor("center"),
    ]);
    
    function handleClick() {
        clicks--;
        titleText.text = getText();
        if (clicks === 0) {
        go("game");
        }
    }
    onClick(handleClick);
    onKeyPress(handleClick);
});

scene("game", () => {

  setGravity(3000);

  let level = addLevel(
    [
      "==========================",
      "=************************=",
      "=************************=",
      "=************************=",
      "=************************=",
      "=************************=",
      "=************************=",
      "=    B                   =",
      "==========================",
    ],
    {
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
        B: () => [
          sprite("bean"),
          area(),
          offscreen({ destroy: false }),
          body(),
          "bean",
        ],
        "*": () => [sprite("watermelon"), area(), "watermelon"],
      },
    }
  );

  let bean = level.get("bean")[0];

  bean.onExitScreen(() => {
    bean.moveTo(level.pos);
  });

  let direction = 1;
  bean.onUpdate(() => {
    camPos(bean.pos);

    if (!bean.isGrounded()) {
      bean.move(200 * direction, 0);
    }
  });

  onCollide("bean", "watermelon", (bean, watermelon) => {
    destroy(watermelon);
    addNotificationText("+1", watermelon.pos);
    if (level.get("watermelon").length === 0) {
      go("start");
    }
  });

  // add a kaboom on mouse click
  onClick(() => {
    let { x } = mousePos();
    let beanX = toScreen(bean.pos).x;
    debug.log(`x: ${x}, beanX: ${beanX}`)
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
