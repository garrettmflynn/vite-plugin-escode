import * as relay from 'virtual:escode-relay'

// NOTE: This is how you send and receive message from the server
relay.on('from-server', (data) => console.log('From Server', data.msg))
relay.send('from-client', { message: 'this is arbitrary from the client' })

