/* eslint-disable @typescript-eslint/no-misused-promises */

import '@polkadot/api-augment'

import async from 'async'

import { fetchEntriesToArray } from '@open-web3/util'

import { formatBalance, table } from '../log'
import runner from '../runner'

runner()
  .requiredNetwork(['polkadot', 'kusama'])
  .withApiPromise()
  .run(async ({ api }) => {
    const maxCommission = 0.07

    const currentEra = (await api.query.staking.currentEra()).unwrap().toNumber()
    const historyDepth = (await api.query.staking.historyDepth()).toNumber()

    const allPoints = {} as Record<string, Record<number, number> & { sum: number; percent: number; count: number }>

    const removed: Set<string> = new Set()

    const queue = async.queue(async (i: number) => {
      const era = currentEra - i
      const eraValidators = await fetchEntriesToArray((startKey) =>
        api.query.staking.erasValidatorPrefs.entriesPaged({
          args: [era],
          pageSize: 500,
          startKey,
        })
      )

      for (const [key, data] of eraValidators) {
        const address = (key.toHuman() as any)[1] as string
        const commission = data.commission.toNumber() / 1e9
        const blocked = data.blocked.toHuman()

        if (commission > maxCommission) {
          removed.add(address)
          continue
        }

        if (blocked) {
          removed.add(address)
          continue
        }

        allPoints[address] = allPoints[address] || { sum: 0, percent: 0, count: 0 }
        allPoints[address][i] = 0
      }

      const points = await api.query.staking.erasRewardPoints(era)
      for (const [addr, v] of points.individual) {
        const total = points.total.toNumber()
        const address = addr.toHuman()
        const value = v.toNumber()
        allPoints[address] = allPoints[address] || { sum: 0 }
        allPoints[address][i] = value
        allPoints[address].sum = allPoints[address].sum + value
        allPoints[address].percent = allPoints[address].percent + value / total
        allPoints[address].count = allPoints[address].count + 1
      }
    }, 20)

    for (let i = 0; i < historyDepth; i++) {
      void queue.push(i)
    }

    await queue.push(historyDepth)

    // must be top 30% for overall performance
    const overallPoints = Object.entries(allPoints).map(([addr, { sum, percent, count }]) => ({
      addr,
      sum,
      percent,
      count,
    }))
    overallPoints.sort((a, b) => (b.sum || 0) - (a.sum || 0))
    // overallPoints.length = Math.floor(overallPoints.length * 0.3)

    const final = overallPoints.filter((x) => !removed.has(x.addr))

    table(
      await async.mapLimit(final, 20, async (x: typeof final[number]): Promise<any> => {
        const addr = x.addr
        const iden = await api.derive.accounts.identity(addr)
        const seflStake = (await api.query.staking.ledger(addr)).unwrapOrDefault().active.toBigInt()
        return {
          address: addr,
          display: iden.displayParent ? `${iden.displayParent}/${iden.display || ''}` : iden.display,
          comission: (await api.query.staking.validators(addr)).commission.toNumber() / 1e9,
          seflStake: formatBalance(seflStake),
          totalPoints: x.sum,
          percent: x.percent / x.count,
          count: x.count,
        }
      })
    )
  })
