/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */

import '@acala-network/types'
import '@acala-network/types/interfaces/types-lookup'

import { BN } from 'bn.js'
import { fetchEntriesToArray } from '@open-web3/util'
import { formatBalance, formatDecimal, table } from '../log'
import runner from '../runner'

runner()
  .requiredNetwork(['acala', 'karura'])
  .withApiPromise()
  .atLatestBlock()
  .run(async ({ apiAt }) => {
    const totalIssuance = await apiAt.query.balances.totalIssuance()

    const accs = await fetchEntriesToArray((startKey) =>
      apiAt.query.system.account.entriesPaged({
        args: [],
        pageSize: 500,
        startKey,
      })
    )

    const totalBalance = new BN(0)
    const totalLockedBalance = new BN(0)
    const totalReservedBalance = new BN(0)
    const totalFreeBalance = new BN(0)

    for (const [, value] of accs) {
      const free = value.data.free
      const feeFrozen = value.data.feeFrozen
      const miscFrozen = value.data.miscFrozen
      const reserved = value.data.reserved
      totalBalance.iadd(free.add(reserved))
      totalLockedBalance.iadd(BN.max(feeFrozen, miscFrozen))
      totalReservedBalance.iadd(reserved)
      totalFreeBalance.iadd(free.sub(BN.max(feeFrozen, miscFrozen)))
    }

    const loansAddr = '23M5ttkmR6KcoCvrNZsA97DQMPxQmqktF8DHYZSDW4HLcEDw'

    const stakedAmount = (await apiAt.query.system.account(loansAddr)).data.free

    table({
      totalIssuance: formatBalance(totalIssuance, 12),
      totalBalance: formatBalance(totalBalance, 12),
      totalLockedBalance: formatBalance(totalLockedBalance, 12),
      totalReservedBalance: formatBalance(totalReservedBalance, 12),
      totalFreeBalance: formatBalance(totalFreeBalance, 12),
      stakedAmount: formatBalance(stakedAmount, 12),
      stakedRatio: formatDecimal(+stakedAmount.toString() / +totalFreeBalance.toString()),
    })
  })
