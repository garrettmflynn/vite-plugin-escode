import { parse } from "@babel/parser";
import babelGenerator from "@babel/generator";
const generate = babelGenerator.default

import fs from 'node:fs'
import options from "../../options";
import { createRelayServer } from "./server";
import http from 'http'

const fileRegex = /\.(flow)$/

const PORT = 40000 // Select predictable port

export default async function escodeVitePlugin() {
    
    const name = 'escode'

    let relayServer;

    let initialLoad = false
    let files = {}

    return {
        name, // required, will show up in warnings and errors
        buildStart: async () => {
            relayServer = await createRelayServer(PORT)

            // Send files on editor page reload
            relayServer.on('connection', () => {
                if (initialLoad) setTimeout(() => relayServer.send('connection', files), 100) // Wait for JavaScript events on the page to load
            })
        },
        buildEnd: () => relayServer.server.close(), // Vite server closed
        configureServer: (server) => {

             // Send files on initial server connection
            server.ws.on('connection', () => {
                relayServer.send('connection', files)
                initialLoad = true
            })

            server.ws.on(name, ({ event, data }) => relayServer.send(event, data))
        },

        // Transform the code so that events are sent through the relay server
        transform(source, id) {

            const result = { code: source, map: null } // provide source map if available

            // // Create AST from multiple files
            // const a = "var a = 1;";
            // const b = "var b = 2;";
            // const astA = parse(a, { sourceFilename: "a.js" });
            // const astB = parse(b, { sourceFilename: "b.js" });
            // const ast = {
            //     type: "Program",
            //     body: [].concat(astA.program.body, astB.program.body),
            // };

            // const { program: ast } = parse(source, options)

            // return generate(
            //     ast,
            //     { 
            //         sourceMaps: true,
            //         minified: true
            //     },
            //     source
            // )

            // // Relay source code link for main file to the editor
            // if (!mainFile || id === mainFile) {
            //     result.code = `import.meta.hot.send('${name}', { event: 'update-source', data:{ path: "${id}", uri: import.meta.url } })\n${source}`
            //     mainFile = id
            // }

            files[id] = source
            // relayServer.send('initialize-source', { path: id, source })

            return result
        }
    }
}