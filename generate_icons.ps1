param (
    [string]$SourceImage = "C:\Users\alan.LOQ_2\.gemini\antigravity\brain\3c951aa6-2193-43f6-bf8a-edb526a9b387\media__1775573430629.jpg",
    [string]$AndroidResPath = "C:\Users\alan.LOQ_2\IA-local\android\app\src\main\res",
    [string]$IosAssetPath = "C:\Users\alan.LOQ_2\IA-local\ios\OffgridMobile\Images.xcassets\AppIcon.appiconset",
    [string]$AppAssetPath = "C:\Users\alan.LOQ_2\IA-local\src\assets"
)

Add-Type -AssemblyName System.Drawing

if (-Not (Test-Path $SourceImage)) {
    Write-Error "Source image not found at $SourceImage"
    exit 1
}

$img = [System.Drawing.Image]::FromFile($SourceImage)

# SECTION 1: ANDROID MIMPAPS
Write-Host "--- Generating Android Icons ---"
$androidSizes = @{
    "mdpi"    = 48
    "hdpi"    = 72
    "xhdpi"   = 96
    "xxhdpi"  = 144
    "xxxhdpi" = 192
}

foreach ($key in $androidSizes.Keys) {
    $size = $androidSizes[$key]
    $folder = Join-Path $AndroidResPath "mipmap-$key"
    if (-Not (Test-Path $folder)) {
        New-Item -ItemType Directory -Path $folder | Out-Null
    }

    $destBitmap = New-Object System.Drawing.Bitmap($img, $size, $size)
    $dest1 = Join-Path $folder "ic_launcher.png"
    $destBitmap.Save($dest1, [System.Drawing.Imaging.ImageFormat]::Png)
    $dest2 = Join-Path $folder "ic_launcher_round.png"
    $destBitmap.Save($dest2, [System.Drawing.Imaging.ImageFormat]::Png)
    $dest3 = Join-Path $folder "ic_launcher_foreground.png"
    $destBitmap.Save($dest3, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Host "Created Android icons in $folder ($size px)"
    $destBitmap.Dispose()
}

# SECTION 2: IOS ICONS
Write-Host "`n--- Generating iOS Icons ---"
if (-Not (Test-Path $IosAssetPath)) {
    Write-Warning "iOS Asset Path not found: $IosAssetPath. Skipping iOS generation."
} else {
    $iosIcons = @{
        "icon-40.png"   = 40
        "icon-58.png"   = 58
        "icon-60.png"   = 60
        "icon-80.png"   = 80
        "icon-87.png"   = 87
        "icon-120.png"  = 120
        "icon-180.png"  = 180
        "icon-1024.png" = 1024
    }

    foreach ($filename in $iosIcons.Keys) {
        $size = $iosIcons[$filename]
        $destPath = Join-Path $IosAssetPath $filename
        $destBitmap = New-Object System.Drawing.Bitmap($img, $size, $size)
        $destBitmap.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
        Write-Host "Created iOS icon: $filename ($size px)"
        $destBitmap.Dispose()
    }
}

# SECTION 3: INTERNAL APP LOGO
Write-Host "`n--- Updating App Internal Logo ---"
if (Test-Path $AppAssetPath) {
    $logoPath = Join-Path $AppAssetPath "logo.png"
    $logoBitmap = New-Object System.Drawing.Bitmap($img, 512, 512)
    $logoBitmap.Save($logoPath, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Host "Updated internal app logo at $logoPath"
    $logoBitmap.Dispose()
}

$img.Dispose()
Write-Host "`nAll icons generated successfully using original user image."
