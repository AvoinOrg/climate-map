export const openWindow = (url: string) => {
  const width = 375
  const height = 667
  const left = window.screen.width / 2 - width / 2
  const top = window.screen.height / 2 - height / 2

  // replace with the actual Zitadel login URL
  const options = `
  toolbar=no,
  location=no,
  directories=no,
  status=no,
  menubar=no,
  scrollbars=no,
  resizable=no,
  width=${width},
  height=${height},
  top=${top},
  left=${left}
`

  return window.open(url, '_blank', options)
}
