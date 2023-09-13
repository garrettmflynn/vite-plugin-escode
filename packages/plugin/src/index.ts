import { parse } from "@babel/parser";
import babelGenerator from "@babel/generator";
const generate = babelGenerator.default

import fs from 'node:fs'
import options from "../../options";
import { createRelayServer } from "./server";
import http from 'http'

const virtualModuleId = 'virtual:escode'
const resolvedVirtualModuleId = '\0' + virtualModuleId
let mainFile = '';

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


            // Example: wait for a client to connect before sending a message
            server.ws.on('connection', () => server.ws.send('escode:from-server', { msg: 'hello' })) // Send to all clients
            server.ws.on('escode:from-client', (data, client) => {
                var postData = JSON.stringify(data);
                const options = {
                    hostname: 'localhost',
                    port: PORT,
                    path: '/',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': `${postData.length}`
                    }
                }
                const req = http.request(options) //, (res) => res.on('data', (d) => process.stdout.write(d)));
                req.on('error', (e) => console.error(e));
                req.write(postData);
                req.end();
                // client.send('escode:from-server', { msg: "Pong" })
            }) // Use client to only respond to specific client
        },

         // Each Incoming Module Request
         resolveId(id) {
            if (id === virtualModuleId) return resolvedVirtualModuleId
        },
        load(id) {
            if (id === resolvedVirtualModuleId) {
                return `
                export const msg = "from virtual module"
                if (import.meta.hot) {
                    import.meta.hot.on('escode:from-server', (data) => console.log(data.msg))
                    import.meta.hot.send('escode:from-client', { message: 'this is arbitrary from the client' })
                }
                
                `
            }
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

            // Relay source code link for main file to the editor
            if (!mainFile || id === mainFile) {
                result.code = `import.meta.hot.send('${name}', { event: 'update-source', data:{ path: "${id}", uri: import.meta.url } })\n${source}`
                mainFile = id
            }

            files[id] = source

            return result
        }
    }
}