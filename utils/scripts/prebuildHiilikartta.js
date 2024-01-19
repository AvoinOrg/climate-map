const fs = require('fs')
const path = require('path')

const projectRoot = path.join(__dirname, '..', '..')
const appletsPath = path.join(projectRoot, 'src', 'app', '(ui)', '(applets)')
const hiilikarttaPath = path.join(appletsPath, 'hiilikartta')
const pagePath = path.join(projectRoot, 'src', 'app', '(ui)', 'page.tsx')

function renameAndCleanup() {
  // Rename hiilikartta folder
  if (fs.existsSync(hiilikarttaPath)) {
    const newHiilikarttaPath = path.join(appletsPath, '(hiilikartta)')
    fs.renameSync(hiilikarttaPath, newHiilikarttaPath)
  }

  // Remove other folders in (applets), except (hiilikartta)
  fs.readdirSync(appletsPath).forEach((file) => {
    const filePath = path.join(appletsPath, file)
    if (
      fs.statSync(filePath).isDirectory() &&
      !filePath.endsWith('(hiilikartta)')
    ) {
      fs.rmdirSync(filePath, { recursive: true })
    }
  })

  // Remove page.tsx
  if (fs.existsSync(pagePath)) {
    fs.unlinkSync(pagePath)
  }
}

renameAndCleanup()
