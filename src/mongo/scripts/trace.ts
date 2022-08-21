import * as config from '../config'
import { AccountBalance, ExtrinsicTrace, Meta, Trace } from '../models'
import mongoose, { ClientSession } from 'mongoose'

const main = async () => {
  const db = await mongoose.connect(config.mongodbUrl)
  const session = await db.startSession()

  try {
    let meta = await Meta.findOne({})
    if (!meta) {
      meta = await Meta.create({})
    }

    await syncTrace(session, meta.extrinsicTraceBlock, meta.traceBlock)
  } catch (e) {
    console.error(e)
  } finally {
    await session.endSession()
    await db.disconnect()
  }
}

const syncTrace = async (session: ClientSession, fromBlock: number, toBlock: number): Promise<any> => {
  const maxBlocks = 1000
  const endBlock = Math.min(fromBlock + maxBlocks, toBlock)

  console.log(`Updating trace from block ${fromBlock} to ${endBlock}`)

  await session.withTransaction(async () => {
    const agg = [
      {
        $match: {
          height: {
            $gte: fromBlock,
            $lt: toBlock,
          },
        },
      },
      {
        $sort: {
          _id: 1,
        } as Record<string, 1>,
      },
      {
        $group: {
          _id: '$extrinsicHash',
          data: {
            $push: '$$CURRENT',
          },
        },
      },
    ]

    for await (const data of Trace.aggregate(agg)) {
      const extrinsicHash = data._id
      const traces = data.data as Trace[]

      for (const trace of traces) {
        if (trace.value < 1) {
          continue
        }
        let createTrace = false
        if (trace.from) {
          const fromAcc = await AccountBalance.findOne({ _id: trace.from })
          if (fromAcc) {
            createTrace = true
            if (trace.to) {
              fromAcc.value -= trace.value
              await fromAcc.save()
            }
          }
          if (trace.call === 'Incentives.claim_rewards' && trace.currencyId === '{"Token":"AUSD"}') {
            createTrace = true
          }
        }
        if (createTrace) {
          await AccountBalance.updateOne({ _id: trace.to }, { $inc: { value: trace.value } }, { upsert: true })
          await ExtrinsicTrace.create({
            eventId: trace._id,
            height: trace.height,
            blockHash: trace.blockHash,
            extrinsicHash,
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
    }

    await Meta.updateOne({}, { extrinsicTraceBlock: endBlock })
  })

  if (endBlock < toBlock) {
    return syncTrace(session, endBlock, toBlock)
  }
}

main().catch(console.error)
