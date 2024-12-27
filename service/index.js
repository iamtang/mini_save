import express from 'express'
import multer from 'multer'
import cors from 'cors'
import * as fs from 'fs'
import { promises as fsPromises } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'


const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_FILE = path.join(__dirname, 'data.json')
const UPLOADS_DIR = path.join(__dirname, 'uploads')

// 确保上传目录存在
async function ensureDirectories() {
  try {
    await fsPromises.access(UPLOADS_DIR)
  } catch {
    await fsPromises.mkdir(UPLOADS_DIR, { recursive: true })
  }
}

// 加载持久化数据
async function loadData() {
  try {
    const data = await fsPromises.readFile(DATA_FILE, 'utf8')
    return JSON.parse(data)
  } catch {
    return {}
  }
}

// 保存数据到文件
async function saveData(data) {
  await fsPromises.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8')
}

const app = express()

// 配置 multer 来保留原始文件名
const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
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

app.use(cors())
app.use(express.json())

// 存储数据的对象
let storage_data = {}

// 初始化服务器
async function initServer() {
  await ensureDirectories()
  storage_data = await loadData()
}

app.post('/api/auth', async (req, res) => {
  const { credential } = req.body
  if (!storage_data[credential]) {
    storage_data[credential] = { texts: [], files: [] }
    await saveData(storage_data)
  }
  res.json({ success: true })
})

app.get('/api/content/:credential', (req, res) => {
  const { credential } = req.params
  const userData = storage_data[credential] || { texts: [], files: [] }
  
  // 按时间戳倒序排序
  const sortedData = {
    texts: [...userData.texts].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
    files: [...userData.files].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  }
  
  res.json(sortedData)
})

app.post('/api/text/:credential', async (req, res) => {
  const { credential } = req.params
  const { text } = req.body
  
  if (!storage_data[credential]) {
    storage_data[credential] = { texts: [], files: [] }
  }
  
  storage_data[credential].texts.unshift({
    id: Date.now(),
    content: text,
    timestamp: new Date().toISOString()
  })
  
  await saveData(storage_data)
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
  await saveData(storage_data)
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
      storage_data[credential] = { texts: [], files: [] }
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
    
    await saveData(storage_data)
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
    await saveData(storage_data)
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

// 启动服务器
initServer().then(() => {
  app.listen(3000, () => {
    console.log('Server running on port 3000')
  })
})