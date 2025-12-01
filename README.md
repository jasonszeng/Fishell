# Fishell

<p align="center">
  <img src="logo.ico" alt="Fishell Logo" width="128" height="128">
</p>

<p align="center">
  <strong>A Modern SSH Client and Server Management Tool</strong><br>
  <strong>现代化的 SSH 客户端和服务器管理工具</strong>
</p>

<p align="center">
  <a href="#features--功能特性">Features / 功能特性</a> •
  <a href="#installation--安装">Installation / 安装</a> •
  <a href="#usage--使用说明">Usage / 使用说明</a> •
  <a href="#tech-stack--技术栈">Tech Stack / 技术栈</a>
</p>

---

## Features / 功能特性

### Terminal Management / 终端管理
- **Multi-tab Terminal / 多标签终端** - Manage multiple SSH sessions simultaneously / 同时管理多个 SSH 会话，轻松切换
- **Smart Terminal / 智能终端** - High-performance terminal emulator based on xterm.js / 基于 xterm.js 的高性能终端模拟器
- **Custom Appearance / 自定义外观** - Font size, cursor style, terminal color customization / 支持字体大小、光标样式、终端颜色等个性化设置

### File Management / 文件管理
- **SFTP Integration / SFTP 集成** - Built-in SFTP file browser with upload/download support / 内置 SFTP 文件浏览器，支持上传下载
- **Sidebar File Manager / 侧边栏文件管理** - Quick file browsing alongside terminal / 在终端旁边快速浏览服务器文件
- **Drag & Drop Upload / 拖拽上传** - Drag files directly to upload to server / 支持拖拽文件直接上传到服务器

### Security Features / 安全特性
- **AES-256-GCM Encryption / AES-256-GCM 加密** - Military-grade encryption for all sensitive data / 所有敏感数据均采用军事级加密存储
- **Argon2 Key Derivation / Argon2 密钥派生** - State-of-the-art key derivation algorithm resistant to GPU attacks / 使用最先进的密钥派生算法，抵抗 GPU 暴力破解
- **App Lock / 应用锁** - Startup password protection / 支持启动密码保护，防止未授权访问
- **Screenshot Protection / 防截图录屏** - Window content protection on Windows 10/11 / Windows 10/11 下可启用窗口内容保护
- **Auto Lock / 自动锁定** - Automatic lock on inactivity / 无操作自动锁定，保护隐私安全

### UI Design / 界面设计
- **Windows Mica/Acrylic** - Native support for Windows 11 Mica and Windows 10 Acrylic effects / 原生支持 Windows 11 Mica 和 Windows 10 Acrylic 毛玻璃效果
- **Multiple Themes / 多主题支持** - Solid Dark, Solid Light, Acrylic Dark / 实体深色、实体亮色、毛玻璃暗色三种主题
- **Theme Colors / 主题色自定义** - Purple, Blue, Green, Cyan, Pink, Orange, Red / 蓝紫、蓝、绿、青、粉、橙、红多种主题色可选
- **Smooth Animations / 流畅动画** - Carefully designed transitions / 精心设计的过渡动画，提升使用体验

### Server Monitoring / 服务器监控
- **Real-time Monitoring / 实时监控** - CPU, Memory, Disk usage display / CPU、内存、磁盘使用率实时显示
- **Server Status / 服务器状态** - Online/Offline status at a glance / 在线/离线状态一目了然
- **Quick Connect / 快速连接** - Double-click to connect / 双击即可快速连接服务器

### Other Features / 其他特性
- **Password/Key Auth / 密码密钥认证** - Support for password and SSH private key authentication / 支持密码和 SSH 私钥两种认证方式
- **Import/Export / 数据导入导出** - Backup and restore server configurations / 支持服务器配置的备份和恢复
- **Auto Update / 自动更新** - Built-in update checker / 内置更新检查，保持软件最新

## Installation / 安装

### Option 1: Download Installer (Recommended) / 方式一：下载安装包（推荐）

Download the latest installer from [Releases](https://github.com/jasonszeng/Fishell/releases) page.

从 [Releases](https://github.com/jasonszeng/Fishell/releases) 页面下载最新版本的安装包。

### Option 2: Run from Source / 方式二：从源码运行

1. Clone the repository / 克隆仓库
```bash
git clone https://github.com/jasonszeng/Fishell.git
cd Fishell
```

2. Install dependencies / 安装依赖
```bash
pip install -r requirements.txt
```

3. Run the application / 运行程序
```bash
python app.py
```

## System Requirements / 系统要求

- **OS / 操作系统**: Windows 10 1903+ / Windows 11
- **Python**: 3.8+ (required when running from source / 从源码运行时需要)
- **Memory / 内存**: 4GB+ recommended / 建议 4GB+

## Tech Stack / 技术栈

| Component / 组件 | Technology / 技术 |
|------|------|
| Backend / 后端 | Python 3, Paramiko (SSH) |
| Frontend / 前端 | HTML5, CSS3, JavaScript |
| Terminal / 终端 | xterm.js |
| GUI Framework / GUI 框架 | pywebview (CEF) |
| Encryption / 加密 | cryptography (AES-256-GCM, Argon2) |
| Serialization / 序列化 | MessagePack |

## Usage / 使用说明

### Add Server / 添加服务器
1. Click the "+" button in the top left corner / 点击左上角 "+" 按钮
2. Fill in server information (name, IP, port, username) / 填写服务器信息（名称、IP、端口、用户名）
3. Select authentication method (password or SSH key) / 选择认证方式（密码或 SSH 密钥）
4. Click Save / 点击保存

### Connect to Server / 连接服务器
- Double-click the server card to connect / 双击服务器卡片即可连接
- A new terminal tab will open upon successful connection / 连接成功后会自动打开新的终端标签

### File Management / 文件管理
- After connecting, the sidebar will show the file browser / 连接服务器后，侧边栏会显示文件浏览器
- Click folders to enter, click ".." to go back / 点击文件夹进入，点击 ".." 返回上级
- Use toolbar buttons for upload, refresh, etc. / 使用工具栏按钮进行上传、刷新等操作

### Security Settings / 安全设置
- Enable "App Lock" in settings to set startup password / 在设置中启用"应用锁"可设置启动密码
- Enable "Screenshot Protection" to protect window content / 启用"防止截图录屏"可保护窗口内容
- Set "Auto Lock Time" to lock automatically on inactivity / 设置"自动锁定时间"可在无操作后自动锁定

## Security / 安全说明

Fishell takes data security seriously:

Fishell 非常重视数据安全：

- All server passwords and SSH keys are encrypted with **AES-256-GCM** / 所有服务器密码和 SSH 密钥均使用 **AES-256-GCM** 加密存储
- Encryption keys are derived using **Argon2id** algorithm with high resistance to brute-force attacks / 加密密钥通过 **Argon2id** 算法派生，具有极高的抗暴力破解能力
- Data files use `.fishell` binary format that cannot be read directly / 数据文件使用 `.fishell` 二进制格式，无法直接读取
- App lock and auto-lock features prevent unauthorized access / 支持应用锁和自动锁定，防止未授权访问

## License / 许可证

MIT License

## Contributing / 贡献

Issues and Pull Requests are welcome!

欢迎提交 Issue 和 Pull Request！

---

<p align="center">
  Made with care for developers<br>
  用心为开发者打造
</p>
