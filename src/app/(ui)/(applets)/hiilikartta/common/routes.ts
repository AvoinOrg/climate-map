import { RouteTree } from '#/common/types/routing'

export const routeTree: RouteTree = {
  _conf: {
    path: 'hiilikartta',
    name: 'Etusivu',
  },
  create: {
    _conf: {
      path: 'luo',
      name: 'Luo kaava',
    },
    import: {
      _conf: {
        path: 'tuo',
        name: 'Tuo uusi kaavatiedosto',
      },
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
    report: {
      _conf: {
        path: 'raportti',
        name: 'Raportti',
      },
    },
  },
}
