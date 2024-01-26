import van from './../../deps/van.js';


export { van }

export const {
    form,
    ul,
    li,
    nav,
    main,
    p,
    h1,
    h2,
    h3,
    h4,
    hr,
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
    svg,
    image,
} = van.tags;

export const noop = () => span({ style: 'display: none;'})