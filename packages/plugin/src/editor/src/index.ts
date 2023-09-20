// Control Flow Parsing Variables
import { parse } from '@babel/parser'
import Graph, { checkForSourceMap } from "../../../../livegraph/src/index"

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

const updateSource = async ({ path, uri }) => {

    editorElement.setAttribute('data-filepath', path)

    // Get source for this file
    let source = await fetch(uri).then(res => res.text()) // Import self code
    
    const mapped = await checkForSourceMap(source)

    // Derive the graph for this file
    const graph = new Graph(mapped ?? source)

    console.log('LiveGraph Output', graph.live, graph.ast)

    // textElement.value = source
    console.error('Not updating the text of the source...')

    return graph
}

relay.on('update-source', updateSource)


submitButton.onclick = () => {
    const path = editorElement.getAttribute('data-filepath')
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
    const shortToOriginalPaths = {}

    const fileOptions = Object.entries(allFiles).map(([path, uri]) => {

        // updateSource({ path, uri })

        const ogPath = path
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
        const idxPath = `${[...indices, target.length ].join('/')}`
        const file = createFile({
            label: filename,
            path: idxPath,
            value: uri
        })

        target.push(file) // Add the file to the last folder
        paths[idxPath] = path
        shortToOriginalPaths[path] = ogPath

        return file
    })

    tree.data = data;

    const loadOption = (opt) => {
        const selectedPath = paths[opt.path]
        editorElement.setAttribute('data-filepath', selectedPath)
        updateSource({ path: selectedPath, uri: shortToOriginalPaths[selectedPath]})
        textElement.value = opt.value
    }

    tree.addEventListener('vsc-select', (event) => {
        const option = event.detail
        if (option.itemType === 'leaf') loadOption(option)
    });

    // Load the first option
    loadOption(fileOptions[0])

})