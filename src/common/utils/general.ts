export const pp = (x: number, precision = 2) => (+x.toPrecision(precision)).toLocaleString()

export const assert = (expr: any, message: any) => {
  if (!expr) throw new Error(`Assertion error: ${message}`)
}
