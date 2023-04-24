import { RouteTree } from '#/common/types/routing'

export const routeTree: RouteTree = {
  _conf: {
    path: 'hiilikartta',
    name: 'Etusivu',
  },
  import: {
    _conf: {
      path: 'luo',
      name: 'Luo kaava',
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
