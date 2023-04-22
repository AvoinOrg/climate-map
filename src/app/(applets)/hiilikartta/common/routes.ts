import { RouteTree } from '#/common/types/routing'

export const routeTree: RouteTree = {
  _conf: {
    path: 'hiilikartta',
    name: 'Omat kaavat',
  },
  import: {
    _conf: {
      path: 'tuo',
      name: 'Tuo kaava',
    },
  },
  plan: {
    _conf: {
      path: 'kaava/:id',
      name: 'Kaavan tiedot',
    },
    settings: {
      _conf: {
        path: 'asetukset',
        name: 'Kaavan asetukset',
      },
    },
  },
}
