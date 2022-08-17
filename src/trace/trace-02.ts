import { readFileSync } from 'fs'

import '@acala-network/types'
import {
  AcalaPrimitivesCurrencyCurrencyId,
  AcalaPrimitivesTradingPair,
} from '@acala-network/types/interfaces/types-lookup'

import { FixedPointNumber, Token } from '@acala-network/sdk-core'
import { Wallet } from '@acala-network/sdk/wallet'
import { fetchEntriesToArray } from '@open-web3/util'

import { formatBalance, table } from '../log'
import runner from '../runner'

runner()
  .requiredNetwork(['acala'])
  .atBlock()
  .withApiPromise()
  .run(async ({ api, apiAt }) => {
    console.log(`
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

    const processed = [
      // ['23M5ttkmR6Kco7bReRDve6bQUSAcwqebatp3fWGJYb4hDSDJ', 4299119431496263064n], // reward pool
      ['24QGpzBVqBi1Tvhsc3Ma6W3zGx8qLspeQRcP7vxZgu7FC6vD', 510596836466674964n],
      ['25T7sudwmcreZicVx21j3pfdchfQmd6eksa6Y1fP8ABxfP5H', 49252732365089272n],
      ['21qmc3rRScZyH5JyiUntmM5GaRfef3rgQQPFUNY9R6seCeNC', 87678200651061816n],
      ['24MdTYGN3BDVNRGowPva9tvewYFSUTJ3gxhpBQhxYGu8TJwS', 213405065723967350n],
      ['24zbvu8D2iPdB1bmTMjLKDgmLFphWmrsXfFfdMFmJkw3FB7D', 2920657996245n],
      ['zvELhACn7LNjQ8UtSQj6qdiqWCi5TAVTD7e4pK47tJzpFVB', 47527872027484783n],
      ['23eCXs2tg7xv2btSHtb3m79eiN96KZtQ6GMpWpg6EKDQnKB2', 4430513376532375815n],
      ['23YqfEJB8zMWi8egFcYmCwa6cv4xQQVQdonAwqH9b5NPbWeK', 9986670778918980192n],
      ['24ruSUsgoPMRZxcdTiBagt45HdJbHGgcAsaU82ozy4PXb3CJ', 677543377399058058n],
      ['26JmEcghNmggvT46sojckg34Py9zFRKkCcFy3gr49hrFgT2k', 1267238048190270564136n],
      ['24JxgR7Qph4h1JE2rarvcjLAuJ5ZCRRU3UDHBF8Swuan8YW1', 1245898965640966904n],
      ['253pFTg22JqHbLeLZupexGMDUuXAJLfEriTYkFqvGWPuwcFi', 1334658780723401627n],
      ['23bmUgSeKMD8Y9triphPw5YHuiz3QUJNqcbmb3Eg9QMQDMWN', 30129211701911631n],
      ['21S9fju5jSp4FWeT1RNQs6MmvfLUc1PoqRivaPNVku6K64oJ', 2215129974286038399n],
      ['23zjkju8pxHtm8b26ntsZHjWUaV3LNRc5YDoYAz6ZfVKHUmn', 494063257449486395n],
    ] as [string, bigint][]

    for (const [who, amount] of processed) {
      all[who] -= amount
      if (all[who] === 0n) {
        delete all[who]
      }
    }

    const beforeBlock = 1638215
    const afterBlock = 1639493

    const wallet = new Wallet(api)

    const tokenNames = {
      '{"token":"ACA"}': 'ACA',
      '{"token":"AUSD"}': 'AUSD',
      '{"token":"DOT"}': 'DOT',
      '{"token":"LDOT"}': 'LDOT',
      '{"liquidCrowdloan":13}': 'LCDOT',
      '{"foreignAsset":3}': 'iBTC',
      '{"foreignAsset":4}': 'INTR',
      '{"stableAssetPoolToken":0}': 'tDOT',
      '{"dexShare":[{"token":"AUSD"},{"foreignAsset":3}]}': 'AUSD/iBTC',
      '{"dexShare":[{"token":"AUSD"},{"foreignAsset":4}]}': 'AUSD/INTR',
      '{"dexShare":[{"token":"AUSD"},{"liquidCrowdloan":13}]}': 'AUSD/LCDOT',
      '{"dexShare":[{"token":"ACA"},{"token":"AUSD"}]}': 'ACA/AUSD',
      '{"dexShare":[{"token":"AUSD"},{"token":"LDOT"}]}': 'AUSD/LDOT',
      '{"dexShare":[{"token":"DOT"},{"liquidCrowdloan":13}]}': 'DOT/LCDOT',
    } as Record<string, string>

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
            const name = tokenNames[JSON.stringify(currencyId)] || token.display
            const free = value.free.toBigInt()
            data.push({
              name,
              token,
              free,
            })

            if (token.isDexShare) {
              const token1 = await wallet.getToken(currencyId.asDexShare[0])
              const token2 = await wallet.getToken(currencyId.asDexShare[1])
              const totalShare = await apiAt.query.tokens.totalIssuance(currencyId)
              const poolAmount = await apiAt.query.dex.liquidityPool(token.toTradingPair(api))
              const token1Amount = (poolAmount[0].toBigInt() * free) / totalShare.toBigInt()
              const token2Amount = (poolAmount[1].toBigInt() * free) / totalShare.toBigInt()

              data.push({
                name: token.display + ' ' + tokenNames[currencyId.asDexShare[0].toString()] || token1.display,
                token: token1,
                free: token1Amount,
              })

              data.push({
                name: token.display + ' ' + tokenNames[currencyId.asDexShare[1].toString()] || token2.display,
                token: token2,
                free: token2Amount,
              })
            }
          }
          for (const { currency, rate } of collaterals) {
            const pos = await apiAt.query.loans.positions(currency, address)
            const debit = FixedPointNumber.fromInner(pos.debit.toString(), stableCurrency.decimals).mul(rate)
            if (!pos.debit.eqn(0)) {
              const token = stableCurrency
              data.push({
                name: 'Debit ' + (tokenNames[currency.toString()] || currency.toString()),
                token,
                free: -BigInt(debit.toChainData()),
              })
            }
            data.push({
              name: 'Collateral ' + (tokenNames[currency.toString()] || currency.toString()),
              token: await wallet.getToken(currency),
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
                name: tokenNames[poolCurrencyId.toString()] || poolCurrencyId.toString(),
                token,
                free: share,
              })

              const token1 = await wallet.getToken(poolCurrencyId.asDexShare[0])
              const token2 = await wallet.getToken(poolCurrencyId.asDexShare[1])
              const totalShare = await apiAt.query.tokens.totalIssuance(poolCurrencyId)
              const poolAmount = await apiAt.query.dex.liquidityPool(token.toTradingPair(api))
              const token1Amount = (poolAmount[0].toBigInt() * share) / totalShare.toBigInt()
              const token2Amount = (poolAmount[1].toBigInt() * share) / totalShare.toBigInt()

              data.push({
                name: token.display + ' ' + tokenNames[poolCurrencyId.asDexShare[0].toString()] || token1.display,
                token: token1,
                free: token1Amount,
              })

              data.push({
                name: token.display + ' ' + tokenNames[poolCurrencyId.asDexShare[1].toString()] || token2.display,
                token: token2,
                free: token2Amount,
              })
            }
          }

          const shareData = provisioningPoolsShareData[address] || []
          for (const { pair, shareAmount } of shareData) {
            const lpToken = apiAt.registry.createType('AcalaPrimitivesCurrencyCurrencyId', {
              dexShare: [pair[0].toJSON(), pair[1].toJSON()],
            })
            const token = await wallet.getToken(lpToken)
            data.push({
              name: tokenNames[lpToken.toString()] || token.display,
              token,
              free: shareAmount,
            })

            const pool = poolData[pair.toString()]

            const token1 = await wallet.getToken(pair[0])
            const token2 = await wallet.getToken(pair[1])
            const token1Amount = (shareAmount * 10n ** 18n) / 2n / pool.initalRate[0]
            const token2Amount = (shareAmount * 10n ** 18n) / 2n / pool.initalRate[1]

            data.push({
              name: token.display + ' ' + tokenNames[pair[0].toString()] || token1.display,
              token: token1,
              free: token1Amount,
            })

            data.push({
              name: token.display + ' ' + tokenNames[pair[1].toString()] || token2.display,
              token: token2,
              free: token2Amount,
            })
          }

          return {
            name: address,
            data: data.filter((x) => x.free !== 0n),
          }
        })
      )
    }

    const blockNow = (await apiAt.query.system.number()).toNumber()

    const addresses = Object.keys(all)
    const [dataBefore, dataAfter, dataNow] = await Promise.all([
      queryData(beforeBlock, addresses),
      queryData(afterBlock, addresses),
      queryData(blockNow, addresses),
    ])

    const total = {} as Record<string, { value: bigint; token: Token }>

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

        console.assert(free[name].now === undefined)
        free[name].now = f
      }
      for (const { name, token, free: f } of beofre.data) {
        if (!free[name]) {
          free[name] = { name, token }
        }

        console.assert(free[name].before === undefined)
        free[name].before = f
      }
      for (const { name, token, free: f } of after.data) {
        if (!free[name]) {
          free[name] = { name, token }
        }

        console.assert(free[name].after === undefined)
        free[name].after = f
      }

      for (const { name: tokenName, token, now, before } of Object.values(free)) {
        const beforeDiff = (now ?? 0n) - BigInt(before ?? 0n)
        if (beforeDiff < 0n) {
          continue
        }
        if (tokenName === 'ACA' || tokenName === 'Collateral ACA') {
          if (!total['ACA']) {
            total['ACA'] = { value: 0n, token }
          }
          total['ACA'].value += beforeDiff
        }
        if (tokenName === 'LDOT' || tokenName === 'Collateral LDOT') {
          if (!total['LDOT']) {
            total['LDOT'] = { value: 0n, token }
          }
          total['LDOT'].value += beforeDiff
        }
        if (tokenName === 'INTR' || tokenName === 'Collateral INTR') {
          if (!total['INTR']) {
            total['INTR'] = { value: 0n, token }
          }
          total['INTR'].value += beforeDiff
        }
        if (tokenName === 'DOT' || tokenName === 'Collateral DOT') {
          if (!total['DOT']) {
            total['DOT'] = { value: 0n, token }
          }
          total['DOT'].value += beforeDiff
        }
        if (tokenName === 'iBTC') {
          if (!total['iBTC']) {
            total['iBTC'] = { value: 0n, token }
          }
          total['iBTC'].value += beforeDiff
        }
        if (tokenName === 'LP aUSD-IBTC iBTC') {
          if (!total['LP aUSD-IBTC iBTC']) {
            total['LP aUSD-IBTC iBTC'] = { value: 0n, token }
          }
          total['LP aUSD-IBTC iBTC'].value += beforeDiff
        }
        if (tokenName === 'LP aUSD-IBTC AUSD') {
          if (!total['LP aUSD-IBTC AUSD']) {
            total['LP aUSD-IBTC AUSD'] = { value: 0n, token }
          }
          total['LP aUSD-IBTC AUSD'].value += beforeDiff
        }
        if (tokenName.startsWith('Debit')) {
          if (!total['Debit']) {
            total['Debit'] = { value: 0n, token }
          }
          total['Debit'].value += beforeDiff
        }
      }

      console.log('Address:', name)
      table(
        Object.values(free)
          .filter((x) => x.now || x.before || x.after)
          .map(({ name, token, now, before, after }) => ({
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

    console.log('Total')
    table(
      Object.fromEntries(
        Object.entries(total).map(([type, val]) => [type, formatBalance(val.value, val.token.decimals)])
      )
    )
  })
