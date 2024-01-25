import van from './../../deps/van.js';


export { van }

export const {
    form,
    ul,
    li,
    p,
    h1,
    h2,
    h3,
    h4,
    h5,
    h6,
    div,
    span,
    summary,
    details,
    small,
    input,
    button,
    table,
    tr,
    td,
    th,
    label,
    select,
    option,
    iframe,
    img,
} = van.tags;

export const noop = () => span({ style: 'display: none;'})