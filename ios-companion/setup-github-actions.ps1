# Setup GitHub Actions for iOS Build
# Run this script to initialize GitHub Actions workflows

Write-Host "🚀 Setting up GitHub Actions for Even Uber iOS" -ForegroundColor Cyan
Write-Host ""

# Check if git is available
if (!(Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Git not found. Please install Git for Windows" -ForegroundColor Red
    exit 1
}

# Check if gh (GitHub CLI) is available
if (!(Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host "⚠️  GitHub CLI not found. Installing..." -ForegroundColor Yellow
    Write-Host "   Run: choco install gh" -ForegroundColor Gray
    Write-Host "   Or: winget install GitHub.cli" -ForegroundColor Gray
}

# Check git status
Write-Host "📋 Checking git status..." -ForegroundColor Cyan
$gitStatus = git status --short
if ($gitStatus) {
    Write-Host "⚠️  You have uncommitted changes:" -ForegroundColor Yellow
    Write-Host $gitStatus
    Write-Host ""
    Read-Host "Press Enter to continue, or Ctrl+C to cancel"
}

# List workflows
Write-Host "📝 GitHub Actions Workflows:" -ForegroundColor Cyan
Write-Host "   ✅ .github/workflows/ios-build.yml" -ForegroundColor Green
Write-Host "   ✅ .github/workflows/ios-build-signed.yml" -ForegroundColor Green
Write-Host ""

# Commit changes
Write-Host "📤 Committing workflow files..." -ForegroundColor Cyan
git add .github/
git commit -m "Add GitHub Actions CI/CD for iOS companion app" 2>$null

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Changes committed" -ForegroundColor Green
} else {
    Write-Host "   ℹ️  No changes to commit" -ForegroundColor Gray
}

# Push to GitHub
Write-Host ""
Write-Host "📤 Pushing to GitHub..." -ForegroundColor Cyan

$currentBranch = git rev-parse --abbrev-ref HEAD
Write-Host "   Branch: $currentBranch" -ForegroundColor Gray

git push origin $currentBranch
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Pushed successfully" -ForegroundColor Green
} else {
    Write-Host "   ❌ Push failed" -ForegroundColor Red
    exit 1
}

# Summary
Write-Host ""
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Go to: https://github.com/aabjerken-byte/Executive-Whisperer/actions" -ForegroundColor Gray
Write-Host "  2. Click 'Build iOS Companion App'" -ForegroundColor Gray
Write-Host "  3. Click 'Run workflow'" -ForegroundColor Gray
Write-Host "  4. Watch the build complete in ~10 minutes" -ForegroundColor Gray
Write-Host ""
Write-Host "For more details, see:" -ForegroundColor Cyan
Write-Host "  📖 EvenUber/ios-companion/GITHUB_ACTIONS_SETUP.md" -ForegroundColor Gray
Write-Host ""
