declare module "https://esm.sh/@arrow-js/core@1.0.0-alpha.9" {
  export function reactive<T>(obj: T): T;
  export const html: any;
  export function watch<T>(yay: () => T, a: (arg: T) => void): any;
}

declare module "https://cdn.jsdelivr.net/npm/lit-html@3.0.2/lit-html.min.js" {
  export const html: any;
  export const render: any;
}

declare module "https://cdn.jsdelivr.net/gh/vanjs-org/van/public/van-1.2.7.min.js" {
  // https://stackoverflow.com/questions/71342646/adding-import-statement-to-global-d-ts-destroys-type-and-module-declarations
  type Van = import("./van.d.ts").Van;
  const van: Van;
  export default van;
}

declare module "https://unpkg.com/kaboom@3000.0.1/dist/kaboom.mjs" {
  type Kaboom = typeof import("./kaboom.d.ts").default;
  const kaboom: Kaboom;
  export default kaboom;
}

declare module "https://esm.sh/peerjs@1.5.2?bundle-deps" {
  export type PeerJsConnection = {
    send: (data: any) => void;
    on(event: "open", callback: () => void): void;
    on(event: "data", callback: (data: any) => void): void;
    on(event: "close", callback: () => void): void;
    on(event: "error", callback: (err: any) => void): void;
    destroy(): void;
    open: boolean;
  };
  class Peer {
    constructor(myPeerId?: string, ops?: { debug: number});

    connect(peerId: string): PeerJsConnection;
    destroy(): void;
    on(event: "open", callback: (id: string) => void): void;
    on(event: "error", callback: (err: any) => void): void;
    on(
      event: "connection",
      callback: (connection: PeerJsConnection) => void
    ): void;
    on(event: "close", callback: (err: any) => void): void;
  }

  export { Peer };
  export default Peer;
}
