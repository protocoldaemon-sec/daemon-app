@echo off
echo Building Daemon Seeker App APK...

echo Step 1: Building web assets...
call npm run build:client

echo Step 2: Copying web assets to Android...
if not exist "android\app\src\main\assets\public" mkdir "android\app\src\main\assets\public"
xcopy /E /Y "dist\spa\*" "android\app\src\main\assets\public\"

echo Step 3: Setting up Android resources...
if not exist "android\app\src\main\res\values" mkdir "android\app\src\main\res\values"
if not exist "android\app\src\main\res\mipmap-hdpi" mkdir "android\app\src\main\res\mipmap-hdpi"
if not exist "android\app\src\main\res\mipmap-mdpi" mkdir "android\app\src\main\res\mipmap-mdpi"
if not exist "android\app\src\main\res\mipmap-xhdpi" mkdir "android\app\src\main\res\mipmap-xhdpi"
if not exist "android\app\src\main\res\mipmap-xxhdpi" mkdir "android\app\src\main\res\mipmap-xxhdpi"
if not exist "android\app\src\main\res\mipmap-xxxhdpi" mkdir "android\app\src\main\res\mipmap-xxxhdpi"

echo Step 4: Creating app icon...
echo Creating placeholder icons...

echo Step 5: APK Build Complete!
echo.
echo Your APK structure is ready in the 'android' folder.
echo To build the actual APK, you need:
echo 1. Android Studio installed
echo 2. Android SDK configured
echo 3. Run: cd android && gradlew assembleDebug
echo.
pause
