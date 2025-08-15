const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Selección de archivos
  selectFile: (options) => ipcRenderer.invoke('select-file', options),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  
  // Configuración
  readConfig: () => ipcRenderer.invoke('read-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  
  // Operaciones de base de datos
  copyDatabase: (source, destination) => ipcRenderer.invoke('copy-database', source, destination),
  
  // Conexiones Firebird (Python Bridge)
  connectFirebird: (config) => ipcRenderer.invoke('connect-firebird', config),
  executeFirebirdQuery: (config, query, params) => ipcRenderer.invoke('execute-firebird-query', config, query, params),
  executeFirebirdNonQuery: (config, query, params) => ipcRenderer.invoke('execute-firebird-nonquery', config, query, params),
  processFacturas: (processConfig, pathConfig, dbConfig) => ipcRenderer.invoke('process-facturas', processConfig, pathConfig, dbConfig),
  
  // Conexión MySQL (placeholder)
  connectMySQL: (config) => ipcRenderer.invoke('connect-mysql', config)
});