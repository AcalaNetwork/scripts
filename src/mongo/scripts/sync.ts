import * as config from '../config'
import { AccountTrace, Event, LoansEvent, Meta, Trace } from '../models'
import { queryEvents, queryLoansEvents } from '../query'
import mongoose from 'mongoose'

const main = async () => {
  const db = await mongoose.connect(config.mongodbUrl)

  try {
    let meta = await Meta.findOne({})
    if (!meta) {
      meta = await Meta.create({})
    }

    const latestBlock = 1694500 // await getLatestBlockHeight()

    await syncBlock(meta.block, latestBlock)
    await syncTrace()
  } catch (e) {
    console.error(e)
  } finally {
    await db.disconnect()
  }
}

const syncBlock = async (fromBlock: number, toBlock: number): Promise<any> => {
  if (fromBlock >= toBlock) {
    return
  }
  const maxBlocks = 1000
  const endBlock = Math.min(fromBlock + maxBlocks, toBlock)

  console.log(`Syncing from block ${fromBlock} to ${endBlock}`)

  const res = (await queryEvents(fromBlock, endBlock)).filter((x) => {
    switch (x.event) {
      case 'Tokens.DustLost':
      case 'Tokens.Endowed':
      case 'Balances.Endowed':
      case 'Balances.Reserved':
      case 'Balances.Unreserved':
      case 'Balances.ReserveRepatriated':
      case 'Balances.DustLost':
        // ignore those events
        return false
    }
    switch (x.call) {
      case 'FinancialCouncil.close':
      case 'FinancialCouncil.propose':
      case 'FinancialCouncil.vote':
      case 'GeneralCouncil.close':
      case 'GeneralCouncil.propose':
      case 'GeneralCouncil.vote':
      case 'ParachainSystem.enact_authorized_upgrade':
      case 'TechnicalCommittee.close':
      case 'TechnicalCommittee.propose':
      case 'TechnicalCommittee.vote':
      case 'Vesting.claim_for':
      case 'Vesting.claim':
      case 'Vesting.vested_transfer':
      case 'Democracy.note_preimage':
      case 'Democracy.propose':
      case 'Democracy.remove_vote':
      case 'Democracy.second':
      case 'Democracy.unlock':
      case 'Democracy.vote':
      case 'AcalaOracle.feed_values':
        return false
    }
    return true
  })

  await Event.insertMany(res)

  const loans = await queryLoansEvents(fromBlock, endBlock)

  await LoansEvent.insertMany(loans)

  await Meta.updateOne({}, { block: endBlock })

  console.log(`Inserted ${res.length} events`)

  if (endBlock < toBlock) {
    return syncBlock(endBlock, toBlock)
  }
}

// const isSystemAccount = (address: string) => {
//   return decodeAddress(address)
//     .slice(14)
//     .every((x) => x === 0)
// }

const createTrace = async (evt: Event) => {
  let from = evt.from
  let to = evt.to

  if (evt.who === config.systemAddresses.treasury) {
    return
  }

  switch (evt.event) {
    case 'Tokens.Withdrawn':
    case 'Balances.Withdraw':
      from = evt.who
      to = undefined
      break
    case 'Tokens.Deposited':
    case 'Balances.Deposit':
      from = undefined
      to = evt.who
      break
    case 'Tokens.Transfer':
    case 'Balances.Transfer':
      // do nothing
      break
    default:
      console.log(`Unknown event ${evt.event}`)
  }

  const token = config.tokens[evt.currencyId]
  const decimals = token?.decimals || 12
  const price = token?.price ?? 0
  const value = (Number(evt.amount) / 10 ** decimals) * price

  return Trace.findByIdAndUpdate(
    { _id: evt._id },
    {
      _id: evt._id,
      height: evt.height,
      blockHash: evt.blockHash,
      extrinsicHash: evt.extrinsicHash,
      call: evt.call,
      event: evt.event,
      amount: evt.amount,
      currencyId: evt.currencyId,
      from,
      to,
      value,
    },
    { upsert: true }
  )
}

const createAccountTrace = async (evt: Event, trace: Trace) => {
  if (
    (evt.event === 'Balances.Withdraw' || evt.event === 'Balances.Deposit') &&
    parseFloat(evt.amount.toString()) < 5000000000
  ) {
    // this looks like for tx fee payment. ignore it. it is small anyway
    return
  }

  let category = 'unknown'
  switch (evt.call) {
    case 'Honzon.adjust_loan':
    case 'Honzon.adjust_loan_by_debit_value':
      category = 'loan'
      break
    case 'Incentives.deposit_dex_share':
    case 'Incentives.withdraw_dex_share':
      category = 'lp-staking'
      break
    case 'Balances.transfer_all':
    case 'Balances.transfer_keep_alive':
    case 'Balances.transfer':
    case 'Currencies.transfer_native_currency':
    case 'Currencies.transfer':
      category = 'transfer'
      break
    case 'XTokens.transfer':
    case 'ParachainSystem.set_validation_data':
      category = 'xcm-transfer'
      break
    case 'Dex.add_liquidity':
    case 'Dex.remove_liquidity':
    case 'StableAsset.mint':
    case 'StableAsset.redeem_proportion':
    case 'StableAsset.redeem_single':
      category = 'swap-liquidity'
      break
    case 'AggregatedDex.swap_with_exact_supply':
    case 'Dex.claim_dex_share':
    case 'Dex.swap_with_exact_supply':
    case 'Dex.swap_with_exact_target':
    case 'Honzon.close_loan_has_debit_by_dex':
    case 'StableAsset.swap':
      category = 'swap'
      break
    case 'EVM.eth_call':
    case 'EVM.call':
      category = 'evm'
      break
    case 'Incentives.claim_rewards':
      category = 'claim'
      break
    case 'Homa.claim_redemption':
    case 'Homa.fast_match_redeems_completely':
    case 'Homa.mint':
    case 'Homa.request_redeem':
    case 'Homa.fast_match_redeems':
      category = 'homa'
      break
    case 'Proxy.proxy':
    case 'Proxy.announce':
    case 'Utility.batch':
    case 'TransactionPayment.with_fee_path':
    case 'TransactionPayment.with_fee_currency':
    case 'Multisig.as_multi':
    case 'Multisig.approve_as_multi':
      category = 'nested'
      break
    case 'CdpEngine.liquidate':
    case 'Dex.end_provisioning':
    case 'EvmAccounts.claim_account':
    case 'Multisig.cancel_as_multi':
    case 'NFT.transfer':
      category = 'ignored'
      // ignore
      return
    case null:
    case undefined:
      if (trace.from === config.systemAddresses.homaTreasury) {
        category = 'homa-burn'
      } else if (trace.to === config.systemAddresses.homaTreasury) {
        category = 'homa-mint'
      } else {
        category = 'ignored'
      }
      break
    default:
      console.log(`Unknown call ${evt.call}`)
  }

  if (trace.from) {
    const account = trace.from
    await AccountTrace.updateOne(
      { _id: `${account}-${evt._id}` },
      {
        _id: `${account}-${evt._id}`,
        height: evt.height,
        blockHash: evt.blockHash,
        extrinsicHash: evt.extrinsicHash,
        call: evt.call,
        account,
        event: evt.event,
        amount: mongoose.Types.Decimal128.fromString((-BigInt(evt.amount.toString())).toString()),
        currencyId: evt.currencyId,
        category,
        value: -trace.value,
      },
      { upsert: true }
    )
  }
  if (trace.to) {
    if (category === 'xcm-transfer' && evt.call?.startsWith('XTokens')) {
      category = 'xcm-receive'
    }
    const account = trace.to
    await AccountTrace.updateOne(
      { _id: `${account}-${evt._id}` },
      {
        _id: `${account}-${evt._id}`,
        height: evt.height,
        blockHash: evt.blockHash,
        extrinsicHash: evt.extrinsicHash,
        call: evt.call,
        account,
        event: evt.event,
        amount: evt.amount,
        currencyId: evt.currencyId,
        category,
        value: trace.value,
      },
      { upsert: true }
    )
  }
}

const createLoanTrace = async (evt: LoansEvent) => {
  const token = config.tokens[evt.currencyId]
  const decimals = token?.decimals || 12
  const price = token?.price ?? 0
  let value = (Number(evt.collateralAmount) / 10 ** decimals) * price
  const rate = config.debitExchangeRate[evt.currencyId] || 0
  let debitValue = (Number(evt.debitAmount) / 10 ** 12) * rate

  let from = config.systemAddresses.loans
  let to = evt.who

  if (value < 0) {
    value = -value
    ;[from, to] = [to, from]
  }

  await Trace.updateOne(
    { _id: evt._id },
    {
      _id: evt._id,
      height: evt.height,
      blockHash: evt.blockHash,
      extrinsicHash: evt.extrinsicHash,
      call: evt.call,
      event: evt.event,
      amount: evt.collateralAmount,
      currencyId: evt.currencyId,
      from,
      to,
      value,
    },
    { upsert: true }
  )

  from = evt.who
  to = config.systemAddresses.loans

  if (debitValue < 0) {
    debitValue = -debitValue
    ;[from, to] = [to, from]
  }

  await Trace.updateOne(
    { _id: evt._id + '-debit' },
    {
      _id: evt._id + '-debit',
      height: evt.height,
      blockHash: evt.blockHash,
      extrinsicHash: evt.extrinsicHash,
      call: evt.call,
      event: evt.event,
      amount: Math.floor(Number(evt.debitAmount) * config.debitExchangeRate[evt.currencyId]),
      currencyId: '{"Token":"AUSD"}',
      from,
      to,
      value: debitValue,
    },
    { upsert: true }
  )
}

const syncTrace = async (): Promise<any> => {
  console.log('sync trace')
  for await (const evt of Event.find()) {
    if (evt.height % 1000 === 0) {
      console.log(`sync trace ${evt.height}`)
    }
    const trace = await createTrace(evt)
    if (trace) {
      await createAccountTrace(evt, trace)
    }
  }
  console.log('sync loans trace')
  for await (const evt of await LoansEvent.find()) {
    if (evt.height % 1000 === 0) {
      console.log(`sync loans trace ${evt.height}`)
    }
    await createLoanTrace(evt)
  }
}

main().catch(console.error)
