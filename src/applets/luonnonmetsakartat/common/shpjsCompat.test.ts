import { ensureShpjsBrowserGlobals } from './shpjsCompat'

const descriptors = {
  Buffer: Object.getOwnPropertyDescriptor(globalThis, 'Buffer'),
  global: Object.getOwnPropertyDescriptor(globalThis, 'global'),
}
const restoreGlobals = () => {
  for (const key of ['Buffer', 'global'] as const) {
    if (descriptors[key])
      Object.defineProperty(globalThis, key, descriptors[key]!)
    else Reflect.deleteProperty(globalThis, key)
  }
}
it('installs absent globals, provides a usable Buffer and is idempotent', async () => {
  try {
    Reflect.deleteProperty(globalThis, 'global')
    Reflect.deleteProperty(globalThis, 'Buffer')
    await ensureShpjsBrowserGlobals()
    expect(globalThis.global).toBe(globalThis)
    expect(globalThis.Buffer.from('Mänty').toString('utf8')).toBe('Mänty')
    const buffer = globalThis.Buffer
    await ensureShpjsBrowserGlobals()
    expect(globalThis.Buffer).toBe(buffer)
  } finally {
    restoreGlobals()
  }
})
it('preserves existing globals without replacing descriptors', async () => {
  try {
    const buffer = { sentinel: 'existing Buffer' }
    const global = { sentinel: 'existing global' }
    Object.defineProperty(globalThis, 'Buffer', {
      configurable: true,
      value: buffer,
    })
    Object.defineProperty(globalThis, 'global', {
      configurable: true,
      value: global,
    })
    await ensureShpjsBrowserGlobals()
    expect(globalThis.Buffer).toBe(buffer)
    expect(globalThis.global).toBe(global)
  } finally {
    restoreGlobals()
  }
})
