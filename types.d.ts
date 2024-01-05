declare module "https://esm.sh/@arrow-js/core@1.0.0-alpha.9" {
    export function reactive<T>(obj: T): T;
    export const html: any;
    export function watch<T>(yay: () => T, a: (arg: T) => void): any;
}

type PeerJsConnection = {
    send: (data: any) => void;
    on(event: 'open', callback: () => void): void;
    on(event: 'data', callback: (data: any) => void): void;
    on(event: 'close', callback: () => void): void;
    on(event: 'error', callback: (err: any) => void): void;
    destroy(): void;
    open: boolean;
}
declare class Peer {
    constructor(myPeerId?: string);

    connect(peerId: string): PeerJsConnection;
    destroy(): void;
    on(event: 'open', callback: (id: string) => void): void;
    on(event: 'connection', callback: (connection: PeerJsConnection) => void): void;
}

declare module "https://cdn.jsdelivr.net/npm/lit-html@3.0.2/lit-html.min.js" {
    export const html: any;
    export const render: any;
}