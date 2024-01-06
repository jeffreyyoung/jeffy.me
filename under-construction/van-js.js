import { van } from "https://cdn.jsdelivr.net/gh/vanjs-org/van/public/van-1.2.7.min.js"

const { h1 } = van.tags;

van.add(document.getElementById('app'), h1('Hello World'));