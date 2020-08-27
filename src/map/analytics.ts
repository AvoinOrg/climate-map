import ReactGA from 'react-ga'

const enabled = process.env.REACT_APP_ANALYTICS_ID

if (enabled) {
  ReactGA.initialize(process.env.REACT_APP_ANALYTICS_ID)
}

const state = {lastLayer: ''}
export const recordLayerActivation = group => {
  if (!enabled) return
  state.lastLayer = `layer/${group}`
  ReactGA.pageview(state.lastLayer)
}

export const setParams = params => {
  if (!enabled) return

  ReactGA.set(params)
  const e = encodeURIComponent
  let paramsStr = Object.entries(params).map(([k,v]) => `${e(k)}=${e(v as any)}`).join('&')
  const url = `${state.lastLayer}?${paramsStr}`
  ReactGA.pageview(url)
}

export const pageview = (path) => {
  if (!enabled) return
  ReactGA.pageview(path)
}
