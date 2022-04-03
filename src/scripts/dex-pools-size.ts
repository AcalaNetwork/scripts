import '@acala-network/types'
import '@acala-network/types/interfaces/types-lookup'

import { firstValueFrom } from 'rxjs'

import { FixedPointNumber } from '@acala-network/sdk-core'
import { WalletRx } from '@acala-network/sdk-wallet'
import { fetchEntriesToArray } from '@open-web3/util'

import { formatBalance, formatDecimal, table } from '../log'
import runner from '../runner'

runner()
  .requiredNetwork(['acala', 'karura'])
  .withApiRx()
  .atLatestBlock()
  .run(async ({ api, apiAt }) => {
    const wallet = new WalletRx(api)

    const pools = await fetchEntriesToArray((startKey) =>
      firstValueFrom(
        apiAt.query.dex.liquidityPool.entriesPaged({
          args: [],
          pageSize: 500,
          startKey,
        })
      )
    )

    const poolsData = await Promise.all(
      pools.map(async ([key, [amount1, amount2]]) => {
        const token1 = wallet.getToken(key.args[0][0])
        const token2 = wallet.getToken(key.args[0][1])
        const [price1, price2] = await firstValueFrom(wallet.queryPrices([token1, token2]))
        const amount1n = FixedPointNumber.fromInner(amount1.toString(), token1.decimals)
        const amount2n = FixedPointNumber.fromInner(amount2.toString(), token2.decimals)
        return {
          token1: token1.display,
          token2: token2.display,
          token1Amount: formatBalance(amount1, token1.decimals),
          token2Amount: formatBalance(amount2, token2.decimals),
          token1ValueUSD: formatBalance(price1.price.mul(amount1n), token1.decimals),
          token2ValueUSD: formatBalance(price2.price.mul(amount2n), token2.decimals),
          price1: formatDecimal(amount1n.div(amount2n), 6),
          price2: formatDecimal(amount2n.div(amount1n), 6),
        }
      })
    )

    table(poolsData)
  })
