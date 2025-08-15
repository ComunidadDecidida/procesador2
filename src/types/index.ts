export interface ElectronAPI {
  selectFile: (options?: any) => Promise<string | null>;
  selectDirectory: () => Promise<string | null>;
  readConfig: () => Promise<any>;
  saveConfig: (config: any) => Promise<void>;
  copyDatabase: (source: string, destination: string) => Promise<boolean>;
  connectFirebird: (config: FirebirdConfig) => Promise<boolean>;
  connectMySQL: (config: MySQLConfig) => Promise<boolean>;
  processFacturas: (config: ProcessConfig, paths: PathConfig, dbConfig: DatabaseConfig) => Promise<ProcessResult>;
  executeFirebirdQuery: (config: FirebirdConfig, query: string, params?: any[]) => Promise<any[]>;
  executeFirebirdNonQuery: (config: FirebirdConfig, query: string, params?: any[]) => Promise<number>;
}

export interface DatabaseConfig {
  firebird: FirebirdConfig;
  mysql: MySQLConfig;
}

export interface FirebirdConfig {
  host: string;
  database: string;
  user: string;
  password: string;
  port: string;
}

export interface MySQLConfig {
  host: string;
  port: string;
  database: string;
  user: string;
  password: string;
}

export interface PathConfig {
  sourceDbPath: string;
  localDbPath: string;
  outputPath: string;
}

export interface ProcessConfig {
  vigenciaDia: number;
  diasFacturas: number;
  palabrasExcluidas: string[];
  palabrasConvenio: string[];
  palabrasCicloEscolar: string[];
  vigenciaConvenio: number;
  vigenciaCicloEscolar: number;
  scheduledExecution: {
    enabled: boolean;
    times: string[];
    days: string[];
    lastExecution: string | null;
  };
}

export interface ProcessLog {
  id: string;
  timestamp: string;
  process: string;
  message: string;
  status: 'success' | 'error' | 'warning' | 'info';
}

export interface ProcessStatus {
  isRunning: boolean;
  currentStep: string;
  progress: number;
  lastRun: string | null;
}

export interface ProcessResult {
  success: boolean;
  message: string;
  facturasProcessed: number;
  vigenciasUpdated: number;
  errors: string[];
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}