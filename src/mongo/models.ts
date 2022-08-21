import { Decimal128, Schema, model } from 'mongoose'

export interface Meta {
  block: number
  traceBlock: number
}

export const metaSchema = new Schema<Meta>({
  block: Number,
  traceBlock: Number,
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

export interface Trace {
  _id: string // event id
  amount: Decimal128
  currencyId: string
  from: string
  to: string
  value: number
}

export const traceSchema = new Schema<Trace>({
  _id: String,
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

export interface AccountBalance {
  _id: string // address
  value: number
}
