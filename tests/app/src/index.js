
const x = 1
let y = 2

y = 3

function fn(arg) {
    const constant = 6
    console.log(constant)
    return x + y + constant
}

const arrowFunction = (arrowArg) => {
    const constant = 3 // NOTE: Registered as the top scope...
    return x + arrowArg + constant
}

console.log(fn())