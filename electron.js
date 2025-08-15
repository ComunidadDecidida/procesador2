const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const { spawn } = require('child_process');

// Configuración de la aplicación
const isDev = process.env.NODE_ENV === 'development';
const isPackaged = app.isPackaged;

let mainWindow;

// Configuración de rutas
const getResourcePath = (relativePath) => {
  if (isPackaged) {
    // Buscar primero en extraResources (carpeta powershell-bridge)
    const extraResourcesPath = path.join(process.resourcesPath, relativePath);
    if (fs.existsSync(extraResourcesPath)) {
      return extraResourcesPath;
    }
    // Si no existe, buscar en app.asar
    const appPath = path.join(process.resourcesPath, 'app', relativePath);
    if (fs.existsSync(appPath)) {
      return appPath;
    }
    // Fallback a extraResources
    return extraResourcesPath;
  }
  return path.join(__dirname, relativePath);
};

const getConfigPath = () => {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'vigencias-config.json');
};

// Crear ventana principal
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true
    },
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    show: false,
    titleBarStyle: 'default',
    autoHideMenuBar: true
  });

  // Cargar la aplicación
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  // Mostrar ventana cuando esté lista
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Manejar cierre de ventana
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Prevenir navegación externa
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    if (parsedUrl.origin !== 'http://localhost:5173' && parsedUrl.origin !== 'file://') {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    }
  });
}

// Configuración de la aplicación
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

// Funciones de utilidad
function logMessage(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    data: data ? JSON.stringify(data, null, 2) : null
  };
  
  console.log(`[${timestamp}] [${level}] ${message}`, data || '');
  
  // Enviar log a la ventana principal si está disponible
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('log-message', logEntry);
  }
}

// Función para ejecutar PowerShell con permisos elevados
async function executePowerShellScript(operation, params = {}) {
  return new Promise((resolve, reject) => {
    try {
      const scriptPath = getResourcePath('powershell-bridge/FirebirdBridge.ps1');
      
      if (!fs.existsSync(scriptPath)) {
        throw new Error(`Script PowerShell no encontrado: ${scriptPath}`);
      }

      // Construir argumentos para PowerShell
      const args = [
        '-ExecutionPolicy', 'Bypass',
        '-NoProfile',
        '-WindowStyle', 'Hidden',
        '-File', scriptPath,
        '-Operation', operation
      ];

      // Agregar parámetros específicos
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          args.push(`-${key}`);
          if (typeof value === 'object') {
            args.push(JSON.stringify(value));
          } else {
            args.push(value.toString());
          }
        }
      });

      logMessage('INFO', `Ejecutando PowerShell: ${operation}`, { args });

      const powershell = spawn('powershell.exe', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
        timeout: 600000, // 10 minutos para operaciones largas
        shell: false
      });

      let stdout = '';
      let stderr = '';

      powershell.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      powershell.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      powershell.on('close', (code) => {
        try {
          if (code === 0 && stdout.trim()) {
            // Buscar el último bloque JSON válido en la salida
            const jsonBlocks = stdout.match(/\{(?:.|\r?\n)*\}/g);
            if (jsonBlocks && jsonBlocks.length > 0) {
              const lastJsonBlock = jsonBlocks[jsonBlocks.length - 1];
              const result = JSON.parse(lastJsonBlock);
              logMessage('SUCCESS', `PowerShell ${operation} completado`, result);
              resolve(result);
            } else {
              // Si no hay JSON válido, devolver respuesta simple
              resolve({ success: true, message: stdout.trim(), method: 'PowerShell' });
            }
          } else {
            const errorMsg = stderr || `PowerShell terminó con código ${code}`;
            logMessage('ERROR', `PowerShell ${operation} falló`, { code, stderr, stdout });
            resolve({ success: false, error: errorMsg, method: 'PowerShell' });
          }
        } catch (parseError) {
          logMessage('ERROR', `Error parseando respuesta PowerShell`, { parseError: parseError.message, stdout });
          resolve({ success: false, error: `Error parseando respuesta: ${parseError.message}`, method: 'PowerShell' });
        }
      });

      powershell.on('error', (error) => {
        logMessage('ERROR', `Error ejecutando PowerShell`, error);
        resolve({ success: false, error: error.message, method: 'PowerShell' });
      });

    } catch (error) {
      logMessage('ERROR', `Error preparando PowerShell`, error);
      reject(error);
    }
  });
}

// Manejadores IPC
ipcMain.handle('select-file', async (event, options = {}) => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: options.title || 'Seleccionar archivo',
      filters: options.filters || [
        { name: 'Todos los archivos', extensions: ['*'] }
      ],
      properties: ['openFile']
    });

    if (result.canceled) {
      return null;
    }

    return result.filePaths[0];
  } catch (error) {
    logMessage('ERROR', 'Error seleccionando archivo', error);
    throw error;
  }
});

ipcMain.handle('select-directory', async (event) => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Seleccionar directorio',
      properties: ['openDirectory']
    });

    if (result.canceled) {
      return null;
    }

    return result.filePaths[0];
  } catch (error) {
    logMessage('ERROR', 'Error seleccionando directorio', error);
    throw error;
  }
});

ipcMain.handle('read-config', async (event) => {
  try {
    const configPath = getConfigPath();
    
    if (fs.existsSync(configPath)) {
      const config = await fs.readJson(configPath);
      logMessage('INFO', 'Configuración cargada exitosamente');
      return config;
    }
    
    return null;
  } catch (error) {
    logMessage('ERROR', 'Error leyendo configuración', error);
    throw error;
  }
});

ipcMain.handle('save-config', async (event, config) => {
  try {
    const configPath = getConfigPath();
    await fs.ensureDir(path.dirname(configPath));
    await fs.writeJson(configPath, config, { spaces: 2 });
    logMessage('INFO', 'Configuración guardada exitosamente');
    return true;
  } catch (error) {
    logMessage('ERROR', 'Error guardando configuración', error);
    throw error;
  }
});

ipcMain.handle('copy-database', async (event, sourcePath, destinationPath) => {
  try {
    return await executePowerShellScript('copy_database', {
      SourcePath: sourcePath,
      DestinationPath: destinationPath
    });
  } catch (error) {
    logMessage('ERROR', 'Error copiando base de datos', error);
    return { success: false, error: error.message, method: 'PowerShell' };
  }
});

ipcMain.handle('connect-firebird', async (event, config) => {
  try {
    return await executePowerShellScript('test_connection', {
      ConfigJson: JSON.stringify(config)
    });
  } catch (error) {
    logMessage('ERROR', 'Error conectando Firebird', error);
    return { success: false, error: error.message, method: 'PowerShell' };
  }
});

ipcMain.handle('connect-mysql', async (event, config) => {
  try {
    return await executePowerShellScript('test_mysql_connection', {
      ConfigJson: JSON.stringify(config)
    });
  } catch (error) {
    logMessage('ERROR', 'Error conectando MySQL', error);
    return { success: false, error: error.message, method: 'PowerShell' };
  }
});

ipcMain.handle('execute-firebird-query', async (event, config, query, params = []) => {
  try {
    return await executePowerShellScript('execute_query', {
      ConfigJson: JSON.stringify(config),
      Query: query,
      Parameters: JSON.stringify(params)
    });
  } catch (error) {
    logMessage('ERROR', 'Error ejecutando consulta Firebird', error);
    return { success: false, error: error.message, method: 'PowerShell' };
  }
});

ipcMain.handle('execute-firebird-nonquery', async (event, config, query, params = []) => {
  try {
    return await executePowerShellScript('execute_non_query', {
      ConfigJson: JSON.stringify(config),
      Query: query,
      Parameters: JSON.stringify(params)
    });
  } catch (error) {
    logMessage('ERROR', 'Error ejecutando comando Firebird', error);
    return { success: false, error: error.message, method: 'PowerShell' };
  }
});

ipcMain.handle('process-facturas', async (event, processConfig, pathConfig, dbConfig) => {
  try {
    return await executePowerShellScript('process_facturas', {
      ConfigJson: JSON.stringify(dbConfig.firebird),
      VigenciaDia: processConfig.vigenciaDia,
      DiasFacturas: processConfig.diasFacturas,
      PalabrasExcluidas: JSON.stringify(processConfig.palabrasExcluidas),
      PalabrasConvenio: JSON.stringify(processConfig.palabrasConvenio),
      PalabrasCicloEscolar: JSON.stringify(processConfig.palabrasCicloEscolar),
      VigenciaConvenio: processConfig.vigenciaConvenio,
      VigenciaCicloEscolar: processConfig.vigenciaCicloEscolar,
      OutputPath: path.join(pathConfig.outputPath, 'carga_integra32.txt')
    });
  } catch (error) {
    logMessage('ERROR', 'Error procesando facturas', error);
    return { 
      success: false, 
      error: error.message,
      facturas_processed: 0,
      vigencias_updated: 0,
      errors: [error.message],
      method: 'PowerShell'
    };
  }
});

// Manejo de errores no capturadas
process.on('uncaughtException', (error) => {
  logMessage('CRITICAL', 'Excepción no capturada', error);
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  logMessage('CRITICAL', 'Promesa rechazada no manejada', { reason, promise });
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Información de la aplicación
logMessage('INFO', 'Aplicación iniciada', {
  version: app.getVersion(),
  platform: process.platform,
  arch: process.arch,
  isDev,
  isPackaged,
  electronVersion: process.versions.electron,
  nodeVersion: process.versions.node
});