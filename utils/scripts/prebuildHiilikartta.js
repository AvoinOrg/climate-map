const fs = require('fs')
const path = require('path')

const appletsPath = path.join(__dirname, 'src', 'app', 'ui', 'applets')
const hiilikarttaPath = path.join(appletsPath, 'hiilikartta')
const pagePath = path.join(__dirname, 'src', 'app', 'ui', 'page.tsx')

function renameAndCleanup() {
  // Rename hiilikartta folder
  if (fs.existsSync(hiilikarttaPath)) {
    fs.renameSync(hiilikarttaPath, hiilikarttaPath.replace(/\(([^)]+)\)/, '$1'))
  }

  // Remove other folders in applets, except hiilikartta
  fs.readdirSync(appletsPath).forEach((file) => {
    const filePath = path.join(appletsPath, file)
    if (fs.statSync(filePath).isDirectory() && filePath !== hiilikarttaPath) {
      fs.rmdirSync(filePath, { recursive: true })
    }
  })

  // Remove page.tsx
  if (fs.existsSync(pagePath)) {
    fs.unlinkSync(pagePath)
  }
}

renameAndCleanup()
