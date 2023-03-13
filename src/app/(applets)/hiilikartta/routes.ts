export const routeTree = {
  base: {
    _conf: {
      path: '/hiilikartta',
      name: 'Omat kaavat',
    },
    plan: {
      _conf: {
        path: '/kaava/:id',
        name: 'Kaavan tiedot',
      },
      settings: {
        _conf: {
          path: '/settings',
          name: 'Kaavan asetukset',
        },
      },
    },
  },
}
