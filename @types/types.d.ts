declare module "https://unpkg.com/kaboom@3000.0.1/dist/kaboom.mjs" {
  type Kaboom = typeof import("./kaboom.d.ts").default;
  const kaboom: Kaboom;
  export default kaboom;
}
