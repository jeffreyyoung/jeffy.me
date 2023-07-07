import kaboom from "https://unpkg.com/kaboom@3000.0.1/dist/kaboom.mjs";


export function addTitleScene({ sceneName = 'start', titleText = 'Title', instructions = 'Press anywhere to jump', nextScene = 'game' }) {
    scene(sceneName, () => {
        let title = add([
          text(titleText, { size: 24, width: width() *2/3, align: 'center' }),
          pos(center()),
          anchor('center'),
        ])
        let directions = add([
          text(instructions, { size: 14, width: width()*2/3, align: 'center' }),
          pos(title.pos.add(0,50)),
          anchor('center'),
        ])
        add([
          text('Press anywhere to begin', { size: 14, width: width()*2/3, align: 'center' }),
          pos(center().x, height() - 100),
          anchor('center'),
        ])
        
        onClick(() => go(nextScene));
        onKeyPress(() => go(nextScene));
      })
}

export function addNotificationText(notificationText = "Yeehaw!", position = center()) {
    let notification = add([
        text(notificationText, { size: 18, }),
        color(),
        pos(position),
        anchor("center"),
        move(0, -50),
    ]);

    wait(1, () => {
        notification.destroy();
    });

}
