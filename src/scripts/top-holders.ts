import '@acala-network/types'
import '@acala-network/types/interfaces/types-lookup'

import { fetchEntries } from '@open-web3/util'

import { formatBalance, table } from '../log'
import runner from '../runner'

runner()
  .requiredNetwork(['acala'])
  .atBlock()
  .withApiPromise()
  .run(async ({ apiAt }) => {
    const tokens = [] as { account: string; amount: bigint }[]
    await fetchEntries(
      (startKey) =>
        apiAt.query.tokens.accounts.entriesPaged({
          args: [],
          pageSize: 500,
          startKey,
        }),
      (key, data) => {
        const acc = key.args[0].toString()
        const token = key.args[1].toString()
        if (token === '{"token":"AUSD"}') {
          const val = data.free.toBigInt()
          tokens.push({ account: acc, amount: val })
        }
      }
    )

    tokens.sort((a, b) => Number(b.amount - a.amount))

    table(tokens.map((x) => ({ account: x.account, amount: formatBalance(x.amount) })))
  })
