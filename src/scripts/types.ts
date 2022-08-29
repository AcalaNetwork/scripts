export interface Event {
  args: Record<string, any>
  id: string
  indexInBlock: number
  name: string
  phase: string
  extrinsic?: {
    hash: string
  }
}

export interface Extrinsic {
  indexInBlock: number
  calls: {
    name: string
    success: boolean
    origin: {
      value: {
        value: string
      }
    }
  }[]
  hash: string
  fee: any
  success: boolean
  error: any
}

export interface ExtendExtrinsc extends Extrinsic {
  events: Event[]
}

export interface Block {
  hash: string
  height: number
  events: Event[]
  extrinsics?: Extrinsic[]
}
