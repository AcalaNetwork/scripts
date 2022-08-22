export const mongodbUrl = 'mongodb://localhost:27017/db'

const ausd = 1
const aca = 0.2785
const dot = 8.96
const ldot = 0.984
const ibtc = 24319.33
const intr = 0.1187
const lcdot = 6.72

const calcDexSharePrice = (
  val1: bigint,
  val2: bigint,
  total: bigint,
  price1: number,
  price2: number,
  d1: number,
  d2: number
) => {
  const v1 = Number(val1)
  const v2 = Number(val2)
  const t = Number(total)
  return ((10 ** d1 / t) * v1 * price1) / 10 ** d1 + ((10 ** d1 / t) * v2 * price2) / 10 ** d2
}

export const tokens = {
  '{"DexShare":[{"Token":"ACA"},{"Token":"AUSD"}]}': {
    decimals: 12,
    price: calcDexSharePrice(3198041192196843092n, 961142132589918007n, 2686314952009514069n, aca, ausd, 12, 12),
  },
  '{"DexShare":[{"Token":"AUSD"},{"ForeignAsset":3}]}': {
    decimals: 12,
    price: calcDexSharePrice(74709176900000000n, 288379511n, 149418353799999999n, ausd, ibtc, 12, 8),
  },
  '{"DexShare":[{"Token":"AUSD"},{"ForeignAsset":4}]}': {
    decimals: 12,
    price: calcDexSharePrice(1162765061520352282n, 1697757504904459n, 243821296627833529n, ausd, intr, 12, 10),
  },
  '{"DexShare":[{"Token":"AUSD"},{"LiquidCrowdloan":13}]}': {
    decimals: 12,
    price: calcDexSharePrice(1162765061520352282n, 1697757504904459n, 3017879558819282474n, ausd, lcdot, 12, 10),
  },
  '{"DexShare":[{"Token":"AUSD"},{"Token":"LDOT"}]}': {
    decimals: 12,
    price: calcDexSharePrice(683903178710475218n, 6991400067299826n, 1837762527784655358n, ausd, ldot, 12, 10),
  },
  '{"DexShare":[{"Token":"DOT"},{"LiquidCrowdloan":13}]}': {
    decimals: 10,
    price: calcDexSharePrice(2389220294615936n, 3162930400549016n, 4299384396226919n, dot, lcdot, 10, 10),
  },
  '{"ForeignAsset":0}': {
    // GLMR
    decimals: 18,
    price: 0, // ignored
  },
  '{"ForeignAsset":1}': {
    // PARA
    decimals: 12,
    price: 0, // ignored
  },
  '{"ForeignAsset":2}': {
    // ASTAR
    decimals: 18,
    price: 0, //ignored
  },
  '{"ForeignAsset":3}': {
    // iBTC
    decimals: 8,
    price: ibtc,
  },
  '{"ForeignAsset":4}': {
    // INTR
    decimals: 10,
    price: intr,
  },
  '{"LiquidCrowdloan":13}': {
    decimals: 10,
    price: lcdot,
  },
  '{"StableAssetPoolToken":0}': {
    decimals: 10,
    price: dot,
  },
  '{"Token":"ACA"}': {
    decimals: 12,
    price: aca,
  },
  '{"Token":"AUSD"}': {
    decimals: 12,
    price: ausd,
  },
  '{"Token":"DOT"}': {
    decimals: 10,
    price: dot,
  },
  '{"Token":"LDOT"}': {
    decimals: 10,
    price: ldot,
  },
} as Record<string, { decimals: number; price: number }>

export const debitExchangeRate = {
  '{"Token":"ACA"}': 0.101189,
  '{"Token":"LDOT"}': 0.100785,
  '{"Token":"DOT"}': 0.101518,
  '{"LiquidCrowdloan":13}': 0.101533,
} as Record<string, number>

export const systemAddresses = {
  loans: '23M5ttkmR6KcoCvrNZsA97DQMPxQmqktF8DHYZSDW4HLcEDw',
  cdp: '23M5ttkmR6KcnvsNJdmYTpLo9xfc54g8uCk55buDfiJPon69',
  homa: '23M5ttkmR6Kco5pqN691bGfU3BhfU6QPG9arw6SR1XpNuQqu',
  dex: '23M5ttkmR6KcnxentoqchgBdUjzMDSzFoUyf5qMs7FsmRMvV',
  incentives: '23M5ttkmR6Kco7bReRDve6bQUSAcwqebatp3fWGJYb4hDSDJ',
}
