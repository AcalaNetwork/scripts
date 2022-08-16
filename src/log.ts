/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import { FixedPointNumber } from '@acala-network/sdk-core'
import { format } from '@fast-csv/format'
import BN from 'bn.js'

import { config } from './runner'

export const logFormat = (x: any): any => {
  if (x == null) {
    return x
  }
  if (x instanceof BN) {
    return x.toString()
  }
  if (x instanceof FixedPointNumber) {
    return x.toString()
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

export const formatDecimal = (x: number | BN | string | FixedPointNumber, length = 4) => {
  let n
  if (x instanceof FixedPointNumber) {
    n = x.toNumber()
  } else if (typeof x === 'number') {
    n = x
  } else {
    n = +x.toString() / 1e18
  }
  return Math.round(n * 10 ** length) / 10 ** length
}

export const formatBalance = (x: number | BN | string | FixedPointNumber | bigint | undefined | null, decimal = 12) => {
  let n
  if (x == null) {
    return '-'
  }
  if (x instanceof FixedPointNumber) {
    n = x.toNumber()
  } else if (typeof x === 'number') {
    n = x
  } else {
    n = +x.toString() / 10 ** decimal
  }

  if (config.output === 'console') {
    if (n > 1e9) {
      return `${formatDecimal(n / 1e9, 2)}B`
    }
    if (n > 1e6) {
      return `${formatDecimal(n / 1e6, 2)}M`
    }
    if (n > 1e3) {
      return `${formatDecimal(n / 1e3, 2)}K`
    }
  }

  return formatDecimal(n).toString()
}

export const table = (data: any) => {
  if (config.output === 'csv') {
    console.log()
    const csvStream = format({ headers: true })
    csvStream.pipe(process.stdout)

    if (Array.isArray(data)) {
      data.forEach((x) => csvStream.write(x))
    } else {
      csvStream.write(data)
    }
    csvStream.end()
    console.log()
    console.log()
  } else {
    console.table(data)
  }
}
