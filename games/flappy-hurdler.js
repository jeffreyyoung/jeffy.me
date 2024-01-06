/// <reference path="../node_modules/kaboom/dist/global.d.ts" />
// @ts-ignore
import kaboom from "https://unpkg.com/kaboom@3000.0.1/dist/kaboom.mjs";

// initialize context
kaboom({
  background: [51, 204, 255],
});

let score = 0;

loadSprite("bean", "https://kaboomjs.com/sprites/bean.png");

scene("start", () => {
  let clicks = 5;

  let getText = () => `score: ${score}\nTap ${clicks} times to start again`;

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
const PLATFORM_HEIGHT = 48;
scene("game", () => {
  score = 0;

  setGravity(3000);

  // load assets

  // add a character to screen
  let bean = add([
    // list of components
    sprite("bean"),
    pos(12, height() - 80),
    area(),
    offscreen({ destroy: false }),
    body(),
    "bean",
  ]);

  let platform = add([
    rect(width(), 48),
    pos(0, height() - 48),
    outline(4),
    area(),
    body({ isStatic: true }),
    color(0, 200, 0),
  ]);

  bean.onExitScreen(() => {
    bean.moveTo(12, 40);
  });

  const scoreText = () => `score: ${score}`;
  let scoreAndTime = add([
    text(scoreText(), {
      size: 14,
    }),
    pos(center()),
    anchor("center"),
    
  ]);
  function setScore(nextScore) {
    score = nextScore;
    scoreAndTime.text = scoreText();
  }

  function addBarrier() {
    // add tree
    let barrier = add([
      rect(48, rand(25, 110)),
      area(),
      outline(4),
      anchor("bot"),
      pos(width(), height() - 48),
      offscreen({ destroy: false }),
      // color(255, 180, 255),
      move(LEFT, 480+(score*15)),
      "barrier", // add a tag here
    ]);

    barrier.onExitScreen(() => {
        console.log('barrier is gone!!!!');
        barrier.destroy();
        setScore(score + 1);
    })
    let minTime = Math.max(1-(score * .1), .8);
    let maxTime = Math.max(1.5-(score*.1), 1);
    wait(rand(minTime, maxTime), () => {
      addBarrier();
    });
  }

  addBarrier();

  onCollide("barrier", "bean", (args) => {
    addKaboom(bean.pos, {
      // @ts-ignore
      text: "Yummy!!!",
    });
    shake(8);
    go("start");
  });

  // add a kaboom on mouse click
  onClick(() => {
    if (bean.isGrounded()) {
        bean.jump(1000);
    }
  });
  onKeyPress(() => {
    if (bean.isGrounded()) {
        bean.jump(1000);
    }
  });
});

go("game");
