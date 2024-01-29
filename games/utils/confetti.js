export function doConfetti() {
  import("https://esm.sh/canvas-confetti@1.6.0").then(async (confetti) => {
    for (let i = 0; i < 3; i++) {
      confetti.default({
        particleCount: 100,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
      });
      confetti.default({
        particleCount: 100,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
      });
      await new Promise((r) => setTimeout(r, 500));
    }
  });
}
