import { encodeAddress } from '@polkadot/keyring'
import fs from 'fs'
import mongoose from 'mongoose'
import path from 'path'

import { Block } from './types'
import { blocks } from '../mongo/models'
import {
  createCSV,
  getTokenDecimals,
  getTokenName,
  getTransfersFileName,
  isCexAddr,
  isExitAddr,
} from './utils/create-csv'

const mongodbUrl = 'mongodb://localhost:27017/acala'
const ss58Prefix = 10
const addrDex = '23M5ttkmR6KcnxentoqchgBdUjzMDSzFoUyf5qMs7FsmRMvV'
const addrIncentive = '23M5ttkmR6Kco7bReRDve6bQUSAcwqebatp3fWGJYb4hDSDJ'
const addrStablePool = '23M5ttkp2zdM8qa6LFak4BySWZDsAVByjepAfr7kt929S1U9'

const startBlock = 1638216
const endBlock = 1694500
const stableAssetHeight = 1639493

const affectedAddresses: Record<string, boolean> = {}

async function parseAllEvents() {
  await mongoose.connect(mongodbUrl)

  const parsers: Record<string, (args: Record<string, any>) => void> = {
    'Incentives.ClaimRewards': parseClaim,
    'Balances.Transfer': parseBalanceTransfer,
    'Tokens.Transfer': parseTokenTransfer,
    'CdpEngine.CloseCDPInDebitByDEX': parseCdpEvents,
    'Dex.AddLiquidity': parseLPAdds,
  }
  const claims: string[][] = []
  const balancesTransfers: string[][] = []
  const tokensTransfers: string[][] = []
  const cdpEvents: string[][] = []
  const lpAdds: string[][] = []

  function parseClaim(args: Record<string, any>) {
    if (
      args.pool.__kind === 'Dex' &&
      args.pool.value.value[0].value.__kind === 'AUSD' &&
      args.pool.value.value[1].value === 3 &&
      args.rewardCurrencyId.value.__kind === 'AUSD'
    ) {
      const to = encodeAddress(args.who, ss58Prefix)

      affectedAddresses[to] = true

      claims.push([
        addrIncentive,
        to,
        'AUSD',
        (Number(args.actualAmount) / 10 ** getTokenDecimals('AUSD')).toFixed(4),
        args.block,
        args.indexInBlock,
        args.hash,
      ])
    }
  }

  function parseBalanceTransfer(args: Record<string, any>) {
    const from = encodeAddress(args.from, ss58Prefix)
    const to = encodeAddress(args.to, ss58Prefix)
    if (isExitAddr(from) || isCexAddr(from) || isExitAddr(to)) return

    if (affectedAddresses[from]) {
      affectedAddresses[to] = true

      balancesTransfers.push([
        from,
        to,
        'ACA',
        (Number(args.amount) / 10 ** getTokenDecimals('ACA')).toFixed(4),
        args.block,
        args.indexInBlock,
        args.hash,
      ])
    }
  }

  function parseTokenTransfer(args: Record<string, any>) {
    const from = encodeAddress(args.from, ss58Prefix)
    const to = encodeAddress(args.to, ss58Prefix)
    if (args.block > stableAssetHeight) {
      if (isExitAddr(from) || isCexAddr(from) || isExitAddr(to)) return
    } else {
      if (
        ((isExitAddr(from) || isCexAddr(from)) && from !== addrStablePool) ||
        (isExitAddr(to) && to != addrStablePool)
      )
        return
    }

    if (affectedAddresses[from]) {
      affectedAddresses[to] = true

      const tokenName = getTokenName(args.currencyId)
      tokensTransfers.push([
        from,
        to,
        tokenName,
        (Number(args.amount) / 10 ** getTokenDecimals(tokenName)).toFixed(4),
        args.block,
        args.indexInBlock,
        args.hash,
      ])
    }
  }

  function parseCdpEvents(args: Record<string, any>) {
    const to = encodeAddress(args.owner, ss58Prefix)
    if (affectedAddresses[addrDex]) {
      affectedAddresses[to] = true

      cdpEvents.push([
        addrDex,
        to,
        'AUSD',
        (Number(args.debitValue) / 10 ** getTokenDecimals('AUSD')).toFixed(4),
        args.block,
        args.indexInBlock,
        args.hash,
      ])
    }
  }

  function parseLPAdds(args: Record<string, any>) {
    const to = encodeAddress(args.who, ss58Prefix)
    if (affectedAddresses[addrDex]) {
      affectedAddresses[to] = true

      const token0 = getTokenName(args.currency0)
      const tokenName = getTokenName({ __kind: 'DexShare', value: [args.currency0, args.currency1] })
      lpAdds.push([
        addrDex,
        to,
        tokenName,
        (Number(args.shareIncrement) / 10 ** getTokenDecimals(token0)).toFixed(4),
        args.block,
        args.indexInBlock,
        args.hash,
      ])
    }
  }

  await everyBlock(
    {
      start: startBlock,
      end: endBlock,
    },
    (blocks) => {
      blocks.map((e) => {
        e.events.map(({ name, args, indexInBlock }) => {
          if (parsers[name]) {
            parsers[name]({ ...args, block: e.height, indexInBlock, hash: e.hash })
          }
        })
      })
      console.log(`claims.length: ${claims.length}`)
      console.log(`balacesTransfer.length: ${balancesTransfers.length}`)
      console.log(`tokensTransfers.length: ${tokensTransfers.length}`)
      console.log(`cdpEvents.length: ${cdpEvents.length}`)
      console.log(`lpAdds.length: ${lpAdds.length}`)
    }
  )

  console.log(`parsing events finished`)
  ;[claims, balancesTransfers, tokensTransfers, cdpEvents, lpAdds].forEach((txs, i) => {
    createCSV(
      getTransfersFileName(i.toString()),
      ['from', 'to', 'token', 'amount', 'block', 'indexInBlock', 'txHash'],
      txs
    )
  })
}

export async function everyBlock(
  configs: {
    start: number
    end: number
  },
  callback: (blocks: Block[]) => void | Promise<void>
) {
  const { start, end } = configs

  for (let i = start; i <= end; i += 500) {
    console.log(`db finding #${i}`)
    const arr = (
      await blocks.find({
        height: {
          $gte: i,
          $lt: i + 500,
        },
      })
    ).map((raw) => parseBlock(raw))

    await callback(arr)
  }
}

export function parseBlock(block: any): Block {
  return {
    hash: block.hash,
    height: block.height,
    // extrinsics: JSON.parse(block.get('extrinsics')),
    events: JSON.parse(block.events),
  }
}

function loadCSV(name: string) {
  const parent = path.join(__dirname, '../../data')
  const filePath = path.join(parent, `${name}`)
  return fs.readFileSync(filePath, { encoding: 'utf-8' })
}

function extractAddress() {
  const files = [0, 1, 2, 3, 4]
  const lines = files
    .map((name) => loadCSV(getTransfersFileName(name.toString())).split('\n'))
    .reduce((res, txs) => res.concat(txs), [])

  const addresses: Record<string, string> = {}
  const addAddr = (addr: string) => {
    if (addr === addrStablePool) {
      addresses[addr] = 'StableAssetPool'
      return
    }
    if (addr === addrIncentive) {
      addresses[addr] = 'Incentive'
      return
    }
    if (addr === addrDex) {
      addresses[addr] = 'Dex'
      return
    }
    if (isCexAddr(addr)) {
      addresses[addr] = 'Exchange'
      return
    }

    if (!addresses[addr]) {
      addresses[addr] = 'User'
    }
  }
  lines.forEach((line) => {
    const item = line.split(',')

    addAddr(item[0])
    addAddr(item[1])

    if (addresses[item[1]] === 'Exchange') {
      addresses[item[0]] = 'ExchangeDepositAddr'
    }
  })

  delete addresses.from
  delete addresses.to

  const data = Object.keys(addresses).map((addr) => [addr, addresses[addr]])

  createCSV(`affected-addresses-6cex.csv`, ['address', 'tag'], data)
}

function main() {
  parseAllEvents()
    .then(() => {
      extractAddress()
      console.log(`extract address finished`)
    })
    .catch(console.log)
}

main()
