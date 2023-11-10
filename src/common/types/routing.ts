import { ReadonlyURLSearchParams } from 'next/navigation'

export type RouteObject = {
  name: string
  path: string
}

export type RouteTree = {
  _conf: RouteObject
} & {
  [key: string]: RouteTree | any
}

export type Params = {
  routeParams?: Record<string, string>
  queryParams?:
    | Record<string, string>
    | URLSearchParams
    | ReadonlyURLSearchParams
}
