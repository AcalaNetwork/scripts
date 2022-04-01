import { AnyApi } from '@acala-network/sdk-core'
import { ApiDecoration, ApiTypes } from '@polkadot/api/types'
import { ApiPromise, ApiRx } from '@polkadot/api'
import { Networks, getApiPromise, getApiRx, getNetworks } from './networks'
import { Observable, firstValueFrom } from 'rxjs'
import yargs from 'yargs'

class Context<Api, ApiAt> {
  constructor(public network: Networks, public api: Api, public apiAt: ApiAt) {}
}

export class Runner<Api extends AnyApi, ApiType extends ApiTypes, ApiAt> {
  #requiredNetwork: Networks[] = ['acala', 'karura', 'polkadot', 'kusama']
  #withApiRx = false
  #at: 'latest' | number | undefined

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

  atBlock(at: 'latest' | number) {
    this.#at = at
    return this as unknown as Runner<Api, ApiType, ApiDecoration<ApiType>>
  }

  atLatestBlock() {
    return this.atBlock('latest')
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

  async #run(fn: (c: Context<Api, ApiAt>) => Promise<any>) {
    let networks = getNetworks((yargs.argv as any).network)

    if (networks === 'all') {
      networks = this.#requiredNetwork
    }

    for (const network of networks) {
      if (!this.#requiredNetwork.includes(network)) {
        throw new Error(`Network not supported: ${network}. Supported networks: ${this.#requiredNetwork.join(', ')}`)
      }

      console.log('Network:', network)

      const api = this.#getApi(network)

      await this.#toPromise(api.isReady)

      let apiAt: ApiAt
      if (this.#at === undefined) {
        apiAt = undefined as unknown as ApiAt
      } else {
        let hash
        let number
        if (this.#at !== 'latest') {
          hash = await this.#toPromise(api.rpc.chain.getBlockHash(this.#at))
          number = this.#at
        } else {
          const header = await this.#toPromise(api.rpc.chain.getHeader())
          hash = header.hash
          number = header.number.toNumber()
        }

        console.log('Block Number:', number)
        apiAt = (await api.at(hash)) as unknown as ApiAt
      }

      await fn(new Context(network, api, apiAt))
    }
  }

  run(fn: (c: Context<Api, ApiAt>) => Promise<any>): void {
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
