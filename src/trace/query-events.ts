import { gql, request } from 'graphql-request'

const main = async () => {
  const pageSize = 100
  const query = gql`
    query q($start: Int) {
      events(
        first: ${pageSize}, offset: $start
        filter: {
          blockNumber: { lessThan: "1639493", greaterThan: "1638215" }
          section: { equalTo: "incentives" }
          method: { equalTo: "ClaimRewards" }
        }
      ) {
        nodes {
          id
          data
        }
        pageInfo {
          hasNextPage
        }
      }
    }
  `

  const filterData = (data: any[]) => {
    return data
      .filter(
        (x: { id: string; data: { value: string }[] }) =>
          x.data[1].value === '{"dex":{"dexShare":[{"token":"AUSD"},{"foreignAsset":3}]}}' &&
          x.data[2].value === '{"token":"AUSD"}'
      )
      .map(({ id, data: [who, , , actualAmount] }: any) => ({
        id,
        who: who.value,
        actualAmount: actualAmount.value,
      }))
  }

  const data = [] as any[]
  const processNext = async (start: number) => {
    const result = await request('https://api.subquery.network/sq/AcalaNetwork/acala', query, { start })
    data.push(...filterData(result.events.nodes))
    if (result.events.pageInfo.hasNextPage) {
      process.stderr.write('.')
      await processNext(start + pageSize)
    }
  }

  await processNext(0)

  console.log(JSON.stringify(data))
}

main().catch(console.error)
