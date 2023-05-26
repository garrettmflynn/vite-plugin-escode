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

import { createServer } from "./utils/network"

export const createRelayServer = async ( port ) => {

    await createServer(port).then(s => s.close()) // Safely flag that a server with this port already exists

    /* 
        NOTE: The goal is to make this hot-reloadable and able to use TypeScript
        This will allow us to actually use Acorn like the current app...  
    */

    // const viteServer = await createViteServer({
    //     // any valid user config options, plus `mode` and `configFile`
    //     configFile: false,
    //     root: path.join(__dirname, 'editor'),
    //     server: {
    //     port: port,
    //     },
    // })

    // await viteServer.listen()
    
    // Setup the event server using Express
    const app = express();
    app.use(cors());
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: false }));

    // Serve the example HTML page
    app.use(express.static(path.join(__dirname, 'editor')));

    // Track all connected clients and send them game state updates
    let clients: ClientType[] = [];

    function send(o) {
        clients.forEach(client => client.response.write(`data: ${JSON.stringify(o)}\n\n`))
    }

    function postHandler(req, res) {
        send(req.body)
        res.sendStatus(200)
    }

    function eventsHandler(request, response) {

        response.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache'
        });

        response.write(`data: ${JSON.stringify({ initialized: true })}\n\n`);

        const clientId = Date.now();
        const newClient = { id: clientId, response };
        clients.push(newClient);

        request.on('close', () => {
            console.log(`${clientId} Connection closed`);
            clients = clients.filter(client => client.id !== clientId);
        });
    }

    app.get('/events', eventsHandler);
    app.post('*', postHandler);

    // Start the event server
    let server = app.listen(port, () => {
        console.log(`Relay server created at http://127.0.0.1:${server.address().port}`) // NOTE: This will always be local
    })

    return {
        server,
        send
    }

}