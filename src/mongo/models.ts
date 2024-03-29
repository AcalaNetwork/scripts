import { Decimal128, Schema, model } from 'mongoose'

export interface Meta {
  block: number
}

export const metaSchema = new Schema<Meta>({
  block: {
    type: Number,
    default: 1638215,
  },
})

export const Meta = model('Meta', metaSchema)

export interface Event {
  _id: string
  height: number
  blockHash: string
  extrinsicHash?: string
  call?: string
  event: string
  amount: Decimal128
  currencyId: string
  from?: string
  to?: string
  who?: string
}

export const eventSchema = new Schema<Event>({
  _id: String,
  height: Number,
  blockHash: String,
  extrinsicHash: String,
  call: String,
  event: String,
  amount: Schema.Types.Decimal128,
  currencyId: String,
  from: String,
  to: String,
  who: String,
})

export const Event = model('Event', eventSchema)

export interface LoansEvent {
  _id: string
  height: number
  blockHash: string
  extrinsicHash?: string
  call?: string
  event: string
  currencyId: string
  collateralAmount: Decimal128
  debitAmount: Decimal128
  who: string
}

export const loansEvent = new Schema<LoansEvent>({
  _id: String,
  height: Number,
  blockHash: String,
  extrinsicHash: String,
  call: String,
  event: String,
  currencyId: String,
  collateralAmount: Schema.Types.Decimal128,
  debitAmount: Schema.Types.Decimal128,
  who: String,
})

export const LoansEvent = model('LoansEvent', loansEvent)

export interface Trace {
  _id: string // event id
  height: number
  blockHash: string
  extrinsicHash?: string
  call?: string
  event: string
  amount: Decimal128
  currencyId: string
  from?: string
  to?: string
  value: number
}

export const traceSchema = new Schema<Trace>({
  _id: String,
  height: Number,
  blockHash: String,
  extrinsicHash: String,
  call: String,
  event: String,
  amount: Schema.Types.Decimal128,
  currencyId: String,
  from: String,
  to: String,
  value: Number,
})

export const Trace = model('Trace', traceSchema)

export interface AccountTrace {
  _id: string // address + event id
  height: number
  blockHash: string
  extrinsicHash?: string
  call?: string
  event: string
  account: string // address
  eventId: string // event id
  amount: Decimal128
  currencyId: string
  category: string
  value: number
}

export const accountTraceSchema = new Schema<AccountTrace>({
  _id: String,
  height: Number,
  blockHash: String,
  extrinsicHash: String,
  call: String,
  event: String,
  account: String,
  eventId: String,
  amount: Schema.Types.Decimal128,
  currencyId: String,
  category: String,
  value: Number,
})

export const AccountTrace = model('AccountTrace', accountTraceSchema)

export interface AccountBalanceTrace {
  _id: string // event id
  height: number
  blockHash: string
  extrinsicHash?: string
  call?: string
  event: string
  amount: Decimal128
  currencyId: string
  from?: string
  to?: string
  value: number
}

export const AccountBalanceTraceSchema = new Schema<AccountBalanceTrace>({
  _id: String,
  height: Number,
  blockHash: String,
  extrinsicHash: String,
  call: String,
  event: String,
  amount: Schema.Types.Decimal128,
  currencyId: String,
  from: String,
  to: String,
  value: Number,
})

export const AccountBalanceTrace = model('AccountBalanceTrace', AccountBalanceTraceSchema)

export interface AccountBalance {
  _id: string // address
  value: number
}

export const accountBalanceSchema = new Schema<AccountBalance>({
  _id: String,
  value: Number,
})

export const AccountBalance = model('AccountBalance', accountBalanceSchema)

export interface AccountBlockTrace {
  _id: string // address + block hash
  height: number
  blockHash: string
  account: string
  value: number
}

export const accountBlockTraceSchema = new Schema<AccountBlockTrace>({
  _id: String,
  height: Number,
  blockHash: String,
  account: String,
  value: Number,
})

export const AccountBlockTrace = model('AccountBlockTrace', accountBlockTraceSchema)
