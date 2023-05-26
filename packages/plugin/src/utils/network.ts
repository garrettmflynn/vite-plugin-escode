import net, { AddressInfo } from "node:net"

export async function createServer(port = 0): Promise<net.Server> {
    return new Promise((resolve, reject) => {
        const srv = net.createServer();
            srv.once('error', function(err) {
                if (err.code === 'EADDRINUSE') reject(err)
            });
            srv.listen(port, () => resolve(srv));

    })
}

export async function getFreePorts(n=1): Promise<number[]> {
    return new Promise( async res => {
        let servers: net.Server[] = []
        for (let i = 0; i < n; i++) servers.push(await createServer()) // Create several servers in series
        const ports = servers.map(srv => (srv.address() as AddressInfo).port) // Get port for each server
        servers.forEach(srv => srv.close()) // Close all servers
        res(ports)
    })
}
