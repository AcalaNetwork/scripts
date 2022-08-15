import '@acala-network/types'
import '@acala-network/types/interfaces/types-lookup'

import runner from '../runner'

runner()
  .requiredNetwork(['acala', 'karura'])
  .withApiPromise()
  .run(async ({ api }) => {
    const proposal1 = () => {
      const token = { Token: 'ACA' } as any
      const interestRatePerSec = 'NoChange' // { NewValue: 0 } // 'NoChange'
      const liquidationRatio = { NewValue: 1_600_000_000_000_000_000n } //'NoChange'
      const liquidationPenalty = 'NoChange' // { NewValue: 150_000_000_000_000_000n } // 'NoChange'
      const requiredCollateralRatio = { NewValue: 1_950_000_000_000_000_000n } // 'NoChange'
      const maximumTotalDebitValue = 'NoChange' // { NewValue: 0 }
      const proposal = api.tx.cdpEngine.setCollateralParams(
        token,
        interestRatePerSec,
        liquidationRatio,
        liquidationPenalty,
        requiredCollateralRatio,
        maximumTotalDebitValue
      )
      return proposal
    }

    const proposal2 = () => {
      const token = { Token: 'LDOT' } as any
      const interestRatePerSec = 'NoChange' // { NewValue: 860_244_000n } // 'NoChange'
      const liquidationRatio = { NewValue: 2_350_000_000_000_000_000n } //'NoChange'
      const liquidationPenalty = 'NoChange' // { NewValue: 150_000_000_000_000_000n } // 'NoChange'
      const requiredCollateralRatio = 'NoChange' // { NewValue: 1_600_000_000_000_000_000n } // 'NoChange'
      const maximumTotalDebitValue = 'NoChange' // { NewValue: 6_000_000_000_000_000_000n }
      const proposal = api.tx.cdpEngine.setCollateralParams(
        token,
        interestRatePerSec,
        liquidationRatio,
        liquidationPenalty,
        requiredCollateralRatio,
        maximumTotalDebitValue
      )
      return proposal
    }

    // const proposal3 = () => {
    //   const token = { liquidCrowdloan: 13 } as any
    //   const interestRatePerSec = 'NoChange' // { NewValue: 0 } // 'NoChange'
    //   const liquidationRatio = 'NoChange' // { NewValue: 2_350_000_000_000_000_000n } //'NoChange'
    //   const liquidationPenalty = 'NoChange' // { NewValue: 150_000_000_000_000_000n } // 'NoChange'
    //   const requiredCollateralRatio = { NewValue: 2_800_000_000_000_000_000n } // 'NoChange'
    //   const maximumTotalDebitValue = 'NoChange' // { NewValue: 6_000_000_000_000_000_000n }
    //   const proposal = api.tx.cdpEngine.setCollateralParams(
    //     token,
    //     interestRatePerSec,
    //     liquidationRatio,
    //     liquidationPenalty,
    //     requiredCollateralRatio,
    //     maximumTotalDebitValue
    //   )
    //   return proposal
    // }

    // const proposal4 = () => {
    //   const token = { Token: 'LDOT' } as any
    //   const interestRatePerSec = 'NoChange' // { NewValue: 0 } // 'NoChange'
    //   const liquidationRatio = 'NoChange' // { NewValue: 2_400_000_000_000_000_000n } //'NoChange'
    //   const liquidationPenalty = 'NoChange' // { NewValue: 150_000_000_000_000_000n } // 'NoChange'
    //   const requiredCollateralRatio = { NewValue: 2_800_000_000_000_000_000n } // 'NoChange'
    //   const maximumTotalDebitValue = 'NoChange' // { NewValue: 6_000_000_000_000_000_000n }
    //   const proposal = api.tx.cdpEngine.setCollateralParams(
    //     token,
    //     interestRatePerSec,
    //     liquidationRatio,
    //     liquidationPenalty,
    //     requiredCollateralRatio,
    //     maximumTotalDebitValue
    //   )
    //   return proposal
    // }

    const proposal = api.tx.utility.batch([proposal1(), proposal2()])
    // const proposal = proposal1()

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
