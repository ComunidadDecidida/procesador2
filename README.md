# Interface de Gestión para Vigencias

## Descripción
Sistema de gestión integrado para procesamiento de vigencias con interfaz web moderna.

## Características
- Interfaz web responsive con React y TypeScript
- Configuración de rutas de archivos y bases de datos
- Monitor de procesos en tiempo real
- Sistema de logs integrado
- Ejecución programada con múltiples horarios por día
- Soporte para bases de datos Firebird y MySQL

## Requisitos del Sistema

### Para Aplicación Web
- Node.js 18 o superior
- npm 9 o superior
- Navegador web moderno (Chrome, Firefox, Edge)

### Para Ejecutable Windows
- Windows 10/11
- .NET Framework 4.7.2 o superior (incluido en Windows 10/11)

## Instalación y Uso

### Como Aplicación Web

1. **Instalar Node.js**
   - Descargar desde: https://nodejs.org/
   - Instalar la versión LTS (recomendada)
   - Verificar instalación: `node --version` y `npm --version`

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Ejecutar en desarrollo**
   ```bash
   npm run dev
   ```

4. **Construir para producción**
   ```bash
   npm run build
   ```

5. **Servir aplicación construida**
   ```bash
   npm run preview
   ```

### Como Ejecutable Windows

1. **Descargar el ejecutable** desde la sección de releases
2. **Ejecutar** `Procesador de Vigencias.exe`
3. **La aplicación se abrirá** en tu navegador predeterminado

## Configuración de Bases de Datos

### Firebird (SAE Local)
- **Driver necesario**: Firebird Client Library
- **Puerto por defecto**: 3050
- **Ubicación típica**: `C:\Program Files\Firebird\`

### MySQL (Base Remota)
- **Driver necesario**: MySQL Connector
- **Puerto por defecto**: 3306
- **Configuración**: A través de la interfaz web

## Estructura del Proyecto
```
src/
├── App.tsx          # Componente principal
├── main.tsx         # Punto de entrada
├── index.css        # Estilos globales
└── vite-env.d.ts    # Tipos de Vite

public/              # Archivos estáticos
dist/                # Build de producción
```

## Scripts Disponibles
- `npm run dev` - Servidor de desarrollo
- `npm run build` - Construir para producción
- `npm run preview` - Vista previa del build
- `npm run lint` - Verificar código

## Soporte
Para soporte técnico, contactar al administrador del sistema.