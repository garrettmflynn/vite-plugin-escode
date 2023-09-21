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

    const statements: {[x: string]: string} = {}
    
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

    function addFunction(node, parentNode){

        const entry = define(node)
    
        // const returned = node.body.body.find(n => n.type === 'ReturnStatement')
        // if (returned) {
        //     entry.returned = returned // NOTE: Not the right entry...
        // }
    
        parentNode.body.body.forEach(n => {
            if (n.type === "VariableDeclaration") {
    
                function addScope(parentNode, scopeNode) {
                    const entry = define(parentNode)
                    entry.scope = scopeNode.name
                }
    
                n.declarations.forEach(({ id: nestedNode }) => nestedNode.elements ? nestedNode.elements.forEach(n => addScope(n, node)) : addScope(nestedNode, node))
                
            }
        })
    
        entry.dependencies = new Set()
    
        // Add internal variables as "dependencies" naively
        walk.simple(parentNode.body, {
            Identifier(node) {
                entry.dependencies.add(node.name)
            },
            ExpressionStatement(node) {
                delete statements[`${node.end}:${node.start}`]
            }
        })
    
        entry.declaration = generate(parentNode)
    }

    function registerVariable(node) {
        const innerNode = node.id
        const hasParams = !!node.params
        const nested = innerNode.elements ?? node.params

        // NOTE: Somewhere should also still have .arguments
        if (hasParams) addFunction(innerNode, node)

        // NOTE: Must also find init.body.arguments

        if (nested) {

            const symbol = Symbol('Shared definition group')

            nested.forEach((loopNode, i) => addDeclaration(loopNode, hasParams ? { kind: 'arg', scope: innerNode.name } : { group: symbol, destructured: { idx: i } }))
        }
        // Add declaration if not nested OR a function declaration
        if (!nested || hasParams) addDeclaration(innerNode, { kind: node.type.includes('Declaration') ? node.type.replace('Declaration', '').toLowerCase() : undefined } )
    }

    const dynamicStatementRecognition = {};

    ['VariableDeclarator', 'FunctionDeclaration', 'ClassDeclaration' ].forEach(type => dynamicStatementRecognition[type] = registerVariable);
    

    // Assign unique IDs to variable nodes
    walk.simple(ast, {
        ExpressionStatement(node) {
            statements[`${node.end}:${node.start}`] = generate(node)
        },
        VariableDeclaration(node){

            const declaration = generate(node)
            node.declarations.forEach(innerNode => {

                const idNode = innerNode.id

                function setMetadata(idNode) {
                    const entry = getVariableSafe(idNode) // Initialize ID Node
                    entry.declaration = declaration
                    kinds[idNode[liveIdSymbol]] = node.kind

                    if (innerNode.init) {
                        entry.value = innerNode.init.raw // NOTE: Not the right entry for non arrowfunctions
                    }
                }

                if (idNode.elements) idNode.elements.forEach(n => setMetadata(n)) 
                else setMetadata(idNode);

            })
        },
        FunctionExpression(node){
            console.log('FUNCTION', node.name, node)
        },
        Identifier(node) {
            used.push(node)
        },
        ImportDeclaration(node) {
            const id = Symbol('Shared import group')

            node.specifiers.forEach(n => {
                const entry = define(n.local, {group: id, source: node.source.value })
                const declaration = generate(node)
                entry.declaration = declaration
            })
        },
        ...dynamicStatementRecognition
    })


    // // 2. Determine how different variables are used by one another
    // walk.fullAncestor(ast, (node) => {

    //     if (node.type === 'VariableDeclaration') {
    //         const declaration = generate(node)
    //         node.declarations.forEach(node => {

    //             const idNode = node.id

    //             function setMetadata(idNode) {
    //                 const entry = getVariableSafe(idNode) // Initialize ID Node
    //                 entry.declaration = declaration
    //                 if (node.init) {
    //                     entry.value = node.init.raw // NOTE: Not the right entry for non arrowfunctions
    //                 }
    //             }

    //             if (idNode.elements) idNode.elements.forEach(n => setMetadata(n)) 
    //             else setMetadata(idNode);

    //         })
    //     }
    // })

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

    allVariables.forEach(entry => {
        if (entry.kind === 'function') {
            const internalVars = Object.keys(entry.variables)
            internalVars.forEach(v => entry.dependencies.delete(v))
        } 
    })


    return {
        variables: variableObject,
        statements: Object.values(statements)
    }
}

export default fullWalk