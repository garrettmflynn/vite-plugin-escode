import  { parse } from 'acorn'
import { generate } from 'escodegen'
import fullWalk from './full'

export default class Graph {
    
    ast: any = {}
    code: string = ''
    live = {}

    constructor(code: string) {
        this.update(code)
    }

    update = (code = this.code) => {
        this.code = Object.keys(this.ast).length ? generate(this.ast, code) : code;
        this.ast = parse(this.code, {
            ecmaVersion: 'latest',
            sourceType: 'module',
            locations: true,
        })

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