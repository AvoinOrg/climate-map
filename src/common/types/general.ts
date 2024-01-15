export type ValueOf<T> = T[keyof T]

export type StringValueOf<T> = T[keyof T] & string

export type SelectOption = {
  label: string
  value: string
}

export enum FetchStatus {
  NOT_STARTED = 'notStarted',
  FETCHING = 'fetching',
  FETCHED = 'fetched',
  ERRORED = 'errored',
}
