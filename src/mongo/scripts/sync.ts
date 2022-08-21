import * as config from '../config'
import { AccountTrace, Event, Meta, Trace } from '../models'
import { decodeAddress } from '@polkadot/util-crypto'
import { getLatestBlockHeight, queryEvents } from '../query'
import mongoose, { ClientSession } from 'mongoose'

const main = async () => {
  const db = await mongoose.connect(config.mongodbUrl)
  const session = await db.startSession()

  try {
    let meta = await Meta.findOne({})
    if (!meta) {
      meta = await Meta.create({ block: 1638215, traceBlock: 1638215 })
    }

    const latestBlock = await getLatestBlockHeight()

    await syncBlock(session, meta.block, latestBlock)
    await syncTrace(session, meta.traceBlock, latestBlock)
  } catch (e) {
    console.error(e)
  } finally {
    await session.endSession()
    await db.disconnect()
  }
}

const syncBlock = async (session: ClientSession, fromBlock: number, toBlock: number): Promise<any> => {
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

  await session.withTransaction(async () => {
    await Event.insertMany(res)
    await Meta.updateOne({}, { block: endBlock })
  })

  console.log(`Inserted ${res.length} events`)

  if (endBlock < toBlock) {
    return syncBlock(session, endBlock, toBlock)
  }
}

const isSystemAccount = (address: string) => {
  return decodeAddress(address)
    .slice(14)
    .every((x) => x === 0)
}

const createTrace = async (evt: Event) => {
  let from = evt.from
  let to = evt.to

  if (evt.who && isSystemAccount(evt.who)) {
    // deposit/withdraw to/from system accounts are ignored
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

  return Trace.create({
    _id: evt._id,
    amount: evt.amount,
    currencyId: evt.currencyId,
    from,
    to,
    value,
  })
}

const createAccountTrace = async (evt: Event, trace: Trace) => {
  if (
    evt.event === 'Balances.Withdraw' &&
    evt.currencyId === '{"Token":"ACA"}' &&
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
    case 'AggregatedDex.swap_with_exact_supply':
    case 'Dex.add_liquidity':
    case 'Dex.claim_dex_share':
    case 'Dex.remove_liquidity':
    case 'Dex.swap_with_exact_supply':
    case 'Dex.swap_with_exact_target':
    case 'Honzon.close_loan_has_debit_by_dex':
    case 'StableAsset.mint':
    case 'StableAsset.redeem_proportion':
    case 'StableAsset.redeem_single':
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
      if (evt.extrinsicHash) {
        category = 'ignored'
      } else {
        category = 'xcm-transfer'
      }
      break
    default:
      console.log(`Unknown call ${evt.call}`)
  }

  if (trace.from && !isSystemAccount(trace.from)) {
    const account = trace.from
    await AccountTrace.create({
      _id: `${account}-${evt._id}`,
      height: evt.height,
      blockHash: evt.blockHash,
      extrinsicHash: evt.extrinsicHash,
      call: evt.call,
      account,
      eventId: evt._id,
      amount: mongoose.Types.Decimal128.fromString((-BigInt(evt.amount.toString())).toString()),
      currencyId: evt.currencyId,
      category,
      value: -trace.value,
    })
  }
  if (trace.to && !isSystemAccount(trace.to)) {
    const account = trace.to
    await AccountTrace.create({
      _id: `${account}-${evt._id}`,
      height: evt.height,
      blockHash: evt.blockHash,
      extrinsicHash: evt.extrinsicHash,
      call: evt.call,
      event: evt._id,
      account,
      eventId: evt._id,
      amount: evt.amount,
      currencyId: evt.currencyId,
      category,
      value: trace.value,
    })
  }
}

const syncTrace = async (session: ClientSession, fromBlock: number, toBlock: number): Promise<any> => {
  const maxBlocks = 1000
  const endBlock = Math.min(fromBlock + maxBlocks, toBlock)

  console.log(`Updating trace from block ${fromBlock} to ${endBlock}`)

  await session.withTransaction(async () => {
    const events = await Event.find({ height: { $gte: fromBlock, $lt: endBlock } })
    for (const evt of events) {
      const trace = await createTrace(evt)
      if (trace) {
        await createAccountTrace(evt, trace)
      }
    }

    await Meta.updateOne({}, { traceBlock: endBlock })
  })

  if (endBlock < toBlock) {
    return syncTrace(session, endBlock, toBlock)
  }
}

main().catch(console.error)
