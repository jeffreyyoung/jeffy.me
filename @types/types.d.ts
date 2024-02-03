declare module "https://unpkg.com/kaboom@3000.0.1/dist/kaboom.mjs" {
  export * from "kaboom";
  import Default from "kaboom";
  export default Default;
}

declare module "https://esm.sh/@arrow-js/core@1.0.0-alpha.9" {
  export * from "@arrow-js/core";
}

declare module "https://esm.sh/lit-html@3.1.1" {
  export * from "lit-html";
}

declare module "https://esm.sh/canvas-confetti@1.6.0" {
  export default function createConfetti(options?: any): any;
}

declare module "https://esm.sh/peerjs@1.5.2?bundle-deps" {
  export * from "peerjs";
  export type PeerJsConnection = import("peerjs").DataConnection;
}

declare module "https://esm.sh/preact@10.19.3" {
  export * from "preact";
}

declare module "https://esm.sh/@preact/signals@1.2.2?deps=preact@10.19.3" {
  export * from "@preact/signals";
}

declare module "https://esm.sh/qrcode@1.5.3" {
  export * from "qrcode";
  import Default from "qrcode";
  export default Default;
}

declare module "https://esm.sh/react@18.2.0" {
  import Default from "react";
  export default Default;
}
declare module "https://esm.sh/react-dom@18.2.0" {
  export * from "react-dom";
  import Default from "react-dom";
  export default Default;
}

declare module "https://esm.sh/framer-motion@11.0.3" {
  export * from "framer-motion";
  import Default from "framer-motion";
  export default Default;
}

declare module "https://esm.sh/htm@3.1.1" {
  export * from "htm";
  import Default from "htm";
  export default Default;
}

declare module "https://esm.sh/three@0.161.0" {
  export * from "three";
}

declare module "https://esm.sh/cannon-es@0.20.0" {
  export * from "cannon-es";
}

declare module "https://esm.sh/three-stdlib@2.29.4?deps=three@0.161.0" {
  export * from "three-stdlib";
}
