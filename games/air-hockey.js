import kaboom from "https://unpkg.com/kaboom@3000.0.1/dist/kaboom.mjs";

// initialize context
kaboom();
let RADIUS = 50;
scene("game", () => {
  let player1Score = 0;
  let player2Score = 0;

  let puck = add([
    circle(RADIUS),
    color(Color.BLACK),
    pos(center().add(0, 10+RADIUS)),
    "puck",
  ]);

  let player1 = add([
    circle(RADIUS),
    color(Color.BLUE),
    pos(center().x, height() - 10 - RADIUS),
    "hitter",
    "player1",
  ]);

  let player2 = add([
    circle(RADIUS),
    color(Color.RED),
    pos(center().x, 30),
    "hitter",
    "player2",
  ]);
  
  
  function getTarget( y = 0) {
    if (y < (height()/4)) {
        return player2;
    } else if (y > (height()-height()/4)) {
        return player1;
    } else {
        return null;
    }
  }
  onTouchStart((touch) => {
    let target = getTarget(touch.y);
    if (target) {

        target.moveTo(touch.x, touch.y);
    }
  });

  onTouchMove((touch) => {
    let target = getTarget(touch.y);
    if (target) {
        target.moveTo(touch.x, touch.y);
    }
  });

  onCollide("puck", "hitter", (puck, hitter) => {});
});

go("game");
