// Native
const { join } = require('path');

// Packages
const { BrowserWindow, app, Tray, dialog } = require('electron');
const isDev = require('electron-is-dev');
const prepareNext = require('electron-next');
const log = require('electron-log');

const prepareIpc = require('./ipc');
const getContextMenu = require('./context-menu');

process.on('uncaughtException', error => {
  console.error(error);
  log.error(error);

  dialog.showMessageBox({
    title: 'Unexpected Error',
    type: 'error',
    message: 'An Error Has Occurred',
    detail: error.toString(),
    buttons: ['Quit Now']
  });

  process.exit(1);
});

process.on('unhandledRejection', error => {
  console.error(error);
  log.error(error);

  dialog.showMessageBox({
    title: 'Unexpected Error',
    type: 'error',
    message: 'An Error Has Occurred',
    detail: error.toString(),
    buttons: ['Quit Now']
  });

  process.exit(1);
});

// Prepare the renderer once the app is ready
app.on('ready', async () => {
  await prepareNext('./renderer');

  const mainWindow = new BrowserWindow({
    width: 800,
    height: 700,
    icon: join(__dirname, 'static/icons/icon.png'),
    webPreferences: {
      nodeIntegration: true,
      webSecurity: false,
      contextIsolation: false,
      preload: join(__dirname, 'preload.js')
    }
  });

  const tray = new Tray(join(__dirname, 'static/icons/icon.png'));

  const gotInstanceLock = app.requestSingleInstanceLock();

  if (!gotInstanceLock) {
    // We're using `exit` because `quit` didn't work
    // on Windows (tested by matheus)
    return app.exit();
  }

  app.on('before-quit', () => {
    mainWindow.destroy();
  });

  mainWindow.on('close', event => {
    event.preventDefault();
    mainWindow.hide();
  });

  const toggleActivity = () => {
    const isVisible = mainWindow.isVisible();
    const isWin = process.platform === 'win32';

    if (!isWin && isVisible && !mainWindow.isFocused()) {
      mainWindow.focus();
      return;
    }

    if (isVisible) {
      mainWindow.close();
    } else {
      mainWindow.show();
    }
  };

  tray.on('double-click', toggleActivity);

  let submenuShown = false;
  const func = prepareIpc(app);
  const menu = await getContextMenu(func);
  tray.on('right-click', async event => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
      return;
    }

    // Toggle submenu
    tray.popUpContextMenu(submenuShown ? null : menu);
    submenuShown = !submenuShown;

    event.preventDefault();
  });

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  const url = isDev
    ? 'http://localhost:8000/start'
    : `${app.getAppPath()}/renderer/out/start.html`;

  mainWindow.setMenu(null);
  mainWindow.loadURL(url);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
