const getRouteChildren = (routeTree: any) => {
  const children = []
  for (const key in routeTree) {
    if (key.charAt(0) !== '_') {
      children.push(routeTree[key])
    }
  }

  return children
}

const getRouteWithoutChildren = (routeTree: any) => {
  const keys = []
  for (const key in routeTree) {
    if (key.charAt(0) === '_') {
      keys.push(key)
    }
  }

  const route: any = {}
  for (const key of keys) {
    route[key] = routeTree[key]
  }

  return route
}

const findRouteObjects = (route: any, routeTree: any, routeObjects: any[] = []): any => {
  const currentRoute = getRouteWithoutChildren(routeTree)
  const routeObjectsCopy = [...routeObjects]
  routeObjectsCopy.push(currentRoute)
  if (route === routeTree) {
    return routeObjectsCopy
  }

  for (const child of getRouteChildren(routeTree)) {
    return findRouteObjects(route, child, routeObjectsCopy)
  }
}

export const getRoute = (route: any, routeTree: any, params: string[] = []) => {
  const routeObjects = findRouteObjects(route, routeTree)
  if (routeObjects.length === 0) {
    throw new Error('Route not found: ' + route + ' in ' + routeTree)
  }

  let paramIndex = 0
  let path = ''
  for (const routeObject of routeObjects) {
    if (routeObject._conf) {
      const pathParts: string[] = routeObject._conf.path.split('/')
      for (const pathPart of pathParts) {
        if (pathPart.length > 0) {
          if (pathPart.charAt(0) === ':') {
            if (paramIndex + 1 > params.length) {
              throw new Error(
                'Not enough params provided for route: ' + route + ' in ' + routeTree + ' with params: ' + params
              )
            }
            path += `/${params[paramIndex]}`
            paramIndex++
          } else {
            path += `/${pathPart}`
          }
        }
      }
    }
  }

  return path
}

export const getParentRoute = (currentPath: any, routeTree: any) => {}
