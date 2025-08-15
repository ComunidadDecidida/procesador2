@echo off
echo ========================================
echo  INSTALAR LIBRERÍAS .NET PARA POWERSHELL
echo  Interface de Gestión para Vigencias
echo ========================================
echo.

echo [1/6] Verificando .NET Runtime...
dotnet --list-runtimes | findstr "Microsoft.NETCore.App 8.0" >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ERROR: .NET 8.0 Runtime no está instalado
    echo.
    echo INSTRUCCIONES DE INSTALACIÓN:
    echo 1. Ve a: https://dotnet.microsoft.com/download/dotnet/8.0
    echo 2. Descarga ".NET 8.0 Runtime" ^(NO SDK^)
    echo 3. Instala con configuración por defecto
    echo 4. Reinicia el ordenador
    echo 5. Ejecuta este script de nuevo
    echo.
    pause
    exit /b 1
)
echo ✅ .NET 8.0 Runtime encontrado

echo.
echo [2/6] Verificando PowerShell...
powershell -Command "Write-Host 'PowerShell OK'" >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ERROR: PowerShell no está disponible
    pause
    exit /b 1
)
echo ✅ PowerShell disponible

echo.
echo [3/6] Creando directorio de librerías...
if not exist "libs" (
    mkdir libs
    echo ✅ Directorio 'libs' creado
) else (
    echo ✅ Directorio 'libs' ya existe
)

echo.
echo [4/6] Verificando librerías existentes...
set FOUND_LIBS=0

if exist "libs\System.Runtime.CompilerServices.Unsafe.dll" (
    echo ✅ System.Runtime.CompilerServices.Unsafe.dll - ENCONTRADO
    set /a FOUND_LIBS+=1
) else (
    echo ❌ System.Runtime.CompilerServices.Unsafe.dll - FALTANTE ^(CRÍTICO^)
)

if exist "libs\System.Threading.Tasks.Extensions.dll" (
    echo ✅ System.Threading.Tasks.Extensions.dll - ENCONTRADO
    set /a FOUND_LIBS+=1
) else (
    echo ❌ System.Threading.Tasks.Extensions.dll - FALTANTE
)

if exist "libs\System.Text.Json.dll" (
    echo ✅ System.Text.Json.dll - ENCONTRADO
    set /a FOUND_LIBS+=1
) else (
    echo ❌ System.Text.Json.dll - FALTANTE
)

if exist "libs\System.Configuration.ConfigurationManager.dll" (
    echo ✅ System.Configuration.ConfigurationManager.dll - ENCONTRADO
    set /a FOUND_LIBS+=1
) else (
    echo ❌ System.Configuration.ConfigurationManager.dll - FALTANTE
)

if exist "libs\FirebirdSql.Data.FirebirdClient.dll" (
    echo ✅ FirebirdSql.Data.FirebirdClient.dll - ENCONTRADO
    set /a FOUND_LIBS+=1
) else (
    echo ❌ FirebirdSql.Data.FirebirdClient.dll - FALTANTE ^(CRÍTICO^)
)

if exist "libs\MySql.Data.dll" (
    echo ✅ MySql.Data.dll - ENCONTRADO
    set /a FOUND_LIBS+=1
) else (
    echo ❌ MySql.Data.dll - FALTANTE
)

echo.
echo [5/6] Estado de librerías: %FOUND_LIBS%/6 encontradas

if %FOUND_LIBS% geq 4 (
    echo.
    echo 🎉 ¡LIBRERÍAS SUFICIENTES PRESENTES!
    if %FOUND_LIBS%==6 (
        echo ✅ Todas las librerías están disponibles
        echo ✅ Soporte completo para Firebird y MySQL
    ) else (
        echo ⚠️  Algunas librerías opcionales faltan pero el sistema funcionará
    )
    echo.
    echo Ya puedes usar el bridge PowerShell
    echo.
    echo Para probar la conexión:
    echo   powershell -ExecutionPolicy Bypass -File test_connection.ps1
    echo.
) else (
    echo.
    echo ⚠️  FALTAN LIBRERÍAS CRÍTICAS
    echo.
    echo 📖 INSTRUCCIONES PARA OBTENER LAS LIBRERÍAS:
    echo.
    echo MÉTODO 1 - Proyecto Temporal ^(RECOMENDADO^):
    echo 1. Abrir PowerShell en un directorio temporal
    echo 2. Ejecutar: dotnet new console -n FirebirdLibs
    echo 3. Ejecutar: cd FirebirdLibs
    echo 4. Ejecutar: dotnet add package FirebirdSql.Data.FirebirdClient --version 10.3.1
    echo 5. Ejecutar: dotnet add package MySql.Data --version 8.2.0
    echo 6. Ejecutar: dotnet add package System.Threading.Tasks.Extensions --version 4.5.4
    echo 7. Ejecutar: dotnet add package System.Text.Json --version 8.0.5
    echo 8. Ejecutar: dotnet add package System.Configuration.ConfigurationManager --version 8.0.1
    echo 9. Ejecutar: dotnet build
    echo 10. Copiar DLL desde bin\Debug\net8.0\ a este directorio libs\
    echo.
    echo MÉTODO 2 - Descarga Manual desde NuGet:
    echo 1. Ve a: https://www.nuget.org/packages/FirebirdSql.Data.FirebirdClient/10.3.1
    echo 2. Clic en "Download package"
    echo 3. Renombrar .nupkg a .zip y extraer
    echo 4. Copiar DLL desde lib\net6.0\ a libs\
    echo 5. Repetir para cada paquete
    echo.
    echo LIBRERÍAS REQUERIDAS:
    echo - FirebirdSql.Data.FirebirdClient ^(v10.3.1^) - CRÍTICO
    echo - System.Runtime.CompilerServices.Unsafe ^(v6.0.0^) - CRÍTICO
    echo - System.Threading.Tasks.Extensions ^(v4.5.4^)
    echo - System.Text.Json ^(v8.0.5^)
    echo - System.Configuration.ConfigurationManager ^(v8.0.1^)
    echo - MySql.Data ^(v8.2.0^) - Para MySQL
)

echo.
echo [6/6] Información del sistema:
echo 📁 Directorio actual: %CD%
echo 📁 Directorio libs: %CD%\libs
echo 🖥️  Sistema: %OS% %PROCESSOR_ARCHITECTURE%
echo ⚡ .NET Runtime: 
dotnet --list-runtimes | findstr "Microsoft.NETCore.App 8.0"
echo.

if %FOUND_LIBS% geq 4 (
    echo 🚀 SISTEMA LISTO PARA USAR
    echo.
    echo Comandos disponibles:
    echo   - Probar Firebird: powershell -ExecutionPolicy Bypass -File test_connection.ps1
    echo   - Ver ayuda: powershell -ExecutionPolicy Bypass -File FirebirdBridge.ps1 -Operation help
) else (
    echo ⚠️  SISTEMA NO LISTO - Instala las librerías faltantes
)

echo.
pause