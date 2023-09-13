import { readFileSync } from "fs"
import { join } from "path";
import * as url from 'url';

import { parse } from "@babel/parser";
import Graph from "../packages/livegraph/src/index";

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

const fullBabelOptions = {
    sourceType: 'module',
    allowImportExportEverywhere: true,
    errorRecovery: true,
    ranges: true,
    strictMode: true,
    plugins: [
        'estree',
        'typescript', 
        'jsx', 
        'nullishCoalescingOperator',
        'bigInt',
        'classPrivateProperties',
        'classPrivateMethods',
        'dynamicImport',
        'nullishCoalescingOperator',
        'objectRestSpread',
        'optionalCatchBinding',
        'topLevelAwait'
    ]
}


export const build = (filepath, babelParseOptions = {}) => {
    const code = readFileSync(filepath).toString()
    console.log(code)
    const { program: ast } = parse(code, babelParseOptions)
    console.log(ast)

    const graph = new Graph(source)
    console.log('LiveGraph Output', graph.live, graph.ast)

}

build(join(__dirname, 'app', 'src', 'index.js'), fullBabelOptions)