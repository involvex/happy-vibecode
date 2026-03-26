# Release Script for Happy Vibecode

Write-Host "Starting release process..."
Write-Host "Bumping version, generating changelog, building the project, and committing changes."
bun pm version patch
Write-Host "Version bumped successfully. Bumping version for mobile app..."
bun run app:version:patch
Write-Host "Generating changelog..."
bun run changelog 
Write-Host "Building the project..."

bun run build
git add .
git commit -F CHANGELOG.md
Write-Host "Changes committed successfully. "

Write-Host "Running git push && git push --tags..."
git push
git push --tags