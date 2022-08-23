/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */

import '@acala-network/types'
import '@acala-network/types/interfaces/types-lookup'

import { firstValueFrom } from 'rxjs'

import { FixedPointNumber } from '@acala-network/sdk-core'
import { WalletRx } from '@acala-network/sdk-wallet'

import { formatBalance, formatDecimal, table } from '../log'
import runner from '../runner'

runner()
  .requiredNetwork(['acala', 'karura'])
  .withApiRx()
  .atBlock()
  .run(async ({ api, apiAt }) => {
    const wallet = new WalletRx(api)

    const collaterals = await firstValueFrom(apiAt.query.cdpEngine.collateralParams.entries())

    const stableCurrency = wallet.getToken(apiAt.consts.cdpEngine.getStableCurrencyId)

    const honzonData = await Promise.all(
      collaterals.map(async ([key, data]) => {
        const {
          interestRatePerSec,
          maximumTotalDebitValue,
          liquidationRatio,
          liquidationPenalty,
          requiredCollateralRatio,
        } = (data as any).unwrap()
        const currency = key.args[0]
        const token = wallet.getToken(currency)
        const decimals = token.decimals
        const total = await firstValueFrom(apiAt.query.loans.totalPositions(currency))
        const rateValue = (await firstValueFrom(apiAt.query.cdpEngine.debitExchangeRate(currency))).unwrapOr(
          apiAt.consts.cdpEngine.defaultDebitExchangeRate
        )
        const rate = FixedPointNumber.fromInner(rateValue.toString(), 18)
        const price = (await firstValueFrom(wallet.queryPrice(token))).price

        const collateralValue = price.mul(FixedPointNumber.fromInner(total.collateral.toString(), decimals))
        const debitNumber = FixedPointNumber.fromInner(total.debit.toString(), stableCurrency.decimals)
        const debitValue = debitNumber.mul(rate)

        return {
          currencyName: token.display,
          interestRatePerYear: formatDecimal(
            (interestRatePerSec.unwrapOrDefault().toNumber() / 1e18 + 1) ** (365 * 86400) - 1
          ),
          maxTotalDebitValue: formatBalance(maximumTotalDebitValue, stableCurrency.decimals),
          liquidationRatio: formatDecimal(liquidationRatio.unwrapOrDefault()),
          liquidationPenalty: formatDecimal(liquidationPenalty.unwrapOrDefault()),
          requiredCollateralRatio: formatDecimal(requiredCollateralRatio.unwrapOrDefault()),
          debitExhcnageRate: formatDecimal(rate),
          totalDebit: formatBalance(debitValue, stableCurrency.decimals),
          totalCollateral: formatBalance(total.collateral, decimals),
          totalCollateralValue: formatBalance(collateralValue),
          capitalEfficiency: formatDecimal(debitValue.div(collateralValue)),
          // other: {
          //   currency,
          //   token,
          //   rate,
          //   price,
          //   liquidationRatio: liquidationRatio.unwrapOrDefault(),
          // },
        }
      })
    )

    table(honzonData)
  })
