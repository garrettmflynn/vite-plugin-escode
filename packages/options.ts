import { ParserOptions } from "@babel/parser"

const options: ParserOptions = {
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
 
export default options