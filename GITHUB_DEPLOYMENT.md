# 🚀 GitHub'a Yükleme ve Deployment Talimatları

## 📋 İçindekiler
1. [GitHub'a İlk Yükleme](#githuba-ilk-yükleme)
2. [Güncel Durumu Yükleme](#güncel-durumu-yükleme)
3. [Yeni Geliştirmeleri Push Etme](#yeni-geliştirmeleri-push-etme)
4. [Deployment Notları](#deployment-notları)

---

## 🔐 Ön Hazırlık

### GitHub Repository Oluşturma

1. **GitHub'da yeni repository oluşturun:**
   - GitHub.com'a gidin
   - "New repository" butonuna tıklayın
   - Repository adı: `dagitim-yonetim-sistemi`
   - Description: "B2B Dağıtım Yönetim Sistemi - Fatura, Sipariş ve Tüketim Analizi"
   - Public veya Private seçin
   - **"Initialize with README" seçmeyin** (zaten var)
   - Create repository

2. **Repository URL'ini kopyalayın:**
   ```
   https://github.com/KULLANICI_ADI/dagitim-yonetim-sistemi.git
   ```

---

## 📤 GitHub'a İlk Yükleme

### Adım 1: Git Kontrolü

```bash
cd /app

# Git durumunu kontrol et
git status

# Eğer .git yoksa, initialize et
git init
```

### Adım 2: .gitignore Kontrolü

`.gitignore` dosyasının olduğundan ve şunları içerdiğinden emin olun:

```gitignore
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
venv/
env/
*.egg-info/

# Node
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*
build/
dist/

# Environment variables
.env
.env.local
.env.*.local
**/.env

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
logs/

# Database
*.db
*.sqlite

# Test
coverage/
.pytest_cache/

# Temporary
*.tmp
temp/
```

### Adım 3: İlk Commit

```bash
# Tüm dosyaları stage'e ekle
git add .

# İlk commit
git commit -m "Initial commit: B2B Dağıtım Yönetim Sistemi

- Fatura yönetimi (HTML upload, manuel giriş)
- Müşteri ve ürün otomatik oluşturma
- Tüketim analizi (fatura bazlı)
- Multi-role sistem (Admin, Muhasebe, Müşteri)
- Sarfiyat istatistikleri
- React + FastAPI + MongoDB
"

# Remote repository ekle
git remote add origin https://github.com/KULLANICI_ADI/dagitim-yonetim-sistemi.git

# İlk push (main branch)
git branch -M main
git push -u origin main
```

---

## 🔄 Güncel Durumu Yükleme

Eğer daha önce git init yaptıysanız ve değişikliklerinizi yüklemek istiyorsanız:

```bash
cd /app

# Mevcut değişiklikleri göster
git status

# Değişiklikleri stage'e ekle
git add .

# Commit mesajı
git commit -m "Update: Consumption calculation fix and product management

- Fixed weekly/monthly consumption calculation logic
- Added product update/delete endpoints for admin
- Created full database seed script with sample data
- Updated Turkish character normalization for usernames
- Improved invoice form with auto-clear after submit
"

# Push et
git push origin main
```

---

## 🆕 Yeni Geliştirmeleri Push Etme

### Günlük Workflow

```bash
# 1. Değişiklikleri kontrol et
git status
git diff

# 2. Değişiklikleri ekle
git add .

# veya seçici olarak
git add backend/routes/consumption_routes.py
git add frontend/src/components/

# 3. Commit yap (anlamlı mesaj)
git commit -m "feat: Add product update functionality for admin"

# 4. Push et
git push origin main
```

### Commit Mesajı Formatı

```
<tip>: <kısa açıklama>

<detaylı açıklama (opsiyonel)>
```

**Tipler:**
- `feat`: Yeni özellik
- `fix`: Bug düzeltme
- `docs`: Dokümantasyon
- `style`: Kod formatı
- `refactor`: Kod yeniden yapılandırma
- `test`: Test ekleme
- `chore`: Build/tool değişiklikleri

**Örnekler:**
```bash
git commit -m "feat: Add consumption calculation from invoices"
git commit -m "fix: Turkish character normalization in usernames"
git commit -m "docs: Update README with new features"
```

---

## 🌿 Branch Stratejisi (Önerilen)

### Main Branch (Production)
```bash
# Ana branch - kararlı sürüm
git checkout main
```

### Development Branch
```bash
# Yeni branch oluştur
git checkout -b development

# Değişiklikleri yap ve commit et
git add .
git commit -m "feat: Add new feature"

# Development branch'e push et
git push origin development

# Main'e merge (test sonrası)
git checkout main
git merge development
git push origin main
```

### Feature Branches
```bash
# Yeni özellik için branch
git checkout -b feature/invoice-upload

# Geliştirme yap
git add .
git commit -m "feat: Implement invoice upload"

# Push et
git push origin feature/invoice-upload

# GitHub'da Pull Request oluştur
```

---

## 📦 Release Tagging

```bash
# Versiyon tag'i oluştur
git tag -a v1.0.0 -m "Release v1.0.0: Initial production release"

# Tag'i push et
git push origin v1.0.0

# Tüm tag'leri push et
git push origin --tags
```

---

## 🔍 Faydalı Git Komutları

### Durum Kontrolü
```bash
# Değişiklikleri göster
git status

# Değişiklik detayları
git diff

# Commit geçmişi
git log --oneline --graph --decorate --all

# Son 5 commit
git log -5 --oneline
```

### Geri Alma İşlemleri
```bash
# Staged değişiklikleri unstage et
git reset HEAD dosya.py

# Son commit'i geri al (değişiklikleri koru)
git reset --soft HEAD~1

# Dosyayı son commit haline getir
git checkout -- dosya.py

# Tüm değişiklikleri at (DİKKAT!)
git reset --hard HEAD
```

### Remote İşlemleri
```bash
# Remote'ları göster
git remote -v

# Remote ekle
git remote add origin https://github.com/user/repo.git

# Remote URL değiştir
git remote set-url origin https://github.com/user/new-repo.git

# Remote'dan değişiklikleri çek
git pull origin main

# Force push (DİKKAT! Sadece gerektiğinde)
git push -f origin main
```

---

## 🚨 Yaygın Sorunlar ve Çözümler

### 1. Push Reddedildi
```bash
# Hata: Updates were rejected because the remote contains work...

# Çözüm: Önce pull yap
git pull origin main --rebase
git push origin main
```

### 2. Merge Conflict
```bash
# Conflict olan dosyayı düzenle
# <<<<<<< HEAD ve >>>>>>> markers'ları temizle

# Düzeltilmiş dosyayı ekle
git add conflicted-file.py

# Merge'i tamamla
git commit -m "Resolve merge conflict"
```

### 3. Yanlış Commit Mesajı
```bash
# Son commit mesajını değiştir
git commit --amend -m "Yeni mesaj"

# Push et (eğer daha push edilmemişse)
git push origin main

# Eğer push edilmişse (DİKKAT!)
git push -f origin main
```

### 4. .env Dosyası Yanlışlıkla Commit Edildi
```bash
# Dosyayı git'ten kaldır (disk'te kalsın)
git rm --cached backend/.env
git rm --cached frontend/.env

# .gitignore'a ekle
echo "**/.env" >> .gitignore

# Commit ve push
git add .gitignore
git commit -m "Remove .env files from git"
git push origin main
```

---

## 📝 GitHub Repository Ayarları

### 1. Secrets (Environment Variables)

GitHub repository → Settings → Secrets and variables → Actions

Eklenecek secrets:
```
MONGO_URL
DB_NAME
SECRET_KEY
```

### 2. Branch Protection

Settings → Branches → Add rule

- Branch name pattern: `main`
- ✅ Require pull request reviews before merging
- ✅ Require status checks to pass before merging

### 3. README Badge'leri

README.md'ye ekleyin:
```markdown
![Python](https://img.shields.io/badge/Python-3.11-blue)
![React](https://img.shields.io/badge/React-18-blue)
![MongoDB](https://img.shields.io/badge/MongoDB-6.0-green)
![License](https://img.shields.io/badge/License-MIT-yellow)
```

---

## 🔐 Güvenlik Önerileri

1. **.env dosyalarını asla commit etmeyin**
   ```bash
   # .gitignore'da olduğundan emin olun
   **/.env
   .env.*
   ```

2. **Hassas bilgileri kodda tutmayın**
   - API keys
   - Database passwords
   - Secret keys

3. **Git history'den hassas bilgileri temizleyin**
   ```bash
   # BFG Repo-Cleaner kullanın (gerekirse)
   # https://rtyley.github.io/bfg-repo-cleaner/
   ```

---

## 📚 Deployment Sonrası

### Vercel/Netlify (Frontend)
```bash
# Frontend klasörünü ayrı repo olarak deploy edebilirsiniz
# Veya monorepo olarak configure edebilirsiniz
```

### Railway/Heroku (Backend)
```bash
# Procfile oluşturun
echo "web: uvicorn backend.server:app --host 0.0.0.0 --port \$PORT" > Procfile

# requirements.txt güncel olduğundan emin olun
pip freeze > backend/requirements.txt
```

### MongoDB Atlas (Database)
1. Free cluster oluşturun
2. Connection string alın
3. Environment variable olarak ekleyin

---

## ✅ Checklist - Push Öncesi

- [ ] .env dosyaları .gitignore'da
- [ ] Hassas bilgiler kodda yok
- [ ] Test edildi ve çalışıyor
- [ ] Commit mesajı anlamlı
- [ ] README.md güncel
- [ ] CHANGELOG.md güncellendi (varsa)
- [ ] Version tag oluşturuldu (release ise)

---

## 🎯 Sonuç

Bu talimatları takip ederek projenizi GitHub'a güvenli bir şekilde yükleyebilir ve güncel tutabilirsiniz.

**Önemli:** İlk push'tan önce mutlaka .env dosyalarının .gitignore'da olduğundan emin olun!

---

**Son Güncelleme:** Kasım 2024
**Yazar:** Emergent AI Development Team
