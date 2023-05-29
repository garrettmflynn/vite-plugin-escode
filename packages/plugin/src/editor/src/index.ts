// Control Flow Parsing Variables
import { parse } from '@babel/parser'
import esgraph from "esgraph"
import Graph from "../../../../livegraph/src/index"
import options from '../../../../options'

import * as relay from 'virtual:escode-relay'

// import '@vscode/codicons/dist/codicon.css'
import '@bendera/vscode-webview-elements/dist/vscode-tree';
import { findCommon } from './utils/strings'

// NOTE: This is how you send and receive message from the server
relay.on('from-server', (data) => console.log('From Server', data.msg))
relay.send('from-client', { message: 'this is arbitrary from the client' })

// Getting Relevant Elements from the HTML
const textElement = document.querySelector('textarea') as HTMLTextAreaElement
const submitButton = document.querySelector('button') as HTMLButtonElement
const rootElement = document.getElementById('root')
const editorElement = document.getElementById('editor') as HTMLDivElement

relay.on('update-source', async ({ path, uri }) => {

    editorElement.setAttribute('data-filename', path)

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


submitButton.onclick = () => {
    const path = editorElement.getAttribute('data-filename')
    if (path) relay.send('update-source', { path, text: textElement.value })
    else console.error('No file specified to edit')
}



// UPDATE THE UI WITH THE TREE
relay.on('connection', (allFiles) => {

    const tree = document.getElementById('tree')

    const icons = {
        branch: 'folder',
        leaf: 'file',
        open: 'folder-opened',
    };

    let data = []

    const createFile = (opts) => Object.assign({ icons }, opts)

    const createFolder = (o) => {
        const obj = createFile(o)
        obj.subItems = []
        return obj
    }

    const rootPath = Object.keys(allFiles).reduce((acc, str) => findCommon(acc, str))

    rootElement.innerText = rootPath.split('/').filter(v => v).pop()

    const paths = {}

    const fileOptions = Object.entries(allFiles).map(([path, source]) => {

        path = path.replace(rootPath, '') // Shorten path with common string

        const split = path.split('/').filter(v => v)
        const filename = split.pop()

        // Get the enclosing folder
        let target = data
        const indices = split.map(label => {
            const idx = target.findIndex(o => o.label === label)
            if (idx !== -1) {
                target = target[idx].subItems
                return idx
            }
            else {
                const folder = createFolder({ label })
                const idx = target.length
                target.push(folder)
                target = folder.subItems
                return idx
            }
        })

        // Create File
        const idxPath = `${[...indices, target.length - 1].join('/')}`
        const file = createFile({
            label: filename,
            path: idxPath,
            value: source
        })


        target.push(file) // Add the file to the last folder
        paths[idxPath] = path

        return file
    })

    tree.data = data;

    const loadOption = (opt) => {
        editorElement.setAttribute('data-filename', paths[opt.path])
        textElement.value = opt.value
    }

    tree.addEventListener('vsc-select', (event) => {
        const option = event.detail
        if (option.itemType === 'leaf') loadOption(option)
    });

    // Load the first option
    loadOption(fileOptions[0])

})