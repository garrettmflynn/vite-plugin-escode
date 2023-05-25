import { generate } from 'escodegen'
import * as walk from 'acorn-walk'
import  { Node } from 'acorn'

const recursive = (ast) => {
    let declarations = {}

    let topLevelVariables = {}
    let liveVariables = {}
    let variableObject: {[x:string]: any} = { } // Inline declared with symbol keys (https://stackoverflow.com/questions/6337344/activation-and-variable-object-in-javascript)


    function setVariableObjectProperty(node: Node, property?: string | {[x:string]: any}, value?: any, name: string | symbol = node.name ) {

        if (typeof property === 'string') property = { [property]: value }

        // Ensure nested object exists
        if (!(name in variableObject)) {

            const id = node.liveID = Symbol('livegraph')

            const hasDeclaration = name in declarations

            // NOTE: These are known to refer to global variables if 'value' and this is not contained in a set scope
            const variable = liveVariables[id] = variableObject[name] = { usedBy: [] }

            if (hasDeclaration) variable.value = declarations[name].value
        }

        if (property) Object.entries(property).forEach(([key, value]) => variableObject[name][key] = value)
    }
    

    const addIdentifier = (node) => setVariableObjectProperty(node) // Ensure property exists

    const addVariableDeclarator = (node, scope, c) => {

        if (node.init) {

            const declaration = node.init
            console.warn('Declaring Variable', node.id.name, declaration.value, scope)

            if (declaration.type.includes('FunctionExpression')) {
                setVariableObjectProperty(node.id, 'value', new Function(generate(declaration)))
                addFunctionDeclaration(node, scope, c) // Will be a function declaration
            } else {
                setVariableObjectProperty(node.id, 'value', declaration.value)
            }
        }

        else console.log('Left unset', node.id.name)

        if (node.init && node.init.type.includes('FunctionExpression')) addFunctionDeclaration(node) // Will be a function declaration
    }

    const addFunctionDeclaration = (node, scope, c) => {

        const name = node.id.name

        if (node.init.params) {

            const entry = variableObject[name]
            entry.scope = {}
            node.init.params.forEach((paramNode, i) => {
                entry.scope[paramNode.name] = liveVariables[paramNode.liveID] // Transfer Live Entry
            })
        }

        if (node.init.body.type === 'CallExpression') {
            node.init.body.arguments.forEach(arg => {
                setVariableObjectProperty(arg)
                variableObject[arg.name].usedBy.push(name)
            })
        }
    }

    const handleExpressionStatement = (node, scope, c) => {
        const name = node.expression.callee.name
        const args = node.expression.arguments
        args.forEach((argNode, i) => {

            // Register variable inputs
            if (argNode.type === 'Identifier') {
                console.log('Name', argNode.name)
                variableObject[argNode.name].usedBy.push(name)
            }

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

                const handleArg = (arg) => variableObject[arg.name].usedBy.push(id)

                argNode.body.arguments.forEach((arg: Node) => {
                    if (arg.name) handleArg(arg)
                    else {
                        if (arg.left.name) handleArg(arg.left)
                        if (arg.right.name)  handleArg(arg.right)
                    }
                })

                variableObject[id] = {
                    value: new Function(generate(argNode)),
                    usedBy: [ name ],
                    arg: i
                }
            }
        })
    }

    console.log(walk.base)
    walk.recursive(ast, 0, {
        Identifier: (node)  => addIdentifier(node),

        VariableDeclarator: (node, state, c) => addVariableDeclarator(node, state, c),

        BlockStatement: (node, state, c) => {
            if (node.init && node.init.type.includes('FunctionExpression')) addFunctionDeclaration(node, state, c)
        },

        ExpressionStatement: (node, state, c) => handleExpressionStatement(node, state, c)
    })

    return variableObject
}

export default recursive