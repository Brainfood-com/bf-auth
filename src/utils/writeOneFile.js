import fse from 'fs-extra'
import path from 'path'

export default async function writeOneFile(targetName, fileContents) {
  const targetBaseName = path.basename(targetName)
  const targetDirName = path.dirname(targetName)
  await fse.mkdirs(targetDirName)
  await fse.writeFile(`${targetDirName}/${targetBaseName}.tmp`, fileContents)
  await fse.rename(`${targetDirName}/${targetBaseName}.tmp`, targetName)
}
