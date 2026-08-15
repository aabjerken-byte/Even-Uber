# Even Uber iOS – GitHub Actions CI/CD Setup

This guide explains how to build your iOS companion app automatically in the cloud using **GitHub Actions**.

## Overview

GitHub Actions runs on Apple's macOS servers, so you can:
- ✅ Build the iOS app without owning a Mac
- ✅ Run tests automatically on every push
- ✅ Generate signed `.ipa` files for TestFlight
- ✅ Get build reports and artifacts

**Cost**: Free for public repos, included in GitHub Pro

---

## Quick Start (5 minutes)

### 1. Push Your Code to GitHub

```bash
cd C:\Users\abjer.000\EvenG2-Dev
git add EvenUber/ios-companion/
git commit -m "Add iOS companion app Swift files"
git push origin feature/even-uber
```

### 2. Go to Your GitHub Repo

Open: https://github.com/aabjerken-byte/Executive-Whisperer

### 3. Check Actions Tab

Click **Actions** → You should see **"Build iOS Companion App"** workflow running

### 4. Wait for Build to Complete

- ✅ Takes ~10 minutes on first run (Xcode setup)
- ✅ Faster on subsequent runs (~5 minutes)
- ✅ Downloads build logs and artifacts

### 5. View Results

- Click the workflow run
- See **Build logs** and **Swift validation** results
- Download **artifacts** (build summary)

---

## Workflow Files Explained

### 1. `ios-build.yml` (Main Build Workflow)

**Triggered by**:
- ✅ Push to `main`, `feature/*`, or `develop` branches
- ✅ Pull requests
- ✅ Manual trigger (Actions tab → "Run workflow")

**What it does**:
```
1. Checks out your code
2. Sets up Xcode 15 + Swift 5.9
3. Validates all Swift files
4. Runs swiftlint (code style check)
5. Creates build summary report
6. Uploads artifacts
```

**View results**:
```
GitHub → Actions → "Build iOS Companion App" 
  → Click the latest run
  → See build summary and logs
```

### 2. `ios-build-signed.yml` (Signed App Workflow)

**Triggered by**:
- ⏳ Manual trigger only (safer for secrets)
- ⏳ Releases (when you create a GitHub release)

**What it does**:
```
1. Imports code signing certificate
2. Loads provisioning profile
3. Builds for iPhone (not just simulator)
4. Creates signed .ipa file
5. Uploads to release or artifacts
```

**Security**: Uses GitHub Secrets (encrypted, not visible in logs)

---

## Step 1: Enable the Basic Build Workflow

The `ios-build.yml` workflow is already set up and will run automatically.

### To trigger manually:
1. Go to https://github.com/aabjerken-byte/Executive-Whisperer/actions
2. Click **Build iOS Companion App**
3. Click **Run workflow**
4. Wait ~10 minutes

### To see results:
```
Actions → Build iOS Companion App → [Run Number]
  ├─ Logs
  ├─ Artifacts
  │  ├─ build-logs
  │  └─ build-summary
  └─ Build Summary (text)
```

---

## Step 2: Set Up Code Signing (Optional, for TestFlight)

To generate a signed `.ipa` file for TestFlight:

### 2A. Get Your Code Signing Certificate

On a Mac (or borrow one):

```bash
# Open Keychain Access
open /Applications/Utilities/Keychain\ Access.app

# Right-click on Apple Development certificate
# Export as .p12 file
# Save as: ~/Downloads/certificate.p12
```

### 2B. Encode Certificate as Base64

```bash
# Convert to Base64
base64 -i ~/Downloads/certificate.p12 | pbcopy

# This copies the Base64 string to clipboard
```

### 2C. Add to GitHub Secrets

1. Go to: https://github.com/aabjerken-byte/Executive-Whisperer/settings/secrets/actions
2. Click **New repository secret**
3. Create these secrets:

| Secret Name | Value |
|------------|-------|
| `BUILD_CERTIFICATE_BASE64` | Paste Base64 from step 2B |
| `P12_PASSWORD` | Password you used for .p12 file |
| `KEYCHAIN_PASSWORD` | Any password (used in CI) |

### 2D. Add Provisioning Profile (Optional)

If you have a provisioning profile:

```bash
# Encode provisioning profile
base64 -i ~/Downloads/profile.mobileprovision | pbcopy
```

Add to GitHub Secrets:
- `PROVISIONING_PROFILE_BASE64`: <Base64 string>

### 2E. Trigger Signed Build

```
Actions → Build iOS App (Signed) → Run workflow
```

---

## Secrets Management

### Safe Practices ✅
- ✅ Store certificates in GitHub Secrets (encrypted)
- ✅ Never commit `.p12` files to git
- ✅ Use strong passwords
- ✅ Rotate certificates annually

### Sensitive Data ❌
- ❌ Don't paste secrets in commit messages
- ❌ Don't commit certificate files
- ❌ Don't share password in code
- ❌ Don't log secrets in build output

**GitHub automatically masks secrets in logs**

---

## Understanding the Workflows

### Build Flow

```
Code pushed to GitHub
    ↓
GitHub Actions triggered
    ↓
macOS runner boots up
    ↓
Xcode 15 + Swift 5.9 installed
    ↓
Your code checked out
    ↓
Swift files validated
    ↓
Syntax checked
    ↓
Linter runs (swiftlint)
    ↓
Build summary created
    ↓
Artifacts uploaded
    ↓
Workflow completes (5-10 minutes)
```

### What Gets Checked

```
✅ Swift syntax (swiftc -parse)
✅ Swift types (swiftc -typecheck)
✅ Code style (swiftlint)
✅ No compiler errors
✅ All 9 files present
```

---

## Viewing Build Logs

### Real-Time Logs
1. Go to Actions tab
2. Click the running workflow
3. Expand sections to see detailed output

### Example Log Output
```
Run Setup Xcode
  ✅ Installing Xcode 15.0
  ✅ Setting up Swift 5.9
  
Run Display Xcode version
  /Applications/Xcode.app/Contents/Developer
  
Run Validate Swift Syntax
  Checking RideData.swift... ✅
  Checking NotificationParser.swift... ✅
  Checking EvenHubClient.swift... ✅
  ... (more files)
  
✅ All files validated successfully
```

### Download Artifacts
1. Click workflow run
2. Scroll down to **Artifacts**
3. Download `build-summary` or `build-logs`

---

## Troubleshooting

### Build Fails: "Xcode project not found"
**Cause**: Xcode project hasn't been created in Xcode yet
**Solution**: This is expected! Complete these steps:
1. Create Xcode project on macOS (follow XCODE_SETUP.md)
2. Push project to GitHub
3. Re-run workflow

### Build Fails: "Code signing failed"
**Cause**: Secrets not configured or wrong certificate
**Solution**:
1. Check GitHub Secrets are set correctly
2. Make sure cert is for the right team
3. Use the manual workflow (`ios-build-signed.yml`)

### Build Takes Too Long
**Normal**: First run is 10+ minutes (Xcode setup)
**Expected**: Subsequent runs are 5 minutes
**Optimization**: Xcode setup only runs once per runner

### Can't See Workflow Results
**Check**: 
1. Is code pushed to GitHub? `git push`
2. Is the file in `.github/workflows/`? Check repo
3. Is branch correct? (`main`, `develop`, or `feature/*`)

---

## Viewing Build Reports

### Build Summary Report
After build completes:
1. Go to Actions → Build run
2. Scroll to **Build Summary** section
3. View formatted report with:
   - Build date/time
   - Swift version
   - Xcode version
   - Files validated
   - Next steps

### Example Report
```
## iOS Build Summary

Build Date: Thu Aug 14 2026 15:45:00 GMT
Swift Version: Swift version 5.9
Xcode Version: /Applications/Xcode.app/Contents/Developer

### Files Validated
- ✅ RideData.swift
- ✅ NotificationParser.swift
- ✅ EvenHubClient.swift
- ✅ UberNotificationListener.swift
- ✅ NotificationPermissions.swift
- ✅ EvenUberCompanionApp.swift
- ✅ ContentView.swift
- ✅ StatusView.swift
- ✅ SettingsView.swift

### Next Steps
1. Complete Xcode project setup (see XCODE_SETUP.md)
2. Add code signing credentials
3. Configure provisioning profiles
4. Run on simulator or device
```

---

## Next Steps

### 1. Test the Basic Build (Right Now)
```
Actions → Build iOS Companion App → Run workflow
```
Watch it build your app in the cloud! ☁️

### 2. Create Xcode Project (On a Mac)
Follow `XCODE_SETUP.md` to create the actual Xcode project
Then push it to GitHub

### 3. Set Up Code Signing (When Ready)
Follow section **Step 2** above to enable signed builds

### 4. Generate TestFlight Build (When Ready)
```
Actions → Build iOS App (Signed) → Run workflow
Download .ipa → Install on iPhone
```

---

## Automating Tests

Once Xcode project exists, you can add unit tests:

```yaml
- name: Run Unit Tests
  run: |
    xcodebuild test \
      -scheme EvenUberCompanion \
      -configuration Debug \
      -sdk iphonesimulator \
      -derivedDataPath build
```

Tests will run automatically on every push!

---

## Commands Reference

### View Workflows
```bash
# List all workflows
gh workflow list
```

### Trigger Workflow Manually
```bash
# Run iOS build
gh workflow run ios-build.yml
```

### View Logs
```bash
# Download latest run logs
gh run download --dir ./logs
```

### See Run Status
```bash
# List recent runs
gh run list --workflow ios-build.yml
```

---

## Resources

- **GitHub Actions Docs**: https://docs.github.com/en/actions
- **Xcode on GitHub Actions**: https://github.com/maxim-lobanov/setup-xcode
- **Swift Package Manager**: https://www.swift.org/package-manager
- **Code Signing Secrets**: https://docs.github.com/en/actions/security-guides/encrypted-secrets

---

## FAQ

**Q: Do I need to pay for GitHub Actions?**  
A: No! Free for public repos, included in GitHub Pro

**Q: How long do builds take?**  
A: First run 10-15 minutes, subsequent runs 5 minutes

**Q: Can I build on Windows?**  
A: GitHub Actions runs on macOS servers automatically

**Q: Do I need my own Mac?**  
A: No! GitHub provides free Mac runners

**Q: Can I test on a real iPhone?**  
A: Yes! Download the .ipa and install via Xcode or Apple Configurator 2

**Q: Where are build artifacts stored?**  
A: GitHub stores them for 7-30 days (configurable)

---

## Success Indicators ✅

- [ ] Workflows appear in Actions tab
- [ ] Build completes successfully
- [ ] Build summary report generated
- [ ] Artifacts downloadable
- [ ] Code validates with no errors

**You did it!** 🎉 Your iOS app is building in the cloud!

---

**Last Updated**: August 14, 2026  
**Questions?** Check the main README or open a GitHub issue
