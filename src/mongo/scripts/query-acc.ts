import * as config from '../config'
import { AccountTrace } from '../models'
import { formatBalance, table } from '../../log'
import mongoose from 'mongoose'

const main = async () => {
  await mongoose.connect(config.mongodbUrl)

  const agg = [
    {
      $group: {
        _id: ['$account', '$category', '$currencyId'],
        sum: {
          $sum: '$amount',
        },
      },
    },
  ]

  const sum = {} as Record<string, Record<string, Record<string, bigint>>>
  for await (const data of AccountTrace.aggregate(agg)) {
    const acc = data._id[0]
    const category = data._id[1]
    const currencyId = data._id[2]

    if (!sum[acc]) {
      sum[acc] = {}
    }

    if (!sum[acc][category]) {
      sum[acc][category] = {}
    }

    if (!sum[acc][category][currencyId]) {
      sum[acc][category][currencyId] = 0n
    }

    sum[acc][category][currencyId] += BigInt(data.sum.toString())
  }

  const res = [] as { acc: string; category: string; token: string; amount: string }[]

  for (const [addr, values] of Object.entries(sum)) {
    for (const [category, currencies] of Object.entries(values)) {
      for (const [currencyId, amount] of Object.entries(currencies)) {
        res.push({
          acc: addr,
          category,
          token: currencyId,
          amount: formatBalance(amount, config.tokens[currencyId].decimals),
        })
      }
    }
  }

  table(res)

  await mongoose.disconnect()
}

main().catch(console.error)
