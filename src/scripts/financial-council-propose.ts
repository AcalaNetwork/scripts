import '@acala-network/types'
import '@acala-network/types/interfaces/types-lookup'

import runner from '../runner'

runner()
  .requiredNetwork(['acala', 'karura'])
  .withApiPromise()
  .run(async ({ api }) => {
    const token = { StableAssetPoolToken: 0 } as any
    const interestRatePerSec = { NewValue: 0 } // 'NoChange'
    const liquidationRatio = { NewValue: 1_600_000_000_000_000_000n } //'NoChange'
    const liquidationPenalty = { NewValue: 150_000_000_000_000_000n } // 'NoChange'
    const requiredCollateralRatio = { NewValue: 2_100_000_000_000_000_000n } // 'NoChange'
    const maximumTotalDebitValue = { NewValue: 0 } //  'NoChange' // { NewValue: 6_000_000_000_000_000_000n }
    const proposal = api.tx.cdpEngine.setCollateralParams(
      token,
      interestRatePerSec,
      liquidationRatio,
      liquidationPenalty,
      requiredCollateralRatio,
      maximumTotalDebitValue
    )
    const tx = api.tx.financialCouncil.propose(2, proposal, proposal.encodedLength)
    console.log('Propose', tx.toHex())

    const hash = proposal.method.hash

    const index = (await api.query.financialCouncil.proposalCount()).toNumber()

    const vote = api.tx.financialCouncil.vote(hash, index, true)
    console.log('Vote', vote.toHex())

    const weight = await api.rpc.payment.queryInfo(proposal.toHex())

    const close = api.tx.financialCouncil.close(hash, index, weight.weight, proposal.encodedLength)
    console.log('Close', close.toHex())

    console.log({
      index,
      hash: hash.toHex(),
      weight: weight.weight.toNumber(),
      length: proposal.encodedLength,
    })
  })
