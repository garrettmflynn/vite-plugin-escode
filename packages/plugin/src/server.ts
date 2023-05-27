import * as url from 'url';
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

import path from 'path'
import express, { Response } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';

type ClientType = {
    id: number,
    response: Response
}

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
            server: { port },
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

                            const send = (command, data) => server.ws.send(`${name}:${command}`, data)

                            server.ws.on('connection', () => send('from-server', { msg: 'hello' })) // Send to all clients
                            server.ws.on(`${name}:from-client`, (data, client) => {
                                console.log('Got an edit...', data)
                            })

                            res({
                                server,
                                send
                            }) // Resolve server connection
                        },
                    }
            })()]
        })
        
        await viteServer.listen()
    }))
    

}