//TODO: FIX PP to format numbers correctly
export const pp = (x: number, precision = 2) => (+x.toPrecision(precision))

export const assert = (expr: any, message: any) => {
  if (!expr) throw new Error(`Assertion error: ${message}`)
}

export const generateUUID = () => {
  let d = new Date().getTime()
  let d2 = (typeof performance !== 'undefined' && performance.now && performance.now() * 1000) || 0

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    let r = Math.random() * 16
    if (d > 0) {
      r = (d + r) % 16 | 0
      d = Math.floor(d / 16)
    } else {
      r = (d2 + r) % 16 | 0
      d2 = Math.floor(d2 / 16)
    }
    return (c == 'x' ? r : (r & 0x7) | 0x8).toString(16)
  })
}

export const generateShortId = () => {
  let id = generateUUID()
  id = id.replaceAll('-', '')
  id = id.substring(0, 20)

  return id
}
