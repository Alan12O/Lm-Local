Write-Host "Cual compilacion desea realizar? Release/Debug/Clean" -ForegroundColor Cyan
$opcion = Read-Host

if ($opcion -eq "Release" -or $opcion -eq "1") {
    Write-Host "`n--- Entorno de Compilacion Configurado ---" -ForegroundColor Green

    Write-Host "`n[1] Version de Java que se usara:" -ForegroundColor Cyan
    java -version

    # Injecting Qualcomm SDK Path for Native Build
    $env:QNN_SDK_ROOT = "C:\Users\alan.LOQ_2\Downloads\v2.45.0.260326\qairt\2.45.0.260326"

    Write-Host "`n[2] Iniciando la construccion de la app..." -ForegroundColor Yellow
    Set-Location .\android
    .\gradlew assembleRelease
    #si la compilacion fue exitosa
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n[3] APK generado exitosamente en:" -ForegroundColor Green
        Write-Host "C:\Users\alan.LOQ_2\IA-local\android\app\build\outputs\apk\release\app-release.apk" -ForegroundColor Cyan
        Write-Host "Desea instalar la apk? y/n" -ForegroundColor Blue
        $respuesta = Read-Host

        if ($respuesta -eq "Y" -or $respuesta -eq "y") {
            adb install C:\Users\alan.LOQ_2\IA-local\android\app\build\outputs\apk\release\app-release.apk
            Write-Host "`n[4] APK instalado exitosamente" -ForegroundColor Green
        }
        else {
            Write-Host "`n[4] APK no instalado" -ForegroundColor Red
        }
    }
    else {
        Write-Host "`n[3] APK no generado" -ForegroundColor Red
    }
    Write-Host "`n[5] saliendo..." -ForegroundColor Blue
    Set-Location ..
    Write-Host "La compilacion fue en release" -ForegroundColor Green

}

if ($opcion -eq "Clean" -or $opcion -eq "3") {
    Write-Host "`n--- Entorno de Compilacion Configurado ---" -ForegroundColor Green

    Write-Host "`n[1] Version de Java que se usara:" -ForegroundColor Cyan
    java -version

    Write-Host "`n[2] Iniciando la limpieza de la app..." -ForegroundColor Yellow
    Set-Location .\android
    .\gradlew clean
    Write-Host "`n[3] Limpieza completada exitosamente" -ForegroundColor Green
    Write-Host "`n[4] saliendo..." -ForegroundColor Blue
    Set-Location ..
    Write-Host "La compilacion fue en clean" -ForegroundColor Green

}
if ($opcion -eq "Debug" -or $opcion -eq "2") {
    $env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.18.8-hotspot"
    $env:ANDROID_HOME = "C:\Android\android-sdk"
    $env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\cmdline-tools\latest\bin;$env:PATH"

    Write-Host "`n--- Entorno de Compilacion Configurado ---" -ForegroundColor Green

    Write-Host "`n[1] Version de Java que se usara:" -ForegroundColor Cyan
    java -version

    Write-Host "`n[2] Celulares conectados detectados:" -ForegroundColor Cyan
    adb devices

    # Injecting Qualcomm SDK Path for Native Build
    $env:QNN_SDK_ROOT = "C:\Users\alan.LOQ_2\Downloads\v2.45.0.260326\qairt\2.45.0.260326"

    Write-Host "`n[3] Iniciando la construccion de la app..." -ForegroundColor Yellow
    npm run android
    Write-Host "La compilacion fue en debug" -ForegroundColor Green
}
write-host "Saliendo..." -ForegroundColor Cyan