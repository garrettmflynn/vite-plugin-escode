import { generate } from 'escodegen'
import * as walk from 'acorn-walk'

const fullWalk = (ast) => {

    let declarations = {}
    let liveVariables = {}
    let variableObject: {[x:string]: any} = { } // Inline declared with symbol keys (https://stackoverflow.com/questions/6337344/activation-and-variable-object-in-javascript)


    const findInSymbolObject = (object, condition) => Object.getOwnPropertySymbols(object).map(sym => object[sym]).find(condition) // Use a fallback

    const getVariableSafe = (node, create: string | boolean = true) => {

        if ('liveID' in  node) return liveVariables[node.liveID]
        else if (create) {

            if (typeof create === 'string') {
                const found = findInSymbolObject(liveVariables, o => o.name === create)
                if (found) return found
            }

            const id = node.liveID = Symbol('livegraph')
            return liveVariables[id] = { name: node.name, usedBy: [] } // NOTE: These are known to refer to global variables if 'value' and this is not contained in a set scope
        } else return findInSymbolObject(liveVariables, o => o.name === node.name) // Use a fallback
    }

    // 1. Register all variables before walking to determine broader structural aspects of the code
    const declared = new Set()
    const used = new Set()
    walk.full(ast, (node) => {
        if ('liveID' in node) console.log('Already has an ID...')
        else {
            node.liveID = Symbol('livegraph')
            const targetNode = node.type === 'VariableDeclarator' ? node.id : node
            if (node.type === 'VariableDeclarator') declared.add(targetNode.name)
            else if (node.type === 'Identifier') used.add(targetNode.name)
            getVariableSafe(targetNode)
        }
    }) // Assign a unique ID to all nodes

    const globals = new Set(Array.from(used).filter(n => !declared.has(n))) // Naive extraction of globals

    const variables = {
        declared,
        globals
    }

    console.log('Variable Types', variables)

    const getVariable = (name) => {
        const found = findInSymbolObject(variableObject, o => o.name === name)
        if (found) return found
        else return variableObject[name] = { name: name, usedBy: [] }
    }

    walk.fullAncestor(ast, (node, _, ancestors) => {

        // NOTE: Must parse CallExpression (e.g. Date.now()) in arguments
        
        // Used Variables
        if (node.type === 'Identifier') {

            // NOTE: These are known to refer to global variables if 'value' and this is not contained in a set scope
            const variable = getVariableSafe(node, node.name)
            if (!variable.scoped) variableObject[node.name] = variable
            else console.error('IS SCOPED')
        }

        // Declared Variables
        if (node.type === 'VariableDeclarator') {

            const entry = getVariableSafe(node.id) // Initialize ID Node
            
            if (node.init) {
                const name = node.id.name
                const declaration = node.init
                const value = (declaration.type.includes('FunctionExpression')) ? new Function(generate(declaration)) : declaration.value
                
                const reversed = ancestors.reverse()
                const idx = reversed.findIndex(n => n.type.includes('FunctionExpression'))
                if (idx !== -1) {
                    const scope = reversed[idx + 1]
                    const scopeEntry = getVariableSafe(scope.id, false)
                    if (scopeEntry) {
                        if (!('scope' in scopeEntry)) scopeEntry.scope = {}
                        scopeEntry.scope[name] = entry // Transfer Live Entry
                    } else console.error('Could not find scope entry...')
                } 
                
                // Top-Level Scope
                else entry.value = value
            }

            else console.log('Left unset', node.id.name)
        }

        if (node.init && node.init.type.includes('FunctionExpression')) {

            const name = node.id.name

            // node.init.body.type === 'AssignmentExpression'
            if (node.init.params) {

                const entry = getVariableSafe(node.id)
                if (!('scope' in entry)) entry.scope = {}
                node.init.params.forEach((paramNode, i) => {
                    entry.scope[paramNode.name] = getVariableSafe(paramNode) // Transfer Live Entry
                })
            }

            if (node.init.body.type === 'CallExpression') {
                const dependencies = node.init.body.arguments.map(arg => arg.name)
                dependencies.forEach(varName => {
                    variableObject[varName].usedBy.push(name)
                })
            }
        }

        if (node.type === 'ExpressionStatement') {
            const name = node.expression.callee.name
            const args = node.expression.arguments
            args.forEach((argNode, i) => {

                // Register variable inputs
                if (argNode.type === 'Identifier') variableObject[argNode.name].usedBy.push(name)

                // Track inline literal arguments
                else if (argNode.type === 'Literal') {
                    const id = Symbol(`InlineLiteral`)
                    variableObject[id] = {
                        value: argNode.value,
                        usedBy: [ name ],
                        arg: i
                    }
                }

                // Track inline function arguments
                else if (argNode.type.includes('FunctionExpression')) {

                    const id = Symbol(`Inline${argNode.type}`)
                    const dependencies = argNode.body.arguments.map(arg => {
                        if (arg.name) return arg.name
                        else {
                            const jointArts = []
                            if (arg.left.name) jointArts.push(arg.left.name)
                            if (arg.right.name) jointArts.push(arg.right.name)
                            return jointArts
                        }
                    }).flat()

                    dependencies.forEach(varName => variableObject[varName].usedBy.push(id))

                    variableObject[id] = {
                        value: new Function(generate(argNode)),
                        usedBy: [ name ],
                        arg: i
                    }
                }
            })
        }
    })

    return variableObject
}

export default fullWalk