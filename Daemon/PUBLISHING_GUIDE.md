# Solana Mobile dApp Store Publishing Guide

## Status Setup
✅ Publishing tools installed
✅ Folders created (publishing/media, publishing/files)
⏳ Release APK build (fixing R8 error)
⏳ Config.yaml populated
⏳ Solana keypair created
⏳ Validation & submission

## Prerequisites Completed
- ✅ Node.js v22.20.0
- ✅ Java OpenJDK 25
- ✅ Android SDK Tools 33.0.1
- ✅ dApp Store CLI installed
- ✅ .env configured with ANDROID_TOOLS_DIR

## Next Steps

### 1. Fix Build Error & Create Release APK
**Issue**: R8 minification error - duplicate SeedVault$AccessType class

**Solution**: Removed duplicate SeedVault.java (using SDK version)

Build command:
```powershell
cd android
.\gradlew.bat assembleRelease
```

Copy APK to publishing:
```powershell
Copy-Item android\app\build\outputs\apk\release\app-release.apk publishing\files\app-release.apk
```

### 2. Prepare Publishing Assets

#### Required Assets (place in `publishing/media/`):
- **App Icon**: 512x512px PNG (create from favicon.svg)
- **Banner**: 1200x600px PNG
- **Screenshots**: Minimum 4 images, 1080p (1920x1080px), same orientation
- **Feature Graphic** (Optional): 1200x1200px for Editor's Choice

#### Current Assets:
- ✅ favicon.svg → needs resize to 512x512 for icon
- ⏳ Banner (create from logo)
- ⏳ Screenshots (take from app)

### 3. Update config.yaml

Required fields to fill:
```yaml
publisher:
  name: "Daemon Protocol" # Update with actual publisher name
  website: "https://daemonprotocol.com"
  email: "contact@daemonprotocol.com" # Update with actual email
  support_email: "support@daemonprotocol.com" # Optional

app:
  name: "Daemon Seeker App"
  android_package: "com.daemon.seeker"
  urls:
    license_url: "https://daemonprotocol.com/terms" # Update with actual URL
    copyright_url: "https://daemonprotocol.com/copyright" # Update with actual URL
    privacy_policy_url: "https://daemonprotocol.com/privacy" # Update with actual URL
    website: "https://daemonprotocol.com"
  media:
    - purpose: icon
      uri: "media/app-icon.png"

release:
  media:
    - purpose: icon
      uri: "media/app-icon.png"
    - purpose: banner
      uri: "media/banner.png"
    - purpose: screenshot
      uri: "media/screenshot1.png"
    - purpose: screenshot
      uri: "media/screenshot2.png"
    - purpose: screenshot
      uri: "media/screenshot3.png"
    - purpose: screenshot
      uri: "media/screenshot4.png"
  files:
    - purpose: install
      uri: "files/app-release.apk"
  catalog:
    en-US:
      name: "Daemon Seeker App"
      short_description: "AI-powered security audit and analysis tool for Solana dApps"
      long_description: |
        Daemon Seeker App provides comprehensive security auditing and analysis 
        for Solana decentralized applications. Features include smart contract 
        analysis, vulnerability detection, and detailed security reports.
      new_in_version: "Initial release v1.0.0"
  android_details:
    locales:
      - en-US

solana_mobile_dapp_publisher_portal:
  testing_instructions: |
    App can be tested without authentication (bypass mode enabled for beta).
    Navigate directly to Chat Copilot from loader screen.
```

### 4. Create Solana Keypair for Publishing

```powershell
# Generate new keypair
solana-keygen new --outfile publishing/dapp-keypair.json

# Fund with SOL (for devnet/testing)
solana airdrop 1 <YOUR_PUBKEY> --url devnet
```

**⚠️ IMPORTANT**: Keep keypair safe! It's needed for all future app updates.

### 5. Validate Configuration

```powershell
cd publishing
npx dapp-store validate -k dapp-keypair.json -b $env:ANDROID_TOOLS_DIR
```

Expected output:
```
App JSON valid!
Release JSON valid!
```

### 6. Mint App NFT (First Time Only)

```powershell
# For devnet (testing)
npx dapp-store create app -k dapp-keypair.json

# For mainnet-beta (production)
npx dapp-store create app -k dapp-keypair.json -u https://YOUR_RPC_URL
```

**Note**: This is a one-time operation per app. The mint address will be recorded in config.yaml.

### 7. Mint Release NFT

```powershell
# For devnet (testing)
npx dapp-store create release -k dapp-keypair.json -b $env:ANDROID_TOOLS_DIR

# For mainnet-beta (production)
npx dapp-store create release -k dapp-keypair.json -b $env:ANDROID_TOOLS_DIR -u https://YOUR_RPC_URL
```

**Repeat for each new version** you want to release.

### 8. Submit for Review

```powershell
# Mainnet-beta only
npx dapp-store publish submit -k dapp-keypair.json -u https://YOUR_RPC_URL --requestor-is-authorized --complies-with-solana-dapp-store-policies
```

### 9. Contact for App Review

After submission:
1. Join [Solana Mobile Discord](https://discord.gg/solanamobile)
2. Get developer role in `#developer` channel
3. Post in `#dapp-store` channel that you've completed submission
4. Wait for review team contact

## Important Notes

- **Signing Key**: Use a NEW signing key solely for dApp Store (NOT Google Play key)
- **RPC Endpoint**: Use private RPC URL for better reliability
- **Network Speed**: Minimum 0.25 MB/s upload required
- **Priority Fee**: Default 500000 lamports (can customize with `-p` flag)
- **Localization**: Currently only en-US, can add more locales later

## Troubleshooting

### R8 Build Error
If you see duplicate class errors:
- Add ProGuard rules to keep SDK classes
- Remove duplicate source files if using SDK as dependency

### Validation Errors
- Check all required fields in config.yaml are filled
- Ensure asset paths are correct (relative to publishing folder)
- Verify APK is release build and signed

### NFT Minting Errors
- Ensure wallet has enough SOL
- Check RPC endpoint connectivity
- Verify keypair path is correct

