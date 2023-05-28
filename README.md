# vite-plugin-escode
A Vite plugin for live-editing arbitrary JavaScript applications

## Requirements
1. A main application: (`typescript`)
2. A hot-reloading bundler (`vite`)
    - Aggregate all source files with their paths + pass to the Editor through a relay server
    - Transform the source to inject monitoring code that sends back to the OG server (or relay server?)
3. A relay server (WS or SSE) that the bundle can access: (`vite` + `express`)
4. An editor window that connects to the relay server + send / receives messages (`solid`)

## To Do
1. Parse and render the comprehensive demo code
2. Replace every variable with a monitorable value in a global store
    - Primitives have getter/setter
    - Objects have Proxies
    - Functions have wrappers
    - Each graph has a pool that indicates the possible global state values that it can hook into, as well as a flow that represents the actual flow of information.
    - Each of these is a node with source declaration + value + an onCodeChange callback that recompiles the whole tree + next + previous
