/// <reference path="../@types/kaboom-global.d.ts" />
// @ts-ignore
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
  titleText: '',
  instructions: 'Press left side of screen to jump left and right side to jump right',
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
    "=                        =",
    "=  B                     =",
    "=  _                     =",
    "==================       =",
    "=                        =",
    "=                        =",
    "=                        =",
    "=                        =",
    "=                        =",
    "=                        =",
    "=      ===================",
    "=                        =",
    "=                        =",
    "=                        =",
    "=                        =",
    "=                  *     =",
    "=                  _     =",
    "==========================",
  ],
  [
    "========================================================",
    "=                                                      =",
    "=                                              *       =",
    "=      B                                       _       =",
    "=      _                                               =",
    "=                                                      =",
    "=                                                      =",
    "=                                                      =",
    "=                                                      =",
    "=                                                      =",
    "=                                                      =",
    "=                                                      =",
    "=                                                      =",
    "=   *                                                  =",
    "=   _                                                  =",
    "========================================================",
  ],
  [
    "========================================================",
    "=                                                      =",
    "=                                              *       =",
    "=      B       *                 *             _       =",
    "=      _                                               =",
    "=                                                      =",
    "=                                                      =",
    "=                     *                   *            =",
    "=                                                      =",
    "=                                                      =",
    "=                          *                           =",
    "=                                                      =",
    "=              *                          *            =",
    "=   *                                                  =",
    "=   _                                                  =",
    "========================================================",
  ],
];

scene("game", (levelIdx = 0) => {
  setGravity(3000);
  camScale(0.5, 0.5);
  console.log("level", levelIdx);
  add([
    text(`Level ${levelIdx + 1}`, { size: 12 }),
    pos(5, 5),
    fixed(),
  ]);
  function addControls() {
    add([
      rect(width()/3, height()/5),
      pos(width()/4, height()*0.8),
      anchor('center'),
      color(255, 255, 255),
      opacity(0.35),
      fixed(),
    ])
    add([
      text('L', { size: height()/10 }),
      pos(width()/4, height()*0.8),
      anchor('center'),
      outline(4),
      color(255, 255, 255),
      opacity(0.55),
      fixed(),
    ])

    add([
      rect(width()/3, height()/5),
      pos(width()*3/4, height()*0.8),
      anchor('center'),
      color(255, 255, 255),
      opacity(0.35),
      fixed(),
    ])
    add([
      text('R', { size: height()/10 }),
      pos(width()*3/4, height()*0.8),
      anchor('center'),
      outline(4),
      color(255, 255, 255),
      opacity(0.55),
      fixed(),
    ])
  }
  addControls();
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
      wait(.5, () => {
        if (isLastLevel) {
          go("start", true)
        } else {

          go('game', levelIdx + 1);
        }
      })
    }
  });

  onCollide("bean", "lava", (bean, lava) => {
    // shake();
    addNotificationText("Ouch!", bean.pos);
    bean.paused = true;
    wait(.5, () => go("game", levelIdx));
  });

  // add a kaboom on mouse click
  onClick(() => {
    let { x } = mousePos();
    let beanX = toScreen(bean.pos).x;
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

