export const mongodbUrl = 'mongodb://localhost:27017/db'

const calcDexSharePrice = (val1: bigint, val2: bigint, total: bigint, decimals: bigint) => {
  return Number((10n ** decimals * val1) / val2) / Number(total)
}

export const tokens = {
  '{"DexShare":[{"Token":"ACA"},{"Token":"AUSD"}]}': {
    decimals: 12,
    price: calcDexSharePrice(3198041192196843092n, 961142132589918007n, 2686314952009514069n, 12n),
  },
  '{"DexShare":[{"Token":"AUSD"},{"ForeignAsset":3}]}': {
    decimals: 12,
    price: calcDexSharePrice(133779256694784484n, 11179554822080479n, 149418353799999999n, 12n),
  },
  '{"DexShare":[{"Token":"AUSD"},{"ForeignAsset":4}]}': {
    decimals: 12,
    price: calcDexSharePrice(74709176900000000n, 288379511n, 243821296627833529n, 12n),
  },
  '{"DexShare":[{"Token":"AUSD"},{"LiquidCrowdloan":13}]}': {
    decimals: 12,
    price: calcDexSharePrice(1162765061520352282n, 1697757504904459n, 3017879558819282474n, 12n),
  },
  '{"DexShare":[{"Token":"AUSD"},{"Token":"LDOT"}]}': {
    decimals: 12,
    price: calcDexSharePrice(683903178710475218n, 6991400067299826n, 1837762527784655358n, 12n),
  },
  '{"DexShare":[{"Token":"DOT"},{"LiquidCrowdloan":13}]}': {
    decimals: 10,
    price: calcDexSharePrice(683903178710475218n, 6991400067299826n, 4299384396226919n, 10n),
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
    price: 24319.33,
  },
  '{"ForeignAsset":4}': {
    // INTR
    decimals: 10,
    price: 0.1187,
  },
  '{"LiquidCrowdloan":13}': {
    decimals: 10,
    price: 6.72,
  },
  '{"StableAssetPoolToken":0}': {
    decimals: 10,
    price: 8.96,
  },
  '{"Token":"ACA"}': {
    decimals: 12,
    price: 0.2785,
  },
  '{"Token":"AUSD"}': {
    decimals: 12,
    price: 1,
  },
  '{"Token":"DOT"}': {
    decimals: 10,
    price: 8.96,
  },
  '{"Token":"LDOT"}': {
    decimals: 10,
    price: 0.984,
  },
} as Record<string, { decimals: number; price: number }>
