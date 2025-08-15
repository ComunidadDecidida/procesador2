import { ProcessConfig } from '../types';

class SchedulerService {
  private intervalId: NodeJS.Timeout | null = null;
  private isElectron: boolean;

  constructor() {
    this.isElectron = typeof window !== 'undefined' && window.electronAPI !== undefined;
  }

  startScheduler(config: ProcessConfig, onExecute: () => Promise<void>) {
    this.stopScheduler();

    if (!config.scheduledExecution.enabled) {
      return;
    }

    // Verificar cada minuto si es hora de ejecutar
    this.intervalId = setInterval(() => {
      this.checkAndExecute(config, onExecute);
    }, 60000); // Cada minuto

    console.log('Scheduler iniciado:', config.scheduledExecution);
  }

  stopScheduler() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Scheduler detenido');
    }
  }

  private async checkAndExecute(config: ProcessConfig, onExecute: () => Promise<void>) {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const currentDay = this.getDayName(now.getDay());

    // Verificar si es el día correcto y alguno de los horarios configurados
    if (config.scheduledExecution.times.includes(currentTime) && 
        config.scheduledExecution.days.includes(currentDay)) {
      
      // Verificar que no se haya ejecutado ya en esta hora específica
      const lastExecution = config.scheduledExecution.lastExecution;
      const currentHour = now.toISOString().substring(0, 13); // YYYY-MM-DDTHH
      
      if (!lastExecution || !lastExecution.startsWith(currentHour)) {
        console.log(`Ejecutando proceso programado a las ${currentTime}...`);
        
        try {
          await onExecute();
          
          // Actualizar última ejecución
          config.scheduledExecution.lastExecution = now.toISOString();
          
          // Guardar configuración actualizada
          if (this.isElectron && window.electronAPI?.saveConfig) {
            await window.electronAPI.saveConfig({
              database: null, // Se actualizará desde el componente principal
              paths: null,
              process: config,
              lastUpdated: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error('Error en ejecución programada:', error);
        }
      }
    }
  }

  private getDayName(dayIndex: number): string {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[dayIndex];
  }

  getNextExecution(config: ProcessConfig): Date | null {
    if (!config.scheduledExecution.enabled) {
      return null;
    }

    const now = new Date();
    
    // Buscar la próxima fecha y hora de ejecución
    for (let i = 0; i < 7; i++) {
      for (const timeStr of config.scheduledExecution.times) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const checkDate = new Date(now);
        checkDate.setDate(now.getDate() + i);
        checkDate.setHours(hours, minutes, 0, 0);
        
        const dayName = this.getDayName(checkDate.getDay());
        
        if (config.scheduledExecution.days.includes(dayName) && checkDate > now) {
          return checkDate;
        }
      }
    }
    
    return null;
  }

  formatNextExecution(config: ProcessConfig): string {
    const nextExecution = this.getNextExecution(config);
    if (!nextExecution) {
      return 'No programado';
    }
    
    return nextExecution.toLocaleString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

export const schedulerService = new SchedulerService();