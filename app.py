import os
import json
import threading
import time
import select
import paramiko
import webview
import ctypes
from ctypes import wintypes
import http.server
import socketserver
import socket
import codecs
import requests
import sys
import io

import webbrowser
import hashlib
import secrets
import binascii
import struct
try:
    import msgpack  # 二进制序列化，比JSON更安全（可选）
    HAS_MSGPACK = True
except ImportError:
    HAS_MSGPACK = False
    msgpack = None
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import hashes
try:
    from cryptography.hazmat.primitives.kdf.argon2 import Argon2
    HAS_ARGON2 = True
except ImportError:
    HAS_ARGON2 = False
    Argon2 = None
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC  # 保留作为备用
import base64

# 注意：打包时不隐藏控制台，方便调试
# 发布版本可以在 spec 文件中设置 console=False

# --- 配置 ---
# PyInstaller 打包后的路径处理
if getattr(sys, 'frozen', False):
    # 打包后运行
    BASE_DIR = os.path.dirname(sys.executable)
else:
    # 开发环境
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# 使用二进制文件扩展名，更安全
DATA_FILE = os.path.join(BASE_DIR, 'servers.fishell')
SETTINGS_FILE = os.path.join(BASE_DIR, 'settings.fishell')
AUTH_FILE = os.path.join(BASE_DIR, 'auth.json')  # 保持JSON用于兼容性
# 旧文件路径（用于迁移）
OLD_DATA_FILE = os.path.join(BASE_DIR, 'servers.json')
OLD_SETTINGS_FILE = os.path.join(BASE_DIR, 'settings.json')

def _hash_password(password, salt=None):
    """Hash a password for storing."""
    if salt is None:
        salt = secrets.token_hex(16)
    pwd_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
    return f"{salt}:{binascii.hexlify(pwd_hash).decode('ascii')}"

def _verify_password(stored_password, provided_password):
    """Verify a stored password against one provided by user"""
    try:
        salt, pwd_hash = stored_password.split(':')
        pwd_hash_check = hashlib.pbkdf2_hmac('sha256', provided_password.encode('utf-8'), salt.encode('utf-8'), 100000)
        return pwd_hash_check == binascii.unhexlify(pwd_hash)
    except Exception:
        return False

# --- DWM Win32 API 定义 ---
DWMWA_USE_IMMERSIVE_DARK_MODE = 20
DWMWA_CAPTION_COLOR = 35
DWMWA_TEXT_COLOR = 36
DWMWA_SYSTEMBACKDROP_TYPE = 38

# --- 防止截图/录屏 API 定义 ---
WDA_NONE = 0x00000000
WDA_MONITOR = 0x00000001
WDA_EXCLUDEFROMCAPTURE = 0x00000011  # Windows 10 1903+

# Windows 10 Acrylic Definitions
class ACCENT_POLICY(ctypes.Structure):
    _fields_ = [
        ("AccentState", ctypes.c_int),
        ("AccentFlags", ctypes.c_int),
        ("GradientColor", ctypes.c_int),
        ("AnimationId", ctypes.c_int)
    ]

class WINDOWCOMPOSITIONATTRIBDATA(ctypes.Structure):
    _fields_ = [
        ("Attribute", ctypes.c_int),
        ("Data", ctypes.POINTER(ACCENT_POLICY)),
        ("SizeOfData", ctypes.c_int)
    ]

def colorref(r, g, b):
    return wintypes.DWORD(b << 16 | g << 8 | r)

def apply_acrylic(hwnd):
    # 1. 尝试 Windows 11 Mica (2) 或 Acrylic (3) - 优先使用更深的效果
    # DWMSBT_MAINWINDOW = 2 (Mica), DWMSBT_TRANSIENTWINDOW = 3 (Acrylic)
    dwmapi = ctypes.windll.dwmapi
    try:
        # 先尝试 Mica 效果（更深的毛玻璃）
        val = ctypes.c_int(2) # Mica 效果，更深更暗
        result = dwmapi.DwmSetWindowAttribute(hwnd, DWMWA_SYSTEMBACKDROP_TYPE, ctypes.byref(val), ctypes.sizeof(val))
        if result != 0:  # 如果 Mica 失败，回退到 Acrylic
            val = ctypes.c_int(3) # Acrylic 效果
            dwmapi.DwmSetWindowAttribute(hwnd, DWMWA_SYSTEMBACKDROP_TYPE, ctypes.byref(val), ctypes.sizeof(val))
    except Exception:
        pass

    # 2. 回退尝试 Windows 10 Acrylic (SetWindowCompositionAttribute) - 使用更深的效果
    try:
        user32 = ctypes.windll.user32
        SetWindowCompositionAttribute = user32.SetWindowCompositionAttribute
        SetWindowCompositionAttribute.argtypes = [wintypes.HWND, ctypes.POINTER(WINDOWCOMPOSITIONATTRIBDATA)]
        SetWindowCompositionAttribute.restype = ctypes.c_int
        
        accent = ACCENT_POLICY()
        # 使用 ACCENT_ENABLE_ACRYLICBLURBEHIND (4) 获得更深的毛玻璃效果
        accent.AccentState = 4  # 更深的 Acrylic 效果
        # 设置渐变颜色为深色，增强深度感
        accent.GradientColor = 0x99000000  # 60% 透明度的黑色叠加
        
        data = WINDOWCOMPOSITIONATTRIBDATA()
        data.Attribute = 19 # WCA_ACCENT_POLICY
        data.Data = ctypes.pointer(accent)
        data.SizeOfData = ctypes.sizeof(accent)
        
        SetWindowCompositionAttribute(hwnd, ctypes.pointer(data))
    except Exception:
        pass

class Bridge:
    def __init__(self):
        self._window = None
        self.ssh_clients = {}
        self.encryption_key = None  # Will be set after password verification
        self._default_key = None  # 默认加密密钥（用于无密码时的加密）
        try:
            self._migrate_auth_file()  # Migrate appPassword to auth.json if needed
        except Exception:
            pass  # 迁移失败不影响启动
        try:
            self._init_default_encryption()  # 初始化默认加密
        except Exception:
            pass  # 加密初始化失败不影响启动
        try:
            self._migrate_old_files()  # 迁移旧JSON文件到新二进制格式
        except Exception:
            pass  # 迁移失败不影响启动
        try:
            self._migrate_plaintext_data()  # 自动迁移明文数据到加密格式
        except Exception:
            pass  # 迁移失败不影响启动
        try:
            self._init_encryption_on_startup()  # 启动时初始化加密密钥
        except Exception:
            pass  # 初始化失败不影响启动

    def _init_default_encryption(self):
        """初始化默认加密密钥（基于机器特征和固定密钥）- 使用Argon2或PBKDF2"""
        try:
            # 使用机器特征生成默认密钥（基于主机名和固定盐值）
            import platform
            machine_id = platform.node()  # 获取主机名
            default_salt = b'Fishell_Default_Encryption_Salt_v2.0'  # 固定盐值（16字节）
            
            # 优先使用 Argon2（更安全，抗GPU攻击）
            if HAS_ARGON2 and Argon2:
                try:
                    kdf = Argon2(
                        algorithm=Argon2.Algorithm.ARGON2ID,  # 使用Argon2id（抗侧信道攻击）
                        length=32,  # AES-256需要32字节
                        salt=default_salt[:16],  # 使用前16字节作为盐
                        memory_cost=65536,  # 64MB内存成本
                        time_cost=3,  # 3次迭代
                        parallelism=4,  # 4个并行线程
                    )
                    # 使用机器ID和固定字符串生成密钥
                    key_material = (machine_id + 'Fishell_Default_Key_2024').encode('utf-8')
                    default_key = kdf.derive(key_material)  # 直接使用32字节密钥，不进行base64编码
                    self._default_key = default_key
                except Exception:
                    # 如果Argon2失败，回退到PBKDF2
                    kdf = PBKDF2HMAC(
                        algorithm=hashes.SHA256(),
                        length=32,
                        salt=default_salt[:16],
                        iterations=300000,  # 增加迭代次数
                    )
                    key_material = (machine_id + 'Fishell_Default_Key_2024').encode('utf-8')
                    default_key = kdf.derive(key_material)  # 直接使用32字节密钥
                    self._default_key = default_key
            else:
                # Argon2不可用，使用PBKDF2
                kdf = PBKDF2HMAC(
                    algorithm=hashes.SHA256(),
                    length=32,
                    salt=default_salt[:16],
                    iterations=300000,  # 增加迭代次数
                )
                key_material = (machine_id + 'Fishell_Default_Key_2024').encode('utf-8')
                default_key = kdf.derive(key_material)  # 直接使用32字节密钥
                self._default_key = default_key
        except Exception:
            # 如果生成失败，使用备用方法
            try:
                # 使用完全随机的密钥（但需要保存，这里使用固定盐值）
                kdf = PBKDF2HMAC(
                    algorithm=hashes.SHA256(),
                    length=32,
                    salt=b'Fishell_Backup_Salt_16B',
                    iterations=300000,
                )
                default_key = kdf.derive(b'Fishell_Default_Encryption_Key_2024')  # 直接使用32字节密钥
                self._default_key = default_key
            except Exception:
                self._default_key = None

    def _init_encryption_on_startup(self):
        """启动时初始化加密密钥，如果有应用密码但没有加密密钥"""
        try:
            # 如果已经有加密密钥，不需要重新初始化
            if self.encryption_key:
                return
                
            # 检查是否有应用密码
            if os.path.exists(AUTH_FILE):
                with open(AUTH_FILE, 'r', encoding='utf-8') as f:
                    auth_data = json.load(f)
                    stored_pwd = auth_data.get('appPassword')
                    if stored_pwd and ':' in stored_pwd:  # 有哈希密码
                        # 有密码但没有加密密钥，这是正常的
                        # 用户需要输入密码来解锁并初始化加密密钥
                        # 这里不做任何操作，让前端检测到需要密码解锁
                        pass
        except Exception:
            pass

    def _derive_key(self, password, salt=None, use_argon2=True):
        """Derive encryption key from password using Argon2 (更安全) or PBKDF2 (备用)."""
        if salt is None:
            salt = secrets.token_bytes(16)
        elif isinstance(salt, str):
            salt = base64.urlsafe_b64decode(salt)
        
        # 优先使用 Argon2（更安全，抗GPU攻击）
        if use_argon2 and HAS_ARGON2 and Argon2:
            try:
                kdf = Argon2(
                    algorithm=Argon2.Algorithm.ARGON2ID,  # Argon2id最安全
                    length=32,  # AES-256需要32字节
                    salt=salt,
                    memory_cost=65536,  # 64MB内存成本（增加攻击难度）
                    time_cost=3,  # 3次迭代
                    parallelism=4,  # 4个并行线程
                )
                key = kdf.derive(password.encode('utf-8'))
                return key, base64.urlsafe_b64encode(salt).decode('utf-8')
            except Exception:
                # 如果Argon2失败，回退到PBKDF2
                pass
        
        # 备用：使用 PBKDF2（增加迭代次数）
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=300000,  # 增加到 300000 提高安全性
        )
        key = kdf.derive(password.encode('utf-8'))  # 直接使用32字节密钥，不进行base64编码
        return key, base64.urlsafe_b64encode(salt).decode('utf-8')

    def _encrypt_data(self, data):
        """Encrypt data using AES-256-GCM (认证加密，比Fernet更安全) with binary format."""
        # 优先使用用户设置的加密密钥，否则使用默认密钥
        key_to_use = self.encryption_key if self.encryption_key else self._default_key
        
        if not key_to_use:
            # 如果默认密钥也生成失败，尝试重新生成
            self._init_default_encryption()
            key_to_use = self._default_key
            if not key_to_use:
                raise Exception("无法初始化加密密钥")
        
        try:
            # 使用 MessagePack 进行二进制序列化（比JSON更安全、更紧凑）
            use_msgpack = False
            if HAS_MSGPACK and msgpack:
                try:
                    serialized_data = msgpack.packb(data, use_bin_type=True)
                    use_msgpack = True
                except Exception:
                    # msgpack打包失败，回退到JSON
                    json_str = json.dumps(data, ensure_ascii=False)
                    serialized_data = json_str.encode('utf-8')
                    use_msgpack = False
            else:
                # msgpack不可用，使用JSON（但仍然是二进制格式）
                json_str = json.dumps(data, ensure_ascii=False)
                serialized_data = json_str.encode('utf-8')
                use_msgpack = False
            
            # 使用 AES-256-GCM 进行认证加密
            # GCM模式提供认证，防止数据被篡改
            aesgcm = AESGCM(key_to_use)
            nonce = secrets.token_bytes(12)  # GCM推荐12字节nonce
            
            # 加密数据（自动包含认证标签）
            encrypted = aesgcm.encrypt(nonce, serialized_data, None)
            
            # 构建二进制格式：版本(1字节) + 标记(1字节) + 格式(1字节) + nonce(12字节) + 加密数据
            # 标记：0x01=用户密码加密, 0x02=默认加密
            # 格式：0x03=使用msgpack, 0x04=使用JSON
            marker = 0x01 if self.encryption_key else 0x02
            format_flag = 0x03 if use_msgpack else 0x04
            
            # 版本号（用于未来兼容性）
            version = 0x02  # v2: AES-GCM + binary format
            
            # 组装：版本(1) + 标记(1) + 格式(1) + nonce(12) + 加密数据
            header = struct.pack('BBB', version, marker, format_flag)
            return header + nonce + encrypted
        except Exception as e:
            # 加密失败时抛出异常，不允许明文保存
            raise Exception(f"数据加密失败: {str(e)}")

    def _decrypt_data(self, data_bytes):
        """Decrypt data bytes using AES-256-GCM with binary format support."""
        try:
            # 检查是否是新的二进制格式（v2）
            if len(data_bytes) < 15:  # 至少需要：版本(1) + 标记(1) + 格式(1) + nonce(12)
                # 可能是旧格式或明文，尝试旧格式解析
                return self._decrypt_legacy_format(data_bytes)
            
            # 解析头部
            version, marker, format_flag = struct.unpack('BBB', data_bytes[:3])
            
            # 版本检查
            if version == 0x02:  # v2: AES-GCM格式
                # 提取nonce和加密数据
                nonce = data_bytes[3:15]  # 12字节nonce
                encrypted_data = data_bytes[15:]
                
                # 确定使用的密钥
                if marker == 0x01:  # 用户密码加密
                    if not self.encryption_key:
                        return None
                    key_to_use = self.encryption_key
                elif marker == 0x02:  # 默认加密
                    if not self._default_key:
                        self._init_default_encryption()
                        if not self._default_key:
                            return None
                    key_to_use = self._default_key
                else:
                    return None
                
                # 使用 AES-GCM 解密（自动验证认证标签）
                aesgcm = AESGCM(key_to_use)
                decrypted = aesgcm.decrypt(nonce, encrypted_data, None)
                
                # 根据格式标志反序列化
                if format_flag == 0x03:  # MessagePack
                    if HAS_MSGPACK and msgpack:
                        try:
                            return msgpack.unpackb(decrypted, raw=False)
                        except Exception:
                            # 如果msgpack解析失败，尝试JSON
                            return json.loads(decrypted.decode('utf-8'))
                    else:
                        # msgpack不可用，尝试JSON
                        return json.loads(decrypted.decode('utf-8'))
                elif format_flag == 0x04:  # JSON
                    return json.loads(decrypted.decode('utf-8'))
                else:
                    return None
            else:
                # 未知版本，尝试旧格式
                return self._decrypt_legacy_format(data_bytes)
        except Exception as e:
            # 解密失败，尝试旧格式
            return self._decrypt_legacy_format(data_bytes)
    
    def _decrypt_legacy_format(self, data_bytes):
        """解密旧格式数据（Fernet + JSON文本格式）用于向后兼容"""
        try:
            # 检查是否是旧格式的Fernet加密
            if data_bytes.startswith(b'ENCRYPTED:'):
                if not self.encryption_key:
                    return None
                try:
                    from cryptography.fernet import Fernet
                    fernet = Fernet(self.encryption_key)
                    encrypted_data = data_bytes[10:]
                    decrypted = fernet.decrypt(encrypted_data)
                    return json.loads(decrypted.decode('utf-8'))
                except Exception:
                    return None
            elif data_bytes.startswith(b'ENCRYPTED_DEFAULT:'):
                if not self._default_key:
                    self._init_default_encryption()
                    if not self._default_key:
                        return None
                try:
                    from cryptography.fernet import Fernet
                    fernet = Fernet(self._default_key)
                    encrypted_data = data_bytes[19:]
                    decrypted = fernet.decrypt(encrypted_data)
                    return json.loads(decrypted.decode('utf-8'))
                except Exception:
                    return None
            else:
                # 尝试作为明文JSON读取（用于迁移）
                try:
                    data = json.loads(data_bytes.decode('utf-8'))
                    return data
                except:
                    return None
        except Exception:
            return None

    def _migrate_auth_file(self):
        """Migrate appPassword from settings.json to auth.json if it exists."""
        if os.path.exists(SETTINGS_FILE) and not os.path.exists(AUTH_FILE):
            try:
                # 尝试以二进制方式读取，检查是否已加密
                with open(SETTINGS_FILE, 'rb') as f:
                    data_bytes = f.read()
                
                # 如果已经是加密数据，跳过迁移
                if data_bytes.startswith(b'ENCRYPTED:') or data_bytes.startswith(b'ENCRYPTED_DEFAULT:'):
                    return
                
                # 尝试作为明文 JSON 读取
                with open(SETTINGS_FILE, 'r', encoding='utf-8') as f:
                    settings = json.load(f)
                
                if 'appPassword' in settings:
                    # Move to auth.json
                    auth_data = {'appPassword': settings['appPassword']}
                    with open(AUTH_FILE, 'w', encoding='utf-8') as f:
                        json.dump(auth_data, f, indent=2)
                    
                    # Remove from settings.json
                    del settings['appPassword']
                    # 立即加密保存
                    self.save_settings(settings)
            except Exception:
                pass
    
    def _migrate_old_files(self):
        """迁移旧JSON文件到新的二进制格式"""
        # 迁移 servers.json -> servers.fishell
        if os.path.exists(OLD_DATA_FILE) and not os.path.exists(DATA_FILE):
            try:
                with open(OLD_DATA_FILE, 'rb') as f:
                    data_bytes = f.read()
                data = self._decrypt_data(data_bytes)
                if data:
                    self._save_file(data)
                    # 备份旧文件
                    try:
                        os.rename(OLD_DATA_FILE, OLD_DATA_FILE + '.backup')
                    except:
                        pass
            except Exception:
                pass
        
        # 迁移 settings.json -> settings.fishell
        if os.path.exists(OLD_SETTINGS_FILE) and not os.path.exists(SETTINGS_FILE):
            try:
                with open(OLD_SETTINGS_FILE, 'rb') as f:
                    data_bytes = f.read()
                data = self._decrypt_data(data_bytes)
                if data:
                    if 'appPassword' in data:
                        del data['appPassword']
                    self.save_settings(data)
                    # 备份旧文件
                    try:
                        os.rename(OLD_SETTINGS_FILE, OLD_SETTINGS_FILE + '.backup')
                    except:
                        pass
            except Exception:
                pass
    
    def _migrate_plaintext_data(self):
        """自动迁移明文数据到加密格式"""
        # 迁移 servers.json
        if os.path.exists(DATA_FILE):
            try:
                with open(DATA_FILE, 'rb') as f:
                    data_bytes = f.read()
                
                # 如果已经是加密数据，跳过
                if data_bytes.startswith(b'ENCRYPTED:') or data_bytes.startswith(b'ENCRYPTED_DEFAULT:'):
                    return
                
                # 尝试作为明文 JSON 读取并加密
                try:
                    data = json.loads(data_bytes.decode('utf-8'))
                    # 立即加密保存
                    self._save_file(data)
                except:
                    pass
            except Exception:
                pass
        
        # 迁移 settings.json
        if os.path.exists(SETTINGS_FILE):
            try:
                with open(SETTINGS_FILE, 'rb') as f:
                    data_bytes = f.read()
                
                # 如果已经是加密数据，跳过
                if data_bytes.startswith(b'ENCRYPTED:') or data_bytes.startswith(b'ENCRYPTED_DEFAULT:'):
                    return
                
                # 尝试作为明文 JSON 读取并加密
                try:
                    data = json.loads(data_bytes.decode('utf-8'))
                    # 移除 appPassword（应该在 auth.json 中）
                    if 'appPassword' in data:
                        del data['appPassword']
                    # 立即加密保存
                    self.save_settings(data)
                except:
                    pass
            except Exception:
                pass

    def set_window(self, window):
        self._window = window

    # --- 窗口控制 ---
    def close_window(self):
        self._window.destroy()

    def minimize_window(self):
        self._window.minimize()

    def maximize_window(self):
        if self._window.on_top:
            self._window.restore()
        else:
            self._window.maximize()
            
    def drag_window(self):
        # 原生标题栏接管拖拽，此方法主要作为保留接口
        pass

    # --- Utils ---
    def open_url(self, url):
        webbrowser.open(url)
    
    # --- 软件更新 ---
    APP_VERSION = "0.0.1 内测版"  # 当前软件版本
    UPDATE_SERVER = "https://oxno.me/server/update.php"  # 更新服务器地址
    NOTICE_SERVER = "https://oxno.me/server/notice.php"  # 公告服务器地址
    
    def get_app_version(self):
        """获取当前软件版本"""
        return self.APP_VERSION
    
    def check_update(self):
        """检查软件更新"""
        try:
            import platform
            machine_id = platform.node()
            
            payload = {
                'version': self.APP_VERSION,
                'platform': 'windows',
                'machine_id': hashlib.md5(machine_id.encode()).hexdigest()
            }
            
            response = requests.post(
                self.UPDATE_SERVER,
                json=payload,
                timeout=10,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                data = response.json()
                return {
                    'success': True,
                    'needs_update': data.get('needs_update', False),
                    'latest_version': data.get('latest_version', self.APP_VERSION),
                    'download_url': data.get('download_url'),
                    'release_notes': data.get('release_notes'),
                    'force_update': data.get('force_update', False),
                    'file_size': data.get('file_size', '')
                }
            else:
                return {'success': False, 'error': f'Server error: {response.status_code}'}
        except requests.exceptions.Timeout:
            return {'success': False, 'error': 'Connection timeout'}
        except requests.exceptions.ConnectionError:
            return {'success': False, 'error': 'Cannot connect to update server'}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def get_notice(self):
        """获取公告"""
        try:
            response = requests.get(self.NOTICE_SERVER, timeout=5)
            if response.status_code == 200:
                return response.json()
            return {'success': False, 'has_notice': False}
        except Exception:
            return {'success': False, 'has_notice': False}
    
    def open_browser(self, url):
        """在外部浏览器中打开链接"""
        try:
            webbrowser.open(url)
            return {'success': True}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def download_update(self, url):
        """下载更新文件"""
        try:
            import tempfile
            
            # 获取临时目录
            temp_dir = tempfile.gettempdir()
            filename = url.split('/')[-1] if '/' in url else 'Fishell-Update.exe'
            filepath = os.path.join(temp_dir, filename)
            
            # 下载文件
            response = requests.get(url, stream=True, timeout=300)
            total_size = int(response.headers.get('content-length', 0))
            
            downloaded = 0
            with open(filepath, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
                        downloaded += len(chunk)
                        # 可以在这里发送进度到前端
            
            return {'success': True, 'filepath': filepath}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def install_update(self, filepath):
        """安装更新并重启"""
        try:
            import subprocess
            # 启动安装程序
            subprocess.Popen([filepath], shell=True)
            # 关闭当前应用
            if self._window:
                self._window.destroy()
            return {'success': True}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def open_devtools(self):
        """打开开发者工具 - 在 debug=True 模式下，F12 应该可以打开"""
        # pywebview 的 debug=True 已经启用了开发者工具
        # 用户可以直接按 F12 或 Ctrl+Shift+I 打开
        pass

    # --- 数据存储 ---
    def get_servers(self):
        # 先检查新格式文件
        if os.path.exists(DATA_FILE):
            try:
                with open(DATA_FILE, 'rb') as f:
                    data_bytes = f.read()
                
                if not data_bytes:
                    # 如果新文件为空，尝试读取旧文件
                    if os.path.exists(OLD_DATA_FILE):
                        return self._get_servers_from_old_file()
                    return []
                
                # Try to decrypt
                result = self._decrypt_data(data_bytes)
                if result is not None:
                    return result if isinstance(result, list) else []
                else:
                    # Decryption failed, might be corrupted or wrong key
                    # 尝试读取旧文件
                    if os.path.exists(OLD_DATA_FILE):
                        return self._get_servers_from_old_file()
                    return []
            except Exception:
                # 如果读取新文件失败，尝试旧文件
                if os.path.exists(OLD_DATA_FILE):
                    return self._get_servers_from_old_file()
                return []
        
        # 如果新格式文件不存在，尝试读取旧格式文件
        if os.path.exists(OLD_DATA_FILE):
            return self._get_servers_from_old_file()
        
        return []
    
    def _get_servers_from_old_file(self):
        """从旧格式文件读取服务器数据"""
        try:
            with open(OLD_DATA_FILE, 'rb') as f:
                data_bytes = f.read()
            
            if not data_bytes:
                return []
            
            # Try to decrypt
            result = self._decrypt_data(data_bytes)
            if result is not None:
                # 迁移到新格式
                if isinstance(result, list) and len(result) > 0:
                    try:
                        self._save_file(result)
                    except:
                        pass
                return result if isinstance(result, list) else []
            return []
        except Exception:
            return []

    def save_server(self, data):
        servers = self.get_servers()
        if 'id' not in data:
            data['id'] = int(time.time() * 1000)
            data['addedTime'] = time.strftime("%Y-%m-%d %H:%M", time.localtime())
        
        # 默认状态
        data['status'] = 'offline'
        data['cpu'] = 0
        data['mem'] = 0
        data['disk'] = 0
        
        servers.append(data)
        self._save_file(servers)
        return servers

    def update_server(self, server_id, data):
        servers = self.get_servers()
        for s in servers:
            if s['id'] == server_id:
                s.update(data)
                break
        self._save_file(servers)
        return servers

    def delete_server(self, server_id):
        servers = self.get_servers()
        servers = [s for s in servers if s['id'] != server_id]
        self._save_file(servers)
        return servers

    def import_servers(self, new_servers):
        # 简单的全量覆盖或合并，这里选择全量覆盖（更符合导入逻辑）
        # 但为了安全，也可以做合并。这里用户意图通常是恢复备份，所以覆盖是合理的
        # 不过为了防止意外，我们先做简单的 ID 检查
        if not isinstance(new_servers, list):
            return False
        self._save_file(new_servers)
        return True

    def _save_file(self, servers):
        try:
            # 强制加密数据（不允许明文保存）
            encrypted_data = self._encrypt_data(servers)
            
            # 加密后的数据总是 bytes
            if isinstance(encrypted_data, bytes):
                with open(DATA_FILE, 'wb') as f:
                    f.write(encrypted_data)
            else:
                # 如果返回的不是 bytes，说明加密失败，抛出异常
                raise Exception("加密失败：数据未正确加密")
        except Exception as e:
            # 不允许明文保存，尝试使用备用加密方法（Fernet）
            try:
                if not self._default_key:
                    self._init_default_encryption()
                if self._default_key:
                    # 尝试使用Fernet作为备用（需要将密钥转换为Fernet格式）
                    try:
                        from cryptography.fernet import Fernet
                        # Fernet需要32字节的URL-safe base64编码密钥
                        # 如果_default_key已经是bytes，需要转换为base64
                        if isinstance(self._default_key, bytes):
                            fernet_key = base64.urlsafe_b64encode(self._default_key)
                        else:
                            fernet_key = self._default_key
                        fernet = Fernet(fernet_key)
                        json_str = json.dumps(servers, ensure_ascii=False)
                        encrypted = fernet.encrypt(json_str.encode('utf-8'))
                        with open(DATA_FILE, 'wb') as f:
                            f.write(b'ENCRYPTED_DEFAULT:' + encrypted)
                    except Exception:
                        # Fernet也失败，尝试直接使用AES-GCM（简化版）
                        if not self._default_key:
                            raise Exception("无法初始化加密密钥")
                        aesgcm = AESGCM(self._default_key)
                        json_str = json.dumps(servers, ensure_ascii=False)
                        nonce = secrets.token_bytes(12)
                        encrypted = aesgcm.encrypt(nonce, json_str.encode('utf-8'), None)
                        # 使用简化格式保存
                        version = 0x02
                        marker = 0x02
                        format_flag = 0x04  # JSON
                        header = struct.pack('BBB', version, marker, format_flag)
                        with open(DATA_FILE, 'wb') as f:
                            f.write(header + nonce + encrypted)
                else:
                    raise Exception("无法初始化加密密钥")
            except Exception as e2:
                # 如果备用方法也失败，记录错误但不抛出异常（避免应用崩溃）
                # 使用sys.stderr而不是print，因为stdout被重定向了
                import sys
                try:
                    sys.stderr.write(f"保存服务器数据失败（加密错误）: {str(e)}, 备用方法也失败: {str(e2)}\n")
                except:
                    pass
                raise Exception(f"保存失败：无法加密数据 - {str(e2)}")

    # --- 设置存储 ---
    def get_settings(self):
        """获取所有设置"""
        if not os.path.exists(SETTINGS_FILE):
            return {}
        try:
            with open(SETTINGS_FILE, 'rb') as f:
                data_bytes = f.read()
            
            if not data_bytes:
                return {}
            
            # Try to decrypt
            result = self._decrypt_data(data_bytes)
            if result is not None:
                settings = result if isinstance(result, dict) else {}
                # Security: Don't send the password hash to frontend (should be in auth.json now)
                if 'appPassword' in settings:
                    del settings['appPassword']
                return settings
            else:
                return {}
        except Exception:
            return {}

    def save_settings(self, settings):
        """保存所有设置到文件（自动保存，强制加密）"""
        try:
            # Read current settings (decrypted)
            current_settings = {}
            if os.path.exists(SETTINGS_FILE):
                try:
                    with open(SETTINGS_FILE, 'rb') as f:
                        data_bytes = f.read()
                    result = self._decrypt_data(data_bytes)
                    if result:
                        current_settings = result
                except:
                    pass
            
            # Remove appPassword if sent (shouldn't be, but safety check)
            if 'appPassword' in settings:
                del settings['appPassword']
            
            # Merge settings
            current_settings.update(settings)
            
            # 强制加密并保存
            encrypted_data = self._encrypt_data(current_settings)
            if isinstance(encrypted_data, bytes):
                with open(SETTINGS_FILE, 'wb') as f:
                    f.write(encrypted_data)
            else:
                # 如果返回的不是 bytes，说明加密失败，抛出异常
                raise Exception("加密失败：设置数据未正确加密")
            return True
        except Exception as e:
            # 不允许明文保存，记录错误但返回 False
            print(f"保存设置失败（加密错误）: {str(e)}")
            return False

    def verify_app_password(self, password):
        """Verify password and derive encryption key if correct."""
        try:
            if not os.path.exists(AUTH_FILE):
                return False
            
            with open(AUTH_FILE, 'r', encoding='utf-8') as f:
                auth_data = json.load(f)
                stored_pwd = auth_data.get('appPassword')
                if not stored_pwd:
                    return False
                
                # Check if it's a legacy plaintext password (no colon)
                if ':' not in stored_pwd:
                    # Auto-migrate to hash
                    if stored_pwd == password:
                        self.set_app_password(password)
                        return True
                    return False
                
                # Verify hash
                if _verify_password(stored_pwd, password):
                    # Derive encryption key from password
                    salt = auth_data.get('encryption_salt')
                    if salt:
                        self.encryption_key, _ = self._derive_key(password, salt)
                    else:
                        # First time, generate salt
                        self.encryption_key, salt = self._derive_key(password)
                        auth_data['encryption_salt'] = salt
                        with open(AUTH_FILE, 'w', encoding='utf-8') as f:
                            json.dump(auth_data, f, indent=2)
                    return True
                return False
        except Exception as e:
            return False

    def set_app_password(self, password):
        """Set a new password, derive encryption key, and re-encrypt all data."""
        try:
            # Hash the password
            hashed = _hash_password(password)
            
            # Derive new encryption key
            new_key, salt = self._derive_key(password)
            
            # Save to auth.json
            auth_data = {
                'appPassword': hashed,
                'encryption_salt': salt
            }
            with open(AUTH_FILE, 'w', encoding='utf-8') as f:
                json.dump(auth_data, f, indent=2)
            
            # Update encryption key
            old_key = self.encryption_key
            self.encryption_key = new_key
            
            # Re-encrypt all data files if they exist
            # Re-encrypt servers.json
            if os.path.exists(DATA_FILE):
                try:
                    # Temporarily use old key to read
                    temp_key = self.encryption_key
                    self.encryption_key = old_key
                    servers = self.get_servers()
                    # Switch to new key and save
                    self.encryption_key = temp_key
                    if servers:
                        self._save_file(servers)
                except Exception:
                    pass
            
            # Re-encrypt settings.json
            if os.path.exists(SETTINGS_FILE):
                try:
                    temp_key = self.encryption_key
                    self.encryption_key = old_key
                    settings = self.get_settings()
                    self.encryption_key = temp_key
                    if settings:
                        self.save_settings(settings)
                except Exception:
                    pass
            
            return True
        except Exception as e:
            return False

    def has_app_password(self):
        try:
            if os.path.exists(AUTH_FILE):
                with open(AUTH_FILE, 'r', encoding='utf-8') as f:
                    auth_data = json.load(f)
                    return bool(auth_data.get('appPassword'))
            return False
        except Exception:
            return False

    def is_locked(self):
        """检查应用是否处于锁定状态（有密码但没有解锁）"""
        try:
            # 如果有密码但没有加密密钥，说明需要解锁
            return self.has_app_password() and self.encryption_key is None
        except Exception:
            return False

    def remove_app_password(self):
        """删除应用密码并重新加密所有数据为默认加密"""
        try:
            # 保存当前的加密密钥（用于读取现有数据）
            old_key = self.encryption_key
            
            # 读取现有数据（使用旧密钥）
            servers = []
            settings = {}
            
            if os.path.exists(DATA_FILE):
                try:
                    servers = self.get_servers()
                except:
                    servers = []
            
            if os.path.exists(SETTINGS_FILE):
                try:
                    settings = self.get_settings()
                except:
                    settings = {}
            
            # 删除密码文件
            if os.path.exists(AUTH_FILE):
                os.remove(AUTH_FILE)
            
            # 清除加密密钥，使用默认加密
            self.encryption_key = None
            
            # 重新保存数据（使用默认加密）
            if servers:
                self._save_file(servers)
            
            if settings:
                self.save_settings(settings)
            
            return True
        except Exception as e:
            return False


    def update_setting(self, key, value):
        """更新单个设置项（自动保存）"""
        settings = self.get_settings()
        settings[key] = value
        return self.save_settings(settings)

    # --- HTTP Server for Puter/Localhost ---
    def start_local_server(self, port=19429):
        # 简单的 HTTP 服务器，绑定到 127.0.0.1
        # 允许跨域以便调试 (虽然同源不需要)
        class CORSRequestHandler(http.server.SimpleHTTPRequestHandler):
            def end_headers(self):
                self.send_header('Access-Control-Allow-Origin', '*')
                super().end_headers()
            
            # 禁止缓存，避免开发时的问题
            def send_response(self, code, message=None):
                super().send_response(code, message)
                self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
            
            # 禁用日志输出
            def log_message(self, format, *args):
                # 静默处理所有日志，不输出到控制台
                pass
            
            # 处理 favicon.ico 请求，避免 404 错误
            def do_GET(self):
                if self.path == '/favicon.ico':
                    self.send_response(204)  # No Content
                    self.end_headers()
                    return
                super().do_GET()
        
        # 切换到资源目录以便服务静态文件
        if getattr(sys, 'frozen', False):
            # 打包后，资源在 _MEIPASS 临时目录
            resource_dir = sys._MEIPASS
        else:
            resource_dir = BASE_DIR
        os.chdir(resource_dir)
        
        try:
            handler = CORSRequestHandler
            # 允许重用端口
            socketserver.TCPServer.allow_reuse_address = True
            with socketserver.TCPServer(("127.0.0.1", port), handler) as httpd:
                httpd.serve_forever()
        except OSError:
            # 静默处理端口占用错误
            pass

    # --- SSH 逻辑 ---
    def ssh_connect(self, server_id):
        if server_id in self.ssh_clients:
            return True

        servers = self.get_servers()
        server = next((s for s in servers if s['id'] == server_id), None)
        if not server:
            return False

        def ssh_thread():
            try:
                client = paramiko.SSHClient()
                client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
                
                try:
                    # 根据验证方式连接
                    if server.get('auth') == 'key':
                        # 使用私钥连接
                        key_content = server.get('keyContent')
                        key_passphrase = server.get('keyPassphrase')
                        
                        if key_content:
                            # 从内容创建私钥
                            import io
                            key_file = io.StringIO(key_content)
                            try:
                                # 尝试不同的私钥格式
                                try:
                                    pkey = paramiko.RSAKey.from_private_key(key_file, password=key_passphrase or None)
                                except paramiko.ssh_exception.SSHException:
                                    key_file.seek(0)
                                    try:
                                        pkey = paramiko.DSSKey.from_private_key(key_file, password=key_passphrase or None)
                                    except paramiko.ssh_exception.SSHException:
                                        key_file.seek(0)
                                        try:
                                            pkey = paramiko.ECDSAKey.from_private_key(key_file, password=key_passphrase or None)
                                        except paramiko.ssh_exception.SSHException:
                                            key_file.seek(0)
                                            pkey = paramiko.Ed25519Key.from_private_key(key_file, password=key_passphrase or None)
                                
                                client.connect(
                                    server['host'], 
                                    port=int(server['port']), 
                                    username=server['user'], 
                                    pkey=pkey,
                                    timeout=10
                                )
                            except Exception as e:
                                raise Exception(f"私钥验证失败: {str(e)}")
                        else:
                            raise Exception("未找到私钥内容")
                    else:
                        # 使用密码连接
                        client.connect(
                            server['host'], 
                            port=int(server['port']), 
                            username=server['user'], 
                            password=server.get('password'),
                            timeout=10
                        )
                except (paramiko.ssh_exception.SSHException, 
                        paramiko.ssh_exception.AuthenticationException,
                        paramiko.ssh_exception.BadHostKeyException,
                        paramiko.ssh_exception.NoValidConnectionsError,
                        OSError, socket.error, Exception) as e:
                    # 捕获所有连接异常，发送错误状态给前端
                    self._emit('ssh_connection_error', {'id': server_id, 'message': str(e)})
                    self._emit('ssh_output', {'id': server_id, 'data': f'\r\n连接错误: {str(e)}\r\n'})
                    return
                
                # 检测操作系统类型
                detected_os = self._detect_os(client)
                if detected_os and detected_os != server.get('os'):
                    # 更新服务器数据中的os字段
                    self.update_server(server_id, {'os': detected_os})
                    server['os'] = detected_os
                    # 通知前端系统已检测
                    self._emit('server_os_detected', {'id': server_id, 'os': detected_os})
                
                channel = client.invoke_shell(term='xterm-256color', width=80, height=24)
                self.ssh_clients[server_id] = {'client': client, 'channel': channel}
                
                # Auto-clear MOTD: Wait briefly for initial output then clear
                # New logic: Buffer until we see the clear result or timeout
                channel.send('clear\n')
                
                initial_buffer = b""
                start_time = time.time()
                motd_cleared = False
                
                # Wait for clear effect (max 1s)
                while time.time() - start_time < 1.0:
                    r, w, x = select.select([channel], [], [], 0.1)
                    if channel in r:
                        if channel.recv_ready():
                            data = channel.recv(8192)
                            initial_buffer += data
                            # Look for standard clear screen sequence
                            if b'\x1b[H\x1b[2J' in initial_buffer or b'\x1b[2J' in initial_buffer:
                                motd_cleared = True
                                break
                    elif channel.exit_status_ready():
                        break
                
                # Process the initial buffer
                text = initial_buffer.decode('utf-8', errors='ignore')
                clean_text = text
                
                if motd_cleared:
                    # Try to strip everything before the last clear sequence
                    if '\x1b[2J' in text:
                        parts = text.split('\x1b[2J')
                        clean_text = '\x1b[2J' + parts[-1]
                    elif '\x1b[H\x1b[2J' in text:
                        parts = text.split('\x1b[H\x1b[2J')
                        clean_text = '\x1b[H\x1b[2J' + parts[-1]
                
                # Emit the cleaned initial output
                if clean_text:
                    self._emit('ssh_output', {'id': server_id, 'data': clean_text})

                # Use incremental decoder to handle multi-byte characters correctly
                decoder = codecs.getincrementaldecoder("utf-8")(errors='replace')

                while True:
                    # Optimize IO loop with select
                    r, w, x = select.select([channel], [], [], 0.1)
                    if channel in r:
                        try:
                            if channel.recv_ready():
                                # Increased buffer size for better throughput
                                raw_data = channel.recv(8192)
                                if raw_data:
                                    data = decoder.decode(raw_data, final=False)
                                    if data:
                                        self._emit('ssh_output', {'id': server_id, 'data': data})
                            if channel.exit_status_ready():
                                break
                        except (Exception, paramiko.ssh_exception.SSHException, OSError, socket.error) as e:
                            # 静默处理连接错误，不显示traceback
                            self._emit('ssh_output', {'id': server_id, 'data': f'\r\nError: {str(e)}\r\n'})
                            break
                    elif channel.exit_status_ready():
                        break
                    # Short sleep removed as select handles waiting efficiently
            except (Exception, paramiko.ssh_exception.SSHException, OSError, socket.error) as e:
                # 捕获所有异常，包括paramiko异常，避免显示traceback
                self._emit('ssh_output', {'id': server_id, 'data': f'\r\nError: {str(e)}\r\n'})
            finally:
                self.ssh_close(server_id)

        t = threading.Thread(target=ssh_thread)
        t.daemon = True
        t.start()
        return True

    def ssh_send(self, server_id, data):
        """立即发送数据到SSH通道，不延迟"""
        if server_id in self.ssh_clients:
            try:
                channel = self.ssh_clients[server_id]['channel']
                # 直接发送，不缓冲
                channel.send(data)
            except Exception:
                pass

    def ssh_resize(self, server_id, cols, rows):
        if server_id in self.ssh_clients:
            try:
                self.ssh_clients[server_id]['channel'].resize_pty(width=cols, height=rows)
            except Exception:
                pass

    def ssh_close(self, server_id):
        if server_id in self.ssh_clients:
            try:
                self.ssh_clients[server_id]['client'].close()
            except:
                pass
            try:
                del self.ssh_clients[server_id]
            except KeyError:
                pass
            self._emit('ssh_disconnect', {'id': server_id})

    def test_connection(self, data):
        # 独立的测试连接逻辑，不影响现有会话
        try:
            client = paramiko.SSHClient()
            client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            try:
                # 根据验证方式连接
                if data.get('auth') == 'key':
                    # 使用私钥连接
                    key_content = data.get('keyContent')
                    key_passphrase = data.get('keyPassphrase')
                    
                    if key_content:
                        # 从内容创建私钥
                        import io
                        key_file = io.StringIO(key_content)
                        try:
                            # 尝试不同的私钥格式
                            try:
                                pkey = paramiko.RSAKey.from_private_key(key_file, password=key_passphrase or None)
                            except paramiko.ssh_exception.SSHException:
                                key_file.seek(0)
                                try:
                                    pkey = paramiko.DSSKey.from_private_key(key_file, password=key_passphrase or None)
                                except paramiko.ssh_exception.SSHException:
                                    key_file.seek(0)
                                    try:
                                        pkey = paramiko.ECDSAKey.from_private_key(key_file, password=key_passphrase or None)
                                    except paramiko.ssh_exception.SSHException:
                                        key_file.seek(0)
                                        pkey = paramiko.Ed25519Key.from_private_key(key_file, password=key_passphrase or None)
                            
                            client.connect(
                                data['host'], 
                                port=int(data['port']), 
                                username=data['user'], 
                                pkey=pkey,
                                timeout=5
                            )
                        except Exception as e:
                            return {'success': False, 'message': f'私钥验证失败: {str(e)}'}
                    else:
                        return {'success': False, 'message': '未找到私钥内容'}
                else:
                    # 使用密码连接
                    client.connect(
                        data['host'], 
                        port=int(data['port']), 
                        username=data['user'], 
                        password=data.get('password'),
                        timeout=5
                    )
                client.close()
                return {'success': True, 'message': '连接成功'}
            except (paramiko.ssh_exception.SSHException, 
                    paramiko.ssh_exception.AuthenticationException,
                    paramiko.ssh_exception.BadHostKeyException,
                    paramiko.ssh_exception.NoValidConnectionsError,
                    OSError, socket.error) as e:
                # 捕获所有连接异常，返回友好的错误信息
                return {'success': False, 'message': str(e)}
        except Exception as e:
            return {'success': False, 'message': str(e)}

    # --- SFTP 逻辑 ---
    def sftp_list(self, server_id, path='.'):
        if server_id not in self.ssh_clients:
            return {'success': False, 'message': 'Not connected'}
        
        try:
            client = self.ssh_clients[server_id]['client']
            sftp = client.open_sftp()
            
            # Normalize path
            if path == '.':
                path = sftp.getcwd() or '/'
            
            try:
                sftp.chdir(path)
                current_path = sftp.getcwd()
            except IOError:
                return {'success': False, 'message': 'Path not found'}

            files = []
            for attr in sftp.listdir_attr(current_path):
                is_dir = (attr.st_mode & 0o40000) == 0o40000
                files.append({
                    'name': attr.filename,
                    'size': attr.st_size,
                    'mtime': attr.st_mtime,
                    'is_dir': is_dir,
                    'perm': str(attr) # simple permission string
                })
            
            # Sort: Directories first, then files
            files.sort(key=lambda x: (not x['is_dir'], x['name']))
            
            sftp.close()
            return {'success': True, 'path': current_path, 'files': files}
        except Exception as e:
            return {'success': False, 'message': str(e)}

    def sftp_download(self, server_id, remote_path, local_path):
        if server_id not in self.ssh_clients:
            return {'success': False, 'message': 'Not connected'}
        try:
            client = self.ssh_clients[server_id]['client']
            sftp = client.open_sftp()
            sftp.get(remote_path, local_path)
            sftp.close()
            return {'success': True}
        except Exception as e:
            return {'success': False, 'message': str(e)}

    def sftp_upload(self, server_id, local_path, remote_path):
        if server_id not in self.ssh_clients:
            return {'success': False, 'message': 'Not connected'}
        try:
            client = self.ssh_clients[server_id]['client']
            sftp = client.open_sftp()
            
            # Determine remote filename if destination is a directory
            try:
                attrs = sftp.stat(remote_path)
                if (attrs.st_mode & 0o40000) == 0o40000:
                    filename = os.path.basename(local_path)
                    remote_path = os.path.join(remote_path, filename).replace('\\', '/')
            except IOError:
                pass # Path doesn't exist or not a dir, assume it's the full path
                
            sftp.put(local_path, remote_path)
            sftp.close()
            return {'success': True}
        except Exception as e:
            return {'success': False, 'message': str(e)}

    def sftp_delete(self, server_id, path, is_dir=False):
        if server_id not in self.ssh_clients:
            return {'success': False, 'message': 'Not connected'}
        try:
            client = self.ssh_clients[server_id]['client']
            sftp = client.open_sftp()
            if is_dir:
                sftp.rmdir(path)
            else:
                sftp.remove(path)
            sftp.close()
            return {'success': True}
        except Exception as e:
            return {'success': False, 'message': str(e)}

    # --- Dialog Wrappers ---
    def sftp_read_text(self, server_id, path):
        if server_id not in self.ssh_clients:
            return {'success': False, 'message': 'Not connected'}
        try:
            client = self.ssh_clients[server_id]['client']
            sftp = client.open_sftp()
            # Check size to prevent reading huge files
            try:
                attr = sftp.stat(path)
                if attr.st_size > 1024 * 1024 * 2: # Limit 2MB
                    sftp.close()
                    return {'success': False, 'message': 'File too large to edit (max 2MB)'}
            except:
                pass

            with sftp.open(path, 'r') as f:
                # Using read() directly returns bytes, need to decode
                data = f.read()
                try:
                    content = data.decode('utf-8')
                except UnicodeDecodeError:
                    sftp.close()
                    return {'success': False, 'message': 'Binary or non-UTF-8 file'}
            
            sftp.close()
            return {'success': True, 'content': content}
        except Exception as e:
            return {'success': False, 'message': str(e)}

    def sftp_write_text(self, server_id, path, content):
        if server_id not in self.ssh_clients:
            return {'success': False, 'message': 'Not connected'}
        try:
            client = self.ssh_clients[server_id]['client']
            sftp = client.open_sftp()
            with sftp.open(path, 'w') as f:
                f.write(content.encode('utf-8'))
            sftp.close()
            return {'success': True}
        except Exception as e:
            return {'success': False, 'message': str(e)}

    def download_file_dialog(self, server_id, remote_path):
        if not self._window: return
        filename = os.path.basename(remote_path)
        file_types = ('All files (*.*)',)
        save_path = self._window.create_file_dialog(webview.SAVE_DIALOG, directory='', save_filename=filename, file_types=file_types)
        
        if save_path and isinstance(save_path, (str, list)):
            # pywebview returns string or list depending on version/os
            path = save_path if isinstance(save_path, str) else save_path[0]
            return self.sftp_download(server_id, remote_path, path)
        return {'success': False, 'message': 'Cancelled'}

    def upload_file_dialog(self, server_id, remote_path):
        if not self._window: return
        file_types = ('All files (*.*)',)
        files = self._window.create_file_dialog(webview.OPEN_DIALOG, allow_multiple=False, file_types=file_types)
        
        if files and len(files) > 0:
            local_path = files[0]
            return self.sftp_upload(server_id, local_path, remote_path)
        return {'success': False, 'message': 'Cancelled'}

    # --- Real-time Stats ---
    def get_server_real_stats(self, server_id):
        if server_id not in self.ssh_clients:
            return None
        try:
            client = self.ssh_clients[server_id]['client']
            
            # Get CPU usage using top command (more accurate)
            stdin, stdout, stderr = client.exec_command("top -bn1 | grep 'Cpu(s)' | awk '{print $2+$4}' | sed 's/%//'")
            cpu_percent_str = stdout.read().decode().strip()
            try:
                cpu_percent = float(cpu_percent_str) if cpu_percent_str else 0
            except:
                # Fallback to /proc/stat method
                stdin, stdout, stderr = client.exec_command("grep 'cpu ' /proc/stat | awk '{usage=($2+$4)*100/($2+$4+$5)} END {print usage}'")
                cpu_percent = float(stdout.read().decode().strip() or 0)
            
            # Get CPU cores
            stdin, stdout, stderr = client.exec_command("nproc")
            cpu_cores = int(stdout.read().decode().strip() or 1)
            
            # Get CPU used cores (approximate)
            cpu_used_cores = round(cpu_cores * cpu_percent / 100, 1)
            
            # Get Memory using free -h and convert to MB
            stdin, stdout, stderr = client.exec_command("free -m | awk 'NR==2{print $2\" \"$3\" \"$7}'")
            mem_info = stdout.read().decode().strip().split()
            mem_total_mb = int(mem_info[0]) if len(mem_info) > 0 and mem_info[0].isdigit() else 0
            mem_used_mb = int(mem_info[1]) if len(mem_info) > 1 and mem_info[1].isdigit() else 0
            mem_percent = float(mem_used_mb * 100 / mem_total_mb) if mem_total_mb > 0 else 0
            
            # Get Disk using df -h (more compatible)
            stdin, stdout, stderr = client.exec_command("df -h / | awk 'NR==2{print $2\" \"$3\" \"$5}'")
            disk_info = stdout.read().decode().strip().split()
            
            # Parse disk size (handle G, T, M suffixes)
            def parse_size(size_str):
                if not size_str:
                    return 0
                size_str = size_str.upper().strip()
                if size_str.endswith('G'):
                    return float(size_str[:-1])
                elif size_str.endswith('T'):
                    return float(size_str[:-1]) * 1024
                elif size_str.endswith('M'):
                    return float(size_str[:-1]) / 1024
                else:
                    try:
                        return float(size_str) / 1024  # Assume MB, convert to GB
                    except:
                        return 0
            
            disk_total_gb = parse_size(disk_info[0]) if len(disk_info) > 0 else 0
            disk_used_gb = parse_size(disk_info[1]) if len(disk_info) > 1 else 0
            disk_percent = float(disk_info[2].replace('%', '')) if len(disk_info) > 2 else 0
            
            # Get Network interface name (try common names)
            stdin, stdout, stderr = client.exec_command("ip route | grep default | awk '{print $5}' | head -1")
            iface = stdout.read().decode().strip()
            if not iface:
                # Fallback: find first non-loopback interface
                stdin, stdout, stderr = client.exec_command("cat /proc/net/dev | grep -vE 'lo|docker|veth|br-|virbr' | awk 'NR>2 {if ($2+$10 > 0) {print $1; exit}}' | sed 's/://'")
                iface = stdout.read().decode().strip()
            if not iface:
                iface = 'eth0'  # Default fallback
            
            # Get network stats - first reading
            stdin, stdout, stderr = client.exec_command(f"cat /proc/net/dev | grep '{iface}:' | awk '{{print $2\" \"$10}}'")
            net_info1 = stdout.read().decode().strip().split()
            try:
                rx_bytes1 = int(net_info1[0]) if len(net_info1) > 0 and net_info1[0].isdigit() else 0
                tx_bytes1 = int(net_info1[1]) if len(net_info1) > 1 and net_info1[1].isdigit() else 0
            except:
                rx_bytes1 = 0
                tx_bytes1 = 0
            
            # Wait 1 second
            time.sleep(1)
            
            # Get network stats - second reading
            stdin, stdout, stderr = client.exec_command(f"cat /proc/net/dev | grep '{iface}:' | awk '{{print $2\" \"$10}}'")
            net_info2 = stdout.read().decode().strip().split()
            try:
                rx_bytes2 = int(net_info2[0]) if len(net_info2) > 0 and net_info2[0].isdigit() else 0
                tx_bytes2 = int(net_info2[1]) if len(net_info2) > 1 and net_info2[1].isdigit() else 0
            except:
                rx_bytes2 = 0
                tx_bytes2 = 0
            
            # Calculate speed in KB/s (MB/s * 1024 = KB/s)
            rx_speed_mb = max(0, (rx_bytes2 - rx_bytes1) / 1024.0 / 1024.0)
            tx_speed_mb = max(0, (tx_bytes2 - tx_bytes1) / 1024.0 / 1024.0)
            rx_speed_kb = rx_speed_mb * 1024
            tx_speed_kb = tx_speed_mb * 1024
            
            return {
                'cpu': int(cpu_percent),
                'cpu_cores': cpu_cores,
                'cpu_used_cores': cpu_used_cores,
                'mem': int(mem_percent),
                'mem_total_mb': mem_total_mb,
                'mem_used_mb': mem_used_mb,
                'disk': int(disk_percent),
                'disk_total_gb': round(disk_total_gb, 2),
                'disk_used_gb': round(disk_used_gb, 2),
                'net_rx_speed_kb': round(rx_speed_kb, 2),
                'net_tx_speed_kb': round(tx_speed_kb, 2)
            }
        except Exception as e:
            import traceback
            traceback.print_exc()
            return None

    def _detect_os(self, client):
        """检测远程系统的操作系统类型"""
        try:
            # 方法1: 检查 /etc/os-release (最可靠)
            stdin, stdout, stderr = client.exec_command("cat /etc/os-release 2>/dev/null || echo ''")
            os_release = stdout.read().decode('utf-8', errors='ignore').lower()
            
            if 'ubuntu' in os_release:
                return 'ubuntu'
            elif 'debian' in os_release:
                return 'debian'
            elif 'centos' in os_release:
                return 'centos'
            elif 'fedora' in os_release:
                return 'fedora'
            elif 'alpine' in os_release:
                return 'alpine'
            elif 'arch' in os_release:
                return 'arch'
            elif 'opensuse' in os_release or 'suse' in os_release:
                return 'opensuse'
            elif 'redhat' in os_release or 'rhel' in os_release:
                return 'redhat'
            elif 'rocky' in os_release:
                return 'rocky'
            elif 'almalinux' in os_release:
                return 'almalinux'
            
            # 方法2: 检查 /etc/issue (备用方法)
            stdin, stdout, stderr = client.exec_command("cat /etc/issue 2>/dev/null | head -1")
            issue = stdout.read().decode('utf-8', errors='ignore').lower()
            
            if 'ubuntu' in issue:
                return 'ubuntu'
            elif 'debian' in issue:
                return 'debian'
            elif 'centos' in issue:
                return 'centos'
            elif 'fedora' in issue:
                return 'fedora'
            
            # 方法3: 检查 uname (最后备用)
            stdin, stdout, stderr = client.exec_command("uname -a")
            uname = stdout.read().decode('utf-8', errors='ignore').lower()
            
            if 'ubuntu' in uname:
                return 'ubuntu'
            elif 'debian' in uname:
                return 'debian'
            
            # 默认返回linux
            return 'linux'
        except Exception:
            return 'linux'
    
    def _emit(self, event, data):
        # 通过 pywebview 执行 JS
        if self._window:
            # 这里的 json.dumps 需要处理，简单起见直接传 dict
            # pywebview 的 evaluate_js 可以接受字符串
            js = f"window.dispatchEvent(new CustomEvent('{event}', {{detail: {json.dumps(data)}}}));"
            self._window.evaluate_js(js)

    def set_titlebar_theme(self, theme):
        # theme: 'dark', 'light', 'glass_dark', 'glass_light'
        window_title = "Fishell"
        hwnd = ctypes.windll.user32.FindWindowW(None, window_title)
        if not hwnd: return
        
        dwmapi = ctypes.windll.dwmapi
        DWMWA_COLOR_NONE = 0xFFFFFFFE
        
        dark_mode = True
        caption_color = colorref(10, 10, 10)
        text_color = colorref(255, 255, 255)
        
        if theme == 'light':
            dark_mode = False
            caption_color = colorref(243, 243, 243) # Match solid-mode light bg
            text_color = colorref(0, 0, 0)
        elif theme == 'glass_light':
            dark_mode = False
            # Use DWMWA_COLOR_NONE to let Acrylic/Mica show through
            caption_color = DWMWA_COLOR_NONE 
            text_color = colorref(0, 0, 0)
        elif theme == 'glass_dark':
             dark_mode = True
             caption_color = DWMWA_COLOR_NONE
             text_color = colorref(255, 255, 255)
        elif theme == 'dark':
             dark_mode = True
             caption_color = colorref(10, 10, 10)
             text_color = colorref(255, 255, 255)
             
        # Apply Dark Mode
        val = ctypes.c_int(1 if dark_mode else 0)
        dwmapi.DwmSetWindowAttribute(hwnd, DWMWA_USE_IMMERSIVE_DARK_MODE, ctypes.byref(val), ctypes.sizeof(val))
        
        # Apply Caption Color
        # Note: DWMWA_COLOR_NONE is a DWORD, colorref returns DWORD. 
        # We need to handle the type correctly.
        if caption_color == DWMWA_COLOR_NONE:
             cc = wintypes.DWORD(DWMWA_COLOR_NONE)
        else:
             cc = caption_color
             
        dwmapi.DwmSetWindowAttribute(hwnd, DWMWA_CAPTION_COLOR, ctypes.byref(cc), ctypes.sizeof(cc))
        
        # Apply Text Color
        dwmapi.DwmSetWindowAttribute(hwnd, DWMWA_TEXT_COLOR, ctypes.byref(text_color), ctypes.sizeof(text_color))

    def set_prevent_screenshot(self, enable):
        """启用/禁用防止截图和录屏功能（Windows 10 1903+）"""
        if sys.platform != 'win32':
            return {'success': False, 'message': '此功能仅支持 Windows 系统'}
        
        try:
            window_title = "Fishell"
            user32 = ctypes.windll.user32
            
            # 查找窗口句柄
            hwnd = user32.FindWindowW(None, window_title)
            if not hwnd:
                return {'success': False, 'message': '未找到窗口'}
            
            # 设置 SetWindowDisplayAffinity
            # 这个API在 Windows 10 1903 (19H1) 及更高版本可用
            try:
                if enable:
                    # 启用防止截图/录屏
                    result = user32.SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE)
                else:
                    # 禁用防止截图/录屏
                    result = user32.SetWindowDisplayAffinity(hwnd, WDA_NONE)
                
                if result:
                    return {'success': True, 'message': '设置成功'}
                else:
                    # 如果API调用失败，可能是系统版本不支持
                    error_code = ctypes.windll.kernel32.GetLastError()
                    if error_code == 87:  # ERROR_INVALID_PARAMETER
                        return {'success': False, 'message': '系统版本不支持此功能（需要 Windows 10 1903 或更高版本）'}
                    return {'success': False, 'message': f'设置失败，错误代码: {error_code}'}
            except AttributeError:
                # SetWindowDisplayAffinity 可能在某些Windows版本中不可用
                return {'success': False, 'message': '系统版本不支持此功能（需要 Windows 10 1903 或更高版本）'}
        except Exception as e:
            return {'success': False, 'message': f'设置失败: {str(e)}'}

def configure_window_style():
    # 给窗口一点时间初始化
    time.sleep(0.5)
    
    window_title = "Fishell"
    hwnd = ctypes.windll.user32.FindWindowW(None, window_title)
    
    if hwnd:
        dwmapi = ctypes.windll.dwmapi
        
        # 1. 启用沉浸式暗黑模式 (绘制暗色边框)
        val = ctypes.c_int(1)
        dwmapi.DwmSetWindowAttribute(hwnd, DWMWA_USE_IMMERSIVE_DARK_MODE, ctypes.byref(val), ctypes.sizeof(val))
        
        # 2. 设置标题栏颜色为更深的黑色 #000000 (RGB: 0, 0, 0)
        caption_color = colorref(0, 0, 0)
        dwmapi.DwmSetWindowAttribute(hwnd, DWMWA_CAPTION_COLOR, ctypes.byref(caption_color), ctypes.sizeof(caption_color))
        
        # 3. 设置标题文字颜色 White (RGB: 255, 255, 255)
        text_color = colorref(255, 255, 255)
        dwmapi.DwmSetWindowAttribute(hwnd, DWMWA_TEXT_COLOR, ctypes.byref(text_color), ctypes.sizeof(text_color))

        # 4. 应用毛玻璃/Mica 效果
        apply_acrylic(hwnd)

if __name__ == '__main__':
    api = Bridge()
    
    # 启动本地 HTTP 服务器线程
    # 这解决了 Puter.js 需要 Origin 和可能的跨域问题，并允许通过 localhost 访问
    server_thread = threading.Thread(target=api.start_local_server, args=(19429,), daemon=True)
    server_thread.start()
    
    # 使用本地服务器 URL
    url = 'http://127.0.0.1:19429/index.html'
    
    # 创建窗口时关闭 frameless，启用原生标题栏
    window = webview.create_window(
        'Fishell', 
        url=url,
        js_api=api,
        width=1400, 
        height=900, 
        background_color='#000000', # 修复: pywebview 不支持 8 位 Hex，配合 transparent=True 使用
        transparent=True, # 开启透明支持
        frameless=False,  # 改为 False，使用原生窗口
        easy_drag=False,  # 关闭内容区域拖拽，使用原生标题栏拖拽
        resizable=True
    )
    api.set_window(window)
    
    try:
        # 尝试不同的后端
        webview.start(func=configure_window_style, debug=False)
    except Exception as e:
        # 显示错误
        import traceback
        error_msg = traceback.format_exc()
        print(f"启动错误: {error_msg}")
        try:
            import ctypes
            ctypes.windll.user32.MessageBoxW(0, f"启动失败:\n{str(e)}", "Fishell 错误", 0x10)
        except:
            pass
