import van from "../../deps/van"
import { div } from "./tags"

export const confetti = (targetElement = document.body) => {
    let confettiHolder = div();

    
    van.add(targetElement, confettiHolder);

}