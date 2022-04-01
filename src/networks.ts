import { ApiPromise, ApiRx, WsProvider } from '@polkadot/api'
import { config } from 'dotenv'
import { options } from '@acala-network/api'

config()

const getEndpoints = (network: string, defaultEndpoints: string[]): string[] => {
  const endpoints = (process.env[`WS_ENDPOINTS_${network.toUpperCase()}`] || '')
    .split(',')
    .map((x) => x.trim())
    .filter((x) => x.length > 0)
  if (endpoints.length === 0) {
    return defaultEndpoints
  }
  return endpoints
}

export const networks = {
  acala: {
    ws: getEndpoints('acala', [
      'wss://acala-polkadot.api.onfinality.io/public-ws',
      'wss://acala-rpc-0.aca-api.network',
      'wss://acala-rpc-1.aca-api.network',
      'wss://acala-rpc-2.aca-api.network/ws',
      'wss://acala-rpc-3.aca-api.network/ws',
      'wss://acala.polkawallet.io',
    ]),
  },
  karura: {
    ws: getEndpoints('karura', [
      'wss://karura.api.onfinality.io/public-ws',
      'wss://karura-rpc-0.aca-api.network',
      'wss://karura-rpc-1.aca-api.network',
      'wss://karura-rpc-2.aca-api.network/ws',
      'wss://karura-rpc-3.aca-api.network/ws',
      'wss://karura.polkawallet.io',
    ]),
  },
  polkadot: {
    ws: getEndpoints('polkadot', ['wss://rpc.polkadot.io', 'wss://polkadot.api.onfinality.io/public-ws']),
  },
  kusama: {
    ws: getEndpoints('kusama', ['wss://kusama-rpc.polkadot.io', 'wss://kusama.api.onfinality.io/public-ws']),
  },
}

export type Networks = keyof typeof networks

export const getNetworks = (arg?: string): Networks[] | 'all' => {
  if (arg === undefined || arg === 'all') {
    return 'all'
  }
  const arr = arg
    .split(',')
    .map((x) => x.trim())
    .filter((x) => x.length > 0)
  for (const network of arr) {
    if (networks[network as 'karura'] == null) {
      throw new Error(`Unknown network: ${network || ''}`)
    }
  }
  if (arr.length === 0) {
    throw new Error('No network specified')
  }
  return arr as Networks[]
}

export const getWsProvider = (network: Networks): WsProvider => {
  return new WsProvider(networks[network as 'karura'].ws)
}

export const getApiRx = (network: Networks): ApiRx => {
  const ws = getWsProvider(network)
  if (network === 'acala' || network === 'karura') {
    return new ApiRx(options({ provider: ws }))
  }
  return new ApiRx({ provider: ws })
}

export const getApiPromise = (network: Networks): ApiPromise => {
  const ws = getWsProvider(network)
  if (network === 'acala' || network === 'karura') {
    return new ApiPromise(options({ provider: ws }))
  }
  return new ApiPromise({ provider: ws })
}

export default networks
