/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */

import '@acala-network/types'
import '@acala-network/types/interfaces/types-lookup'

import { fetchEntries, fetchEntriesToArray } from '@open-web3/util'
import { firstValueFrom } from 'rxjs'
import { log } from '../log'
import runner from '../runner'

runner()
  .requiredNetwork(['acala', 'karura'])
  .withApiRx()
  .atLatestBlock()
  .run(async ({ apiAt }) => {
    const collaterals = await firstValueFrom(apiAt.query.cdpEngine.collateralParams.keys())

    for (const key of collaterals) {
      const currency = key.args[0]

      log('Currency', currency)

      const loans = await fetchEntriesToArray((startKey) =>
        firstValueFrom(
          apiAt.query.loans.positions.entriesPaged({
            args: [currency],
            pageSize: 500,
            startKey,
          })
        )
      )

      const loansObj = Object.fromEntries(
        loans.map(([key, value]) => [key.args[1].toString(), value.collateral.toString()])
      ) as Record<string, string>

      await fetchEntries(
        (startKey) =>
          firstValueFrom(
            apiAt.query.rewards.sharesAndWithdrawnRewards.entriesPaged({
              args: [{ Loans: currency }],
              pageSize: 500,
              startKey,
            })
          ),
        (key, entry) => {
          const acc = key.args[1].toString()
          const shares = entry[0].toString()
          const collateral = loansObj[acc]
          if (collateral !== shares) {
            console.error('Mismatching', {
              acc,
              shares,
              collateral,
            })
          }
        }
      )
    }
  })
