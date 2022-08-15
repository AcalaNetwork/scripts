import '@acala-network/types'
import '@acala-network/types/interfaces/types-lookup'

import { AnyApi } from '@acala-network/sdk-core'
import { ApiDecoration, ApiTypes } from '@polkadot/api/types'
import { ApiPromise, ApiRx } from '@polkadot/api'
import { Networks, getApiPromise, getApiRx, getNetworks } from './networks'
import { Observable, firstValueFrom } from 'rxjs'
import moment from 'moment'
import yargs from 'yargs'

export const config = {
  network: '',
  output: 'console',
}

class Context<Api, ApiAt> {
  constructor(public network: Networks, public api: Api, public apiAt: ApiAt) {}
}

interface RunOptions {
  network: Networks
  at: number | string | undefined
}

export class Runner<Api extends AnyApi, ApiType extends ApiTypes, ApiAt> {
  #requiredNetwork: Networks[] = ['acala', 'karura', 'polkadot', 'kusama']
  #withApiRx = false
  #at: 'now' | number | undefined

  requiredNetwork(network: Networks[]) {
    this.#requiredNetwork = network
    return this
  }

  withApiRx(): Runner<ApiRx, 'rxjs', ApiAt> {
    this.#withApiRx = true
    return this as Runner<ApiRx, 'rxjs', ApiAt>
  }

  withApiPromise(): Runner<ApiPromise, 'promise', ApiAt> {
    this.#withApiRx = false
    return this as Runner<ApiPromise, 'promise', ApiAt>
  }

  atBlock(at: 'now' | number = 'now') {
    this.#at = at
    return this as unknown as Runner<Api, ApiType, ApiDecoration<ApiType>>
  }

  #getApi(network: Networks) {
    if (this.#withApiRx) {
      return getApiRx(network) as Api
    } else {
      return getApiPromise(network) as Api
    }
  }

  async #toPromise<A, B>(x: Observable<A> | Promise<B>) {
    if (this.#withApiRx) {
      return firstValueFrom(x as Observable<A>)
    }
    return x as Promise<B>
  }

  async #getTime(api: AnyApi, hash: string) {
    const apiAt = await api.at(hash)
    const time = await this.#toPromise(apiAt.query.timestamp.now())
    return time.toNumber()
  }

  async #getHash(api: AnyApi, blockNo: number) {
    const hash = await this.#toPromise(api.rpc.chain.getBlockHash(blockNo))
    return hash.toString()
  }

  async #parseAt(api: AnyApi, at: number | string | undefined): Promise<number | 'now'> {
    switch (at) {
      case undefined:
      case null:
      case 'now':
        return 'now'
    }

    if (typeof at === 'number') {
      if (at > 0) {
        return at
      } else {
        const header = await this.#toPromise(api.rpc.chain.getHeader())
        const num = header.number.toNumber()
        return num + at
      }
    }

    if (at.match(/^\d+$/)) {
      return parseInt(at, 10)
    }

    const header = await this.#toPromise(api.rpc.chain.getHeader())
    const num = header.number.toNumber()

    if (at.match(/^-\d+$/)) {
      const n = parseInt(at, 10)
      return num - n
    }

    const t1 = await this.#getTime(api, header.hash.toString())
    const t2 = await this.#getTime(api, await this.#getHash(api, num - 1000))

    const blockTime = (t1 - t2) / 1000

    const [, n, t] = at.match(/^(\d+)([wdhms])$/) || []

    if (n === undefined || t === undefined) {
      throw new Error(`Invalid at format: ${at}`)
    }

    let unit
    switch (t) {
      case 'w':
        unit = 7 * 24 * 60 * 60 * 1000
        break
      case 'd':
        unit = 24 * 60 * 60 * 1000
        break
      case 'h':
        unit = 60 * 60 * 1000
        break
      case 'm':
        unit = 60 * 1000
        break
      case 's':
        unit = 1000
        break
      default:
        throw new Error(`Invalid at format: ${at}`)
    }

    const total = parseInt(n, 10) * unit
    const blockNo = Math.floor(total / blockTime)

    return num - blockNo
  }

  async #runOne({ network, at }: RunOptions, fn: (c: Context<Api, ApiAt>) => Promise<any> | void) {
    if (!this.#requiredNetwork.includes(network)) {
      throw new Error(`Network not supported: ${network}. Supported networks: ${this.#requiredNetwork.join(', ')}`)
    }

    config.network = network
    console.log('Network:', network)

    const api = this.#getApi(network)

    await this.#toPromise(api.isReady)

    const parsedAt = await this.#parseAt(api, at)

    let apiAt: ApiAt
    if (this.#at === undefined) {
      apiAt = undefined as unknown as ApiAt
      if (at) {
        throw new Error('at is not supported')
      }
    } else {
      let hash
      let number

      if (parsedAt === 'now') {
        const header = await this.#toPromise(api.rpc.chain.getHeader())
        hash = header.hash.toString()
        number = header.number.toNumber()
      } else {
        hash = await this.#getHash(api, parsedAt)
        number = parsedAt
      }

      const time = moment(await this.#getTime(api, hash))
      console.log('Block Number:', number, 'Time:', time.format(), time.fromNow())
      apiAt = (await api.at(hash)) as unknown as ApiAt
    }

    await fn(new Context(network, api, apiAt))

    console.log()
  }

  async #run(fn: (c: Context<Api, ApiAt>) => Promise<any> | void) {
    const argv = yargs.argv as any

    config.output = argv.output || 'console'

    let atList: Array<number | string | undefined>

    if (typeof argv.at === 'number') {
      atList = [argv.at]
    } else {
      atList = ((argv.at as string) || '')
        .split(',')
        .map((x) => x.trim())
        .filter((x) => x.length > 0)

      if (atList.length === 0) {
        atList.push(this.#at)
      }
    }

    let networks

    if (argv.all) {
      networks = this.#requiredNetwork
    } else {
      networks = getNetworks(argv.network)

      if (networks === 'all') {
        networks = this.#requiredNetwork
      }

      if (argv.acala && !networks.includes('acala')) {
        networks.push('acala')
      }

      if (argv.karura && !networks.includes('karura')) {
        networks.push('karura')
      }

      if (argv.polkadot && !networks.includes('polkadot')) {
        networks.push('polkadot')
      }

      if (argv.kusama && !networks.includes('kusama')) {
        networks.push('kusama')
      }

      if (networks.length === 0) {
        networks = this.#requiredNetwork
      }
    }

    for (const at of atList) {
      for (const network of networks) {
        await this.#runOne({ network, at }, fn)
      }
    }
  }

  run(fn: (c: Context<Api, ApiAt>) => Promise<any> | void): void {
    this.#run(fn)
      .then(() => {
        process.exit(0)
      })
      .catch((err) => {
        console.error('Error:', Object.entries(err as object), err)
        process.exit(1)
      })
  }
}

const runner = () => new Runner<ApiPromise, 'promise', undefined>()

export default runner
