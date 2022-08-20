/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Wallet } from '@acala-network/sdk/wallet'
import { decodeAddress, encodeAddress } from '@polkadot/keyring'
import { gql, request } from 'graphql-request'
import { u8aToHex } from '@polkadot/util'

import { Token } from '@acala-network/sdk-core'
import { formatBalance, table } from '../log'
import runner from '../runner'

const ss58Prefix = 10

runner()
  .requiredNetwork(['acala'])
  .withApiPromise()
  .run(async ({ api }) => {
    const beforeBlock = 1638215
    // const afterBlock = 1639493

    const addresses = [
      '22sFp199qYu4CM9Tok3eh8KtvHHGYZpepwxqtvLbKFqG9hTy',
      '246CS7mbRGx9AxmNCxk8TXPvdTncW1EBStBX1JpuZcETz8ey',
      '23Da2dpGZhiGF45fZFhyZR7ZR9yKZekASjpaRrhdLbY5r6yt',
      '23WGC8YAapwLxz1jpw44NW4VhaQ851KA8d165yahhdWkRJRx',
      '263cUSPicxPXUD1CgHn81KjLpeCFubzm1EqsFu6bpPZKrpDp',
      '25iKjHR2nwrn8dUavmFCqAcxrja1YasLQhckWCygb9CC1UuW',
      '25e8CwDBHuvcpjMxqco3JnoDGzFqxJhPe9ECQujjZL5rkKmn',
      '25s8fdiCZzWboZmTZowZr3ce9tbTmiE83WtMN9FZ73N9CYh3',
      '25zPhmmQGSEd8fXfH3GVGF5SaN5LYH8ixFt2FAEwQvQyLove',
      '25YCYnFqKcUB8xz7AsUtuxVWzvqMrUj5wSmo9tWFekRjy3eJ',
      '24JxgR7Qph4h1JE2rarvcjLAuJ5ZCRRU3UDHBF8Swuan8YW1',
      '24VonbUuxQ1CSLG3vPHLbonKvkgEs7dVzkwDQJyMiWvrBkUL',
      '22bKt6jMy4UTxDMiicm1tv7PiGvZrBtHPTjUNF8cE8WoVefM',
      'zw69mSioDm66y283xz8g4nzR7zNfwB7Yn89oFo1N4BsrR7j',
      '21UbUwWWQvfwYxpkC6eaP1UPX91jRVpU2M7x3jPjz2tDUa1X',
      '22c1qyYWQS94JSSpYFFcYSs8hYynuwS99pCwUcDayTD1RWtn',
      '253rcz1RVQnJKFYx95gef6Tce8x9b63EnCciqbpJ6Wm6wryU',
      '25v1BEfEoZSWLr34Jqj5Y4CYGRJEyvtTeuTs8a3rVZGpPjEQ',
      '25Vu5Qj3iBHSaZVKeCqR1B54iTgcsmDQ55SRHYh96osmVnJs',
      '212MBCvB4ah9E8zgx73Dy7YRgr43LAcAu669tKsby773TA8c',
      '23En8vsfjc5PwPYGTAwazR39LvtzHQGDX3GnAykECufc5kkK',
      '21JRiZ7VDWnECCsAGFm6vubgoJo72j6Szsr5GhAZH7cMgFeb',
      '21L3FqQbvZWHwMdum1HAN9pQystzJ64HPeeksatkqwRo5dTp',
      '21cF27pb6shDzCw7JjpAqV3K8ojtn8QuabTsvZzXNKarPije',
      '26B6Nera44zhPNiN4WJXqm4o7LjmZJ9f6AUNykEUrtR7aMfL',
      '22JN4pgXfUYavBPtc8DAp6Eh47w2bGxtRhYqNdzbpZkXbVqa',
      '21qmc3rRScZyH5JyiUntmM5GaRfef3rgQQPFUNY9R6seCeNC',
      '25b7KcQUAL4UKqTb7sF5FDXuDZcwKdqbYLEG5BT8P32tgm2z',
      '23HV5FHHVtNANnXSGLtEFyDVoaLacAWEYQFz3Eyz1dDskmWR',
      '24dXVGe3EWtFrm9L1ocZDkKSpaQNFLNspjVxNXXQyRNPNT3w',
      '25gVEhmuESXdQcVDNfxGcfyckHj7m2DepxCufMccRXSv743B',
      '256fHBPwHt5ocpXT8Qob9cPGdjC1ZZQPNDDqtMNocsnsU9Kf',
      '22uZp2mo9gBDSznGx5D7NBS14tJ3zRPztpE4ei2Pi8Ap6w8D',
      '21wnQgeWkjyoCDeBPn41QTeBmSm8ddnd9EsGdgi6YonWsmJv',
      '22NYU4mpwbh5xReRkNTztkc2Xc8Bvwjk1TzYxKEnMefLQ4qP',
      '23vQQqYeDQ47ZhtZ9bEaZjAyqKV1zPjaaqHaMhwZ4A7q7ity',
    ].map((x) => u8aToHex(decodeAddress(x)))

    const query = gql`
      query q($acc: JSON, $evt: String) {
        events(
          where: {
            name_eq: $evt,
            block: {height_gte: ${beforeBlock}},
            args_jsonContains: $acc,
          }
        ) {
          extrinsic {
            hash
          }
          block {
            height
            hash
          }
          call {
            name
          }
          args
        }
      }
  `

    const processValue = (value: any): any => {
      if (Array.isArray(value)) {
        return value.map(processValue) as any
      }
      if (typeof value === 'object') {
        if ('value' in value) {
          return { [value.__kind]: processValue(value.value) }
        }
        return value.__kind
      }
      return value
    }

    const processResult = async (result: any, kind: string, from = 'from', to = 'to') => {
      return Promise.all(
        (result.events as any[]).map(async (x: any) => ({
          height: x.block.height,
          blockHash: x.block.hash,
          extrinsicHash: x.extrinsic?.hash,
          call: x.call?.name,
          amount: x.args.amount,
          currencyId: await wallet.getToken(
            api.registry.createType(
              'AcalaPrimitivesCurrencyCurrencyId',
              x.args.currencyId ? processValue(x.args.currencyId) : { Token: 'ACA' }
            )
          ),
          from: from ? encodeAddress(x.args[from], ss58Prefix) : '',
          to: to ? encodeAddress(x.args[to], ss58Prefix) : '',
          kind,
        }))
      )
    }

    const wallet = new Wallet(api)

    for (const addr of addresses) {
      const [result1, result2, result3, result4, result5, result6] = await Promise.all([
        request('https://acala.explorer.subsquid.io/graphql', query, {
          acc: { to: addr },
          evt: 'Tokens.Transfer',
        }),
        request('https://acala.explorer.subsquid.io/graphql', query, {
          acc: { from: addr },
          evt: 'Tokens.Transfer',
        }),
        request('https://acala.explorer.subsquid.io/graphql', query, {
          acc: { who: addr },
          evt: 'Tokens.Deposited',
        }),
        request('https://acala.explorer.subsquid.io/graphql', query, {
          acc: { who: addr },
          evt: 'Tokens.Withdrawn',
        }),
        request('https://acala.explorer.subsquid.io/graphql', query, {
          acc: { to: addr },
          evt: 'Balances.Transfer',
        }),
        request('https://acala.explorer.subsquid.io/graphql', query, {
          acc: { from: addr },
          evt: 'Balances.Transfer',
        }),
      ])

      const [events1, events2, events3, events4, events5, events6] = await Promise.all([
        processResult(result1, 'in'),
        processResult(result2, 'out'),
        processResult(result3, 'in', '', 'who'),
        processResult(result4, 'in', 'who', ''),
        processResult(result5, 'in'),
        processResult(result6, 'out'),
      ])

      const allEvents = events1.concat(events2).concat(events3).concat(events4).concat(events5).concat(events6)
      allEvents.sort((a, b) => a.height - b.height)

      console.log(encodeAddress(addr, ss58Prefix))
      table(
        allEvents.map((x: any) => ({
          ...x,
          currencyId: x.currencyId.display,
          amount: formatBalance(x.amount, x.currencyId.decimals),
        }))
      )

      const total = {} as Record<string, { token: Token; value: bigint }>
      for (const e of allEvents) {
        const currencyName = e.currencyId.display
        total[currencyName] = total[currencyName] || { token: e.currencyId, value: 0n }
        total[currencyName].value += e.kind === 'in' ? BigInt(e.amount) : -BigInt(e.amount)
      }
      console.log('diff')
      table(Object.entries(total).map(([k, v]) => ({ currency: k, amount: formatBalance(v.value, v.token.decimals) })))

      const sum = {
        claim: 0n,
        debt: 0n,
      }
      const xcmSum = {} as Record<string, { token: Token; value: bigint }>
      const transferSum = {} as Record<string, { token: Token; value: bigint }>
      const cdpSum = {} as Record<string, { token: Token; value: bigint }>
      for (const evt of allEvents) {
        const currencyName = evt.currencyId.display
        switch (evt.call) {
          case 'Incentives.claim_rewards':
            sum.claim += BigInt(evt.amount)
            break
          case 'XTokens.transfer':
            xcmSum[currencyName] = xcmSum[currencyName] || { token: evt.currencyId, value: 0n }
            xcmSum[currencyName].value += BigInt(evt.amount)
            break
          case 'ParachainSystem.set_validation_data':
            xcmSum[currencyName] = xcmSum[currencyName] || { token: evt.currencyId, value: 0n }
            xcmSum[currencyName].value -= BigInt(evt.amount)
            break
          case 'Honzon.adjust_loan_by_debit_value':
          case 'Honzon.adjust_loan':
            if (evt.currencyId.display === 'aUSD') {
              sum.debt += BigInt(evt.amount) * (evt.kind === 'in' ? -1n : 1n)
            } else {
              cdpSum[currencyName] = cdpSum[currencyName] || { token: evt.currencyId, value: 0n }
              cdpSum[currencyName].value += BigInt(evt.amount) * (evt.kind === 'in' ? -1n : 1n)
            }
            break
          case 'Currencies.transfer':
          case 'Balances.transfer':
          case 'Balances.transfer_keep_alive':
            transferSum[currencyName] = transferSum[currencyName] || { token: evt.currencyId, value: 0n }
            transferSum[currencyName].value += BigInt(evt.amount) * (evt.kind === 'in' ? -1n : 1n)
            break
        }
      }

      const finalSum = Object.assign({}, total)
      for (const [k, v] of Object.entries(xcmSum)) {
        finalSum[k] = finalSum[k] || { token: v.token, value: 0n }
        finalSum[k].value += v.value
      }
      for (const [k, v] of Object.entries(transferSum)) {
        finalSum[k] = finalSum[k] || { token: v.token, value: 0n }
        finalSum[k].value += v.value
      }
      for (const [k, v] of Object.entries(cdpSum)) {
        finalSum[k] = finalSum[k] || { token: v.token, value: 0n }
        finalSum[k].value += v.value
      }
      finalSum['aUSD'] = finalSum['aUSD'] || { token: { decimals: 12, display: 'aUSD' }, value: 0n }
      finalSum['aUSD'].value += sum.claim
      finalSum['aUSD'].value += sum.debt

      console.log('xcm diff')
      table(Object.entries(xcmSum).map(([k, v]) => ({ currency: k, amount: formatBalance(v.value, v.token.decimals) })))
      console.log('transfer diff')
      table(
        Object.entries(transferSum).map(([k, v]) => ({ currency: k, amount: formatBalance(v.value, v.token.decimals) }))
      )
      console.log('cdp diff')
      table(Object.entries(cdpSum).map(([k, v]) => ({ currency: k, amount: formatBalance(v.value, v.token.decimals) })))
      table(Object.entries(sum).map(([k, v]) => ({ currency: k, amount: formatBalance(v) })))
      console.log('final diff')
      table(
        Object.entries(finalSum).map(([k, v]) => ({ currency: k, amount: formatBalance(v.value, v.token.decimals) }))
      )
      console.log()
    }
  })
