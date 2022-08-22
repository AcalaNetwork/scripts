import * as config from '../config'
import { AccountBalance, AccountBalanceTrace, AccountBlockTrace, Trace } from '../models'
import mongoose from 'mongoose'

const main = async () => {
  const db = await mongoose.connect(config.mongodbUrl)

  try {
    await syncTrace()
  } catch (e) {
    console.error(e)
  } finally {
    await db.disconnect()
  }
}

const systemAddresses = {
  cdp: '23M5ttkmR6KcoCvrNZsA97DQMPxQmqktF8DHYZSDW4HLcEDw',
  homa: '23M5ttkmR6Kco5pqN691bGfU3BhfU6QPG9arw6SR1XpNuQqu',
}

const syncTrace = async (): Promise<any> => {
  const agg = [
    {
      $sort: {
        _id: 1,
      } as Record<string, 1>,
    },
    {
      $group: {
        _id: '$height',
        data: {
          $push: '$$CURRENT',
        },
      },
    },
    {
      $sort: {
        _id: 1,
      } as Record<string, 1>,
    },
  ]

  for await (const data of Trace.aggregate(agg)) {
    const blockHeight = data._id as number
    const traces = data.data as Trace[]

    const changes = {} as Record<string, number>

    for (const trace of traces) {
      if (trace.value < 1) {
        continue
      }
      if (trace.from === systemAddresses.cdp || trace.to === systemAddresses.cdp) {
        // ignore as this does not actually transfer value
        continue
      }
      if (trace.to === systemAddresses.homa && trace.call === 'Homa.request_redeem') {
        // ignore as this does not actually transfer value
        continue
      }

      let createTrace = false
      if (trace.from) {
        const fromAcc = await AccountBalance.findOne({ _id: trace.from })
        if (fromAcc) {
          createTrace = true
          if (trace.to) {
            changes[trace.from] = (changes[trace.from] || 0) - trace.value
            fromAcc.value -= trace.value
            await fromAcc.save()
          }
        }
        if (trace.call === 'Incentives.claim_rewards' && trace.currencyId === '{"Token":"AUSD"}') {
          createTrace = true
        }
      }
      if (createTrace && trace.to) {
        changes[trace.to] = (changes[trace.to] || 0) + trace.value
        await AccountBalance.updateOne({ _id: trace.to }, { $inc: { value: trace.value } }, { upsert: true })
        await AccountBalanceTrace.create({
          _id: trace._id,
          height: trace.height,
          blockHash: trace.blockHash,
          extrinsicHash: trace.extrinsicHash,
          call: trace.call,
          event: trace.event,
          amount: trace.amount,
          currencyId: trace.currencyId,
          from: trace.from,
          to: trace.to,
          value: trace.value,
        })
      }
    }

    for (const [addr, value] of Object.entries(changes)) {
      await AccountBlockTrace.create({
        _id: `${addr}-${blockHeight}`,
        height: traces[0].height,
        blockHash: traces[0].blockHash,
        account: addr,
        value,
      })
    }
  }
}

main().catch(console.error)
