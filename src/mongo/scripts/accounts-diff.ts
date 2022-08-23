/* eslint-disable @typescript-eslint/no-unsafe-return */
import '@acala-network/types'
import * as config from '../config'
import {
  AcalaPrimitivesCurrencyCurrencyId,
  AcalaPrimitivesTradingPair,
} from '@acala-network/types/interfaces/types-lookup'
import { AccountTrace } from '../models'
import { FixedPointNumber } from '@acala-network/sdk-core'
import { Wallet } from '@acala-network/sdk/wallet'
import { fetchEntriesToArray } from '@open-web3/util'
import { formatBalance, table } from '../../log'
import mongoose from 'mongoose'

import runner from '../../runner'

runner()
  .requiredNetwork(['acala'])
  .withApiPromise()
  .run(async ({ api }) => {
    await mongoose.connect(config.mongodbUrl)

    const wallet = new Wallet(api)

    const stableCurrency = await wallet.getToken(api.consts.cdpEngine.getStableCurrencyId)

    const queryData = async (block: number, addresses: string[]) => {
      const apiAt = await api.at(await api.rpc.chain.getBlockHash(block))

      const collaterals = await Promise.all(
        (
          await apiAt.query.cdpEngine.collateralParams.keys()
        ).map(async (x) => {
          const currency = x.args[0]
          const rateValue = (await apiAt.query.cdpEngine.debitExchangeRate(currency)).unwrapOr(
            apiAt.consts.cdpEngine.defaultDebitExchangeRate
          )
          const rate = FixedPointNumber.fromInner(rateValue.toString(), 18)
          return {
            currency,
            rate,
          }
        })
      )

      const rewardPools = (await apiAt.query.rewards.poolInfos.entries()).map(([key, info]) => ({
        pool: key.args[0],
        info,
      }))

      const provisioningPools = (await apiAt.query.dex.provisioningPool.entries()).map(([key, data]) => ({
        pair: key.args[0],
        account: key.args[1],
        data: [(data as any)[0].toBigInt(), (data as any)[1].toBigInt()] as [bigint, bigint],
      }))

      const provisioningPoolsShareData = {} as Record<
        string,
        { pair: AcalaPrimitivesTradingPair; shareAmount: bigint }[]
      >

      const initialExchangeRate = (await apiAt.query.dex.initialShareExchangeRates.entries()).map(([key, data]) => ({
        pair: key.args[0],
        data: [(data as any)[0].toBigInt(), (data as any)[1].toBigInt()] as [bigint, bigint],
      }))

      const poolData = {} as Record<
        string,
        { pair: AcalaPrimitivesTradingPair; initalRate: [bigint, bigint]; totalShare: bigint }
      >

      for (const { pair, data } of initialExchangeRate) {
        poolData[pair.toString()] = {
          pair,
          initalRate: data,
          totalShare: 0n,
        }
      }

      for (const data of provisioningPools) {
        const acc = data.account.toString()

        const pool = poolData[data.pair.toString()]
        const shareAmount =
          (data.data[0] * pool.initalRate[0]) / 10n ** 18n + (data.data[1] * pool.initalRate[1]) / 10n ** 18n
        pool.totalShare += shareAmount

        provisioningPoolsShareData[acc] = provisioningPoolsShareData[acc] || []
        provisioningPoolsShareData[acc].push({
          pair: data.pair,
          shareAmount: shareAmount,
        })
      }

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

          const nativeToken = await wallet.getToken(api.consts.currencies.getNativeCurrencyId)
          const data = [{ name: nativeToken.display, token: nativeToken, free: native.toBigInt() }]
          for (const [key, value] of tokens) {
            const currencyId = key.args[1] as AcalaPrimitivesCurrencyCurrencyId
            const token = await wallet.getToken(currencyId)
            const name = token.display
            const free = value.free.toBigInt()
            data.push({
              name,
              token,
              free,
            })

            // if (token.isDexShare) {
            //   const token1 = await wallet.getToken(currencyId.asDexShare[0])
            //   const token2 = await wallet.getToken(currencyId.asDexShare[1])
            //   const totalShare = await apiAt.query.tokens.totalIssuance(currencyId)
            //   const poolAmount = await apiAt.query.dex.liquidityPool(token.toTradingPair(api))
            //   const token1Amount = (poolAmount[0].toBigInt() * free) / totalShare.toBigInt()
            //   const token2Amount = (poolAmount[1].toBigInt() * free) / totalShare.toBigInt()

            //   data.push({
            //     name: token.display + ' ' + token1.display,
            //     token: token1,
            //     free: token1Amount,
            //   })

            //   data.push({
            //     name: token.display + ' ' + token2.display,
            //     token: token2,
            //     free: token2Amount,
            //   })
            // }
          }
          for (const { currency, rate } of collaterals) {
            const collateralToken = await wallet.getToken(currency)
            const pos = await apiAt.query.loans.positions(currency, address)
            const debit = FixedPointNumber.fromInner(pos.debit.toString(), stableCurrency.decimals).mul(rate)
            if (!pos.debit.eqn(0)) {
              data.push({
                name: 'Debit ' + collateralToken.display,
                token: stableCurrency,
                free: -BigInt(debit.toChainData()),
              })
            }

            data.push({
              name: 'Collateral ' + collateralToken.display,
              token: collateralToken,
              free: pos.collateral.toBigInt(),
            })
          }

          for (const pool of rewardPools) {
            if (pool.pool.isDex) {
              const reward = await apiAt.query.rewards.sharesAndWithdrawnRewards(pool.pool, address)
              const share = reward[0].toBigInt()
              const poolCurrencyId = pool.pool.asDex
              const token = await wallet.getToken(poolCurrencyId)
              data.push({
                name: 'Reward' + token.display,
                token,
                free: share,
              })

              // const token1 = await wallet.getToken(poolCurrencyId.asDexShare[0])
              // const token2 = await wallet.getToken(poolCurrencyId.asDexShare[1])
              // const totalShare = await apiAt.query.tokens.totalIssuance(poolCurrencyId)
              // const poolAmount = await apiAt.query.dex.liquidityPool(token.toTradingPair(api))
              // const token1Amount = (poolAmount[0].toBigInt() * share) / totalShare.toBigInt()
              // const token2Amount = (poolAmount[1].toBigInt() * share) / totalShare.toBigInt()

              // data.push({
              //   name: 'Reward' + token.display + ' ' + token1.display,
              //   token: token1,
              //   free: token1Amount,
              // })

              // data.push({
              //   name: 'Reward' + token.display + ' ' + token2.display,
              //   token: token2,
              //   free: token2Amount,
              // })
            }
          }

          const shareData = provisioningPoolsShareData[address] || []
          for (const { pair, shareAmount } of shareData) {
            const lpToken = apiAt.registry.createType('AcalaPrimitivesCurrencyCurrencyId', {
              dexShare: [pair[0].toJSON(), pair[1].toJSON()],
            })
            const token = await wallet.getToken(lpToken)
            data.push({
              name: token.display,
              token,
              free: shareAmount,
            })

            // const pool = poolData[pair.toString()]

            // const token1 = await wallet.getToken(pair[0])
            // const token2 = await wallet.getToken(pair[1])
            // const token1Amount = (shareAmount * 10n ** 18n) / 2n / pool.initalRate[0]
            // const token2Amount = (shareAmount * 10n ** 18n) / 2n / pool.initalRate[1]

            // data.push({
            //   name: token.display + ' ' + token1.display,
            //   token: token1,
            //   free: token1Amount,
            // })

            // data.push({
            //   name: token.display + ' ' + token2.display,
            //   token: token2,
            //   free: token2Amount,
            // })
          }

          return {
            name: address,
            data: data.filter((x) => x.free !== 0n),
          }
        })
      )
    }

    const beforeBlock = 1638215
    const afterBlock = 1696000

    // const addresses = []

    // for await (const acc of AccountBalance.find({})) {
    //   addresses.push(acc._id)
    // }

    const addresses = (
      await AccountTrace.aggregate([
        {
          $match: {
            $or: [{ value: { $gt: 0.5 } }, { value: { $lt: -0.5 } }],
          },
        },
        {
          $group: {
            _id: '$account',
          },
        },
      ])
    ).map((i) => i._id) as string[]

    const [dataBefore, dataAfter] = await Promise.all([
      queryData(beforeBlock, addresses),
      queryData(afterBlock, addresses),
    ])

    const result = []
    const keys: Set<string> = new Set()

    for (let i = 0; i < addresses.length; i++) {
      const name = addresses[i]
      const beofre = dataBefore[i]
      const after = dataAfter[i]
      const free = {} as {
        [key: string]: { name: string; token: any; xcmIn?: any; xcmOut?: any; before?: any; after?: any }
      }

      for (const { name, token, free: f } of beofre.data) {
        if (!free[name]) {
          free[name] = { name, token }
        }

        console.assert(free[name].before === undefined, 'before', name, free[name].before)
        free[name].before = f
      }

      for (const { name, token, free: f } of after.data) {
        if (!free[name]) {
          free[name] = { name, token }
        }

        console.assert(free[name].after === undefined, 'after', name, free[name].after)
        free[name].after = f
      }

      const agg = [
        {
          $match: {
            category: 'xcm-transfer',
            account: name,
            amount: { $gt: 0 },
          },
        },
        {
          $group: {
            _id: '$currencyId',
            sum: {
              $sum: '$amount',
            },
          },
        },
      ]

      for await (const xcmData of await AccountTrace.aggregate(agg)) {
        const currency = api.registry.createType('AcalaPrimitivesCurrencyCurrencyId', JSON.parse(xcmData._id))
        const token = await wallet.getToken(currency)
        const name = token.display
        if (!free[name]) {
          free[name] = { name, token }
        }

        console.assert(free[name].xcmIn === undefined, free[name].xcmIn, name, xcmData)
        free[name].xcmIn = BigInt(xcmData.sum.toString())
      }

      const agg2 = [
        {
          $match: {
            category: 'xcm-transfer',
            account: name,
            amount: { $lt: 0 },
          },
        },
        {
          $group: {
            _id: '$currencyId',
            sum: {
              $sum: '$amount',
            },
          },
        },
      ]

      for await (const xcmData of await AccountTrace.aggregate(agg2)) {
        const currency = api.registry.createType('AcalaPrimitivesCurrencyCurrencyId', JSON.parse(xcmData._id))
        const token = await wallet.getToken(currency)
        const name = token.display
        if (!free[name]) {
          free[name] = { name, token }
        }

        console.assert(free[name].xcmOut === undefined, free[name].xcmOut, name, xcmData)
        free[name].xcmOut = -BigInt(xcmData.sum.toString())
      }

      const data = {
        account: name,
      } as Record<string, string>
      for (const val of Object.values(free)) {
        keys.add(`${val.name} before`)
        keys.add(`${val.name} after`)
        keys.add(`${val.name} xcmIn`)
        keys.add(`${val.name} xcmOut`)
        data[`${val.name} before`] = formatBalance(val.before, val.token.decimals)
        data[`${val.name} after`] = formatBalance(val.after, val.token.decimals)
        data[`${val.name} xcmIn`] = formatBalance(val.xcmIn, val.token.decimals)
        data[`${val.name} xcmOut`] = formatBalance(val.xcmOut, val.token.decimals)
        // result.push({
        //   account: name,
        //   token: val.name,
        //   before: formatBalance(val.before, val.token.decimals),
        //   after: formatBalance(val.after, val.token.decimals),
        //   xcmIn: formatBalance(val.xcmIn, val.token.decimals),
        //   xcmOut: formatBalance(val.xcmOut, val.token.decimals),
        // })
      }
      result.push(data)
    }

    for (const k of keys) {
      result[0][k] = result[0][k] || ''
    }
    table(result)

    await mongoose.disconnect()
  })
