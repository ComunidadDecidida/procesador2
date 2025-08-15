import { DatabaseConfig, PathConfig, ProcessConfig } from '../types';

export interface AppConfig {
  database: DatabaseConfig;
  paths: PathConfig;
  process: ProcessConfig;
  lastUpdated: string;
}

const DEFAULT_CONFIG: AppConfig = {
  database: {
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
  },
  paths: {
    sourceDbPath: 'Z:\\Sistemas Aspel\\SAE9.00\\Empresa01\\Datos\\SAE90EMPRE01.FDB',
    localDbPath: 'C:\\Users\\Comunidad Decidida\\Desktop\\Base\\SAE80EMPRE01\\SAE90EMPRE01.FDB',
    outputPath: 'C:\\Users\\Comunidad Decidida\\Desktop\\INFORMACION_BD\\'
  },
  process: {
    vigenciaDia: 9,
    diasFacturas: 5,
    palabrasExcluidas: ['FONDO DE RESERVA', 'FONDO', 'INSCRIP', 'INSCRIPCIÓN', 'ADELANTO', 'TARJETA', 'TARJE', 'ACCESO', 'TAG', 'APP'],
    palabrasConvenio: ['CONVENIO'],
    palabrasCicloEscolar: ['CICLO ESCOLAR'],
    vigenciaConvenio: 90,
    vigenciaCicloEscolar: 365,
    scheduledExecution: {
      enabled: false,
      times: ['09:00'],
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      lastExecution: null
    }
  },
  lastUpdated: new Date().toISOString()
};

class ConfigManager {
  private configPath: string;
  private isElectron: boolean;

  constructor() {
    this.isElectron = typeof window !== 'undefined' && window.electronAPI !== undefined;
    this.configPath = this.isElectron ? 'vigencias-config.json' : 'vigencias-config-web.json';
  }

  async loadConfig(): Promise<AppConfig> {
    try {
      if (this.isElectron && window.electronAPI?.readConfig) {
        const config = await window.electronAPI.readConfig();
        return config ? { ...DEFAULT_CONFIG, ...config } : DEFAULT_CONFIG;
      } else {
        // Para aplicación web, usar localStorage
        const stored = localStorage.getItem('vigencias-management-config');
        if (stored) {
          const parsed = JSON.parse(stored);
          return { ...DEFAULT_CONFIG, ...parsed };
        }
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
    return DEFAULT_CONFIG;
  }

  async saveConfig(config: AppConfig): Promise<void> {
    try {
      const configToSave = {
        ...config,
        lastUpdated: new Date().toISOString()
      };

      if (this.isElectron && window.electronAPI?.saveConfig) {
        await window.electronAPI.saveConfig(configToSave);
      } else {
        // Para aplicación web, usar localStorage
        localStorage.setItem('vigencias-management-config', JSON.stringify(configToSave));
      }
    } catch (error) {
      console.error('Error saving config:', error);
      throw error;
    }
  }

  async resetConfig(): Promise<AppConfig> {
    const config = { ...DEFAULT_CONFIG, lastUpdated: new Date().toISOString() };
    await this.saveConfig(config);
    return config;
  }
}

export const configManager = new ConfigManager();