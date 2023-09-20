import  { Parser } from 'acorn'
import tsPlugin from 'acorn-typescript'

import { generate } from 'escodegen'

import fullWalk from './full'

const sourceMappingURLRegex = /\/\/# sourceMappingURL=(.*?)$/;

const parser = Parser.extend(tsPlugin() as any)

const parse = (code) => {
    return parser.parse(code, {
        ecmaVersion: 'latest',
        sourceType: 'module',
        locations: true,
    })
}


export const checkForSourceMap = async (code) => {

    // Switch to the file's sourcemap if present
    const match = code.match(sourceMappingURLRegex);

    if (match && match[1]) {
        const map = (await fetch(match[1]).then(res => res.json()))
        return map.sourcesContent[0]
    }
}

export default class Graph {
    
    ast: any = {}
    code: string = ''
    live = {}

    constructor(code: string) {
        console.error(code)
        this.update(code)
    }

    update = (code = this.code) => {
        this.code = Object.keys(this.ast).length ? generate(this.ast, code) : code;
        this.ast = parse(this.code)

        const variables = fullWalk(this.ast)

        console.log('Program Variable Object', variables)
    }

    modify() {

        // walk.simple(this.ast, {
        //     Literal(node) {
        //         console.log(`Found a literal: ${node.value}`)
        //         node.value = node.value // Replace all literals with 20
        //     }
        // })

        this.update()
    }
}