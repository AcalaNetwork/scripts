/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import BN from 'bn.js'

export const logFormat = (x: any): any => {
  if (x == null) {
    return x
  }
  if (x.toHuman) {
    return x.toHuman()
  }
  if (Array.isArray(x)) {
    return x.map(logFormat)
  }
  return x
}

export const log = (...x: any[]) => {
  const item = x.length === 1 ? x[0] : x
  const json = logFormat(item)
  console.dir(json, { depth: 5 })
}

export const formatDecimal = (x: number | BN | string, length = 4) => {
  let n
  if (typeof x === 'number') {
    n = x
  } else {
    n = +x.toString() / 1e18
  }
  return Math.round(n * 10 ** length) / 10 ** length
}

export const formatBalance = (x: number | BN | string, decimal = 12) => {
  let n
  if (typeof x === 'number') {
    n = x
  } else {
    n = +x.toString() / 10 ** decimal
  }
  if (n > 1e6) {
    return `${formatDecimal(n / 1e6, 4)}M`
  }
  if (n > 1e3) {
    return `${formatDecimal(n / 1e3, 4)}K`
  }
  return formatDecimal(n).toString()
}
