import React, { useState, useEffect } from 'react';
import { 
  Database, 
  FolderOpen, 
  Settings, 
  Play, 
  Monitor, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Clock,
  Server,
  HardDrive,
  Calendar,
  Users,
  Activity,
  Zap,
  RefreshCw,
  Save,
  TestTube,
  Download,
  Upload,
  Plus,
  Minus
} from 'lucide-react';

import { 
  DatabaseConfig, 
  PathConfig, 
  ProcessConfig, 
  ProcessLog, 
  ProcessStatus,
  ProcessResult,
  ElectronAPI
} from './types';

import { configManager } from './utils/config';
import { databaseService } from './services/databaseService';
import { schedulerService } from './services/schedulerService';

type TabType = 'dashboard' | 'database' | 'paths' | 'parameters' | 'monitor' | 'logs';

const App: React.FC = () => {
  // Estados principales
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isElectron] = useState(typeof window !== 'undefined' && window.electronAPI !== undefined);
  
  // Configuraciones
  const [dbConfig, setDbConfig] = useState<DatabaseConfig>({
    firebird: {
      host: 'localhost',
      database: 'C:\\Users\\Comunidad Decidida\\Desktop\\Base\\SAE80EMPRE01\\SAE90EMPRE01.FDB',
      user: 'SYSDBA',
      password: 'masterkey',
      port: '3050'
    },
    mysql: {
      host: 'comunidad-decidida-2.cfesoyykm6x4.us-west-2.rds.amazonaws.com',
      port: '3306',
      database: 'ComunidadDecidida',
      user: 'admin',
      password: 'Peaky*50'
    }
  });

  const [pathConfig, setPathConfig] = useState<PathConfig>({
    sourceDbPath: 'Z:\\Sistemas Aspel\\SAE9.00\\Empresa01\\Datos\\SAE90EMPRE01.FDB',
    localDbPath: 'C:\\Users\\Comunidad Decidida\\Desktop\\Base\\SAE80EMPRE01\\SAE90EMPRE01.FDB',
    outputPath: 'C:\\Users\\Comunidad Decidida\\Desktop\\INFORMACION_BD\\'
  });

  const [processConfig, setProcessConfig] = useState<ProcessConfig>({
    vigenciaDia: 9,
    diasFacturas: 5,
    palabrasExcluidas: ['FONDO DE RESERVA', 'FONDO', 'INSCRIP', 'INSCRIPCIÓN', 'ADELANTO', 'TARJETA', 'TARJE', 'ACCESO', 'TAG', 'APP'],
    palabrasConvenio: ['CONVENIO'],
    palabrasCicloEscolar: ['CICLO ESCOLAR'],
    vigenciaConvenio: 90,
    vigenciaCicloEscolar: 365,
    scheduledExecution: {
      enabled: false,
      time: '09:00',
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      lastExecution: null
    }
  });

  // Estados de proceso
  const [processStatus, setProcessStatus] = useState<ProcessStatus>({
    isRunning: false,
    currentStep: '',
    progress: 0,
    lastRun: null
  });

  const [logs, setLogs] = useState<ProcessLog[]>([]);
  const [connectionStatus, setConnectionStatus] = useState({
    firebird: false,
    mysql: false,
    testing: false
  });

  // Cargar configuración al iniciar
  useEffect(() => {
    loadConfiguration();
  }, []);

  // Inicializar scheduler
  useEffect(() => {
    if (processConfig.scheduledExecution.enabled) {
      schedulerService.startScheduler(processConfig, executeProcess);
    } else {
      schedulerService.stopScheduler();
    }

    return () => schedulerService.stopScheduler();
  }, [processConfig.scheduledExecution]);

  const loadConfiguration = async () => {
    try {
      const config = await configManager.loadConfig();
      if (config) {
        setDbConfig(config.database);
        setPathConfig(config.paths);
        setProcessConfig(config.process);
        addLog('Sistema', 'Configuración cargada exitosamente', 'success');
      }
    } catch (error) {
      addLog('Sistema', `Error cargando configuración: ${error.message}`, 'error');
    }
  };

  const saveConfiguration = async () => {
    try {
      await configManager.saveConfig({
        database: dbConfig,
        paths: pathConfig,
        process: processConfig,
        lastUpdated: new Date().toISOString()
      });
      addLog('Sistema', 'Configuración guardada exitosamente', 'success');
    } catch (error) {
      addLog('Sistema', `Error guardando configuración: ${error.message}`, 'error');
    }
  };

  const addLog = (process: string, message: string, status: ProcessLog['status']) => {
    const newLog: ProcessLog = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleString(),
      process,
      message,
      status
    };
    setLogs(prev => [newLog, ...prev.slice(0, 99)]); // Mantener solo 100 logs
  };

  const testConnections = async () => {
    setConnectionStatus(prev => ({ ...prev, testing: true }));
    
    addLog('Conexiones', 'Iniciando prueba de conexiones...', 'info');
    
    try {
      addLog('Conexiones', `Probando Firebird: ${dbConfig.firebird.host}:${dbConfig.firebird.port}`, 'info');
      const firebirdResult = await databaseService.testFirebirdConnection(dbConfig.firebird);
      
      addLog('Conexiones', `Probando MySQL: ${dbConfig.mysql.host}:${dbConfig.mysql.port}`, 'info');
      const mysqlResult = await databaseService.testMySQLConnection(dbConfig.mysql);
      
      setConnectionStatus({
        firebird: firebirdResult,
        mysql: mysqlResult,
        testing: false
      });

      const firebirdMsg = firebirdResult ? '✅ Conectado' : '❌ Error de conexión';
      const mysqlMsg = mysqlResult ? '✅ Conectado' : '❌ Error de conexión';
      
      addLog('Conexiones', `Firebird: ${firebirdMsg}`, firebirdResult ? 'success' : 'error');
      addLog('Conexiones', `MySQL: ${mysqlMsg}`, mysqlResult ? 'success' : 'error');
      
      const overallStatus = firebirdResult && mysqlResult ? 'success' : 
                           firebirdResult || mysqlResult ? 'warning' : 'error';
      
      addLog('Conexiones', 
        `Prueba completada - Firebird: ${firebirdResult ? 'OK' : 'Error'}, MySQL: ${mysqlResult ? 'OK' : 'Error'}`, 
        overallStatus
      );
    } catch (error) {
      setConnectionStatus(prev => ({ ...prev, testing: false }));
      addLog('Conexiones', `Error crítico probando conexiones: ${error.message}`, 'error');
      console.error('Connection test error:', error);
    }
  };

  const executeProcess = async () => {
    if (processStatus.isRunning) return;

    setProcessStatus({
      isRunning: true,
      currentStep: 'Iniciando proceso...',
      progress: 0,
      lastRun: null
    });

    addLog('Proceso', 'Iniciando procesamiento de facturas', 'info');

    try {
      // Paso 1: Copiar base de datos
      setProcessStatus(prev => ({ ...prev, currentStep: 'Copiando base de datos...', progress: 20 }));
      addLog('Proceso', 'Copiando base de datos desde origen', 'info');
      
      const copyResult = await databaseService.copyDatabase(pathConfig.sourceDbPath, pathConfig.localDbPath);
      if (!copyResult) {
        throw new Error('Error copiando base de datos');
      }

      // Paso 2: Procesar facturas
      setProcessStatus(prev => ({ ...prev, currentStep: 'Procesando facturas...', progress: 50 }));
      addLog('Proceso', 'Procesando facturas y calculando vigencias', 'info');
      
      const processResult = await databaseService.processFacturas(processConfig, pathConfig, dbConfig);
      
      if (!processResult.success) {
        throw new Error(processResult.message);
      }

      // Paso 3: Finalizar
      setProcessStatus(prev => ({ ...prev, currentStep: 'Finalizando...', progress: 90 }));
      
      const finalMessage = `Proceso completado: ${processResult.facturasProcessed} facturas procesadas, ${processResult.vigenciasUpdated} vigencias actualizadas`;
      
      setProcessStatus({
        isRunning: false,
        currentStep: 'Completado',
        progress: 100,
        lastRun: new Date().toLocaleString()
      });

      addLog('Proceso', finalMessage, 'success');

      if (processResult.errors.length > 0) {
        processResult.errors.forEach(error => {
          addLog('Proceso', `Advertencia: ${error}`, 'warning');
        });
      }

    } catch (error) {
      setProcessStatus({
        isRunning: false,
        currentStep: 'Error',
        progress: 0,
        lastRun: new Date().toLocaleString()
      });
      
      addLog('Proceso', `Error en procesamiento: ${error.message}`, 'error');
    }
  };

  const handleBrowseFile = async (type: 'sourceDb' | 'localDb' | 'output') => {
    if (!isElectron || !window.electronAPI?.selectFile) {
      addLog('Sistema', 'Función de navegación solo disponible en aplicación de escritorio', 'warning');
      return;
    }

    try {
      let selectedPath: string | null = null;
      
      if (type === 'output') {
        selectedPath = await window.electronAPI.selectDirectory();
      } else {
        selectedPath = await window.electronAPI.selectFile({
          title: 'Seleccionar archivo de base de datos',
          filters: [
            { name: 'Firebird Database', extensions: ['fdb', 'FDB'] },
            { name: 'All Files', extensions: ['*'] }
          ]
        });
      }

      if (selectedPath) {
        setPathConfig(prev => ({
          ...prev,
          [type === 'sourceDb' ? 'sourceDbPath' : 
           type === 'localDb' ? 'localDbPath' : 'outputPath']: selectedPath
        }));
      }
    } catch (error) {
      addLog('Sistema', `Error seleccionando archivo: ${error.message}`, 'error');
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            {/* Estado del Sistema */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Activity className="w-5 h-5 mr-2 text-blue-600" />
                Estado del Sistema
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${connectionStatus.firebird ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span>Firebird: {connectionStatus.firebird ? 'Conectado' : 'Desconectado'}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${connectionStatus.mysql ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span>MySQL: {connectionStatus.mysql ? 'Conectado' : 'Desconectado'}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${processStatus.isRunning ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                  <span>Proceso: {processStatus.isRunning ? 'Ejecutándose' : 'Listo'}</span>
                </div>
              </div>
              <div className="mt-4 flex space-x-3">
                <button
                  onClick={testConnections}
                  disabled={connectionStatus.testing}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
                >
                  <TestTube className="w-4 h-4 mr-2" />
                  {connectionStatus.testing ? 'Probando...' : 'Probar Conexiones'}
                </button>
                <button
                  onClick={saveConfiguration}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Guardar Configuración
                </button>
              </div>
            </div>

            {/* Control de Proceso */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Zap className="w-5 h-5 mr-2 text-orange-600" />
                Control de Proceso
              </h2>
              
              {processStatus.isRunning && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>{processStatus.currentStep}</span>
                    <span>{processStatus.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${processStatus.progress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Última Ejecución</label>
                  <p className="text-sm text-gray-600">{processStatus.lastRun || 'Nunca'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Próxima Ejecución Programada</label>
                  <p className="text-sm text-gray-600">{schedulerService.formatNextExecution(processConfig)}</p>
                </div>
              </div>

              <button
                onClick={executeProcess}
                disabled={processStatus.isRunning}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-lg font-medium"
              >
                {processStatus.isRunning ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    Iniciar Proceso
                  </>
                )}
              </button>
            </div>

            {/* Estadísticas Rápidas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow-md p-4">
                <div className="flex items-center">
                  <Calendar className="w-8 h-8 text-blue-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Día Vigencia</p>
                    <p className="text-2xl font-semibold text-gray-900">{processConfig.vigenciaDia}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-md p-4">
                <div className="flex items-center">
                  <Clock className="w-8 h-8 text-green-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Días Facturas</p>
                    <p className="text-2xl font-semibold text-gray-900">{processConfig.diasFacturas}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-md p-4">
                <div className="flex items-center">
                  <Users className="w-8 h-8 text-purple-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Convenio</p>
                    <p className="text-2xl font-semibold text-gray-900">{processConfig.vigenciaConvenio}d</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-md p-4">
                <div className="flex items-center">
                  <HardDrive className="w-8 h-8 text-red-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Ciclo Escolar</p>
                    <p className="text-2xl font-semibold text-gray-900">{processConfig.vigenciaCicloEscolar}d</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'database':
        return (
          <div className="space-y-6">
            {/* Configuración Firebird */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Server className="w-5 h-5 mr-2 text-orange-600" />
                Configuración Firebird (SAE Local)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Host</label>
                  <input
                    type="text"
                    value={dbConfig.firebird.host}
                    onChange={(e) => setDbConfig(prev => ({
                      ...prev,
                      firebird: { ...prev.firebird, host: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="localhost"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Puerto</label>
                  <input
                    type="text"
                    value={dbConfig.firebird.port}
                    onChange={(e) => setDbConfig(prev => ({
                      ...prev,
                      firebird: { ...prev.firebird, port: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="3050"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
                  <input
                    type="text"
                    value={dbConfig.firebird.user}
                    onChange={(e) => setDbConfig(prev => ({
                      ...prev,
                      firebird: { ...prev.firebird, user: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="SYSDBA"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                  <input
                    type="password"
                    value={dbConfig.firebird.password}
                    onChange={(e) => setDbConfig(prev => ({
                      ...prev,
                      firebird: { ...prev.firebird, password: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="masterkey"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ruta de Base de Datos</label>
                  <input
                    type="text"
                    value={dbConfig.firebird.database}
                    onChange={(e) => setDbConfig(prev => ({
                      ...prev,
                      firebird: { ...prev.firebird, database: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="C:\path\to\database.fdb"
                  />
                </div>
              </div>
            </div>

            {/* Configuración MySQL */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Database className="w-5 h-5 mr-2 text-blue-600" />
                Configuración MySQL (Base Remota)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Host</label>
                  <input
                    type="text"
                    value={dbConfig.mysql.host}
                    onChange={(e) => setDbConfig(prev => ({
                      ...prev,
                      mysql: { ...prev.mysql, host: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="mysql.example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Puerto</label>
                  <input
                    type="text"
                    value={dbConfig.mysql.port}
                    onChange={(e) => setDbConfig(prev => ({
                      ...prev,
                      mysql: { ...prev.mysql, port: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="3306"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Base de Datos</label>
                  <input
                    type="text"
                    value={dbConfig.mysql.database}
                    onChange={(e) => setDbConfig(prev => ({
                      ...prev,
                      mysql: { ...prev.mysql, database: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="database_name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
                  <input
                    type="text"
                    value={dbConfig.mysql.user}
                    onChange={(e) => setDbConfig(prev => ({
                      ...prev,
                      mysql: { ...prev.mysql, user: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="admin"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                  <input
                    type="password"
                    value={dbConfig.mysql.password}
                    onChange={(e) => setDbConfig(prev => ({
                      ...prev,
                      mysql: { ...prev.mysql, password: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="password"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={saveConfiguration}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
              >
                <Save className="w-4 h-4 mr-2" />
                Guardar Configuración de Base de Datos
              </button>
            </div>
          </div>
        );

      case 'paths':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <FolderOpen className="w-5 h-5 mr-2 text-green-600" />
                Configuración de Rutas
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ruta de Base de Datos de Origen (Red)
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={pathConfig.sourceDbPath}
                      onChange={(e) => setPathConfig(prev => ({ ...prev, sourceDbPath: e.target.value }))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Z:\Sistemas Aspel\SAE9.00\Empresa01\Datos\SAE90EMPRE01.FDB"
                    />
                    <button
                      onClick={() => handleBrowseFile('sourceDb')}
                      className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center"
                    >
                      <FolderOpen className="w-4 h-4 mr-1" />
                      Navegar
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ruta de Base de Datos Local
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={pathConfig.localDbPath}
                      onChange={(e) => setPathConfig(prev => ({ ...prev, localDbPath: e.target.value }))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="C:\Users\Usuario\Desktop\Base\SAE90EMPRE01.FDB"
                    />
                    <button
                      onClick={() => handleBrowseFile('localDb')}
                      className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center"
                    >
                      <FolderOpen className="w-4 h-4 mr-1" />
                      Navegar
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Directorio de Salida
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={pathConfig.outputPath}
                      onChange={(e) => setPathConfig(prev => ({ ...prev, outputPath: e.target.value }))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="C:\Users\Usuario\Desktop\INFORMACION_BD\"
                    />
                    <button
                      onClick={() => handleBrowseFile('output')}
                      className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center"
                    >
                      <FolderOpen className="w-4 h-4 mr-1" />
                      Navegar
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={saveConfiguration}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Guardar Configuración de Rutas
                </button>
              </div>
            </div>
          </div>
        );

      case 'parameters':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Settings className="w-5 h-5 mr-2 text-purple-600" />
                Parámetros de Proceso
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Día para Generar Vigencias
                  </label>
                  <select
                    value={processConfig.vigenciaDia}
                    onChange={(e) => setProcessConfig(prev => ({ ...prev, vigenciaDia: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                      <option key={day} value={day}>Día {day}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Días de Facturas a Procesar
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={processConfig.diasFacturas}
                    onChange={(e) => setProcessConfig(prev => ({ ...prev, diasFacturas: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vigencia CONVENIO (días)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={processConfig.vigenciaConvenio}
                    onChange={(e) => setProcessConfig(prev => ({ ...prev, vigenciaConvenio: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vigencia CICLO ESCOLAR (días)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={processConfig.vigenciaCicloEscolar}
                    onChange={(e) => setProcessConfig(prev => ({ ...prev, vigenciaCicloEscolar: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Palabras Excluidas (separadas por comas)
                </label>
                <textarea
                  value={processConfig.palabrasExcluidas.join(', ')}
                  onChange={(e) => setProcessConfig(prev => ({
                    ...prev,
                    palabrasExcluidas: e.target.value.split(',').map(word => word.trim()).filter(word => word)
                  }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="FONDO DE RESERVA, FONDO, INSCRIP, INSCRIPCIÓN"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Palabras CONVENIO (separadas por comas)
                  </label>
                  <textarea
                    value={processConfig.palabrasConvenio.join(', ')}
                    onChange={(e) => setProcessConfig(prev => ({
                      ...prev,
                      palabrasConvenio: e.target.value.split(',').map(word => word.trim()).filter(word => word)
                    }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="CONVENIO"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Palabras CICLO ESCOLAR (separadas por comas)
                  </label>
                  <textarea
                    value={processConfig.palabrasCicloEscolar.join(', ')}
                    onChange={(e) => setProcessConfig(prev => ({
                      ...prev,
                      palabrasCicloEscolar: e.target.value.split(',').map(word => word.trim()).filter(word => word)
                    }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="CICLO ESCOLAR"
                  />
                </div>
              </div>

              {/* Programación Automática */}
              <div className="mt-8 border-t pt-6">
                <h3 className="text-lg font-medium mb-4 flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-blue-600" />
                  Ejecución Programada
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="scheduledEnabled"
                      checked={processConfig.scheduledExecution.enabled}
                      onChange={(e) => setProcessConfig(prev => ({
                        ...prev,
                        scheduledExecution: { ...prev.scheduledExecution, enabled: e.target.checked }
                      }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="scheduledEnabled" className="ml-2 block text-sm text-gray-900">
                      Habilitar ejecución automática programada
                    </label>
                  </div>

                  {processConfig.scheduledExecution.enabled && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Horarios de Ejecución
                          </label>
                          <div className="space-y-2">
                            {processConfig.scheduledExecution.times.map((time, index) => (
                              <div key={index} className="flex items-center space-x-2">
                                <input
                                  type="time"
                                  value={time}
                                  onChange={(e) => {
                                    const newTimes = [...processConfig.scheduledExecution.times];
                                    newTimes[index] = e.target.value;
                                    setProcessConfig(prev => ({
                                      ...prev,
                                      scheduledExecution: { ...prev.scheduledExecution, times: newTimes }
                                    }));
                                  }}
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                {processConfig.scheduledExecution.times.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newTimes = processConfig.scheduledExecution.times.filter((_, i) => i !== index);
                                      setProcessConfig(prev => ({
                                        ...prev,
                                        scheduledExecution: { ...prev.scheduledExecution, times: newTimes }
                                      }));
                                    }}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                                  >
                                    <Minus className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => {
                                const newTimes = [...processConfig.scheduledExecution.times, '09:00'];
                                setProcessConfig(prev => ({
                                  ...prev,
                                  scheduledExecution: { ...prev.scheduledExecution, times: newTimes }
                                }));
                              }}
                              className="flex items-center px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-md text-sm"
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Agregar Horario
                            </button>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Días de la Semana
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {[
                            { key: 'monday', label: 'Lunes' },
                            { key: 'tuesday', label: 'Martes' },
                            { key: 'wednesday', label: 'Miércoles' },
                            { key: 'thursday', label: 'Jueves' },
                            { key: 'friday', label: 'Viernes' },
                            { key: 'saturday', label: 'Sábado' },
                            { key: 'sunday', label: 'Domingo' }
                          ].map(day => (
                            <div key={day.key} className="flex items-center">
                              <input
                                type="checkbox"
                                id={day.key}
                                checked={processConfig.scheduledExecution.days.includes(day.key)}
                                onChange={(e) => {
                                  const days = e.target.checked
                                    ? [...processConfig.scheduledExecution.days, day.key]
                                    : processConfig.scheduledExecution.days.filter(d => d !== day.key);
                                  setProcessConfig(prev => ({
                                    ...prev,
                                    scheduledExecution: { ...prev.scheduledExecution, days }
                                  }));
                                }}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <label htmlFor={day.key} className="ml-2 block text-sm text-gray-900">
                                {day.label}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={saveConfiguration}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Guardar Configuración de Parámetros
                </button>
              </div>
            </div>
          </div>
        );

      case 'monitor':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Monitor className="w-5 h-5 mr-2 text-green-600" />
                Monitor de Proceso
              </h2>

              {processStatus.isRunning ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-medium">{processStatus.currentStep}</span>
                    <span className="text-lg font-bold text-blue-600">{processStatus.progress}%</span>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-green-500 h-4 rounded-full transition-all duration-500 flex items-center justify-center"
                      style={{ width: `${processStatus.progress}%` }}
                    >
                      {processStatus.progress > 10 && (
                        <span className="text-white text-xs font-medium">{processStatus.progress}%</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-center mt-4">
                    <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mr-3" />
                    <span className="text-lg text-gray-700">Procesando...</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Sistema Listo</h3>
                  <p className="text-gray-600">No hay procesos ejecutándose actualmente</p>
                  {processStatus.lastRun && (
                    <p className="text-sm text-gray-500 mt-2">
                      Última ejecución: {processStatus.lastRun}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        );

      case 'logs':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-gray-600" />
                  Registro de Actividades
                </h2>
                <button
                  onClick={() => setLogs([])}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                >
                  Limpiar Logs
                </button>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {logs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No hay registros de actividad
                  </div>
                ) : (
                  logs.map((log) => (
                    <div
                      key={log.id}
                      className={`p-3 rounded-md border-l-4 ${
                        log.status === 'success' ? 'bg-green-50 border-green-400' :
                        log.status === 'error' ? 'bg-red-50 border-red-400' :
                        log.status === 'warning' ? 'bg-yellow-50 border-yellow-400' :
                        'bg-blue-50 border-blue-400'
                      }`}
                    >
                      <div className="flex items-start">
                        <div className="flex-shrink-0 mr-3">
                          {log.status === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
                          {log.status === 'error' && <XCircle className="w-5 h-5 text-red-600" />}
                          {log.status === 'warning' && <AlertCircle className="w-5 h-5 text-yellow-600" />}
                          {log.status === 'info' && <AlertCircle className="w-5 h-5 text-blue-600" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-gray-900">{log.process}</p>
                              <p className="text-gray-700">{log.message}</p>
                            </div>
                            <span className="text-xs text-gray-500 ml-4">{log.timestamp}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <img 
                src="/assets/logo1.png" 
                alt="Logo" 
                className="w-10 h-10 mr-3 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling.style.display = 'block';
                }}
              />
              <Database className="w-8 h-8 text-blue-600 mr-3 hidden" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Interface de Gestión para Vigencias</h1>
                <p className="text-sm text-gray-600">
                  {isElectron ? 'Aplicación de Escritorio' : 'Aplicación Web'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className={`w-3 h-3 rounded-full ${processStatus.isRunning ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></div>
              <span className="text-sm text-gray-600">
                {processStatus.isRunning ? 'Procesando' : 'Listo'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Activity },
              { id: 'database', label: 'Base de Datos', icon: Database },
              { id: 'paths', label: 'Rutas', icon: FolderOpen },
              { id: 'parameters', label: 'Parámetros', icon: Settings },
              { id: 'monitor', label: 'Monitor', icon: Monitor },
              { id: 'logs', label: 'Logs', icon: FileText }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center px-3 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderTabContent()}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <p>© 2024 Interface de Gestión para Vigencias - Sistema de Gestión Integrado</p>
            <p>Versión 1.0.0 - {isElectron ? 'Desktop' : 'Web'}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;