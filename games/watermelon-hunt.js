import kaboom from "https://unpkg.com/kaboom@3000.0.1/dist/kaboom.mjs";
import { addNotificationText, addTitleScene } from "./utils/addNotificationText.js";

// initialize context
kaboom({
  background: [51, 204, 255],
});

loadSprite("bean", "https://kaboomjs.com/sprites/bean.png");
loadSprite("watermelon", "https://kaboomjs.com/sprites/watermelon.png");

const block_size = 50;

addTitleScene({
  sceneName: "initial",
  titleText: 'Flappy\'s Watermelon Obstacle Quest',
  instructions: 'Press left side to jump left and right side to jump right',
  nextScene: 'game',
})

go("initial");

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

scene("level-complete", (levelIdx = 0) => {
    let announcement = add([
        text(`Level ${levelIdx + 1} complete!`, { size: 18 }),
        pos(center()),
        anchor("center"),
    ]);
    function countdown(secondsLeft = 3) {
      addNotificationText(`Next level in ${secondsLeft}...`, center().add(0, 50));
      if (secondsLeft === 0) {
        go("game", levelIdx + 1);
      } else {
        wait(1, () => {
          countdown(secondsLeft - 1);
        });
      }
    }
    countdown();
})

let levels = [
  [
    "==========================",
    "=                        =" ,
    "=                        =",
    "=                        =",
    "=  B              *      =",
    "=  _              _      =",
    "=                        =",
    "=                        =",
    "=                        =",
    "=                        =",
    "=                        =",
    "=                        =",
    "=                        =",
    "=                        =",
    "==========================",
  ],
  [
    "==========================",
    "=          =             =",
    "=          =             =",
    "=          =             =",
    "=   B      =      *      =",
    "=   _      =      _      =",
    "=          =             =",
    "=          =             =",
    "=          =             =",
    "=          =             =",
    "=                        =",
    "=                        =",
    "=                        =",
    "=                        =",
    "=                        =",
    "==========================",
  ],
  [
    "==========================",
    "=        =               =",
    "=        =               =",
    "=        =               =",
    "=     B  =               =",
    "=     _  =               =",
    "=        =               =",
    "=        =      =        =",
    "=        =      =        =",
    "=        =      =        =",
    "=               =        =",
    "=               =        =",
    "=               =        =",
    "=               =    *   =",
    "=               =    _   =",
    "==========================",
  ],
  [
    "==========================",
    "=                        =",
    "=                        =",
    "=                        =",
    "=  B                     =",
    "=  _                     =",
    "==================       =",
    "=                        =",
    "=                        =",
    "=                        =",
    "=                        =",
    "=                        =",
    "=      ===================",
    "=                        =",
    "=                        =",
    "=                        =",
    "=                  *     =",
    "=                  _     =",
    "==========================",
  ],
];

scene("game", (levelIdx = 0) => {
  setGravity(3000);
  camScale(0.5, 0.5);
  console.log("level", levelIdx);
  let isLastLevel = levelIdx === levels.length - 1;
  let level = addLevel(levels[levelIdx], {
    tileHeight: block_size,
    tileWidth: block_size,
    tiles: {
      "_": () => [
        rect(block_size, block_size),
        color(Color.GREEN),
        area(),
        body({ isStatic: true }),
        "platform",
      ],
      "=": () => [
        rect(block_size, block_size),
        color(100, 100, 100),
        area(),
        body({ isStatic: true }),
        "lava",
      ],
      B: () => [
        sprite("bean"),
        area(),
        offscreen({ destroy: false }),
        body(),
        (() => {
          let jumpDirection = 1;
          return {
            setJumpDirection(direction) {
              jumpDirection = direction;
            },
            update() {
              if (!bean.isGrounded()) {
                bean.move(200 * jumpDirection, 0);
                camPos(bean.pos);
              }
            },
          };
        })(),
        "bean",
      ],
      "*": () => [sprite("watermelon"), area(), "watermelon"],
    },
  });

  let bean = level.get("bean")[0];

  bean.onExitScreen(() => {
    bean.moveTo(level.pos);
  });

  onCollide("bean", "watermelon", (bean, watermelon) => {
    destroy(watermelon);
    let remaining = level.get("watermelon").length;

    if (remaining > 0) {
      addNotificationText("+1", watermelon.pos);
    } else {
      bean.paused = true;
      addNotificationText("You win!", watermelon.pos);
      wait(.3, () => {
        if (isLastLevel) {
          go("start", true)
        } else {

          go('game', levelIdx + 1);
        }
      })
      // if (isLastLevel) {
      //   go("start", true);
      // } else {
      //   go("level-complete", levelIdx);
      // }
    }
  });

  onCollide("bean", "lava", (bean, lava) => {
    // shake();
    addNotificationText("Ouch!", bean.pos);
    wait(0.3, go("game", levelIdx));
  });

  // add a kaboom on mouse click
  onClick(() => {
    let { x } = mousePos();
    let beanX = toScreen(bean.pos).x;
    debug.log(`x: ${x}, beanX: ${beanX}`);
    if (x < beanX) {
      bean.setJumpDirection(-1);
    } else {
      bean.setJumpDirection(1);
    }
    bean.jump(750);
  });
  onKeyPress((key) => {
    if (key === "left") {
      bean.setJumpDirection(-1);
    }
    if (key === "right") {
      bean.setJumpDirection(1);
    }
    bean.jump(750);
  });
});

