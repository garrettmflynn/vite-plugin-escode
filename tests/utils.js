

export const symbolMap = {}
export const valueMap = {}

const onGet = (key, value) => {
    console.log('On Get', key, value)

}

const onSet = (key, newValue, oldValue) => {
    console.log('On Change', key, newValue, oldValue)
}

const onCall = (key, ...args) => {
    console.log('On Call', key, ...args)
}

const onReturn = (key, result) => {
    console.log('On Return', key, result)
}



export function declare (key, ogValue, o) {
    if (typeof ogValue === 'function') {
        const _og = ogValue
        ogValue = function (...args) {
            onCall(key, ...args)
            const res = _og.call(this, ...args)
            onReturn(key, res)
            return res
        }
    }

    valueMap[key] = ogValue
    const symbol = symbolMap[key] = Symbol()
    Object.defineProperty(o, symbol, {
        get: () => {
            onGet(key, valueMap[key])
            return valueMap[key]
        },
        set: (newValue) => {
            onSet(key, newValue, valueMap[key])
            valueMap[key] = newValue
        },
    })

    return o
}