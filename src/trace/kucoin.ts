import '@acala-network/types'
import {
  AcalaPrimitivesCurrencyCurrencyId,
  AcalaPrimitivesTradingPair,
} from '@acala-network/types/interfaces/types-lookup'

import { Wallet } from '@acala-network/sdk/wallet'
import { fetchEntriesToArray } from '@open-web3/util'

import { formatBalance, table } from '../log'
import runner from '../runner'

runner()
  .requiredNetwork(['acala'])
  .withApiPromise()
  .run(async ({ api }) => {
    const cexAddr = [
      '217NfYDjiTTt8THZHH2u5pL71KDAgaEspQxz7k9w5WH9Q4A2',
      '217seC4ytA7PLAK3r5tq9rtLmuF6QK3najweZSHvojTZUuxf',
      '21BZxNXVHK7JymKGnPPW9wNmQNJYTXhM2CftUsoGPpbfXtks',
      '21kt2qzXjyH6fBeG1VRyB4adFjbwramsVczNHca13eua96pu',
      '21MBxgCyHZbgxwZEXJMAwFBr1U8TPvssrQ6w9phWruRMyFpf',
      '21uDV86a2APWt5StkXrVUsmj9WpEnxCBmi8XCBcDWWguw4Bu',
      '21wnQgeWkjyoCDeBPn41QTeBmSm8ddnd9EsGdgi6YonWsmJv',
      '22AvzuUNAtaunFDthQyS3GSwVeGxqnhf6Kh2G42Kfce9vKJp',
      '22gr7trdLZR17xZxQe9ax94oGdXQLnjTwuiLvUf8RXtUi8yh',
      '22JN4pgXfUYavBPtc8DAp6Eh47w2bGxtRhYqNdzbpZkXbVqa',
      '22miD3fb4GakiYzcURaFfLs6WXAkUmUTX2b4UEdBkzju1MDR',
      '22NYU4mpwbh5xReRkNTztkc2Xc8Bvwjk1TzYxKEnMefLQ4qP',
      '22T81YVAstzeL1zx5AZD37dU97ejm5o3fvNcNuU2sNhG5qps',
      '22uZp2mo9gBDSznGx5D7NBS14tJ3zRPztpE4ei2Pi8Ap6w8D',
      '22zcrNq347jVeZYh6inegwLQfJ4m33cxXf1jTXcv8rj7ZowG',
      '232KzC62oBQJcxGbsZEF61qFmhDADUGoQzbPx4PHPBzNMy8W',
      '234QeQaiAvNHE9brWo7GL53fYk9yGYs9w8EGqNckaitpeYmw',
      '235kJrfWVrjHjzuHFrGPqk5GZoQjaNryadJZH9S68kAoEQ7L',
      '235VD7W6WQgZd6foWuuiVyQ2ow61uT9zAFm6UCrXLKzQ3VPU',
      '23d19597TN8yxc5wBgmxsXFZ5sgvwy8Zp9pcmWbRPifj6ndx',
      '23Da2dpGZhiGF45fZFhyZR7ZR9yKZekASjpaRrhdLbY5r6yt',
      '23DhqhsKDDpFnH2GreWy7Sk4dqUmGCCVPGk5Lpr84jxzBh5T',
      '23En8vsfjc5PwPYGTAwazR39LvtzHQGDX3GnAykECufc5kkK',
      '23WGC8YAapwLxz1jpw44NW4VhaQ851KA8d165yahhdWkRJRx',
      '23xYohWzet7RuHmu2Gq1UMTTdfJ5E7H3EVyhcLnwPHFp3vsq',
      '23YQ6jFqEXJbDMFYoLT7p4s37nXMJj9Qq9hjjkHy3btw9a6F',
      '24at2teh82wYYrYfRy24wbLXzsx6PsbwknRARtJWhfP7D8nG',
      '24HzwK2w9tDpDHQ5XQQNii3hFnKewJTWfHaZHqGBALCo1XD7',
      '24iqn1Y3EP5qEYNsn3xa5RViDkuqZ96vRUcdyXzCPsvhAiWS',
      '24MUpK1uVBgn8kKVh6dBZjJYXa8RYmNyrh8pEzKjKQdCJXRt',
      '24Px9gwiXJrVgCvWbSG2rxQHLGCWyzyvCNJdSykcNzhQqyKR',
      '24PzbynuB69QNefP1iisbEjK71jo2uwcRWCVAxeb6XZHxBqF',
      '25bSEvYqvL7bchtGkvme7ycrHb1hqMvcepsMApmNiR1T9ikf',
      '25TTWHNNFKkK2FNYprV7aeg7T7jyZPRjrW6P6eoLzoFhdDCo',
      '25v1BEfEoZSWLr34Jqj5Y4CYGRJEyvtTeuTs8a3rVZGpPjEQ',
      '25WAnhrQgifqxPdywQEsczXwW7By4eerzTdcXnJaXjLA4m8z',
      '25XJ7PNthzBkFNb5BhKWxinG9bTK3pcy4AnmL5q8Bd2s2v7c',
      '25XneaSHxu7BAD9fELjBoSR8hmFKUNga4BEL5T5pD3uUo71j',
      '25Xwa9DBi7kxTBsarSDvQzWDYe8X2u3yW6ZtZ7nyjwpaAg3t',
      '263AqwbsRZmBjHWk7G6FxUrmgr7QxxPWDea5GPPS2aj9CTW7',
      '263cUSPicxPXUD1CgHn81KjLpeCFubzm1EqsFu6bpPZKrpDp',
      '265EuiEu91bMBbrBZiEGEH9mkUJYafMuNYtaMVRk3XHEAdTG',
      '26a6B6w6gVB2EYjHcQt44qrtGKrbTJWaB2QUmKFVXRYWoHqU',
      '26MJJCHK6NrnRfxNDXyQfiK6ksUCV7VsHf7jhnmhBp2kv3g5',
      '26SPPh1YLqytf8n4mav5XYCBVyJqCG5K7qBQDsZgmvxZQqss',
      '26YvA4eQkGf6NtTYDQ53VhpGgPq1wY2yp9iXP3PY8yTeY4nC',
      'zup4jAepDp2W6qG7NbRsoPa8hXdqiS27sqR2rwWZQ6t5PBi',
    ]

    const beforeBlock = 1638215
    const afterBlock = 1639493

    const wallet = new Wallet(api)

    const tokenNames = {
      '{"token":"ACA"}': 'ACA',
      '{"token":"AUSD"}': 'AUSD',
      '{"token":"DOT"}': 'DOT',
      '{"token":"LDOT"}': 'LDOT',
      '{"liquidCrowdloan":13}': 'LCDOT',
      '{"foreignAsset":3}': 'iBTC',
      '{"foreignAsset":4}': 'INTR',
      '{"stableAssetPoolToken":0}': 'tDOT',
      '{"dexShare":[{"token":"AUSD"},{"foreignAsset":3}]}': 'AUSD/iBTC',
      '{"dexShare":[{"token":"AUSD"},{"foreignAsset":4}]}': 'AUSD/INTR',
      '{"dexShare":[{"token":"AUSD"},{"liquidCrowdloan":13}]}': 'AUSD/LCDOT',
      '{"dexShare":[{"token":"ACA"},{"token":"AUSD"}]}': 'ACA/AUSD',
      '{"dexShare":[{"token":"AUSD"},{"token":"LDOT"}]}': 'AUSD/LDOT',
      '{"dexShare":[{"token":"DOT"},{"liquidCrowdloan":13}]}': 'DOT/LCDOT',
    } as Record<string, string>

    const queryData = async (block: number, addresses: string[]) => {
      const apiAt = await api.at(await api.rpc.chain.getBlockHash(block))

      const provisioningPools = (await apiAt.query.dex.provisioningPool.entries()).map(([key, data]) => ({
        pair: key.args[0],
        account: key.args[1],
        data: [(data as any)[0].toBigInt(), (data as any)[1].toBigInt()] as [bigint, bigint],
      }))

      const provisioningPoolsShareData = {} as Record<
        string,
        { pair: AcalaPrimitivesTradingPair; shareAmount: bigint }[]
      >

      const initialExchangeRate = (await apiAt.query.dex.initialShareExchangeRates.entries()).map(([key, data]) => ({
        pair: key.args[0],
        data: [(data as any)[0].toBigInt(), (data as any)[1].toBigInt()] as [bigint, bigint],
      }))

      const poolData = {} as Record<
        string,
        { pair: AcalaPrimitivesTradingPair; initalRate: [bigint, bigint]; totalShare: bigint }
      >

      for (const { pair, data } of initialExchangeRate) {
        poolData[pair.toString()] = {
          pair,
          initalRate: data,
          totalShare: 0n,
        }
      }

      for (const data of provisioningPools) {
        const acc = data.account.toString()

        const pool = poolData[data.pair.toString()]
        const shareAmount =
          (data.data[0] * pool.initalRate[0]) / 10n ** 18n + (data.data[1] * pool.initalRate[1]) / 10n ** 18n
        pool.totalShare += shareAmount

        provisioningPoolsShareData[acc] = provisioningPoolsShareData[acc] || []
        provisioningPoolsShareData[acc].push({
          pair: data.pair,
          shareAmount: shareAmount,
        })
      }

      return Promise.all(
        addresses.map(async (address) => {
          const native = (await apiAt.query.system.account(address)).data.free
          const tokens = await fetchEntriesToArray((startKey) =>
            apiAt.query.tokens.accounts.entriesPaged({
              args: [address],
              pageSize: 100,
              startKey,
            })
          )

          const nativeToken = await wallet.getToken(api.consts.currencies.getNativeCurrencyId)
          const data = [{ name: nativeToken.display, token: nativeToken, free: native.toBigInt() }]
          for (const [key, value] of tokens) {
            const currencyId = key.args[1] as AcalaPrimitivesCurrencyCurrencyId
            const token = await wallet.getToken(currencyId)
            const name = tokenNames[JSON.stringify(currencyId)] || token.display
            const free = value.free.toBigInt()
            data.push({
              name,
              token,
              free,
            })
          }

          return {
            name: address,
            data: data.filter((x) => x.free !== 0n),
          }
        })
      )
    }

    const addresses = cexAddr
    const [dataBefore, dataAfter] = await Promise.all([
      queryData(beforeBlock, addresses),
      queryData(afterBlock, addresses),
    ])

    const data = []

    for (let i = 0; i < addresses.length; i++) {
      const addr = addresses[i]
      const beofre = dataBefore[i]
      const after = dataAfter[i]
      const free = {} as { [key: string]: { name: string; token: any; before?: any; after?: any } }

      free['AUSD'] = { name: 'AUSD', token: { decimals: 12 }, before: 0n, after: 0n }
      for (const { name, token, free: f } of beofre.data) {
        if (!free[name]) {
          free[name] = { name, token }
        }
        free[name].before = f
      }
      for (const { name, token, free: f } of after.data) {
        if (!free[name]) {
          free[name] = { name, token }
        }
        free[name].after = f
      }

      data.push(
        ...Object.values(free)
          .filter((x) => x.name === 'AUSD')
          .map(({ token, before, after }) => ({
            address: addr,
            'Before Balance': formatBalance(before, token.decimals),
            'After Balance': formatBalance(after, token.decimals),
          }))
      )
    }

    table(data)
  })
