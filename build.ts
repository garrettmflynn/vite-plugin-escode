import esbuild from 'esbuild'

import Graph from './packages/livegraph/src/index.ts'

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join, resolve, extname, basename, relative } from 'path'

const changeExtension = (file, extension) => join(dirname(file), basename(file, extname(file)) + extension)


const src = './tests/app/src/index.js' // 'src/main.ts' // './tests/app/src/index.js'

const outDir = 'dist'
const tempDir = '.temp'
const declarationsDir = 'declarations'

const isAbsolute = path => path[0] !== '.'

const loadGraph = (src) => new Graph(readFileSync(src).toString())

const possibleExtensions = ['.js', '.ts']

function createDeclarations(src, outfile, { nested } = {}) {

    const graph = loadGraph(src)

    console.log(src, graph.variables)

    let imports = ``
    let mainFileText = ``

    const isGroupDeclared = []
    let destructured = []

    const parentDirectory = dirname(outfile)
    outfile = changeExtension(outfile, '.js') // Update extension of the outfile

    Object.values(graph.variables).forEach(o => {
        if (o.declaration) {
            if (o.kind === 'import') {
                const id = o.group
                if (!isGroupDeclared.includes(id)) {

                    const source = o.source
                    let declaration = o.declaration

                    console.log('Is absolute', source)

                    if (!isAbsolute(source)) {
                        let importSrc = source
                        const ext = extname(importSrc)

                        function resolveImport(str, error = true) {
                            const res = join(dirname(src), str)
                            return error ? resolve(res) : existsSync(res)
                        }

                        if (!ext) {
                            const found = possibleExtensions.find(str => resolveImport(importSrc + str, false))
                            if (found) importSrc += found // Add extension if absent
                        }

                        const info = createDeclarations(resolveImport(importSrc), join(parentDirectory, importSrc), { nested: true }) // NOTE: Supports relative imports
                        declaration = o.declaration.replace(source, `./${relative(parentDirectory, info.out)}`)
                    }

                    imports += `${declaration}\n`

                }
                isGroupDeclared.push(id)
            }
            
            else {
                if (o.destructured) {
                    const id = o.group
                    destructured.push(o.name)
                    if (!isGroupDeclared.includes(id))  mainFileText += `${o.declaration}\n`
                    isGroupDeclared.push(id)
                }
                else mainFileText += `export ${o.declaration}\n`
            }
        }
    })

    const finalCode = `${imports}\n${mainFileText}\n${graph.statements.join('\n')}\nexport { ${destructured.join(',')} }`

    mkdirSync(parentDirectory, { recursive: true });
    writeFileSync(outfile, finalCode) // Always output JS code

    return {
        code: finalCode,
        out: outfile
    }
    
}

async function build({ src }) {

    const declarationsOutFile = join(outDir, tempDir, declarationsDir, changeExtension(basename(src), '.js'))

    const entryPoint = createDeclarations(src, declarationsOutFile).out

    // Bundle the code together
    await esbuild.build({
        entryPoints: [ entryPoint ],
        bundle: true,
        outdir: outDir,
    })

    // Create an HTML page to view the results
    const base = basename(entryPoint)

    const outputPath = relative(outDir, changeExtension(join(outDir, base), '.js'))

    writeFileSync(join(outDir, 'index.html'), 
    `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8" />
        <link rel="icon" type="image/svg+xml" href="/vite.svg" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Test Build</title>
        <script src="./${outputPath}" type="module"></script>
    </head>
    </html>
    `
    )
}

build({ src })