import { generate } from 'escodegen'
import * as walk from 'acorn-walk'
import { ExpressionStatement } from 'typescript'

type VariableKind = 'let' | 'const' | 'var' | 'function' | 'class' | 'arg'

const liveIdSymbol = Symbol('LiveID')

const fullWalk = (ast) => {

    let variablesById = {}
    let variableObject: {[x:string]: any} = { } // Inline declared with symbol keys (https://stackoverflow.com/questions/6337344/activation-and-variable-object-in-javascript)


    const getVariableSafe = (node, create: string | boolean = true) => {
        if (liveIdSymbol in node) return variablesById[node[liveIdSymbol]]
        else{
            console.error(node)
            throw new Error('Node has not been registered')
        }
    }

    // 1. Register all variables before walking to determine broader structural aspects of the code
    const declared = new Set()
    const kinds = {}
    const used = []

    const declarationNodes = ['VariableDeclarator', 'FunctionDeclaration', 'ClassDeclaration' ]
    
    type DeclarationInfo = {
        kind?: VariableKind,
        scope?: string,
        destructured?: {
            idx: number,
        },
        group?: symbol
    }

    function addDeclaration(node, info: DeclarationInfo = {}) {
        const ref = define(node) // Ensure all declarations are defined
        declared.add(node[liveIdSymbol])
        Object.assign(ref, info)
    }

    function addType(node, kind) {
        kinds[node[liveIdSymbol]] = kind
    }

    // const variablesByName = {}

    function define(node, info = {}) {
        // const sameNameNodes = variablesByName[node.name] ?? (variablesByName[node.name] = [])

        // sameNameNodes.push(node)
        const resolved = variablesById[node[liveIdSymbol]]
        if (resolved) return resolved

        const id = node[liveIdSymbol] = Symbol('livegraph') // sameNameNodes[0]?.[liveIdSymbol] || Symbol('livegraph')

        // if (!sameNameNodes.length) {
            Object.defineProperty(variablesById, id, {
                value: { 
                    name: node.name, 
                    usedBy: [],
                    ...info
                },
                configurable: false,
                enumerable: true
            })
        // }

        return variablesById[id]

    }

    walk.full(ast, (node) => {
        const isDeclaration = declarationNodes.includes(node.type)

        if (node.type === "VariableDeclaration") node.declarations.forEach(({ id: innerNode }) => innerNode.elements ? innerNode.elements.forEach(n => addType(n, node.kind)) : addType(innerNode, node.kind))
        else if (node.type === "FunctionExpression") {
            console.log('FUNCTION', node.name, node)
        }
        else if (isDeclaration) {
            const innerNode = node.id
            const hasParams = !!node.params
            const nested = innerNode.elements ?? node.params

            // NOTE: Somewhere should also still have .arguments
            if (hasParams) {

                const entry = define(innerNode)

                const returned = node.body.body.find(n => n.type === 'ReturnStatement')
                if (returned) {
                    entry.returned = returned // NOTE: Not the right entry...
                }

                node.body.body.forEach(n => {
                    if (n.type === "VariableDeclaration") {

                        function addScope(node, scopeNode) {
                            const entry = define(node)
                            entry.scope = scopeNode.name
                        }

                        n.declarations.forEach(({ id: nestedNode }) => nestedNode.elements ? nestedNode.elements.forEach(n => addScope(n, innerNode)) : addScope(nestedNode, innerNode))
                        
                    }
                })

                entry.declaration = generate(node)
                
            }

            // NOTE: Must also find init.body.arguments

            if (nested) {

                const symbol = Symbol('Shared definition group')

                nested.forEach((loopNode, i) => addDeclaration(loopNode, hasParams ? { kind: 'arg', scope: innerNode.name } : { group: symbol, destructured: { idx: i } }))
            }
            // Add declaration if not nested OR a function declaration
            if (!nested || hasParams) addDeclaration(innerNode, { kind: node.type.includes('Declaration') ? node.type.replace('Declaration', '').toLowerCase() : undefined } )
        }
        else if (node.type === 'Identifier') used.push(node)

        // Define Imports
        else if (node.type === 'ImportDeclaration') {

            const id = Symbol('Shared import group')

            node.specifiers.forEach(n => {
                const entry = define(n.local, {group: id, source: node.source.value })
                const declaration = generate(node)
                entry.declaration = declaration
            })
        }

    }) // Assign a unique ID to all nodes

    // globals.forEach(symbol => {
    //     define()
    // })


    let ignored = [ 
        'Literal', 
        'Program', 
        'ImportNamespaceSpecifier', 
        'ImportSpecifier', 
        'ImportDeclaration' 
    ]

    // 2. Determine how different variables are used by one another
    walk.fullAncestor(ast, (node, _, ancestors) => {

        // NOTE: Must parse CallExpression (e.g. Date.now()) in arguments

        if (ignored.includes(node.type)) return // Refer to literals from other nodes

        // Track the text declaration for every variable
        else if (node.type === 'VariableDeclaration') {
            const declaration = generate(node)
            node.declarations.forEach(node => {

                const idNode = node.id

                function setMetadata(idNode) {
                    const entry = getVariableSafe(idNode) // Initialize ID Node
                    entry.declaration = declaration
                    if (node.init) {
                        entry.value = node.init.raw // NOTE: Not the right entry for non arrowfunctions
                    }
                }

                if (idNode.elements) idNode.elements.forEach(n => setMetadata(n)) 
                else setMetadata(idNode);

            })
        }

        // else console.log('Unknown  Node', node.type, node)

        // NOTE: This is where something is done...
        if (node.type === 'ExpressionStatement') {
            const ExpressionNode = node as unknown as ExpressionStatement
            // const name = ExpressionNode.expression.callee.name
            // const args = ExpressionNode.expression.arguments
            // args.forEach((argNode, i) => {

            //     // Register variable inputs
            //     if (argNode.type === 'Identifier') variableObject[argNode.name].usedBy.push(name)

            //     // Track inline literal arguments
            //     else if (argNode.type === 'Literal') {
            //         const id = Symbol(`InlineLiteral`)
            //         variableObject[id] = {
            //             value: argNode.value,
            //             usedBy: [ name ],
            //             arg: i
            //         }
            //     }

            //     // Track inline function arguments
            //     else if (argNode.type.includes('FunctionExpression')) {

            //         const id = Symbol(`Inline${argNode.type}`)
            //         const dependencies = argNode.body.arguments.map(arg => {
            //             if (arg.name) return arg.name
            //             else {
            //                 const jointArts = []
            //                 if (arg.left.name) jointArts.push(arg.left.name)
            //                 if (arg.right.name) jointArts.push(arg.right.name)
            //                 return jointArts
            //             }
            //         }).flat()

            //         dependencies.forEach(varName => variableObject[varName].usedBy.push(id))

            //         variableObject[id] = {
            //             value: new Function(generate(argNode)),
            //             usedBy: [ name ],
            //             arg: i
            //         }
            //     }
            // })
        }
    })

    // Add info to all variables + non-scoped variables to the object
    Object.getOwnPropertySymbols(variablesById).forEach((id) => {
        const entry = variablesById[id]
        if (!entry.kind) entry.kind = kinds[id] || 'import'
        if (!entry.scope) variableObject[entry.name] = entry
    })
    
    // Scope scoped variables
    const allVariables = Object.getOwnPropertySymbols(variablesById).map(id => variablesById[id])
    allVariables.forEach(entry => {
        if (entry.scope) {
            const variables = variableObject[entry.scope].variables ?? (variableObject[entry.scope].variables = {})
            variables[entry.name] = entry
        } 
    })

    // Register global variables (i.e. variables that are not defined elsewhere)
    used.forEach(({ name }) => {
        const found = allVariables.find(o => o.name === name)
        if (!found) variableObject[name] = { name, usedBy: [], kind: 'global' }
    })


    return variableObject
}

export default fullWalk