Write-Host "`n--- Entorno de Compilacion Configurado ---" -ForegroundColor Green

Write-Host "`n[1] Version de Java que se usara:" -ForegroundColor Cyan
java -version

Write-Host "`n[2] Iniciando la construccion de la app..." -ForegroundColor Yellow
Set-Location .\android
.\gradlew assembleRelease
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
Write-Host "`n[5] saliendo..." -ForegroundColor Blue
Set-Location ..