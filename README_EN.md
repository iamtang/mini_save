# 📋 Mini Save - Multi-Device Clipboard Sync Tool

<div align="center">

![GitHub stars](https://img.shields.io/github/stars/iamtang/mini_save?style=social)
![GitHub forks](https://img.shields.io/github/forks/iamtang/mini_save?style=social)
![GitHub issues](https://img.shields.io/github/issues/iamtang/mini_save)
![GitHub license](https://img.shields.io/github/license/iamtang/mini_save)
![npm version](https://img.shields.io/npm/v/electron)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)
![Node](https://img.shields.io/badge/node-%3E=20.0.0-brightgreen)

**A lightweight, secure clipboard synchronization tool**

[Features](#-features) • [Quick Start](#-quick-start) • [Usage](#-usage) • [Deployment](#-deployment) • [FAQ](#-faq)

English | [简体中文](./README.md)

</div>

---

## 📖 About

**Mini Save** is a cross-platform clipboard synchronization tool that enables real-time sync of text, images, and files across multiple devices. Using end-to-end encryption technology to ensure your data is secure.

> **Core Benefits:** Open Source | End-to-End Encryption | Multi-Device Sync | Self-Hosted | Privacy-Focused

**Use Cases:** Multi-device Collaboration | File Transfer | Code Snippet Sharing | Team Collaboration | Secure File Transfer

---

## ✨ Features

### 🔄 Real-Time Multi-Device Sync
- **Platforms:** Windows / macOS / Linux / Web(H5) / Mobile
- **Content Types:** Text, images, any files
- **Communication:** WebSocket low-latency real-time push
- **Auto-Reconnect:** Seamless recovery after disconnection

### 🔐 Security & Encryption
- **End-to-End Encryption:** AES-256-CBC symmetric encryption
- **Zero-Knowledge Storage:** Server cannot decrypt, only transfers encrypted data
- **Key Management:** Independent keys for each group
- **Secure Transfer:** HTTPS + signature verification

### 📁 File Management
- **File Upload:** Support any format with automatic encryption
- **OSS Direct Upload:** Support Alibaba Cloud OSS resumable upload
- **History Records:** Auto-save recent clipboard history
- **Favorites:** Mark important content

### 🎯 Easy to Use
- **Password Mechanism:** Enter same password to join shared space
- **Group Isolation:** Different groups don't interfere
- **Web Interface:** No installation, use directly in browser
- **System Tray:** Run in background, launch anytime

### 🛠️ Advanced Features
- **Log Viewer:** Real-time system log viewing
- **Settings:** Flexible configuration
- **Self-Hosted:** Complete control over data privacy
- **API:** Open API for integration

---

## 🚀 Quick Start

### Requirements

- **Node.js:** >= 20.0.0
- **npm:** >= 9.0.0
- **System:** Windows / macOS / Linux

### Installation

```bash
# Clone the repository
git clone https://github.com/iamtang/mini_save.git
cd mini_save

# Install dependencies
npm install

# Build frontend
cd client
npm install
npm run build
cd ..

# Start server
npm run dev

# Package application (optional)
npm run package
```

### Quick Usage

1. **Launch app** - System tray icon appears
2. **Open URL** or Web interface
3. **Enter password** (6 characters)
4. **Start syncing** - Copy on any device, paste on others

---

## 📖 Usage

### Desktop (Electron)

**System Tray Features:**
- 🔴 **Start/Stop** - Control sync service
- 🌐 **Open URL** - Quick access to Web interface
- ⚙️ **Settings** - Configure parameters
- 📋 **Logs** - View runtime logs
- ❌ **Exit** - Completely exit application

**Keyboard Shortcuts:**
- `Ctrl/Cmd + Shift + V` - Open clipboard history
- `ESC` - Close window

### Web Interface

**Main Features:**
- 📝 **View History** - Browse all sync records
- 📋 **One-Click Copy** - Click text to copy
- 📥 **Download Files** - Click file to download
- ⭐ **Favorites** - Mark important content
- 🗑️ **Delete** - Remove unwanted content
- 📤 **Upload** - Upload files or input text directly

### Password Mechanism

- **Format:** 6 characters (numbers or letters)
- **Principle:** Same password = Same shared space
- **Security:** Password not stored, only used for group identification
- **Recommendation:** Change password regularly for security

---

## 🌐 Deployment

### Local Development

```bash
# Start in development mode
npm run dev

# Server runs at http://localhost:3000
```

### Production Build

```bash
# Build React frontend
cd client
npm run build

# Package Electron app
cd ..
npm run package

# Installation packages located in dist/ directory
```

### Server Deployment

**Configuration File (`config.json`):**
```json
{
  "PORT": 3000,
  "SERVER_ADDRESS": "",
  "CREDENTIAL": "",
  "MAX_TEXT_NUMBER": 20,
  "MAX_FILE_NUMBER": 10,
  "MAX_FILE_SIZE": 10
}
```

**Environment Variables:**
```bash
# Server port
PORT=3000

# Server address (for client mode)
SERVER_ADDRESS=https://your-server.com

# Default password (optional)
CREDENTIAL=123456

# Maximum text records
MAX_TEXT_NUMBER=20

# Maximum file records
MAX_FILE_NUMBER=10

# Maximum file size (MB)
MAX_FILE_SIZE=10
```

### OSS Configuration (Optional)

For Alibaba Cloud OSS direct upload, create `.oss.json`:

```json
{
  "region": "oss-cn-hangzhou",
  "accessKeyId": "your-access-key-id",
  "accessKeySecret": "your-access-key-secret",
  "bucket": "your-bucket-name",
  "roleArn": "acs:ram::your-account-id:role/your-role-name",
  "secure": true
}
```

---

## 🔧 Tech Stack

### Frontend
- **Framework:** React 18
- **Build:** Vite
- **Desktop:** Electron
- **Communication:** WebSocket Client
- **Encryption:** Web Crypto API

### Backend
- **Runtime:** Node.js
- **Framework:** Express
- **Communication:** WebSocket (ws)
- **Storage:** File System / Alibaba Cloud OSS
- **Logging:** electron-log

### Security
- **Algorithm:** AES-256-CBC
- **Key Management:** Local storage, never transmitted
- **Transfer Security:** HTTPS/WSS
- **File Encryption:** Client-side encryption, zero-decryption on server

---

## 📸 Preview

### Web Interface
- Clean and modern UI design
- Responsive layout, mobile-friendly
- Real-time updates without refresh
- Dark mode support

### Desktop App
- System tray integration
- Background operation
- Auto-start (optional)
- Cross-platform support

---

## 🏗️ Project Structure

```
mini_save/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Components
│   │   ├── utils/         # Utility functions
│   │   ├── App.jsx        # Main app
│   │   └── main.jsx       # Entry file
│   ├── index.css
│   └── package.json
├── page/                   # Electron pages
│   ├── setting/           # Settings page
│   └── logs/              # Logs page
├── server.js               # Express server
├── index.js                # Electron main process
├── onCopy.js              # Clipboard monitoring
├── utils.js               # Utility functions
├── clipboard-macos.js     # macOS clipboard
├── .oss.json             # OSS config (optional)
├── config.json           # App config
└── package.json
```

---

## ❓ FAQ

### Q: Where is data stored?
A:
- **Text data:** Local JSON file
- **File data:** Local file system or OSS
- **Logs:** userData directory

### Q: How is security ensured?
A:
- End-to-end AES encryption
- Server cannot decrypt
- Password not stored
- HTTPS transfer

### Q: Which platforms are supported?
A:
- Windows 10/11
- macOS 10.15+
- Linux (mainstream distributions)
- Web browsers (modern browsers)
- Mobile browsers

### Q: Can I self-host?
A: Fully supported, completely open source, can be deployed to private servers.

### Q: What's the sync speed?
A: Using WebSocket persistent connection, latency usually under 100ms, depending on network conditions.

---

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or pull requests.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the [MIT](LICENSE) License.

---

## 🌟 Star History

[![Star History Chart](https://api.star-history.com/svg?repos=iamtang/mini_save&type=Date)](https://star-history.com/#iamtang/mini_save&Date)

---

## 🔗 Related Links

- [Changelog](CHANGELOG.md)
- [Issues](https://github.com/iamtang/mini_save/issues)
- [Discussions](https://github.com/iamtang/mini_save/discussions)

---

<div align="center">

**If this project helps you, please consider giving it a ⭐️!**

Made with ❤️ by [iamtang](https://github.com/iamtang)

</div>
