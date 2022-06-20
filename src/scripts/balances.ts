/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */

import '@acala-network/types'
import '@acala-network/types/interfaces/types-lookup'

import yargs from 'yargs'

import { WalletPromise } from '@acala-network/sdk-wallet'
import { fetchEntriesToArray } from '@open-web3/util'

import { formatBalance, table } from '../log'
import runner from '../runner'

runner()
  .requiredNetwork(['acala', 'karura'])
  .withApiPromise()
  .atBlock()
  .run(async ({ api, apiAt }) => {
    const argv = yargs.argv as any
    const addresses = ((argv.address as string) || '')
      .split(',')
      .map((x) => x.trim())
      .filter((x) => x.length > 0)

    if (addresses.length === 0) {
      throw new Error('Please pass address with `--address=xxx,xxx`')
    }

    const wallet = new WalletPromise(api)

    const blockNow = (await apiAt.query.system.number()).toBigInt()
    const block7d = blockNow - (87400n * 7n) / 12n
    const block30d = blockNow - (87400n * 30n) / 12n

    const queryData = async (block: bigint) => {
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
            if (token.isDexShare || token.isForeignAsset) {
              continue
            }
            const name = token.isTokenSymbol ? token.symbol : (key.args[1].toString() as string)
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

    const dataNow = await queryData(blockNow)
    const data7d = await queryData(block7d)
    const data30d = await queryData(block30d)

    for (let i = 0; i < addresses.length; i++) {
      const name = addresses[i]
      const now = dataNow[i]
      const sevenDays = data7d[i]
      const thirtyDays = data30d[i]
      const free = {} as { [key: string]: { name: string; token: any; now?: any; sevenDays?: any; thirtyDays?: any } }
      for (const { name, token, free: f } of now.data) {
        if (!free[name]) {
          free[name] = { name, token }
        }
        free[name].now = f
      }
      for (const { name, token, free: f } of sevenDays.data) {
        if (!free[name]) {
          free[name] = { name, token }
        }
        free[name].sevenDays = f
      }
      for (const { name, token, free: f } of thirtyDays.data) {
        if (!free[name]) {
          free[name] = { name, token }
        }
        free[name].thirtyDays = f
      }
      console.log(name)
      table(
        Object.values(free).map(({ name, token, now, sevenDays, thirtyDays }) => ({
          name,
          now: formatBalance(now, token.decimals),
          '7d': formatBalance(sevenDays, token.decimals),
          '30d': formatBalance(thirtyDays, token.decimals),
          '7d diff': formatBalance(now ?? 0n - (BigInt(sevenDays) ?? 0n), token.decimals),
          '30d diff': formatBalance(now ?? 0n - (thirtyDays ?? 0n), token.decimals),
        }))
      )
    }
  })
