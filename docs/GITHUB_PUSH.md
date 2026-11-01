# Push FOODIVERSE to GitHub

Local git is initialized and an initial commit exists. GitHub CLI needs a one-time login, then create + push.

## 1. Open PowerShell in the project folder

```powershell
cd C:\Users\pankh\OneDrive\Documents\FoodiverseCosmicKitchen
```

## 2. Log in to GitHub CLI

```powershell
gh auth login
```

Choose: **GitHub.com** → **HTTPS** → login via browser.

## 3. Commit any leftover Phase 2 files, then create the repo and push

```powershell
git add -A
git status
git commit -m "Add Phase 1 hand tracking and Phase 2 Unity bridge scaffold."
gh repo create FoodiverseCosmicKitchen --private --source=. --remote=origin --push
```

Use `--public` instead of `--private` if you want it public.

## If `gh` is not found

Close and reopen PowerShell after installing GitHub CLI, or run:

```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
```
