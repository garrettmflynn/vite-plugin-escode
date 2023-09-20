import { ParserOptions } from "@babel/parser"


// NOTE: Not possible to mix babel and acorn
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