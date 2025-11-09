# PowerShell script to setup Android build environment
Write-Host "🔧 Setting up Android build environment..." -ForegroundColor Green

# Download Gradle Wrapper JAR
Write-Host "📦 Downloading Gradle Wrapper JAR..." -ForegroundColor Yellow
$gradleWrapperUrl = "https://github.com/gradle/gradle/raw/v8.4.0/gradle/wrapper/gradle-wrapper.jar"
$gradleWrapperPath = "android\gradle\wrapper\gradle-wrapper.jar"

try {
    Invoke-WebRequest -Uri $gradleWrapperUrl -OutFile $gradleWrapperPath -UseBasicParsing
    Write-Host "✅ Gradle Wrapper JAR downloaded successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to download Gradle Wrapper JAR" -ForegroundColor Red
    Write-Host "Please download manually from: $gradleWrapperUrl" -ForegroundColor Yellow
}

# Create missing resource directories
Write-Host "📁 Creating missing resource directories..." -ForegroundColor Yellow
$resourceDirs = @(
    "android\app\src\main\res\xml",
    "android\app\src\main\res\drawable",
    "android\app\src\main\res\values-night"
)

foreach ($dir in $resourceDirs) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "Created: $dir" -ForegroundColor Cyan
    }
}

# Create missing XML files
Write-Host "📄 Creating missing XML configuration files..." -ForegroundColor Yellow

# data_extraction_rules.xml
$dataExtractionRules = @"
<?xml version="1.0" encoding="utf-8"?>
<data-extraction-rules>
    <cloud-backup>
        <include domain="sharedpref" path="." />
        <exclude domain="sharedpref" path="device.xml" />
    </cloud-backup>
    <device-transfer>
        <include domain="sharedpref" path="." />
        <exclude domain="sharedpref" path="device.xml" />
    </device-transfer>
</data-extraction-rules>
"@
$dataExtractionRules | Out-File -FilePath "android\app\src\main\res\xml\data_extraction_rules.xml" -Encoding UTF8

# backup_rules.xml
$backupRules = @"
<?xml version="1.0" encoding="utf-8"?>
<full-backup-content>
    <include domain="sharedpref" path="." />
    <exclude domain="sharedpref" path="device.xml" />
</full-backup-content>
"@
$backupRules | Out-File -FilePath "android\app\src\main\res\xml\backup_rules.xml" -Encoding UTF8

# file_paths.xml
$filePaths = @"
<?xml version="1.0" encoding="utf-8"?>
<paths xmlns:android="http://schemas.android.com/apk/res/android">
    <external-path name="external_files" path="." />
    <external-files-path name="external_files" path="." />
    <cache-path name="cache" path="." />
    <external-cache-path name="external_cache" path="." />
    <files-path name="files" path="." />
</paths>
"@
$filePaths | Out-File -FilePath "android\app\src\main\res\xml\file_paths.xml" -Encoding UTF8

# splashscreen.xml
$splashScreen = @"
<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:drawable="@android:color/black" />
    <item>
        <bitmap
            android:gravity="center"
            android:src="@mipmap/ic_launcher" />
    </item>
</layer-list>
"@
$splashScreen | Out-File -FilePath "android\app\src\main\res\drawable\splashscreen.xml" -Encoding UTF8

Write-Host "✅ All configuration files created successfully" -ForegroundColor Green

# Build web assets and copy to Android
Write-Host "🌐 Building web assets..." -ForegroundColor Yellow
npm run build:client

Write-Host "📱 Copying web assets to Android..." -ForegroundColor Yellow
if (Test-Path "dist\spa") {
    Copy-Item "dist\spa\*" "android\app\src\main\assets\public\" -Recurse -Force
    Write-Host "✅ Web assets copied successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Web assets not found. Please run 'npm run build:client' first" -ForegroundColor Red
}

Write-Host "`n🎉 Android build environment setup complete!" -ForegroundColor Green
Write-Host "`n📋 Next steps:" -ForegroundColor Yellow
Write-Host "1. Install Android Studio if you haven't already" -ForegroundColor White
Write-Host "2. Generate app icons using create-app-icon.html" -ForegroundColor White
Write-Host "3. Open Android Studio and import the 'android' folder" -ForegroundColor White
Write-Host "4. Build APK using: Build → Build Bundle(s) / APK(s) → Build APK(s)" -ForegroundColor White
Write-Host "`nOr use command line:" -ForegroundColor Cyan
Write-Host "cd android" -ForegroundColor Gray
Write-Host ".\gradlew.bat assembleDebug" -ForegroundColor Gray

Write-Host "`n📖 For detailed instructions, see: MOBILE_BUILD_GUIDE.md" -ForegroundColor Magenta
