# Fishell

<p align="center">
  <img src="logo.ico" alt="Fishell Logo" width="128" height="128">
</p>

<p align="center">
  <strong>A Modern SSH Client and Server Management Tool</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#usage">Usage</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="README_CN.md">中文文档</a>
</p>

---

## ✨ Features

### 🖥️ Terminal Management
- **Multi-tab Terminal** - Manage multiple SSH sessions simultaneously
- **Smart Terminal** - High-performance terminal emulator based on xterm.js
- **Custom Appearance** - Font size, cursor style, terminal color customization

### 📁 File Management
- **SFTP Integration** - Built-in SFTP file browser with upload/download support
- **Sidebar File Manager** - Quick file browsing alongside terminal
- **Drag & Drop Upload** - Drag files directly to upload to server

### 🔐 Security Features
- **AES-256-GCM Encryption** - Military-grade encryption for all sensitive data
- **Argon2 Key Derivation** - State-of-the-art algorithm resistant to GPU attacks
- **App Lock** - Startup password protection
- **Screenshot Protection** - Window content protection on Windows 10/11
- **Auto Lock** - Automatic lock on inactivity

### 🎨 UI Design
- **Windows Mica/Acrylic** - Native support for Windows 11 Mica and Windows 10 Acrylic effects
- **Multiple Themes** - Solid Dark, Solid Light, Acrylic Dark
- **Theme Colors** - Purple, Blue, Green, Cyan, Pink, Orange, Red
- **Smooth Animations** - Carefully designed transitions

### 📊 Server Monitoring
- **Real-time Monitoring** - CPU, Memory, Disk usage display
- **Server Status** - Online/Offline status at a glance
- **Quick Connect** - Double-click to connect

### 🔧 Other Features
- **Password/Key Auth** - Support for password and SSH private key authentication
- **Import/Export** - Backup and restore server configurations
- **Auto Update** - Built-in update checker

## 📦 Installation

### Option 1: Download Installer (Recommended)

Download the latest installer from [Releases](https://github.com/jasonszeng/Fishell/releases) page.

### Option 2: Run from Source

1. Clone the repository
```bash
git clone https://github.com/jasonszeng/Fishell.git
cd Fishell
```

2. Install dependencies
```bash
pip install -r requirements.txt
```

3. Run the application
```bash
python app.py
```

## 📋 System Requirements

- **OS**: Windows 10 1903+ / Windows 11
- **Python**: 3.8+ (required when running from source)
- **Memory**: 4GB+ recommended

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | Python 3, Paramiko (SSH) |
| Frontend | HTML5, CSS3, JavaScript |
| Terminal | xterm.js |
| GUI Framework | pywebview (CEF) |
| Encryption | cryptography (AES-256-GCM, Argon2) |
| Serialization | MessagePack |

## 📖 Usage

### Add Server
1. Click the "+" button in the top left corner
2. Fill in server information (name, IP, port, username)
3. Select authentication method (password or SSH key)
4. Click Save

### Connect to Server
- Double-click the server card to connect
- A new terminal tab will open upon successful connection

### File Management
- After connecting, the sidebar will show the file browser
- Click folders to enter, click ".." to go back
- Use toolbar buttons for upload, refresh, etc.

### Security Settings
- Enable "App Lock" in settings to set startup password
- Enable "Screenshot Protection" to protect window content
- Set "Auto Lock Time" to lock automatically on inactivity

## 🔒 Security

Fishell takes data security seriously:

- All server passwords and SSH keys are encrypted with **AES-256-GCM**
- Encryption keys are derived using **Argon2id** algorithm
- Data files use `.fishell` binary format
- App lock and auto-lock prevent unauthorized access

## 📄 License

MIT License

## 🤝 Contributing

Issues and Pull Requests are welcome!

---

<p align="center">
  Made with ❤️ for developers
</p>
