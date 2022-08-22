/* eslint-disable @typescript-eslint/no-unsafe-return */

import { encodeAddress } from '@polkadot/keyring'
import { gql, request } from 'graphql-request'

const url = 'https://acala.explorer.subsquid.io/graphql'
const ss58Prefix = 10

export const getLatestBlockHeight = async () => {
  const query = gql`
    query {
      blocks(limit: 1, orderBy: height_DESC) {
        height
      }
    }
  `

  const { blocks } = await request(url, query)

  return blocks[0].height as number
}

const processValue = (value: any): any => {
  if (Array.isArray(value)) {
    return value.map(processValue) as any
  }
  if (typeof value === 'object') {
    if ('value' in value) {
      return { [value.__kind]: processValue(value.value) }
    }
    return value.__kind
  }
  return value
}

export const queryEvents = async (fromBlock: number, toBlock: number) => {
  const query = gql`
    query q($fromBlock: Int, $toBlock: Int) {
      events(
        where: {
          block: { height_gte: $fromBlock, height_lt: $toBlock }
          call: { success_eq: true }
          AND: { name_startsWith: "Tokens", OR: { name_startsWith: "Balances" } }
        }
      ) {
        extrinsic {
          hash
        }
        block {
          height
          hash
        }
        call {
          name
        }
        args
        name
        id
      }
    }
  `

  const query2 = gql`
    query q($fromBlock: Int, $toBlock: Int) {
      events(
        where: {
          block: { height_gte: $fromBlock, height_lt: $toBlock }
          call_isNull: true
          AND: { name_startsWith: "Tokens", OR: { name_startsWith: "Balances" } }
        }
      ) {
        extrinsic {
          hash
        }
        block {
          height
          hash
        }
        call {
          name
        }
        args
        name
        id
      }
    }
  `

  const [res1, res2] = await Promise.all([
    request(url, query, { fromBlock, toBlock }),
    request(url, query2, { fromBlock, toBlock }),
  ])

  return [...res1.events, ...res2.events].map((x: any) => ({
    _id: x.id,
    height: x.block.height,
    blockHash: x.block.hash,
    extrinsicHash: x.extrinsic?.hash,
    call: x.call?.name,
    event: x.name,
    amount: x.args.amount,
    currencyId: JSON.stringify(x.args.currencyId ? processValue(x.args.currencyId) : { Token: 'ACA' }),
    from: x.args.from && encodeAddress(x.args.from, ss58Prefix),
    to: x.args.to && encodeAddress(x.args.to, ss58Prefix),
    who: x.args.who && encodeAddress(x.args.who, ss58Prefix),
  }))
}

export const queryLoansEvents = async (fromBlock: number, toBlock: number) => {
  const query = gql`
    query q($fromBlock: Int, $toBlock: Int) {
      events(
        where: {
          block: { height_gte: $fromBlock, height_lt: $toBlock }
          call: { success_eq: true }
          name_eq: "Loans.PositionUpdated"
        }
      ) {
        extrinsic {
          hash
        }
        block {
          height
          hash
        }
        call {
          name
        }
        args
        name
        id
      }
    }
  `

  const query2 = gql`
    query q($fromBlock: Int, $toBlock: Int) {
      events(
        where: {
          block: { height_gte: $fromBlock, height_lt: $toBlock }
          call_isNull: true
          name_eq: "Loans.PositionUpdated"
        }
      ) {
        extrinsic {
          hash
        }
        block {
          height
          hash
        }
        call {
          name
        }
        args
        name
        id
      }
    }
  `

  const [res1, res2] = await Promise.all([
    request(url, query, { fromBlock, toBlock }),
    request(url, query2, { fromBlock, toBlock }),
  ])

  return [...res1.events, ...res2.events].map((x: any) => ({
    _id: x.id,
    height: x.block.height,
    blockHash: x.block.hash,
    extrinsicHash: x.extrinsic?.hash,
    call: x.call?.name,
    event: x.name,
    currencyId: JSON.stringify(processValue(x.args.collateralType)),
    collateralAmount: x.args.collateralAdjustment,
    debitAmount: x.args.debitAdjustment,
    who: encodeAddress(x.args.owner, ss58Prefix),
  }))
}
