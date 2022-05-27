/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */

import '@acala-network/types'
import '@acala-network/types/interfaces/types-lookup'

import { firstValueFrom } from 'rxjs'
import yargs from 'yargs'

import { FixedPointNumber } from '@acala-network/sdk-core'
import { WalletRx } from '@acala-network/sdk-wallet'

import { formatBalance, formatDecimal, logFormat, table } from '../log'
import runner from '../runner'

runner()
  .requiredNetwork(['acala', 'karura'])
  .withApiRx()
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
          other: {
            currency,
            token,
            rate,
            price,
            liquidationRatio: liquidationRatio.unwrapOrDefault(),
          },
        }
      })
    )

    table(Object.fromEntries(honzonData.map(({ currencyName, other: _, ...value }) => [currencyName, value])))

    for (const addr of addresses) {
      const result = await Promise.all(
        honzonData.map(async (params) => {
          const currency = params.other.currency
          const pos = await firstValueFrom(apiAt.query.loans.positions(currency, addr))
          if (pos.debit.eqn(0)) {
            return null
          }

          const debit = FixedPointNumber.fromInner(pos.debit.toString(), stableCurrency.decimals).mul(params.other.rate)
          const collateralValue = params.other.price.mul(
            FixedPointNumber.fromInner(pos.collateral.toString(), params.other.token.decimals)
          )

          const liquidationRatio = FixedPointNumber.fromInner(params.other.liquidationRatio.toString())
          const liquidationPrice = debit.mul(liquidationRatio).div(collateralValue).mul(params.other.price)
          const collateralRatio = collateralValue.div(debit)
          const buffer = 1 - liquidationRatio.div(collateralRatio).toNumber()

          return {
            account: addr,
            debit,
            collateral: pos.collateral,
            collateralValue,
            collateralRatio,
            liquidationPrice,
            buffer,
            token: params.currencyName,
            decimals: params.other.token.decimals,
          }
        })
      )

      table(
        result.flatMap((value) =>
          value
            ? [
                {
                  acc: logFormat(value.account),
                  token: value.token,
                  debit: formatBalance(value.debit, stableCurrency.decimals),
                  collateral: formatBalance(value.collateral, value.decimals),
                  collateralValue: formatBalance(value.collateralValue, stableCurrency.decimals),
                  collateralRatio: formatDecimal(value.collateralRatio),
                  liquidationPrice: formatBalance(value.liquidationPrice, stableCurrency.decimals),
                  buffer: formatDecimal(value.buffer),
                },
              ]
            : []
        )
      )
    }
  })
