$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.18.8-hotspot"
$env:ANDROID_HOME = "C:\Android\android-sdk"
$env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\cmdline-tools\latest\bin;$env:PATH"

Write-Host "`n--- Entorno de Compilacion Configurado ---" -ForegroundColor Green

Write-Host "`n[1] Version de Java que se usara:" -ForegroundColor Cyan
java -version

Write-Host "`n[2] Celulares conectados detectados:" -ForegroundColor Cyan
adb devices

Write-Host "`n[3] Iniciando la construccion de la app..." -ForegroundColor Yellow
npm run android
