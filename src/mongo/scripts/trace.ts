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

const isExitAddr = (addr: string) => {
  const exitAddresses = [
    // config.systemAddresses.loans,
    config.systemAddresses.homa,

    // moonbeam
    '23UvQ3ZQXJ5LfTUSYkcRPkQX2FHgcKxGmqdxYJe9j5e3Lwsi',
    // astar
    '23UvQ3ZQvYBhhhL4C1Zsn7gfDWcWu3pWyG5boWyGufhyoPbc',
    // cex
    '26JqMKx4HJJcmb1kXo24HYYobiK2jURGCq6zuEzFBK3hQ9Ti',
    '23DhqhsKDDpFnH2GreWy7Sk4dqUmGCCVPGk5Lpr84jxzBh5T',
    '221r454cYfBePBwyMLL5QhdijGQaXrLvqKDp5cCBtMTTXWWH',
    '22qUkUHTKmWsMJm9UA781DNRshnig1H2J251wEbciy7yM96m',
    '24i2G8sM8Nqki95y5AafBZoS1EjvVrKSekA93sooNJ8sDtjJ',
    '24Vv7VS9CpRcxThp972X7sWu3Ksjyndrz7ZLnmyj1PYgVchQ',
    // other exit addresses
    '217NfYDjiTTt8THZHH2u5pL71KDAgaEspQxz7k9w5WH9Q4A2',
    '24Px9gwiXJrVgCvWbSG2rxQHLGCWyzyvCNJdSykcNzhQqyKR',
    '21MBxgCyHZbgxwZEXJMAwFBr1U8TPvssrQ6w9phWruRMyFpf',
    '21uDV86a2APWt5StkXrVUsmj9WpEnxCBmi8XCBcDWWguw4Bu',
    '22miD3fb4GakiYzcURaFfLs6WXAkUmUTX2b4UEdBkzju1MDR',
    '23d19597TN8yxc5wBgmxsXFZ5sgvwy8Zp9pcmWbRPifj6ndx',
    '25Xwa9DBi7kxTBsarSDvQzWDYe8X2u3yW6ZtZ7nyjwpaAg3t',
    '25Xwa9DBi7kxTBsarSDvQzWDYe8X2u3yW6ZtZ7nyjwpaAg3t',
    '232KzC62oBQJcxGbsZEF61qFmhDADUGoQzbPx4PHPBzNMy8W',
    '25WAnhrQgifqxPdywQEsczXwW7By4eerzTdcXnJaXjLA4m8z',
    '265EuiEu91bMBbrBZiEGEH9mkUJYafMuNYtaMVRk3XHEAdTG',
    '26SPPh1YLqytf8n4mav5XYCBVyJqCG5K7qBQDsZgmvxZQqss',
    '235VD7W6WQgZd6foWuuiVyQ2ow61uT9zAFm6UCrXLKzQ3VPU',
    '26YvA4eQkGf6NtTYDQ53VhpGgPq1wY2yp9iXP3PY8yTeY4nC',
    '22T81YVAstzeL1zx5AZD37dU97ejm5o3fvNcNuU2sNhG5qps',
    '25TTWHNNFKkK2FNYprV7aeg7T7jyZPRjrW6P6eoLzoFhdDCo',
    '217seC4ytA7PLAK3r5tq9rtLmuF6QK3najweZSHvojTZUuxf',
    '26a6B6w6gVB2EYjHcQt44qrtGKrbTJWaB2QUmKFVXRYWoHqU',
    '22AvzuUNAtaunFDthQyS3GSwVeGxqnhf6Kh2G42Kfce9vKJp',
    '25TTWHNNFKkK2FNYprV7aeg7T7jyZPRjrW6P6eoLzoFhdDCo',
    '25XneaSHxu7BAD9fELjBoSR8hmFKUNga4BEL5T5pD3uUo71j',
    '22gr7trdLZR17xZxQe9ax94oGdXQLnjTwuiLvUf8RXtUi8yh',
    '24PzbynuB69QNefP1iisbEjK71jo2uwcRWCVAxeb6XZHxBqF',
    '25XJ7PNthzBkFNb5BhKWxinG9bTK3pcy4AnmL5q8Bd2s2v7c',
    '22gr7trdLZR17xZxQe9ax94oGdXQLnjTwuiLvUf8RXtUi8yh',
    '234QeQaiAvNHE9brWo7GL53fYk9yGYs9w8EGqNckaitpeYmw',
  ]
  return exitAddresses.includes(addr)
}

const syncTrace = async (): Promise<any> => {
  const agg = [
    {
      $match: {
        value: { $gt: 2 },
      },
    },
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

  for await (const data of Trace.aggregate(agg, { allowDiskUse: true })) {
    const blockHeight = data._id as number
    const traces = data.data as Trace[]

    const changes = {} as Record<string, number>

    for (const trace of traces) {
      if (trace.to === config.systemAddresses.homa && trace.call === 'Homa.request_redeem') {
        // ignore as this does not actually transfer value
        continue
      }
      if (trace.call === 'Dex.claim_dex_share') {
        continue
      }
      if (trace.from === config.systemAddresses.incentives || trace.to === config.systemAddresses.incentives) {
        if (trace.currencyId.includes('DexShare')) {
          // deposit or withdraw dex share
          continue
        }
      }

      let from = trace.from
      let createTrace = false

      if (trace.call === 'Dex.add_liquidity' && trace.event === 'Tokens.Deposited') {
        from = config.systemAddresses.dex
      }

      if (from) {
        const fromAcc = await AccountBalance.findOne({ _id: from })
        if (fromAcc) {
          createTrace = true
          if (trace.to && !isExitAddr(trace.to)) {
            changes[from] = (changes[from] || 0) - trace.value
            fromAcc.value -= trace.value
            await fromAcc.save()
          }
        }
        if (trace.call === 'Incentives.claim_rewards' && trace.currencyId === '{"Token":"AUSD"}') {
          createTrace = true
        }
      }

      if (createTrace && trace.to && !isExitAddr(trace.to)) {
        if (trace.to !== config.systemAddresses.cdp) {
          changes[trace.to] = (changes[trace.to] || 0) + trace.value
          await AccountBalance.updateOne({ _id: trace.to }, { $inc: { value: trace.value } }, { upsert: true })
        }

        await AccountBalanceTrace.create({
          _id: trace._id,
          height: trace.height,
          blockHash: trace.blockHash,
          extrinsicHash: trace.extrinsicHash,
          call: trace.call,
          event: trace.event,
          amount: trace.amount,
          currencyId: trace.currencyId,
          from,
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
