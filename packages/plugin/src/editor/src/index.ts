// Control Flow Parsing Variables
import { parse } from '@babel/parser'
import esgraph from "esgraph"
import Graph from "../../../../livegraph/src/index"
import options from '../../../../options'

import * as relay from 'virtual:escode-relay'

// import '@vscode/codicons/dist/codicon.css'
import '@bendera/vscode-webview-elements/dist/vscode-tree';

// NOTE: This is how you send and receive message from the server
relay.on('from-server', (data) => console.log('From Server', data.msg))
relay.send('from-client', { message: 'this is arbitrary from the client' })

// Getting Relevant Elements from the HTML
const textElement = document.querySelector('textarea') as HTMLTextAreaElement
const submitButton = document.querySelector('button') as HTMLButtonElement
const headerElement = document.querySelector('h3') as HTMLHeadingElement

relay.on('update-source', async ({ path, uri }) => {

    headerElement.innerText = path

    const sourceMapComment = '# sourceMappingURL='

    // Get source for this file
    let source = await fetch(uri).then(res => res.text()) // Import self code
    let parsed = parse(source, options) // Get AST for self

    // Switch to the file's sourcemap if present
    const sourcemap = parsed.comments?.find(o => o.value.slice(0, sourceMapComment.length) === sourceMapComment)?.value.slice(sourceMapComment.length)
    if (sourcemap) {
        const map = (await fetch(sourcemap).then(res => res.json()))
        console.warn('Source map found!', map)
        source = map.sourcesContent[0]
        parsed = parse(source, options)
    }

    try {

        // Derive the graph for this file
        const { program: ast } = parsed
        const nodes = esgraph(ast) // Parse the graph for self
        const [start, end, all] = nodes

        const graph = new Graph(source)

        console.log('AST (self)', ast)
        console.log('ESGraph Nodes', all)
        console.log('DOT', esgraph.dot(nodes, { source }))
        console.log('LiveGraph Output', graph.live, graph.ast)

    } catch (e) {
        console.error('Could not parse:', e.message)
    }

    textElement.value = source
})


submitButton.onclick = () => relay.send('update-source', { path: headerElement.innerText, text: textElement.value })



// UPDATE THE UI WITH THE TREE
relay.on('connection', (allFiles) => {
    
    const tree = document.getElementById('tree')

    const icons = {
        branch: 'folder',
        leaf: 'file',
        open: 'folder-opened',
      };
      
      console.log('All Files', allFiles)

      let data = []

      const createFile = (name, value?) => {
        const obj =  {
            icons,
            label: name,
        }

        if (value) obj.value = value

        return obj
      }

      const createFolder = (name) => {
        const obj = createFile(name)
        obj.subItems = []
        return obj
      }


      // NOTE: Make sure you use the smallest base possible
      // NOT: /Users/garrettflynn/Documents/Github/control-flow/src/main.ts
      // TO: /control-flow/src/main.ts and control-flow/node_modules/vite/dist/client/client.mjs
      Object.entries(allFiles).forEach(([path, source]) => {

        const split = path.split('/').filter(v => v)
        const filename = split.pop()

        const file = createFile(filename, source)

        let target = data
        split.forEach(label => {
            const found = target.find(o => o.label === label)
            if (found) target = found.subItems
            else {
                const folder = createFolder(label)
                target.push(folder)
                target = folder.subItems
            }
        })

        target.push(file) // Add the file to the last folder
      })
    
      tree.data = data;
    
      tree.addEventListener('vsc-select', (event) => {
        console.log(event.detail);
      });
    
})