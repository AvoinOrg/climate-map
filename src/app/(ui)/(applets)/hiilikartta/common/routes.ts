import { RouteTree } from '#/common/types/routing'

const basePath =
  process.env.NEXT_PUBLIC_USE_BASE_ROUTE_FOR_APPLETS === 'true'
    ? ''
    : 'hiilikartta'

export const routeTree: RouteTree = {
  _conf: {
    path: basePath,
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
  plans: {
    _conf: {
      path: 'kaavat',
      name: 'Omat kaavat',
    },
    plan: {
      _conf: {
        path: '[planId]',
        name: 'Kaavan tiedot',
      },
    },
  },
  report: {
    _conf: {
      path: 'raportti',
      name: 'Raportti',
    },
  },
}
