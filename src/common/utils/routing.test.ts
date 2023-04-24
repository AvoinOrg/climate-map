import { RouteTree } from '../types/routing'
import { getRoute, getRouteParent, getRoutesForPath } from './routing'
import { cloneDeep } from 'lodash'

describe('routing utils', () => {
  const routeTree: RouteTree = {
    _conf: { path: '/', name: 'Home' },
    products: {
      _conf: { path: 'products', name: 'Products' },
      product: {
        _conf: { path: ':id', name: 'Product' },
        details: {
          _conf: { path: 'details', name: 'Details' },
        },
      },
    },
    stuff: {
      _conf: { path: 'stuff/:id', name: 'Stuff' },
      settings: {
        _conf: { path: 'settings', name: 'Settings' },
      },
    },
    about: {
      _conf: { path: 'about', name: 'About' },
      contact: {
        _conf: { path: 'contact', name: 'Contact' },
      },
    },
  }

  const routeTreeWithBase: RouteTree = cloneDeep(routeTree)
  routeTreeWithBase._conf.path = '/home'

  describe('getRoute', () => {
    it('returns the correct route with no parameters', () => {
      const route = getRoute(routeTree.about, routeTree)
      expect(route).toBe('/about')
    })

    it('returns the correct route with no parameters for a route tree with a base path', () => {
      const route = getRoute(routeTreeWithBase.about, routeTreeWithBase)
      expect(route).toBe('/home/about')
    })

    it('returns the correct route with parameters', () => {
      const route = getRoute(routeTree.products.product, routeTree, ['123'])
      expect(route).toBe('/products/123')
    })

    it('returns the correct route with parameters', () => {
      const route = getRoute(routeTree.stuff.settings, routeTree, ['123'])
      expect(route).toBe('/stuff/123/settings')
    })

    it('returns the correct route with parameters for a route tree with a base path', () => {
      const route = getRoute(routeTreeWithBase.stuff.settings, routeTreeWithBase, ['123'])
      expect(route).toBe('/home/stuff/123/settings')
    })

    it('throws an error if route not found', () => {
      expect(() => getRoute({ _conf: { name: 'None', path: '/none' } }, routeTree)).toThrowError('Route not found')
    })

    it('throws an error if not enough parameters are provided', () => {
      expect(() => getRoute(routeTree.products.product, routeTree)).toThrowError('Not enough params provided')
    })
  })

  describe('getRouteParent', () => {
    it('returns the correct parent route with no parameters', () => {
      const route = getRouteParent(routeTree.products.product, routeTree)
      expect(route).toBe('/products')
    })

    it('returns the correct parent route with parameters', () => {
      const route = getRouteParent(routeTree.products.product, routeTree, ['123'])
      expect(route).toBe('/products')
    })

    it('returns the root route as the parent of a top-level route', () => {
      const route = getRouteParent(routeTree.about, routeTree)
      expect(route).toBe('/')
    })

    it('returns the root route as the parent of a top-level route for a route tree with a base path', () => {
      const route = getRouteParent(routeTreeWithBase.about, routeTreeWithBase)
      expect(route).toBe('/home')
    })
  })

  describe('getRoutesForPath', () => {
    it('returns a correct set of routes for a path', () => {
      const routes = getRoutesForPath('/products/123/', routeTree)
      expect(routes).toEqual([
        { name: 'Home', path: '/' },
        { name: 'Products', path: '/products' },
        { name: 'Product', path: '/products/123' },
      ])
    })

    it('returns a correct set of routes for a path', () => {
      const routes = getRoutesForPath('/stuff/123/settings', routeTree)
      expect(routes).toEqual([
        { name: 'Home', path: '/' },
        { name: 'Stuff', path: '/stuff/123' },
        { name: 'Settings', path: '/stuff/123/settings' },
      ])
    })

    it('returns a correct set of routes for a path', () => {
      const routes = getRoutesForPath('/', routeTree)
      expect(routes).toEqual([{ name: 'Home', path: '/' }])
    })

    it('returns a correct set of routes for a path for a route tree with a base path', () => {
      const routes = getRoutesForPath('/home/stuff/123/settings', routeTreeWithBase)
      expect(routes).toEqual([
        { name: 'Home', path: '/home' },
        { name: 'Stuff', path: '/home/stuff/123' },
        { name: 'Settings', path: '/home/stuff/123/settings' },
      ])
    })

    it('returns a correct set of routes for a path for a route tree with a base path', () => {
      const routes = getRoutesForPath('/home/about/contact', routeTreeWithBase)
      expect(routes).toEqual([
        { name: 'Home', path: '/home' },
        { name: 'About', path: '/home/about' },
        { name: 'Contact', path: '/home/about/contact' },
      ])
    })

    it('returns a correct set of routes for a path for a route tree with a base path', () => {
      const routes = getRoutesForPath('/home', routeTreeWithBase)
      expect(routes).toEqual([{ name: 'Home', path: '/home' }])
    })
  })
})
