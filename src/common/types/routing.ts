export type RouteObject = {
  name: string
  path: string
}

export type RouteTree = {
  _conf: RouteObject
} & {
  [key: string]: RouteTree | any
}
