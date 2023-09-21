import "./style.css";
import * as lib from "./lib";
import { createSignal, createEffect } from "solid-js";
const readout = document.getElementById("readout");
const app = document.getElementById("app");
const button = document.createElement("button");
button.innerText = "Click me";
app.append(button);
let value = 10;
let toResolve;

class MyClass {
  constructor(){}
}
const callback = (value2) => {
  toResolve = value2;
  const internalVariable = toResolve;
  function fn() {
    return internalVariable + 1;
  }
  return readout.innerText = fn();
};
setInterval(() => callback(value), 1e3);
value = Date.now();
const newVariable = value;
const instance = new lib.Class(newVariable);
console.log("Instance Created", instance);
const [count, setCount] = createSignal(value);
createEffect(() => {
  console.error(count());
});
button.onclick = () => {
  value++;
  console.warn("Updated value", value);
  setCount(value);
};
