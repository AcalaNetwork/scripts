/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */

import '@acala-network/types'
import '@acala-network/types/interfaces/types-lookup'

// import { Homa } from '@acala-network/sdk'
import { WalletRx } from '@acala-network/sdk-wallet'
import { fetchEntriesToArray } from '@open-web3/util'
import { firstValueFrom } from 'rxjs'
import { forceToCurrencyName } from '@acala-network/sdk-core'
import { formatBalance, formatDecimal, logFormat } from '../log'
import { getApiRx } from '../networks'

import { BN } from 'bn.js'
import type { AcalaPrimitivesCurrencyCurrencyId } from '@polkadot/types/lookup'

const main = async () => {
  const api = getApiRx('karura')
  await firstValueFrom(api.isReady)
  const wallet = new WalletRx(api)
  // const homa = new Homa(api, wallet)

  const collaterals = await firstValueFrom(api.query.cdpEngine.collateralParams.entries())

  const stableCurrency = wallet.getToken(api.consts.cdpEngine.getStableCurrencyId)

  const honzonData = await Promise.all(
    collaterals.map(
      async ([
        key,
        { interestRatePerSec, maximumTotalDebitValue, liquidationRatio, liquidationPenalty, requiredCollateralRatio },
      ]) => {
        const currency = key.args[0]
        const decimal = wallet.getToken(currency).decimal
        const total = await firstValueFrom(
          api.query.loans.totalPositions(currency as AcalaPrimitivesCurrencyCurrencyId)
        )
        const rate = (await firstValueFrom(api.query.cdpEngine.debitExchangeRate(currency))).unwrapOr(
          api.consts.cdpEngine.defaultDebitExchangeRate
        )

        return {
          currencyName: forceToCurrencyName(currency),
          interestRatePerYear: formatDecimal(
            (interestRatePerSec.unwrapOrDefault().toNumber() / 1e18 + 1) ** (365 * 86400) - 1
          ),
          maximumTotalDebitValue: formatBalance(maximumTotalDebitValue, stableCurrency.decimal),
          liquidationRatio: formatDecimal(liquidationRatio.unwrapOrDefault()),
          liquidationPenalty: formatDecimal(liquidationPenalty.unwrapOrDefault()),
          requiredCollateralRatio: formatDecimal(requiredCollateralRatio.unwrapOrDefault()),
          debitExhcnageRate: formatDecimal(rate),
          totalDebit: formatBalance(total.debit.mul(rate).div(new BN((1e18).toString())), stableCurrency.decimal),
          totalCollateral: formatBalance(total.collateral, decimal),
          other: {
            currency,
            decimal,
            rate,
          },
        }
      }
    )
  )

  console.table(Object.fromEntries(honzonData.map(({ currencyName, other: _, ...value }) => [currencyName, value])))

  for (const params of honzonData) {
    const currency = params.other.currency
    const result = await fetchEntriesToArray((startKey) =>
      firstValueFrom(
        api.query.loans.positions.entriesPaged({
          args: [currency],
          pageSize: 500,
          startKey,
        })
      )
    )

    result.sort((a, b) => b[1].debit.cmp(a[1].debit))

    console.table(
      result.slice(0, 3).map(([key, value]) => ({
        token: params.currencyName,
        acc: logFormat(key.args[1]),
        collateral: formatBalance(value.collateral),
        debit: formatBalance(value.debit.mul(params.other.rate).div(new BN((1e18).toString())), stableCurrency.decimal),
      }))
    )
  }
}

main()
  .catch((err) => {
    console.error('Error:', Object.entries(err as object), err)
  })
  .finally(() => {
    process.exit()
  })
