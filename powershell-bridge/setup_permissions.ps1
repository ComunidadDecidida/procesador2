# setup_permissions.ps1
# Configuración de permisos y políticas para Interface de Gestion para Vigencias
# EJECUTAR COMO ADMINISTRADOR

param(
    [switch]$SetupFirewall,
    [switch]$SetupExecutionPolicy,
    [switch]$SetupFilePermissions,
    [switch]$All
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CONFIGURACION DE PERMISOS Y POLITICAS" -ForegroundColor Cyan
Write-Host "  Interface de Gestion para Vigencias" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar si se ejecuta como administrador
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-Administrator)) {
    Write-Host "ERROR: Este script debe ejecutarse como Administrador" -ForegroundColor Red
    Write-Host ""
    Write-Host "INSTRUCCIONES:" -ForegroundColor Yellow
    Write-Host "1. Clic derecho en PowerShell" -ForegroundColor White
    Write-Host "2. Seleccionar 'Ejecutar como administrador'" -ForegroundColor White
    Write-Host "3. Ejecutar este script de nuevo" -ForegroundColor White
    Write-Host ""
    pause
    exit 1
}

Write-Host "Ejecutandose como Administrador" -ForegroundColor Green
Write-Host ""

# Funcion para configurar politica de ejecucion de PowerShell
function Set-PowerShellExecutionPolicy {
    Write-Host "Configurando politica de ejecucion de PowerShell..." -ForegroundColor Yellow
    
    try {
        # Obtener politica actual
        $currentPolicy = Get-ExecutionPolicy -Scope LocalMachine
        Write-Host "   Politica actual: $currentPolicy" -ForegroundColor White
        
        if ($currentPolicy -eq "Restricted" -or $currentPolicy -eq "AllSigned") {
            Write-Host "   Cambiando politica a RemoteSigned..." -ForegroundColor White
            Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope LocalMachine -Force
            Write-Host "   Politica cambiada a RemoteSigned" -ForegroundColor Green
        } else {
            Write-Host "   Politica ya es compatible: $currentPolicy" -ForegroundColor Green
        }
        
        # Verificar politica para CurrentUser tambien
        $userPolicy = Get-ExecutionPolicy -Scope CurrentUser
        if ($userPolicy -eq "Restricted") {
            Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
            Write-Host "   Politica de usuario cambiada a RemoteSigned" -ForegroundColor Green
        }
        
        return $true
    }
    catch {
        Write-Host "   Error configurando politica: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Funcion para configurar reglas de firewall
function Set-FirewallRules {
    Write-Host "Configurando reglas de firewall..." -ForegroundColor Yellow
    
    try {
        # Firebird puerto 3050
        $firebirdRule = Get-NetFirewallRule -DisplayName "Firebird Database Server" -ErrorAction SilentlyContinue
        if (-not $firebirdRule) {
            New-NetFirewallRule -DisplayName "Firebird Database Server" -Direction Inbound -Protocol TCP -LocalPort 3050 -Action Allow -Profile Any
            Write-Host "   Regla creada para Firebird (puerto 3050)" -ForegroundColor Green
        } else {
            Write-Host "   Regla de Firebird ya existe" -ForegroundColor Green
        }
        
        # MySQL puerto 3306
        $mysqlRule = Get-NetFirewallRule -DisplayName "MySQL Database Server" -ErrorAction SilentlyContinue
        if (-not $mysqlRule) {
            New-NetFirewallRule -DisplayName "MySQL Database Server" -Direction Inbound -Protocol TCP -LocalPort 3306 -Action Allow -Profile Any
            Write-Host "   Regla creada para MySQL (puerto 3306)" -ForegroundColor Green
        } else {
            Write-Host "   Regla de MySQL ya existe" -ForegroundColor Green
        }
        
        # Electron app (permitir programa)
        $appPath = Join-Path $env:LOCALAPPDATA "Programs\interface-gestion-vigencias\Interface de Gestion para Vigencias.exe"
        $electronRule = Get-NetFirewallRule -DisplayName "Interface de Gestion para Vigencias" -ErrorAction SilentlyContinue
        if (-not $electronRule) {
            if (Test-Path $appPath) {
                New-NetFirewallRule -DisplayName "Interface de Gestion para Vigencias" -Program $appPath -Action Allow -Profile Any
                Write-Host "   Regla creada para la aplicacion Electron" -ForegroundColor Green
            } else {
                Write-Host "   Nota: Ejecutable de la aplicacion no encontrado; omitiendo regla de programa" -ForegroundColor Yellow
            }
        } else {
            Write-Host "   Regla para aplicacion Electron ya existe" -ForegroundColor Green
        }
        
        return $true
    }
    catch {
        Write-Host "   Error configurando firewall: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Funcion para configurar permisos de archivos
function Set-FilePermissions {
    Write-Host "Configurando permisos de archivos..." -ForegroundColor Yellow
    
    try {
        # Directorios comunes donde pueden estar las bases de datos
        $commonPaths = @(
            "C:\Users\$env:USERNAME\Desktop\Base",
            "C:\Users\$env:USERNAME\Downloads",
            "C:\Users\$env:USERNAME\Desktop\Base\SAE80EMPRE01",
            "Z:\Sistemas Aspel\SAE9.00\Empresa01\Datos",
            "C:\",
            "C:\SAE",
            "C:\Aspel",
            "C:\Program Files\Firebird",
            "C:\Program Files (x86)\Firebird",
            "C:\Users\$env:USERNAME\Desktop\Base",
            "C:\Users\$env:USERNAME\Desktop\INFORMACION_BD"
        )
        
        foreach ($path in $commonPaths) {
            if (Test-Path $path) {
                try {
                    # Permitir control total al usuario actual
                    $acl = Get-Acl $path
                    $rule = New-Object System.Security.AccessControl.FileSystemAccessRule($env:USERNAME, "FullControl", "ContainerInherit, ObjectInherit", "None", "Allow")
                    $acl.SetAccessRule($rule)
                    Set-Acl -Path $path -AclObject $acl
                    Write-Host "   Permisos configurados para: $path" -ForegroundColor Green
                }
                catch {
                    Write-Host "   Error aplicando permisos en ${path}: $($_.Exception.Message)" -ForegroundColor Yellow
                }
            }
        }
        
        return $true
    }
    catch {
        Write-Host "   Error configurando permisos: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Funcion para verificar servicios de base de datos
function Test-DatabaseServices {
    Write-Host "Verificando servicios de base de datos..." -ForegroundColor Yellow
    
    try {
        # Verificar Firebird
        $firebirdFound = $false
        $services = Get-Service | Where-Object { $_.DisplayName -like "Firebird*" -or $_.Name -like "Firebird*" }
        
        foreach ($srv in $services) {
            Write-Host ("   Servicio encontrado: {0} (Estado: {1})" -f $srv.DisplayName, $srv.Status) -ForegroundColor Green
            $firebirdFound = $true
        }
        
        if (-not $firebirdFound) {
            Write-Host "   No se encontro servicio de Firebird instalado" -ForegroundColor Yellow
            Write-Host "      Instale Firebird Server desde: https://firebirdsql.org/en/downloads/" -ForegroundColor White
        }
        
        # Verificar MySQL (opcional)
        $mysqlService = Get-Service -Name "MySQL*" -ErrorAction SilentlyContinue
        if ($mysqlService) {
            Write-Host "   Servicio MySQL encontrado: $($mysqlService.Name) (Estado: $($mysqlService.Status))" -ForegroundColor Green
        } else {
            Write-Host "   MySQL no instalado localmente (puede usar servidor remoto)" -ForegroundColor Cyan
        }
        return $true
    }
    catch {
        Write-Host "   Error verificando servicios: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Funcion para configurar variables de entorno
function Set-EnvironmentVariables {
    Write-Host "Configurando variables de entorno..." -ForegroundColor Yellow
    
    try {
        # Agregar Firebird al PATH si existe
        $firebirdPaths = @(
            "C:\Program Files\Firebird\Firebird_2_5\bin",
            "C:\Program Files\Firebird\Firebird_3_0\bin",
            "C:\Program Files\Firebird\Firebird_4_0\bin",
            "C:\Program Files\Firebird\Firebird_5_0\bin",
            "C:\Program Files (x86)\Firebird\Firebird_2_5\bin"
        )
        
        $currentPath = [Environment]::GetEnvironmentVariable("PATH", "Machine")
        $pathUpdated = $false
        
        foreach ($fbPath in $firebirdPaths) {
            if ((Test-Path $fbPath) -and ($currentPath -notlike "*$fbPath*")) {
                $newPath = $currentPath + ";" + $fbPath
                [Environment]::SetEnvironmentVariable("PATH", $newPath, "Machine")
                Write-Host "   Firebird agregado al PATH: $fbPath" -ForegroundColor Green
                $pathUpdated = $true
                break
            }
        }
        
        if (-not $pathUpdated) {
            Write-Host "   Firebird ya esta en PATH o no se encontro instalacion" -ForegroundColor Cyan
        }
        
        return $true
    }
    catch {
        Write-Host "   Error configurando variables de entorno: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Funcion para crear script de inicio rapido
function Create-QuickStartScript {
    Write-Host "Creando script de inicio rapido..." -ForegroundColor Yellow
    
    try {
        $scriptContent = @"
echo off
echo ========================================
echo  INTERFACE DE GESTION PARA VIGENCIAS
echo  Inicio Rapido con Permisos Elevados
echo ========================================
echo.

echo Verificando servicios...
net start "Firebird Server - DefaultInstance" >nul 2>&1
if %errorlevel%==0 (
    echo Servicio Firebird iniciado
) else (
    echo Servicio Firebird no disponible
)

echo.
echo Iniciando aplicacion...
cd /d "%LOCALAPPDATA%\Programs\interface-gestion-vigencias"
if exist "Interface de Gestion para Vigencias.exe" (
    start "" "Interface de Gestion para Vigencias.exe"
    echo Aplicacion iniciada
) else (
    echo Aplicacion no encontrada en la ubicacion esperada
    echo Busque el ejecutable manualmente
    pause
)

timeout /t 3 >nul
"@
        
        $scriptPath = "$env:PUBLIC\Desktop\Vigencias - Inicio Rapido.bat"
        $scriptContent | Out-File -FilePath $scriptPath -Encoding ASCII
        
        Write-Host "   Script de inicio creado en el escritorio publico" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "   Error creando script de inicio: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Ejecutar configuraciones segun parametros
$success = $true

if ($All -or $SetupExecutionPolicy) {
    if (-not (Set-PowerShellExecutionPolicy)) { $success = $false }
    Write-Host ""
}

if ($All -or $SetupFirewall) {
    if (-not (Set-FirewallRules)) { $success = $false }
    Write-Host ""
}

if ($All -or $SetupFilePermissions) {
    if (-not (Set-FilePermissions)) { $success = $false }
    Write-Host ""
}

if ($All) {
    if (-not (Test-DatabaseServices)) { $success = $false }
    Write-Host ""
    
    if (-not (Set-EnvironmentVariables)) { $success = $false }
    Write-Host ""
    
    if (-not (Create-QuickStartScript)) { $success = $false }
    Write-Host ""
}

# Resumen final
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RESUMEN DE CONFIGURACION" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if ($success) {
    Write-Host "CONFIGURACION COMPLETADA EXITOSAMENTE" -ForegroundColor Green
    Write-Host ""
    Write-Host "PROXIMOS PASOS:" -ForegroundColor Yellow
    Write-Host "1. Reiniciar el ordenador para aplicar todos los cambios" -ForegroundColor White
    Write-Host "2. Instalar la aplicacion Interface de Gestion para Vigencias" -ForegroundColor White
    Write-Host "3. Usar el script 'Vigencias - Inicio Rapido.bat' del escritorio" -ForegroundColor White
    Write-Host "4. Configurar las rutas de base de datos en la aplicacion" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "REVISAR:" -ForegroundColor Yellow
    Write-Host "- Los mensajes de error anteriores" -ForegroundColor White
    Write-Host "- Permisos de usuario y administrador" -ForegroundColor White
    Write-Host "- Instalacion de Firebird Server" -ForegroundColor White
}

Write-Host ""
Write-Host "COMANDOS UTILES PARA VERIFICACION:" -ForegroundColor Cyan
Write-Host "- Get-ExecutionPolicy -List" -ForegroundColor White
Write-Host "- Get-NetFirewallRule | Where DisplayName -like '*Firebird*'" -ForegroundColor White
Write-Host "- Get-Service | Where Name -like '*Firebird*'" -ForegroundColor White
Write-Host ""

pause