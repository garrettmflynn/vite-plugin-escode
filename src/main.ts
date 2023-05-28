import './style.css'

import * as lib from './lib'

import { createSignal, createEffect } from "solid-js";

const readout = document.getElementById('readout') as HTMLSpanElement
const app = document.getElementById('app') as HTMLDivElement

const button = document.createElement('button')
button.innerText = 'Click Me'
app.append(button)

let value = 10; // Top-level variable
let toResolve: any; // Lazy variable

// Basic callback function
const callback = (
  value: number // Scope variable
) => {
  toResolve = value // Set lazy variable

  const internalVariable = toResolve

  function fn() { return internalVariable + 1 } // Nested function

  return readout.innerText = fn()
}

setInterval(() => callback(value), 1000) // Event Callback

value = Date.now() // Set the variable to a new value

const newVariable = value // Declare a new variable that takes the value of the old one

const instance = new lib.Class(newVariable) // Create a class instance
console.log('Instance Created', instance)

// Create Signal
const [ count, setCount ] = createSignal(value);

createEffect(() => {
  console.error(count())
})

button.onclick = () => {
  value++ // Increment the value
  console.warn('Updated value', value)
  setCount(value)
}