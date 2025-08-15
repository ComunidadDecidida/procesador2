# 🔐 INSTRUCCIONES PRECISAS DE PERMISOS Y CONFIGURACIÓN
# Interface de Gestión para Vigencias - Solo PowerShell

## 📋 RESUMEN DE CAMBIOS REALIZADOS

### ✅ **ELIMINACIONES COMPLETADAS:**
- ❌ **Carpeta `python-bridge/`** - Eliminada completamente
- ❌ **Referencias a Python** en `package.json` - Removidas
- ❌ **Dependencias Python** - Eliminadas
- ❌ **Código híbrido Python/PowerShell** - Simplificado solo a PowerShell

### ✅ **OPTIMIZACIONES IMPLEMENTADAS:**
- ⚡ **Solo PowerShell** como método de conexión
- ⚡ **Robocopy** para copia robusta de bases de datos
- ⚡ **Timeouts extendidos** (2 min conexión, 5 min comandos)
- ⚡ **Permisos de administrador** requeridos automáticamente
- ⚡ **Compatibilidad verificada** entre todas las dependencias

---

## 🚀 INSTRUCCIONES PASO A PASO

### **PASO 1: CONFIGURAR PERMISOS DEL SISTEMA**

#### **1.1 Ejecutar Script de Configuración Automática:**
```powershell
# EJECUTAR COMO ADMINISTRADOR
cd powershell-bridge
.\setup_permissions.ps1 -All
```

#### **1.2 Configuración Manual (si el script falla):**

**A) Política de Ejecución PowerShell:**
```powershell
# Como Administrador
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope LocalMachine -Force
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
```

**B) Reglas de Firewall:**
```powershell
# Firebird
New-NetFirewallRule -DisplayName "Firebird Database Server" -Direction Inbound -Protocol TCP -LocalPort 3050 -Action Allow -Profile Any

# MySQL
New-NetFirewallRule -DisplayName "MySQL Database Server" -Direction Inbound -Protocol TCP -LocalPort 3306 -Action Allow -Profile Any

# Aplicación
New-NetFirewallRule -DisplayName "Interface de Gestión para Vigencias" -Direction Inbound -Program "%LOCALAPPDATA%\Programs\interface-gestion-vigencias\Interface de Gestión para Vigencias.exe" -Action Allow -Profile Any
```

**C) Permisos de Archivos:**
```powershell
# Dar permisos completos a directorios de bases de datos
$paths = @(
    "C:\SAE",
    "C:\Aspel", 
    "C:\Users\$env:USERNAME\Desktop\Base",
    "C:\Users\$env:USERNAME\Desktop\INFORMACION_BD"
)

foreach ($path in $paths) {
    if (Test-Path $path) {
        $acl = Get-Acl $path
        $accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule($env:USERNAME, "FullControl", "ContainerInherit,ObjectInherit", "None", "Allow")
        $acl.SetAccessRule($accessRule)
        Set-Acl -Path $path -AclObject $acl
    }
}
```

### **PASO 2: CONFIGURAR ROBOCOPY PARA COPIA DE BASES DE DATOS**

#### **2.1 ¿Por qué Robocopy?**
- ✅ **Más robusto** que Copy-Item para archivos grandes
- ✅ **Manejo de archivos bloqueados** mejor que métodos estándar
- ✅ **Reintentos automáticos** si el archivo está en uso
- ✅ **Verificación de integridad** automática
- ✅ **Nativo en Windows** - no requiere instalación

#### **2.2 Configuración Implementada:**
```powershell
# Parámetros Robocopy optimizados para bases de datos:
$robocopyArgs = @(
    "/R:3",        # 3 reintentos si falla
    "/W:5",        # 5 segundos entre reintentos
    "/MT:1",       # Single-threaded (mejor para BD)
    "/COPY:DAT",   # Copiar datos, atributos y timestamps
    "/XO",         # Excluir archivos más antiguos
    "/FFT",        # Asumir tiempos FAT (compatibilidad)
    "/DST"         # Compensar horario de verano
)
```

#### **2.3 Manejo de Archivos Bloqueados:**
```powershell
# Si la base de datos está en uso, Robocopy:
# 1. Espera 5 segundos
# 2. Reintenta hasta 3 veces
# 3. Reporta error específico si no puede copiar
```

### **PASO 3: CONFIGURAR TIMEOUTS OPTIMIZADOS**

#### **3.1 Timeouts Implementados:**
```powershell
# Conexión Firebird
$builder.ConnectionTimeout = 120  # 2 minutos
$builder.CommandTimeout = 300     # 5 minutos

# Conexión MySQL  
ConnectionTimeout=120;CommandTimeout=300

# Proceso PowerShell
timeout: 600000  # 10 minutos para operaciones largas
```

#### **3.2 ¿Por qué estos tiempos?**
- **2 min conexión:** Suficiente para redes lentas y bases grandes
- **5 min comandos:** Permite consultas complejas y actualizaciones masivas
- **10 min proceso:** Para copia de bases de datos grandes (>1GB)

### **PASO 4: VERIFICAR COMPATIBILIDAD DE DEPENDENCIAS**

#### **4.1 Dependencias Node.js Verificadas:**
```json
{
  "dependencies": {
    "fs-extra": "^11.2.0",        // ✅ Compatible con Node 18+
    "lucide-react": "^0.344.0",   // ✅ Compatible con React 18
    "react": "^18.3.1",           // ✅ Versión estable LTS
    "react-dom": "^18.3.1"        // ✅ Compatible con React 18
  },
  "devDependencies": {
    "electron": "^28.3.3",        // ✅ Versión estable, compatible con Node 18
    "electron-builder": "^24.13.3", // ✅ Compatible con Electron 28
    "vite": "^5.4.19",            // ✅ Versión estable
    "terser": "^5.43.1"           // ✅ Agregado para build optimizado
  }
}
```

#### **4.2 Librerías .NET Verificadas:**
```
FirebirdSql.Data.FirebirdClient.dll v10.3.1  // ✅ Compatible con .NET 8.0
System.Runtime.CompilerServices.Unsafe.dll   // ✅ Requerido por Firebird
System.Threading.Tasks.Extensions.dll        // ✅ Compatible con .NET 8.0
System.Text.Json.dll v8.0.5                  // ✅ Nativo .NET 8.0
MySql.Data.dll v8.2.0                        // ✅ Compatible con .NET 8.0
```

#### **4.3 Matriz de Compatibilidad:**
| Componente | Versión | Compatible con | Estado |
|------------|---------|----------------|--------|
| Node.js | 18.19.0+ | Electron 28 | ✅ |
| Electron | 28.3.3 | Windows 10/11 | ✅ |
| .NET Runtime | 8.0 | Windows 10/11 | ✅ |
| PowerShell | 5.1+ | Windows 10/11 | ✅ |
| Firebird Client | 2.5-5.0 | .NET 8.0 | ✅ |
| MySQL Client | 8.2.0 | .NET 8.0 | ✅ |

### **PASO 5: COMPILAR Y DISTRIBUIR**

#### **5.1 Compilación Optimizada:**
```bash
# Limpiar completamente
npm run full-clean

# Instalar dependencias
npm install

# Verificar PowerShell
cd powershell-bridge
.\install_libs.bat
.\test_connection.ps1

# Compilar aplicación
cd ..
npm run build
npm run dist
```

#### **5.2 Estructura del Ejecutable:**
```
release/
├── Interface de Gestión para Vigencias Setup.exe  # ✅ Instalador con permisos admin
├── win-unpacked/                                  # ✅ Ejecutable directo
│   ├── Interface de Gestión para Vigencias.exe   # ✅ Requiere admin automáticamente
│   └── resources/
│       └── app/
│           └── powershell-bridge/                 # ✅ Scripts PowerShell incluidos
│               ├── libs/                          # ✅ DLLs .NET incluidas
│               ├── FirebirdBridge.ps1             # ✅ Script principal optimizado
│               └── setup_permissions.ps1          # ✅ Script de configuración
```

### **PASO 6: INSTRUCCIONES DE INSTALACIÓN PARA USUARIOS FINALES**

#### **6.1 Requisitos Previos:**
1. **Windows 10/11** (64-bit recomendado)
2. **.NET 8.0 Runtime** - Descargar de: https://dotnet.microsoft.com/download/dotnet/8.0
3. **Firebird Server/Client** - Descargar de: https://firebirdsql.org/en/downloads/
4. **Permisos de Administrador** - Para instalación y primera ejecución

#### **6.2 Proceso de Instalación:**
```bash
# 1. Ejecutar instalador como Administrador
"Interface de Gestión para Vigencias Setup.exe"

# 2. Ejecutar configuración de permisos (automático en primera ejecución)
# O manualmente:
powershell -ExecutionPolicy Bypass -File "setup_permissions.ps1" -All

# 3. Reiniciar ordenador

# 4. Usar script de inicio rápido del escritorio
"Vigencias - Inicio Rápido.bat"
```

#### **6.3 Configuración en la Aplicación:**
```
Pestaña "Base de Datos":
├── Firebird:
│   ├── Host: localhost
│   ├── Puerto: 3050  
│   ├── Base de datos: C:\ruta\completa\archivo.fdb
│   ├── Usuario: SYSDBA
│   └── Contraseña: [tu_contraseña]
└── MySQL (opcional):
    ├── Host: servidor-mysql.com
    ├── Puerto: 3306
    ├── Base de datos: nombre_bd
    ├── Usuario: usuario_mysql
    └── Contraseña: [contraseña_mysql]

Pestaña "Rutas":
├── Origen (Red): Z:\Sistemas Aspel\SAE9.00\Empresa01\Datos\SAE90EMPRE01.FDB
├── Local: C:\Users\Usuario\Desktop\Base\SAE90EMPRE01.FDB
└── Salida: C:\Users\Usuario\Desktop\INFORMACION_BD\
```

---

## 🔍 VERIFICACIÓN DE FUNCIONAMIENTO

### **Checklist de Verificación:**
- [ ] **.NET 8.0 Runtime** instalado: `dotnet --list-runtimes`
- [ ] **PowerShell ExecutionPolicy** configurado: `Get-ExecutionPolicy -List`
- [ ] **Firewall** configurado: `Get-NetFirewallRule | Where DisplayName -like '*Firebird*'`
- [ ] **Servicios** ejecutándose: `Get-Service | Where Name -like '*Firebird*'`
- [ ] **Librerías .NET** presentes: `dir powershell-bridge\libs\`
- [ ] **Test de conexión** exitoso: `.\test_connection.ps1`
- [ ] **Aplicación** compila: `npm run dist`
- [ ] **Ejecutable** funciona con permisos admin

### **Comandos de Diagnóstico:**
```powershell
# Información del sistema
echo "OS: $([Environment]::OSVersion.VersionString)"
echo ".NET: $(dotnet --version)"
echo "PowerShell: $($PSVersionTable.PSVersion)"

# Verificar servicios críticos
Get-Service | Where {$_.Name -like "*Firebird*" -or $_.Name -like "*MySQL*"}

# Verificar conectividad de red
Test-NetConnection -ComputerName localhost -Port 3050  # Firebird
Test-NetConnection -ComputerName tu-servidor-mysql.com -Port 3306  # MySQL

# Verificar permisos de archivos
Get-Acl "C:\ruta\a\tu\base.fdb" | Format-List
```

---

## 🚨 SOLUCIÓN DE PROBLEMAS COMUNES

### **Error: "PowerShell execution policy"**
```powershell
# Solución:
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force
# O permanente:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope LocalMachine -Force
```

### **Error: "Access denied" al copiar base de datos**
```powershell
# Solución:
# 1. Ejecutar aplicación como Administrador
# 2. Verificar permisos del archivo origen:
Get-Acl "Z:\ruta\origen.fdb"
# 3. Usar Robocopy manualmente:
robocopy "Z:\origen" "C:\destino" "archivo.fdb" /R:3 /W:5
```

### **Error: "Firebird connection failed"**
```powershell
# Verificar:
# 1. Servicio ejecutándose:
Get-Service | Where Name -like "*Firebird*"
# 2. Puerto abierto:
netstat -an | findstr :3050
# 3. Archivo existe:
Test-Path "C:\ruta\base.fdb"
# 4. Credenciales correctas (probar con FlameRobin o similar)
```

### **Error: "Assembly could not be loaded"**
```powershell
# Solución:
# 1. Verificar .NET 8.0 Runtime instalado
dotnet --list-runtimes
# 2. Verificar DLLs presentes:
dir powershell-bridge\libs\*.dll
# 3. Reinstalar librerías:
cd powershell-bridge
.\install_libs.bat
```

---

## 📊 RENDIMIENTO Y OPTIMIZACIÓN

### **Configuración Optimizada Implementada:**
- **Conexiones:** Pool deshabilitado para evitar bloqueos
- **Timeouts:** Extendidos para operaciones largas
- **Copia de archivos:** Robocopy con reintentos automáticos
- **Consultas:** Limitadas a 2000 registros por defecto
- **Actualizaciones:** En lotes de 50 para mejor rendimiento
- **Memoria:** Liberación automática de conexiones

### **Métricas Esperadas:**
- **Conexión Firebird:** < 2 segundos (local), < 10 segundos (red)
- **Copia de BD (100MB):** < 30 segundos
- **Procesamiento 1000 facturas:** < 2 minutos
- **Actualización vigencias:** < 1 minuto por cada 500 registros

---

## ✅ RESULTADO FINAL

Con esta configuración tendrás:

- ✅ **Sistema 100% PowerShell** - Sin dependencias Python
- ✅ **Copia robusta con Robocopy** - Manejo de archivos bloqueados
- ✅ **Timeouts optimizados** - Para operaciones largas
- ✅ **Permisos automáticos** - Configuración de administrador
- ✅ **Compatibilidad verificada** - Todas las dependencias compatibles
- ✅ **Instalación simplificada** - Script automático de configuración
- ✅ **Diagnóstico completo** - Herramientas de verificación incluidas

**El sistema está optimizado para máximo rendimiento y compatibilidad en entornos Windows empresariales.**