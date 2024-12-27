import express from 'express'
import multer from 'multer'
import cors from 'cors'
import * as fs from 'fs'
import { promises as fsPromises } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, 'data')
const UPLOADS_DIR = path.join(__dirname, 'uploads')

// 存储数据的对象
let storage_data = {}

// 确保必要目录存在
async function ensureDirectories() {
  const dirs = [UPLOADS_DIR, DATA_DIR]
  for (const dir of dirs) {
    try {
      await fsPromises.access(dir)
    } catch {
      await fsPromises.mkdir(dir, { recursive: true })
    }
  }
}

// 确保用户目录存在
async function ensureUserDirectory(credential) {
  const userDir = path.join(UPLOADS_DIR, credential)
  try {
    await fsPromises.access(userDir)
  } catch {
    await fsPromises.mkdir(userDir, { recursive: true })
  }
  return userDir
}

// 获取用户数据文件路径
function getUserDataPath(credential) {
  return path.join(DATA_DIR, `${credential}.json`)
}

// 加载用户数据
async function loadUserData(credential) {
  try {
    const dataPath = getUserDataPath(credential)
    const data = await fsPromises.readFile(dataPath, 'utf8')
    return JSON.parse(data)
  } catch {
    return { texts: [], files: [] }
  }
}

// 保存用户数据
async function saveUserData(credential, data) {
  const dataPath = getUserDataPath(credential)
  await fsPromises.writeFile(dataPath, JSON.stringify(data, null, 2), 'utf8')
}

// 加载所有用户数据
async function loadAllData() {
  try {
    const files = await fsPromises.readdir(DATA_DIR)
    const data = {}
    for (const file of files) {
      if (file.endsWith('.json')) {
        const credential = path.basename(file, '.json')
        data[credential] = await loadUserData(credential)
      }
    }
    return data
  } catch {
    return {}
  }
}

const app = express()
app.use(cors())
app.use(express.json())

// 配置 multer 来保留原始文件名
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const userDir = await ensureUserDirectory(req.params.credential)
      cb(null, userDir)
    } catch (error) {
      cb(error)
    }
  },
  filename: (req, file, cb) => {
    // 解决中文文件名问题
    const originalname = Buffer.from(file.originalname, 'latin1').toString('utf8')
    // 获取文件名和后缀
    const ext = path.extname(originalname)
    const nameWithoutExt = path.basename(originalname, ext)
    // 生成唯一文件名但保持原始后缀
    const uniqueName = `${nameWithoutExt}-${Date.now()}${ext}`
    cb(null, uniqueName)
  }
})

const upload = multer({ storage })

// API 路由
app.post('/api/auth', async (req, res) => {
  const { credential } = req.body
  if (!storage_data[credential]) {
    storage_data[credential] = await loadUserData(credential)
    await ensureUserDirectory(credential)
  }
  res.json({ success: true })
})

app.get('/api/content/:credential', async (req, res) => {
  const { credential } = req.params
  const userData = await loadUserData(credential)
  
  const sortedData = {
    texts: [...userData.texts].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
    files: [...userData.files].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  }
  
  res.json(sortedData)
})

app.post('/api/text/:credential', async (req, res) => {
  const { credential } = req.params
  const { text } = req.body

  const userData = await loadUserData(credential)
  userData.texts.unshift({
    id: Date.now(),
    content: text,
    timestamp: new Date().toISOString()
  })

  await saveUserData(credential, userData)
  storage_data[credential] = userData
  res.json({ success: true })
})

app.delete('/api/text/:credential/:id', async (req, res) => {
  const { credential, id } = req.params
  
  if (!storage_data[credential]) {
    return res.status(404).send('User not found')
  }

  const textIndex = storage_data[credential].texts.findIndex(t => t.id === parseInt(id))
  if (textIndex === -1) {
    return res.status(404).send('Text not found')
  }
  
  storage_data[credential].texts.splice(textIndex, 1)
  await saveUserData(credential, storage_data[credential])
  res.json({ success: true })
})

app.post('/api/upload/:credential', upload.single('file'), async (req, res) => {
  const { credential } = req.params
  const file = req.file
  
  if (!file) {
    return res.status(400).send('No file uploaded')
  }

  try {
    // 解决中文文件名问题
    const originalname = Buffer.from(file.originalname, 'latin1').toString('utf8')
    
    if (!storage_data[credential]) {
      storage_data[credential] = await loadUserData(credential)
    }
    
    // 获取文件大小
    const stats = await fsPromises.stat(file.path)
    
    storage_data[credential].files.unshift({
      id: Date.now(),
      filename: originalname,
      systemPath: file.path,
      timestamp: new Date().toISOString(),
      size: stats.size || 0  // 确保有默认值
    })

    await saveUserData(credential, storage_data[credential])
    res.json({ success: true })
  } catch (error) {
    console.error('Upload error:', error)
    res.status(500).send('Error processing file')
  }
})

app.delete('/api/file/:credential/:id', async (req, res) => {
  const { credential, id } = req.params
  
  if (!storage_data[credential]) {
    return res.status(404).send('User not found')
  }
  
  const file = storage_data[credential].files.find(f => f.id === parseInt(id))
  if (!file) {
    return res.status(404).send('File not found')
  }
  
  try {
    // 删除物理文件
    await fsPromises.unlink(file.systemPath)
    // 从数据中移除
    storage_data[credential].files = storage_data[credential].files.filter(f => f.id !== parseInt(id))
    await saveUserData(credential, storage_data[credential])
    res.json({ success: true })
  } catch (error) {
    console.error('Delete error:', error)
    res.status(500).send('Error deleting file')
  }
})

app.get('/api/download/:credential/:fileId', async (req, res) => {
  const { credential, fileId } = req.params
  
  try {
    const userData = storage_data[credential]
    if (!userData) {
      return res.status(404).send('User not found')
    }

    const file = userData.files.find(f => f.id === parseInt(fileId))
    if (!file) {
      return res.status(404).send('File not found')
    }

    // 检查文件是否存在
    try {
      await fsPromises.access(file.systemPath)
    } catch {
      return res.status(404).send('File not found on disk')
    }

    // 设置文件名编码
    const filename = encodeURIComponent(file.filename)
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filename}`)
    res.setHeader('Content-Type', 'application/octet-stream')
    
    // 使用原生 fs 的 createReadStream
    const fileStream = fs.createReadStream(file.systemPath)
    fileStream.pipe(res)
  } catch (error) {
    console.error('Download error:', error)
    res.status(500).send('Error downloading file')
  }
})

// 初始化服务器
async function initServer() {
  await ensureDirectories()
  storage_data = await loadAllData()
}

// 启动服务器
initServer().then(() => {
  app.listen(3000, '0.0.0.0', () => {
    console.log('Server running on port 3000')
  })
})