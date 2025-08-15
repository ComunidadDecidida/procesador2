# test_connection.ps1
# Test de conexión PowerShell para Firebird
# Interface de Gestión para Vigencias

param(
    [string]$DbHost = "localhost",
    [string]$Port = "3050",
    [string]$Database = "C:\Users\Comunidad Decidida\Desktop\Base\SAE80EMPRE01\SAE90EMPRE01.FDB",
    [string]$User = "SYSDBA",
    [string]$Password = "masterkey"
)

# Configurar encoding
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TEST DE CONEXION FIREBIRD POWERSHELL" -ForegroundColor Cyan
Write-Host "  Interface de Gestion para Vigencias" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Configuracion de prueba:" -ForegroundColor Yellow
Write-Host "  Host: $DbHost" -ForegroundColor White
Write-Host "  Puerto: $Port" -ForegroundColor White
Write-Host "  Base de datos: $Database" -ForegroundColor White
Write-Host "  Usuario: $User" -ForegroundColor White
Write-Host ""

# Verificar librerías antes de la prueba
Write-Host "Verificando librerias .NET..." -ForegroundColor Yellow
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$libsPath = Join-Path $scriptPath "libs"

$requiredLibs = @(
    "FirebirdSql.Data.FirebirdClient.dll",
    "System.Runtime.CompilerServices.Unsafe.dll",
    "System.Threading.Tasks.Extensions.dll",
    "System.Text.Json.dll"
)

$missingLibs = @()
foreach ($lib in $requiredLibs) {
    $libPath = Join-Path $libsPath $lib
    if (Test-Path $libPath) {
        Write-Host "  ✅ $lib" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $lib - FALTANTE" -ForegroundColor Red
        $missingLibs += $lib
    }
}

if ($missingLibs.Count -gt 0) {
    Write-Host ""
    Write-Host "❌ ERROR: Faltan librerias criticas" -ForegroundColor Red
    Write-Host "Ejecuta install_libs.bat primero para obtener las librerias necesarias" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host "  ✅ Todas las librerias necesarias estan presentes" -ForegroundColor Green
Write-Host ""

try {
    # Crear configuración JSON
    $config = @{
        host = $DbHost
        port = $Port
        database = $Database
        user = $User
        password = $Password
        charset = "UTF8"
        connectionTimeout = 60
        commandTimeout = 120
    }
    
    $configJson = $config | ConvertTo-Json -Compress
    
    Write-Host "Iniciando test de conexion..." -ForegroundColor Yellow
    
    # Ejecutar script principal
    $scriptPath = Join-Path $PSScriptRoot "FirebirdBridge.ps1"
    
    if (-not (Test-Path $scriptPath)) {
        throw "Script FirebirdBridge.ps1 no encontrado en: $scriptPath"
    }
    
    $result = & $scriptPath -Operation "test_connection" -ConfigJson $configJson
    
    if (-not $result) {
        throw "No se recibio respuesta del script FirebirdBridge.ps1"
    }
    
    # Parsear resultado
    try {
        $resultObj = $result | ConvertFrom-Json
    } catch {
        Write-Host "Error parseando respuesta JSON:" -ForegroundColor Red
        Write-Host $result -ForegroundColor Gray
        throw "Respuesta invalida del script: $($_.Exception.Message)"
    }
    
    Write-Host "Resultado del test:" -ForegroundColor Yellow
    Write-Host ($resultObj | ConvertTo-Json -Depth 10) -ForegroundColor Gray
    
    if ($resultObj.success) {
        Write-Host ""
        Write-Host "✅ CONEXION EXITOSA" -ForegroundColor Green
        Write-Host "   Tiempo de servidor: $($resultObj.server_time)" -ForegroundColor Green
        Write-Host "   Tiempo de ejecucion: $($resultObj.execution_time)" -ForegroundColor Green
        Write-Host "   Metodo: $($resultObj.method)" -ForegroundColor Green
        
        # Probar consulta simple
        Write-Host ""
        Write-Host "Probando consulta simple..." -ForegroundColor Yellow
        
        try {
            $queryResult = & $scriptPath -Operation "execute_query" -ConfigJson $configJson -Query "SELECT COUNT(*) as TOTAL_TABLES FROM RDB`$RELATIONS WHERE RDB`$RELATION_TYPE = 0"
            $queryObj = $queryResult | ConvertFrom-Json
        } catch {
            Write-Host "❌ Error en consulta de prueba: $($_.Exception.Message)" -ForegroundColor Red
            exit 1
        }
        
        if ($queryObj.success -and $queryObj.data.Count -gt 0) {
            $totalTables = $queryObj.data[0].TOTAL_TABLES
            Write-Host "✅ Consulta exitosa: $totalTables tablas encontradas en la base de datos" -ForegroundColor Green
            
            # Probar copia de base de datos (simulada)
            Write-Host ""
            Write-Host "Probando funcionalidad de copia..." -ForegroundColor Yellow
            $tempSource = $Database
            $tempDest = [System.IO.Path]::ChangeExtension($Database, ".backup.fdb")
            
            if (Test-Path $tempSource) {
                try {
                    $copyResult = & $scriptPath -Operation "copy_database" -SourcePath $tempSource -DestinationPath $tempDest
                    $copyObj = $copyResult | ConvertFrom-Json
                    
                    if ($copyObj.success) {
                        Write-Host "✅ Funcionalidad de copia verificada" -ForegroundColor Green
                        # Limpiar archivo temporal
                        if (Test-Path $tempDest) {
                            Remove-Item $tempDest -Force -ErrorAction SilentlyContinue
                        }
                    } else {
                        Write-Host "⚠️  Advertencia en copia: $($copyObj.error)" -ForegroundColor Yellow
                    }
                } catch {
                    Write-Host "⚠️  No se pudo probar la funcionalidad de copia: $($_.Exception.Message)" -ForegroundColor Yellow
                }
            }
            
        } else {
            Write-Host "❌ Error en consulta: $($queryObj.error)" -ForegroundColor Red
            exit 1
        }
        
        Write-Host ""
        Write-Host "🎉 TODAS LAS PRUEBAS COMPLETADAS EXITOSAMENTE" -ForegroundColor Green
        Write-Host "   El sistema PowerShell esta listo para usar" -ForegroundColor Green
        
        exit 0
    } else {
        Write-Host ""
        Write-Host "❌ CONEXION FALLIDA" -ForegroundColor Red
        Write-Host "   Error: $($resultObj.error)" -ForegroundColor Red
        
        if ($resultObj.method) {
            Write-Host "   Metodo: $($resultObj.method)" -ForegroundColor Red
        }
        
        Write-Host ""
        Write-Host "💡 POSIBLES SOLUCIONES:" -ForegroundColor Yellow
        Write-Host "   1. Verificar que Firebird Server esta ejecutandose" -ForegroundColor White
        Write-Host "   2. Verificar la ruta del archivo de base de datos" -ForegroundColor White
        Write-Host "   3. Verificar credenciales (usuario/contraseña)" -ForegroundColor White
        Write-Host "   4. Verificar que el puerto 3050 esta abierto" -ForegroundColor White
        Write-Host "   5. Ejecutar como Administrador si hay problemas de permisos" -ForegroundColor White
        
        exit 1
    }
}
catch {
    Write-Host ""
    Write-Host "❌ ERROR CRITICO: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔍 INFORMACION DE DEBUG:" -ForegroundColor Yellow
    Write-Host "   Script: $($MyInvocation.MyCommand.Path)" -ForegroundColor White
    Write-Host "   PowerShell: $($PSVersionTable.PSVersion)" -ForegroundColor White
    Write-Host "   .NET Runtime: " -NoNewline -ForegroundColor White
    try {
        $dotnetVersion = dotnet --list-runtimes | Select-String "Microsoft.NETCore.App 8.0" | Select-Object -First 1
        Write-Host $dotnetVersion -ForegroundColor White
    } catch {
        Write-Host "No disponible" -ForegroundColor Red
    }
    
    exit 1
}