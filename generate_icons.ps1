param (
    [string]$SourceImage = "C:\Users\alan.LOQ_2\.gemini\antigravity\brain\7bcae42d-9dc9-49d2-92f4-cd631f20996f\lm_local_app_icon_1775343222277.png",
    [string]$ResPath = "C:\Users\alan.LOQ_2\IA-local\android\app\src\main\res"
)

Add-Type -AssemblyName System.Drawing

$sizes = @{
    "mdpi"    = 48
    "hdpi"    = 72
    "xhdpi"   = 96
    "xxhdpi"  = 144
    "xxxhdpi" = 192
}

if (-Not (Test-Path $SourceImage)) {
    Write-Error "Source image not found at $SourceImage"
    exit 1
}

$img = [System.Drawing.Image]::FromFile($SourceImage)

foreach ($key in $sizes.Keys) {
    $size = $sizes[$key]
    $folder = Join-Path $ResPath "mipmap-$key"
    if (-Not (Test-Path $folder)) {
        New-Item -ItemType Directory -Path $folder | Out-Null
    }

    $destBitmap = New-Object System.Drawing.Bitmap($img, $size, $size)
    
    # Save standard launchers
    $dest1 = Join-Path $folder "ic_launcher.png"
    $destBitmap.Save($dest1, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Host "Created $dest1"

    $dest2 = Join-Path $folder "ic_launcher_round.png"
    $destBitmap.Save($dest2, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Host "Created $dest2"

    $dest3 = Join-Path $folder "ic_launcher_foreground.png"
    $destBitmap.Save($dest3, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Host "Created $dest3"

    $destBitmap.Dispose()
}

$img.Dispose()
Write-Host "All icons generated successfully."
