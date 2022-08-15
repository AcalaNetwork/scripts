import { readFileSync } from 'fs'

import '@acala-network/types'
import '@acala-network/types/interfaces/types-lookup'

import { WalletPromise } from '@acala-network/sdk-wallet'
import { fetchEntriesToArray } from '@open-web3/util'

import { formatBalance, table } from '../log'
import runner from '../runner'

runner()
  .requiredNetwork(['acala'])
  .withApiPromise()
  .run(async ({ api }) => {
    console.log(`
Error Mint aUSD On Account: min(Current Balance, Total Claim)
Current Balance: Balance when running this script
Before Balance: Balance before the incident #1638215
After Balance: Balance after the pause #1639493
Before Diff: Current Balance - Before Balance
After Diff: Current Balance - After Balance
`)

    const path = __dirname + '/claim-rewards-events.json'

    const data: any[] = JSON.parse(readFileSync(path, 'utf8'))

    const result = data.map(({ id, who, actualAmount }: any) => ({
      id,
      who,
      amount: BigInt(actualAmount),
    }))

    const all = {} as Record<string, bigint>

    for (const { who, amount } of result) {
      all[who] = (all[who] || 0n) + amount
    }

    const beforeBlock = 1638215
    const afterBlock = 1639493

    const wallet = new WalletPromise(api)

    const tokenNames = {
      '{"token":"ACA"}': 'ACA',
      '{"token":"AUSD"}': 'AUSD',
      '{"token":"DOT"}': 'DOT',
      '{"token":"LDOT"}': 'LDOT',
      '{"liquidCrowdloan":13}': 'LDOT',
      '{"foreignAsset":3}': 'INTR',
      '{"foreignAsset":4}': 'iBTC',
      '{"stableAssetPoolToken":0}': 'tDOT',
      '{"dexShare":[{"token":"AUSD"},{"foreignAsset":3}]}': 'AUSD/INTR',
      '{"dexShare":[{"token":"AUSD"},{"foreignAsset":4}]}': 'AUSD/iBTC',
    } as Record<string, string>

    const stableCurrency = wallet.getToken(api.consts.cdpEngine.getStableCurrencyId)

    const queryData = async (block: number, addresses: string[]) => {
      const apiAt = await api.at(await api.rpc.chain.getBlockHash(block))

      return Promise.all(
        addresses.map(async (address) => {
          const native = (await apiAt.query.system.account(address)).data.free
          const tokens = await fetchEntriesToArray((startKey) =>
            apiAt.query.tokens.accounts.entriesPaged({
              args: [address],
              pageSize: 100,
              startKey,
            })
          )
          const nativeToken = wallet.getNativeToken()
          const data = [{ name: nativeToken.display, token: wallet.getNativeToken(), free: native.toBigInt() }]
          for (const [key, value] of tokens) {
            const token = wallet.getToken(key.args[1])
            const name = tokenNames[JSON.stringify(key.args[1])] || token.display
            data.push({
              name,
              token,
              free: value.free.toBigInt(),
            })
          }
          return {
            name: address,
            data,
          }
        })
      )
    }

    const blockNow = (await api.query.system.number()).toNumber()

    const addresses = Object.keys(all)
    const dataBefore = await queryData(beforeBlock, addresses)
    const dataAfter = await queryData(afterBlock, addresses)
    const dataNow = await queryData(blockNow, addresses)

    const reclaimAusd = {} as Record<string, bigint>

    for (let i = 0; i < addresses.length; i++) {
      const name = addresses[i]
      const beofre = dataBefore[i]
      const after = dataAfter[i]
      const now = dataNow[i]
      const free = {} as { [key: string]: { name: string; token: any; now?: any; before?: any; after?: any } }
      for (const { name, token, free: f } of now.data) {
        if (!free[name]) {
          free[name] = { name, token }
        }
        free[name].now = f
      }
      for (const { name, token, free: f } of beofre.data) {
        if (!free[name]) {
          free[name] = { name, token }
        }
        free[name].before = f
      }
      for (const { name, token, free: f } of after.data) {
        if (!free[name]) {
          free[name] = { name, token }
        }
        free[name].after = f
      }

      for (const { name: token, after, before } of Object.values(free)) {
        const diff = BigInt(after ?? 0n) - BigInt(before ?? 0n)
        if (diff > 0n) {
          if (token === 'AUSD') {
            reclaimAusd[name] = (reclaimAusd[name] || 0n) + diff
          }
        }
      }

      reclaimAusd[name] = reclaimAusd[name] > all[name] ? all[name] : reclaimAusd[name]

      console.log('Address:', name)
      console.log('Error mint aUSD on Account:', formatBalance(all[name]))
      table(
        Object.values(free).map(({ name, token, now, before, after }) => ({
          name,
          'Current Balance': formatBalance(now, token.decimals),
          'Before Balance': formatBalance(before, token.decimals),
          'After Balance': formatBalance(after, token.decimals),
          'Before Diff': formatBalance((now ?? 0n) - BigInt(before ?? 0n), token.decimals),
          'After Diff': formatBalance((now ?? 0n) - BigInt(after ?? 0n), token.decimals),
        }))
      )
      console.log()
    }

    table(
      Object.entries(all)
        .map(([who]) => ({
          who,
          'Error Mint aUSD On Account': formatBalance(reclaimAusd[who]),
        }))
        .concat([
          {
            who: 'Total',
            'Error Mint aUSD On Account': formatBalance(Object.values(reclaimAusd).reduce((a, b) => a + b, 0n)),
          },
        ])
    )

    const rewardPool = '23M5ttkmR6Kco7bReRDve6bQUSAcwqebatp3fWGJYb4hDSDJ'
    const reawrdPoolAmount = (await api.query.tokens.accounts(rewardPool, stableCurrency.toChainData())).free.toBigInt()

    console.log('ReawrdPoolAmount', rewardPool, formatBalance(reawrdPoolAmount, stableCurrency.decimals))

    const honzonTreasury = '23M5ttkmR6KcnvsNJdmYTpLo9xfc54g8uCk55buDfiJPon69'
    const honzonTreasuryAmount = (
      await api.query.tokens.accounts(honzonTreasury, stableCurrency.toChainData())
    ).free.toBigInt()

    console.log('HonzonTreasuryAmount', honzonTreasury, formatBalance(honzonTreasuryAmount, stableCurrency.decimals))
  })
