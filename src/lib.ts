
// JavaScript Primitive Values
export let number = 0
setTimeout(() => number + 1, 1000) // Increment the number every second

export const boolean = true

export const string = 'string'

export const stringObject = new String(string)

export const isNull = null

export const isUndefined = undefined

export const bigInt = BigInt(1)

export const symbol = Symbol('symbol')

// Function
export const fn = (v: any) => {
  console.log(v)
  return v
}

// Array
export const array = [ number, boolean, string, stringObject, isNull, isUndefined, bigInt, symbol, fn ]


// Object
export const object = {
  number,
  boolean, 
  string,
  stringObject,
  array,
  isNull,
  isUndefined,
  bigInt,
  symbol,
  fn
}


// Class
export class Class {

  setProperty;

  constructor(input: any){
    this.setProperty = input
  }

  property = 100

  method() {
    console.log(this.setProperty)
    return this.setProperty
  }

  arrowMethod = fn
}