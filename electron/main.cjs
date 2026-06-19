const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

let mainWindow;

async function loadDevURL(win, url, retries = 20, delay = 1500) {
  for (let i = 0; i < retries; i++) {
    try {
      await win.loadURL(url);
      return true;
    } catch (err) {
      console.log(`等待开发服务器...（${i + 1}/${retries}）`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  return false;
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 680,
    title: '剧本杀排位助手',
    backgroundColor: '#f1f5f9',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    const devURL = 'http://localhost:5174';
    const loaded = await loadDevURL(mainWindow, devURL);
    if (loaded) {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    } else {
      mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

const template = [
  {
    label: '文件',
    submenu: [
      { role: 'quit', label: '退出' },
    ],
  },
  {
    label: '编辑',
    submenu: [
      { role: 'undo', label: '撤销' },
      { role: 'redo', label: '重做' },
      { type: 'separator' },
      { role: 'cut', label: '剪切' },
      { role: 'copy', label: '复制' },
      { role: 'paste', label: '粘贴' },
      { role: 'selectall', label: '全选' },
    ],
  },
  {
    label: '视图',
    submenu: [
      { role: 'reload', label: '刷新' },
      { role: 'toggledevtools', label: '开发者工具' },
      { type: 'separator' },
      { role: 'resetzoom', label: '重置缩放' },
      { role: 'zoomin', label: '放大' },
      { role: 'zoomout', label: '缩小' },
      { type: 'separator' },
      { role: 'togglefullscreen', label: '全屏' },
    ],
  },
  {
    label: '工具',
    submenu: [
      {
        label: '生成排位',
        accelerator: 'Ctrl+G',
        click: () => {
          if (mainWindow) {
            mainWindow.webContents.executeJavaScript(
              'document.querySelector("button[onclick*=\'generate\']")?.click()'
            );
          }
        },
      },
      {
        label: '生成主持单',
        accelerator: 'Ctrl+H',
        click: () => {
          if (mainWindow) {
            mainWindow.webContents.executeJavaScript(
              'document.querySelector("button[onclick*=\'HostSheet\']")?.click()'
            );
          }
        },
      },
    ],
  },
  {
    label: '帮助',
    submenu: [
      {
        label: '关于',
        click: () => {
          const { dialog } = require('electron');
          dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: '关于',
            message: '剧本杀排位助手',
            detail:
              '版本 1.0.0\n\n面向高校剧本杀社团主持人的排位工具\n\n功能：\n· 玩家名单管理\n· 角色要求配置\n· 智能匹配排位\n· 拖拽互换调整\n· 一键生成主持单',
          });
        },
      },
    ],
  },
];

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);
