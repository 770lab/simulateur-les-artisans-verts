#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== Installation de l'export Pixel CRM ==="
echo ""

# 1. Vérifier Python
if ! command -v python3 &>/dev/null; then
    echo "ERREUR : Python 3 n'est pas installé."
    echo "Installez-le avec : sudo apt install python3 python3-pip"
    exit 1
fi

PYTHON_VERSION=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
echo "[OK] Python $PYTHON_VERSION détecté"

# 2. Installer les dépendances
echo ""
echo "Installation des dépendances Python..."
pip install -r requirements.txt -q
echo "[OK] Dépendances installées"

# 3. Créer le fichier .env s'il n'existe pas
if [ ! -f .env ]; then
    cp .env.example .env
    echo ""
    echo "[!] Fichier .env créé à partir de .env.example"
    echo "    Éditez-le avec vos identifiants :"
    echo "    nano $SCRIPT_DIR/.env"
else
    echo ""
    echo "[OK] Fichier .env déjà présent"
fi

# 4. Vérifier le service account
if [ ! -f service_account.json ]; then
    echo ""
    echo "[!] ATTENTION : service_account.json manquant !"
    echo "    Pour le créer :"
    echo "    1. Allez sur https://console.cloud.google.com"
    echo "    2. Activez l'API Google Drive"
    echo "    3. Créez un Service Account > Keys > JSON"
    echo "    4. Sauvegardez le fichier ici : $SCRIPT_DIR/service_account.json"
    echo "    5. Partagez le dossier Drive avec l'email du service account"
else
    echo "[OK] service_account.json trouvé"
fi

# 5. Résumé
echo ""
echo "=== Checklist ==="
echo ""

check() {
    if [ "$1" = "ok" ]; then
        echo "  [x] $2"
    else
        echo "  [ ] $2"
    fi
}

# Vérifier .env rempli
if [ -f .env ] && ! grep -q "votre_email@example.com" .env; then
    check ok "Identifiants Pixel CRM configurés dans .env"
else
    check no "Identifiants Pixel CRM à configurer dans .env"
fi

if [ -f service_account.json ]; then
    check ok "Service Account Google (service_account.json)"
else
    check no "Service Account Google (service_account.json)"
fi

if [ -f .env ] && ! grep -q "votre_folder_id" .env; then
    check ok "ID du dossier Drive configuré"
else
    check no "ID du dossier Drive à configurer dans .env"
fi

echo ""
echo "Une fois tout configuré, lancez :"
echo "  python3 export_pixel_crm.py"
echo ""
