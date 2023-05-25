import './style.css'
import typescriptLogo from './typescript.svg'
import viteLogo from '/vite.svg'
import { setupCounter } from './counter.ts'

// Vite Plugin Imports
import './log.flow' // NOTE: A custom file import
import { msg } from 'virtual:escode'
console.log(msg)

const sourceMapComment = '# sourceMappingURL='

// Control Flow Parsing Variables
import { parse } from '@babel/parser'
import esgraph from "esgraph"
import Graph from "../packages/livegraph/src/index"

import options from '../packages/options.ts'

// Get source for this file
let source = await fetch(import.meta.url).then(res => res.text()) // Import self code
let parsed = parse(source, options) // Get AST for self

// Switch to the file's sourcemap if present
const sourcemap = parsed.comments?.find(o => o.value.slice(0, sourceMapComment.length) === sourceMapComment)?.value.slice(sourceMapComment.length)
if (sourcemap) {
  const map = (await fetch(sourcemap).then(res => res.json()))
  console.warn('Source map found!', map)
  source = map.sourcesContent[0]
  parsed = parse(source, options)
}

// Derive the graph for this file
const { program: ast } = parsed
const nodes = esgraph(ast) // Parse the graph for self
const [ start, end, all ] = nodes

const code = `
  let x = 10;
  const v = 200; // Top-level variable
  let toResolve;
  const callback = (v) => toResolve = v // Is redeclaring v inside a scope
  setTimeout(() => callback(x + Date.now()), 1000)
`

const withCallback = `
  let x = 10;
  const callback = () => {
    const x = 2000
    console.log(x)
  }
  setTimeout(callback, 1000)
`


const graph = new Graph(code)

console.log('AST (self)', ast)
console.log('ESGraph Nodes', all)
console.log('DOT', esgraph.dot(nodes, { source }))
console.log('LiveGraph Output', graph.live, graph.ast)

// graph.modify()


// General Demo Code
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <a href="https://vitejs.dev" target="_blank">
      <img src="${viteLogo}" class="logo" alt="Vite logo" />
    </a>
    <a href="https://www.typescriptlang.org/" target="_blank">
      <img src="${typescriptLogo}" class="logo vanilla" alt="TypeScript logo" />
    </a>
    <h1>Vite + TypeScript</h1>
    <div class="card">
      <button id="counter" type="button"></button>
    </div>
    <p class="read-the-docs">
      Click on the Vite and TypeScript logos to learn more
    </p>
  </div>
`

setupCounter(document.querySelector<HTMLButtonElement>('#counter')!)
