import kaboom from "https://unpkg.com/kaboom@3000.0.1/dist/kaboom.mjs";


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