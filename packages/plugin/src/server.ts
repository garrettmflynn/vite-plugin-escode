import * as url from 'url';
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

import path from 'path'
import fs from 'fs';

import { createServer as createViteServer } from 'vite'

export const createRelayServer = async ( port?: number ) => {

    /* 
        NOTE: The goal is to make this hot-reloadable and able to use TypeScript
        This will allow us to actually use Acorn like the current app...  

        You will want to inject the communcation with a websocket like you did before, rather than using HTTP requests...
    */

   return new Promise(( async res => {

        const viteServer = await createViteServer({
            // any valid user config options, plus `mode` and `configFile`
            configFile: false,
            root: path.join(__dirname, 'editor'),
            server: { 
                port,
                open: true
            },
            plugins: [
                (() => {

                    const virtualModuleId = 'virtual:escode-relay'
                    const resolvedVirtualModuleId = '\0' + virtualModuleId
                    const name = 'escode-relay'
                    return {
                        name, // required, will show up in warnings and errors
                        

                        // Each Incoming Module Request
                        resolveId(id) {
                            if (id === virtualModuleId) return resolvedVirtualModuleId
                        },

                        load(id) {
                            if (id === resolvedVirtualModuleId) {
                                return `
                                    export const send = (import.meta.hot) ? (name, data) =>  import.meta.hot.send(\`${name}:\$\{name\}\`, data) : undefined
                                    export const on = (import.meta.hot) ? (name, callback) =>  import.meta.hot.on(\`${name}:\$\{name\}\`, callback) : undefined
                                `
                            }
                        },

                        // Server Communication
                        configureServer(server) {

                            let callbacks = {}
                            const on = (name, callback) => {
                                if (!callbacks[name]) callbacks[name] = []
                                callbacks[name].push(callback)
                            }

                            const trigger = (name, payload) => {
                                const arr = callbacks[name] ?? []
                                arr.forEach(f => f(payload))
                            }

                            let connected = false
                            let queue: any[] = []

                            const send = (command, data?) => server.ws.send(`${name}:${command}`, data)
                            const sendSafe = (command, data) => (connected) ? send(command, data) : queue.push({ command, data })

                            server.ws.on('connection', () => {
                                connected = true
                                queue.forEach(o => send(o.command, o.data))
                                queue = []
                                trigger('connection', true)
                                // send('connection') // NOTE: Will be sent by the manager server
                            })

                            server.ws.on(`${name}:update-source`, ({ path , text }) => fs.writeFileSync(path, text))

                            res({
                                server,
                                send: sendSafe,
                                on 
                            }) // Resolve server connection
                        },
                    }
            })()]
        })
        
        await viteServer.listen()
    }))
    

}