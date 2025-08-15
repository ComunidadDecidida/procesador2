import { DatabaseConfig, PathConfig, ProcessConfig, ProcessResult } from '../types';

class DatabaseService {
  private isElectron: boolean;

  constructor() {
    this.isElectron = typeof window !== 'undefined' && window.electronAPI !== undefined;
  }

  async testFirebirdConnection(config: DatabaseConfig['firebird']): Promise<boolean> {
    try {
      if (this.isElectron && window.electronAPI?.connectFirebird) {
        console.log('Testing Firebird connection via PowerShell bridge...', {
          host: config.host,
          port: config.port,
          database: config.database ? config.database.substring(config.database.lastIndexOf('\\') + 1) : 'N/A',
          user: config.user
        });
        const result = await window.electronAPI.connectFirebird(config);
        // Manejar tanto formato boolean (legacy) como objeto (nuevo)
        if (typeof result === 'boolean') {
          return result;
        } else if (typeof result === 'object' && result !== null) {
          return result.success || false;
        }
        return false;
      } else {
        // En modo web, no hay conexión real disponible
        console.warn('Firebird connection not available in web mode');
        return false;
      }
    } catch (error) {
      console.error('Firebird connection test failed:', {
        error: error.message,
        host: config.host,
        port: config.port
      });
      return false;
    }
  }

  async testMySQLConnection(config: DatabaseConfig['mysql']): Promise<boolean> {
    try {
      if (this.isElectron && window.electronAPI?.connectMySQL) {
        const result = await window.electronAPI.connectMySQL(config);
        // Manejar tanto formato boolean (legacy) como objeto (nuevo)
        if (typeof result === 'boolean') {
          return result;
        } else if (typeof result === 'object' && result !== null) {
          return result.success || false;
        }
        return false;
      } else {
        // En modo web, no hay conexión real disponible
        console.warn('MySQL connection not available in web mode');
        return false;
      }
    } catch (error) {
      console.error('MySQL connection test failed:', error);
      return false;
    }
  }

  async copyDatabase(sourcePath: string, destinationPath: string): Promise<boolean> {
    try {
      if (this.isElectron && window.electronAPI?.copyDatabase) {
        const result = await window.electronAPI.copyDatabase(sourcePath, destinationPath);
        // Manejar tanto formato boolean (legacy) como objeto (nuevo)
        if (typeof result === 'boolean') {
          return result;
        } else if (typeof result === 'object' && result !== null) {
          return result.success || false;
        }
        return false;
      } else {
        // En modo web, no hay operaciones de archivo disponibles
        console.warn('Database copy not available in web mode');
        return false;
      }
    } catch (error) {
      console.error('Database copy failed:', error);
      return false;
    }
  }

  async processFacturas(
    processConfig: ProcessConfig, 
    pathConfig: PathConfig, 
    dbConfig: DatabaseConfig
  ): Promise<ProcessResult> {
    try {
      if (this.isElectron && window.electronAPI?.processFacturas) {
        return await window.electronAPI.processFacturas(processConfig, pathConfig, dbConfig);
      } else {
        // En modo web, no hay procesamiento real disponible
        console.warn('Facturas processing not available in web mode');
        return {
          success: false,
          message: 'Procesamiento de facturas no disponible en modo web',
          facturasProcessed: 0,
          vigenciasUpdated: 0,
          errors: ['Funcionalidad no disponible en modo web']
        };
      }
    } catch (error) {
      console.error('Facturas processing failed:', error);
      return {
        success: false,
        message: `Error procesando facturas: ${error.message}`,
        facturasProcessed: 0,
        vigenciasUpdated: 0,
        errors: [error.message]
      };
    }
  }
}

export const databaseService = new DatabaseService();