import fs from 'fs'
import path from 'path'

export async function readJson(fileName) {
  try {
    const handle = await fs.promises.open(fileName, 'r')
    try {
      return JSON.parse(await handle.readFile())
    } finally {
      await handle.close()
    }
  } catch (e) {
    if (e.code === 'ENOENT') {
      return undefined
    }
    console.error(e)
    throw e
  }
}

export async function writeJson(fileName, data) {
  const baseName = path.basename(fileName)
  const dirName = path.dirname(fileName)
  const tmpName = dirName + '/' + baseName + '.tmp'
  try {
    const handle = await fs.promises.open(tmpName, 'w').catch(async err => {
      if (err.code === 'ENOENT') {
        await fs.promises.mkdir(dirName, {recursive: true})
        return fs.promises.open(tmpName, 'w')
      }
      console.error(err)
      throw err
    })
    try {
      await handle.writeFile(JSON.stringify(data))
    } finally {
      await handle.close()
      await fs.promises.rename(tmpName, fileName)
    }
  } catch (e) {
    console.error(e)
    throw e
  }
}

export default class DB {
  constructor(dir) {
    this._dir = dir
  }

  async nextSequence(name) {
    const fileName = this._dir + '/sequences.json'
    const sequences = await readJson(fileName).then(data => data || {})
    //console.log('nextSequence:before', sequences)
    const currentValue = sequences[name] || 0
    sequences[name] = currentValue + 1
    //console.log('nextSequence:after', sequences)
    await writeJson(this._dir + '/sequences.json', sequences)
    return currentValue
  }

  async getRow(tableName, rowId) {
    const fileName = this._dir + '/' + tableName + '/' + rowId + '.json'
    return readJson(fileName)
  }

  async setRow(tableName, rowId, data) {
    const fileName = this._dir + '/' + tableName + '/' + rowId + '.json'
    return writeJson(fileName, data)
  }

  async deleteRow(tableName, rowId) {
    const fileName = this._dir + '/' + tableName + '/' + rowId + '.json'
    return fs.promises.unlink(fileName)
  }
}

