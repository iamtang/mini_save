const express = require("express");
const multer = require("multer");
const fs = require("fs");
const WebSocket = require("ws");
const path = require("path");
const {STS} =  require('ali-oss');
const { getIPAddress } = require("./utils.js");
let ip = getIPAddress();
const PORT = 3000;
const MAX_TEXT_NUMBER = 20;
const MAX_FILE_NUMBER = 10;
// module.exports = (_app, { url, PORT, MAX_TEXT_NUMBER = 20, MAX_FILE_NUMBER = 10 }) => {
const userDataPath = path.join(process.cwd(), "userData");
const DATA_DIR = path.join(userDataPath, "data");
const UPLOADS_DIR = path.join(userDataPath, "uploads");
const app = express();
// app.use(cors())
app.use(express.json());
app.use(express.static(path.join(__dirname, "./dist/")));

// 存储数据的对象
let storage_data = {};

let sts = null
let ossConf = null
let credentials = null

// 房间管理对象
const rooms = new Map(); // 使用 Map 存储房间和客户端连接
try{
	ossConf =  require('./.oss.json');
	sts = new STS({
		accessKeyId: ossConf.accessKeyId,
		accessKeySecret: ossConf.accessKeySecret,
	});
	console.log(ossConf)
}catch(e){
	console.log(e)
}
function initServerWss(server) {
    const wss = new WebSocket.Server({ noServer: true });
    // 处理 WebSocket 连接
    wss.on("connection", (ws, req) => {
        const roomID = req.url.slice(1); // 获取路径部分去掉 "/"
        if (!rooms.has(roomID)) {
            rooms.set(roomID, new Set()); // 如果房间不存在，创建房间
        }
        // 将客户端加入房间
        rooms.get(roomID).add(ws);
        console.log("客户端连接成功", roomID);
        // 监听客户端发送的消息
        ws.on("message", (msg) => {
            // 同步给同口令的设备
            for (const client of rooms.get(roomID)) {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(msg);
                }
            }
        });
        ws.on("close", () => {
            rooms.get(roomID).delete(ws);
        });
    });

    // 在 HTTP 服务器上升级到 WebSocket
    server.on("upgrade", (request, socket, head) => {
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit("connection", ws, request);
        });
    });
}

function broadcast(credential, msg, from) {
    if (rooms.get(credential) && from === "h5") {
        for (const client of rooms.get(credential)) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(msg);
            }
        }
    }
}

// 确保用户目录存在
function ensureUserDirectory(credential) {
    const userDir = path.join(UPLOADS_DIR, credential);
    try {
        fs.accessSync(userDir);
    } catch {
        fs.mkdirSync(userDir, { recursive: true });
    }
    return userDir;
}

// 获取用户数据文件路径
function getUserDataPath(credential) {
    try {
        fs.accessSync(DATA_DIR);
    } catch {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    return path.join(DATA_DIR, `${credential}.json`);
}

// 加载用户数据
function loadUserData(credential) {
    try {
        const dataPath = getUserDataPath(credential);
        const data = fs.readFileSync(dataPath, "utf8");
        return JSON.parse(data);
    } catch {
        return { texts: [], files: [] };
    }
}

// 保存用户数据
function saveUserData(credential, data) {
    const dataPath = getUserDataPath(credential);
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), "utf8");
}

// 加载所有用户数据
async function loadAllData() {
    try {
        const files = fs.readdirSync(DATA_DIR);
        const data = {};
        for (const file of files) {
            if (file.endsWith(".json")) {
                const credential = path.basename(file, ".json");
                data[credential] = loadUserData(credential);
            }
        }
        return data;
    } catch {
        return {};
    }
}

// 配置 multer 来保留原始文件名
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        try {
            const userDir = ensureUserDirectory(req.params.credential);
            cb(null, userDir);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        // 解决中文文件名问题
        const originalname = Buffer.from(file.originalname, "latin1").toString(
            "utf8"
        );
        // 获取文件名和后缀
        const ext = path.extname(originalname);
        const nameWithoutExt = path.basename(originalname, ext);
        // 生成唯一文件名但保持原始后缀
        const uniqueName = `${nameWithoutExt}-${Date.now()}${ext}`;
        cb(null, uniqueName);
    },
});

const upload = multer({ storage });

app.get("/", (req, res) => {
    res.sendFile(__dirname + "./dist/index.html");
});

// API 路由
app.post("/api/auth", async (req, res) => {
    const { credential } = req.body;
    if (!storage_data[credential]) {
        storage_data[credential] = loadUserData(credential);
        ensureUserDirectory(credential);
    }
    res.json({ success: true });
});

app.get("/api/content/:credential", async (req, res) => {
    const { credential } = req.params;
    const userData = loadUserData(credential);

    const sortedData = {
        texts: [...userData.texts].sort(
            (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        ),
        files: [...userData.files].sort(
            (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        ),
    };

    res.json(sortedData);
});

app.post("/api/text/:credential", async (req, res) => {
    const { credential } = req.params;
    const { text, from } = req.body;

    const userData = loadUserData(credential);
    let star = 0;
    // // 查找是否已存在相同的文本
    const existingIndex = userData.texts.findIndex(
        (item) => item.content === text
    );
    if (existingIndex !== -1) {
        const existingItem = userData.texts[existingIndex];
        star = existingItem.star;
        userData.texts.splice(existingIndex, 1); // 移除原来位置
    }

    const data = {
        star,
        id: Date.now(),
        content: text,
        timestamp: new Date().toISOString(),
    };
    userData.texts.unshift(data);

    // 保证 texts 数组长度不超过 20 条
    while (
        userData.texts.filter((item) => !item.star).length > MAX_TEXT_NUMBER
    ) {
        const removeIndex = userData.texts.findLastIndex(
            (item) => item.star !== 1
        );
        userData.texts.splice(removeIndex, 1);
        // userData.texts = userData.texts.slice(0, MAX_TEXT_NUMBER); // 截取前 20 条记录
    }

    saveUserData(credential, userData);
    storage_data[credential] = userData;
    broadcast(
        credential,
        JSON.stringify({ type: "text", data: data.content }),
        from
    );
    res.json({ success: true, ...data });
});

app.delete("/api/text/:credential/:id", async (req, res) => {
    const { credential, id } = req.params;

    if (!storage_data[credential]) {
        return res.status(404).send("User not found");
    }

    const textIndex = storage_data[credential].texts.findIndex(
        (t) => t.id === parseInt(id)
    );
    if (textIndex === -1) {
        return res.status(404).send("Text not found");
    }

    storage_data[credential].texts.splice(textIndex, 1);
    saveUserData(credential, storage_data[credential]);
    res.json({ success: true });
});

app.put("/api/star/text/:credential/:id", async (req, res) => {
    const { credential, id } = req.params;

    if (!storage_data[credential]) {
        return res.status(404).send("User not found");
    }

    const textIndex = storage_data[credential].texts.findIndex(
        (t) => t.id === parseInt(id)
    );
    if (textIndex === -1) {
        return res.status(404).send("Text not found");
    }
    storage_data[credential].texts[textIndex].star = !!storage_data[credential]
        .texts[textIndex].star
        ? 0
        : 1;
    saveUserData(credential, storage_data[credential]);
    res.json({ success: true });
});

app.put("/api/star/file/:credential/:id", async (req, res) => {
    const { credential, id } = req.params;

    if (!storage_data[credential]) {
        return res.status(404).send("User not found");
    }

    const fileIndex = storage_data[credential].files.findIndex(
        (f) => f.id === parseInt(id)
    );
    if (fileIndex === -1) {
        return res.status(404).send("File not found");
    }

    try {
        // 从数据中移除
        storage_data[credential].files[fileIndex].star = !!storage_data[
            credential
        ].files[fileIndex].star
            ? 0
            : 1;
        saveUserData(credential, storage_data[credential]);
        res.json({ success: true });
    } catch (error) {
        log.error("Delete error:", error);
        res.status(500).send("Error deleting file");
    }
});

app.get("/api/upload/oss/sts", async (req, res) => {
    const { _oss } = req.headers;
    if(!_oss || !ossConf){
      return res.status(404).send('not found')
    }
    if (credentials && new Date() < new Date(credentials.expiration)) {
        return res.json(credentials);
    }
    const result = await sts.assumeRole(ossConf.roleArn, null, 3600);
    credentials = {
        region: ossConf.region,
        bucket: ossConf.bucket,
        accessKeyId: result.credentials.AccessKeyId,
        accessKeySecret: result.credentials.AccessKeySecret,
        stsToken: result.credentials.SecurityToken,
        expiration: result.credentials.Expiration,
    };
    res.json(credentials);
});

app.post("/api/upload/oss/:credential", async (req, res) => {
    const { credential } = req.params;
    const { from, size, filename, filePath } = req.body;
    let star = 0;

    try {
        if (!storage_data[credential]) {
            storage_data[credential] = loadUserData(credential);
        }
        const now = new Date();
        const data = {
            star,
            id: +now,
            filename,
            filePath,
            timestamp: now.toISOString(),
            size: size || 0, // 确保有默认值
            type: "oss",
        };
        storage_data[credential].files.unshift(data);
        // 检查并删除多余文件
        while (
            storage_data[credential].files.filter((item) => !item.star).length >
            MAX_FILE_NUMBER
        ) {
            // 删除多余的文件记录和文件系统中的实际文件
            const removeIndex = storage_data[credential].files.findLastIndex(
                (item) => item.star !== 1
            );
            // userData.texts.splice(removeIndex, 1);
            // const extraFiles = storage_data[credential].files.slice(MAX_FILE_NUMBER);
            // extraFiles.forEach(file => {
            try {
                storage_data[credential].files[removeIndex].systemPath &&
                    fs.unlinkSync(
                        storage_data[credential].files[removeIndex].systemPath
                    ); // 删除文件系统中的文件
            } catch (err) {
                log.error(`Failed to delete file ${file.systemPath}:`, err);
            }
            // });

            // 保留最新的 MAX_FILE_NUMBER 条文件记录
            storage_data[credential].files.splice(removeIndex, 1);
            // storage_data[credential].files = storage_data[credential].files.slice(0, MAX_FILE_NUMBER);
        }

        saveUserData(credential, storage_data[credential]);
        broadcast(
            credential,
            JSON.stringify({ type: "oss", data: filePath }),
            from
        );
        res.json({ success: true, ...data });
    } catch (error) {
        log.error("Upload error:", error);
        res.status(500).send("Error processing file");
    }
});

app.post("/api/upload/:credential", upload.single("file"), async (req, res) => {
    const { credential } = req.params;
    const file = req.file;
    const from = req.body.from;
    let star = 0;
    if (!file) {
        return res.status(400).send("No file uploaded");
    }

    try {
        // 解决中文文件名问题
        const originalname = Buffer.from(file.originalname, "latin1").toString(
            "utf8"
        );

        if (!storage_data[credential]) {
            storage_data[credential] = loadUserData(credential);
        }

        const existingFileIndex = storage_data[credential].files.findIndex(
            (f) => f.filename === originalname
        );

        // 如果文件已经存在，删除旧的文件
        if (existingFileIndex !== -1) {
            const oldFile = storage_data[credential].files[existingFileIndex];
            star = oldFile.star;
            try {
                oldFile.systemPath && fs.unlinkSync(oldFile.systemPath); // 删除旧文件
            } catch (err) {
                log.error(`删除文件 ${oldFile.systemPath} 失败:`, err);
            }
            storage_data[credential].files.splice(existingFileIndex, 1); // 从列表中移除旧文件
        }

        // 获取文件大小
        const stats = fs.statSync(file.path);
        const data = {
            star,
            id: Date.now(),
            filename: originalname,
            systemPath: file.path,
            timestamp: new Date().toISOString(),
            size: stats.size || 0, // 确保有默认值
            type: "file",
        };
        storage_data[credential].files.unshift(data);

        // 检查并删除多余文件
        while (
            storage_data[credential].files.filter((item) => !item.star).length >
            MAX_FILE_NUMBER
        ) {
            // 删除多余的文件记录和文件系统中的实际文件
            const removeIndex = storage_data[credential].files.findLastIndex(
                (item) => item.star !== 1
            );
            // userData.texts.splice(removeIndex, 1);
            // const extraFiles = storage_data[credential].files.slice(MAX_FILE_NUMBER);
            // extraFiles.forEach(file => {
            try {
                fs.unlinkSync(
                    storage_data[credential].files[removeIndex].systemPath
                ); // 删除文件系统中的文件
            } catch (err) {
                log.error(`Failed to delete file ${file.systemPath}:`, err);
            }
            // });

            // 保留最新的 MAX_FILE_NUMBER 条文件记录
            storage_data[credential].files.splice(removeIndex, 1);
            // storage_data[credential].files = storage_data[credential].files.slice(0, MAX_FILE_NUMBER);
        }

        saveUserData(credential, storage_data[credential]);
        broadcast(
            credential,
            JSON.stringify({ type: "file", data: data.id }),
            from
        );
        res.json({ success: true, ...data });
    } catch (error) {
        log.error("Upload error:", error);
        res.status(500).send("Error processing file");
    }
});

app.delete("/api/file/:credential/:id", async (req, res) => {
    const { credential, id } = req.params;

    if (!storage_data[credential]) {
        return res.status(404).send("User not found");
    }

    const file = storage_data[credential].files.find(
        (f) => f.id === parseInt(id)
    );
    if (!file) {
        return res.status(404).send("File not found");
    }

    try {
        // 删除物理文件
        fs.unlinkSync(file.systemPath);
        // 从数据中移除
        storage_data[credential].files = storage_data[credential].files.filter(
            (f) => f.id !== parseInt(id)
        );
        saveUserData(credential, storage_data[credential]);
        res.json({ success: true });
    } catch (error) {
        log.error("Delete error:", error);
        res.status(500).send("Error deleting file");
    }
});

app.get("/api/download/:credential/:fileId", async (req, res) => {
    const { credential, fileId } = req.params;

    try {
        const userData = storage_data[credential];
        if (!userData) {
            return res.status(404).send("User not found");
        }

        const file = userData.files.find((f) => f.id === parseInt(fileId));
        if (!file) {
            return res.status(404).send("File not found");
        }

        // 检查文件是否存在
        try {
            fs.accessSync(file.systemPath);
        } catch {
            return res.status(404).send("File not found on disk");
        }

        // 设置文件名编码
        const filename = encodeURIComponent(file.filename);
        res.setHeader(
            "Content-Disposition",
            `attachment; filename*=UTF-8''${filename}`
        );
        res.setHeader("Content-Type", "application/octet-stream");

        // 使用原生 fs 的 createReadStream
        const fileStream = fs.createReadStream(file.systemPath);
        fileStream.pipe(res);
    } catch (error) {
        log.error("Download error:", error);
        res.status(500).send("Error downloading file");
    }
});

initServerWss(
    app.listen(PORT, () => {
        console.log(`Server is running at ${PORT}`, `${ip}:${PORT}`);
    })
);
