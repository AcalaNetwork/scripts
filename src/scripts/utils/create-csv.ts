import * as fs from 'fs'
import path from 'path'

export function createCSV(name: string, header: string[], content: any[][]) {
  const parent = path.join(__dirname, '../../../data')
  const filePath = path.join(parent, `${name}`)

  if (!fs.existsSync(parent)) {
    fs.mkdirSync(parent, { recursive: true })
  }

  let contentStr = `${header.join(',')}\n`

  contentStr += content.map((item) => item.join(',')).join('\n')

  fs.writeFileSync(filePath, contentStr, { encoding: 'utf-8' })
}

export function getTokenDecimals(token: string) {
  const t = token.match('lp-') ? token.split('-')[1] : token
  switch (t.toUpperCase()) {
    case 'DOT':
      return 10
    case 'LDOT':
      return 10
    case 'AUSD':
      return 12
    case 'IBTC':
      return 8
    case 'INTR':
      return 10
    case 'LCDOT':
      return 10
  }

  return 12
}

export function getTokenName(token: Record<string, any>) {
  if (token.__kind === 'Token') {
    return token.value.__kind as string
  }
  if (token.__kind === 'LiquidCrowdloan') {
    return 'LCDOT'
  }
  if (token.__kind === 'ForeignAsset') {
    if (token.value === 3) return 'IBTC'
    if (token.value === 4) return 'INTR'
  }
  if (token.__kind === 'DexShare') {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    return `lp-${token.value.map((e: Record<string, any>) => getTokenName(e)).join('-')}`
  }

  return 'unconfig'
}

export const isExitAddr = (addr: string) => {
  const addrDex = '23M5ttkmR6KcnxentoqchgBdUjzMDSzFoUyf5qMs7FsmRMvV'
  const exitAddresses = [
    // moonbeam
    '23UvQ3ZQXJ5LfTUSYkcRPkQX2FHgcKxGmqdxYJe9j5e3Lwsi',
    // astar
    '23UvQ3ZQvYBhhhL4C1Zsn7gfDWcWu3pWyG5boWyGufhyoPbc',
  ]
  return exitAddresses.includes(addr) || (addr.slice(0, 4) === '23M5' && addr !== addrDex)
}

export const isCexAddr = (addr: string) => {
  const exitAddresses = [
    // cex
    '26JqMKx4HJJcmb1kXo24HYYobiK2jURGCq6zuEzFBK3hQ9Ti',
    '23DhqhsKDDpFnH2GreWy7Sk4dqUmGCCVPGk5Lpr84jxzBh5T',
    '221r454cYfBePBwyMLL5QhdijGQaXrLvqKDp5cCBtMTTXWWH',
    '22qUkUHTKmWsMJm9UA781DNRshnig1H2J251wEbciy7yM96m',
    '24i2G8sM8Nqki95y5AafBZoS1EjvVrKSekA93sooNJ8sDtjJ',
    '24Vv7VS9CpRcxThp972X7sWu3Ksjyndrz7ZLnmyj1PYgVchQ',
    '23YSRvT53DmJqNSA8Ad222aNzAG3iWutxCFD54RXAxwBMUnJ',
    // '21B6SER8NUWRVZcNM8LjAkYoVvms1EN1sKCfxJgTtN7MWpWm',
    // '21ho2JXgaGNPyxq17GAuGAQsuF5CicLXLC9ChM3jPuxxxWr4',
    // '24DYKM9LKtAcoWYke5oegdapiyXy6Un8i1ohYSVqxDB1rF5s',
  ]
  return exitAddresses.includes(addr)
}

export const getTransfersFileName = (name: string) => {
  return `event-success-${name}.csv`
}
