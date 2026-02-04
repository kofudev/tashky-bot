<div align="center">

# 🤖 TASHKY Bot - Discord Bot Ultimate Edition

<img src="./assets/images/logo.png" width="200" alt="TASHKY Bot Logo"/>

**Bot Discord Multifonction Universel**

*Modération • Tickets • Logs • Owner Panel • Et bien plus !*

[![Discord.js](https://img.shields.io/badge/discord.js-v14-blue.svg)](https://discord.js.org)
[![Node.js](https://img.shields.io/badge/node.js-v16+-green.svg)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-MIT-orange.svg)](LICENSE)
[![Made by Kofu](https://img.shields.io/badge/Made%20by-Kofu-ff69b4.svg)](https://github.com/kofudev)

[📥 Inviter le Bot](#) • [📖 Documentation](#features) • [💬 Support](#support) • [⭐ Star sur GitHub](https://github.com/kofudev/tashky-bot)

</div>

---

## ✨ Made with ❤️ by Kofu

> *"Un bot Discord qui n'est pas juste un outil, mais une véritable expérience. Un code lisible, humain, fait avec passion."*
> 
> **— Kofu** ([github.com/kofudev](https://github.com/kofudev))

---

## 📋 Table des Matières

- [🎯 Fonctionnalités](#-fonctionnalités)
- [🚀 Installation](#-installation)
- [⚙️ Configuration](#️-configuration)
- [📦 Commandes](#-commandes)
- [🛡️ Sécurité](#️-sécurité)
- [🌐 Panel Web](#-panel-web)
- [📸 Screenshots](#-screenshots)
- [🤝 Contribuer](#-contribuer)
- [📄 Licence](#-licence)
- [💖 Crédits](#-crédits)

---

## 🎯 Fonctionnalités

### 🛡️ Modération Avancée
- **20+ commandes de modération** (ban, kick, mute, warn, clear...)
- **Logs détaillés** pour toutes les actions (messages, membres, modération, vocal...)
- **Auto-modération** avec anti-spam, anti-raid et anti-nuke
- **Système de warnings** avec historique complet
- **Sanctions temporaires** (tempban, tempmute)

### 🎫 Système de Tickets Complet
- **Création facile** via boutons ou commandes
- **Catégories personnalisables** (Support, Report, etc.)
- **Système de claim** pour le staff
- **Transcriptions HTML automatiques**
- **Gestion avancée** (add/remove members, rename, close)

### 👑 Commandes Owner Ultra-Puissantes
- **`/owner_panel`** - Contrôle TOTAL sur tous les serveurs
- **`/alluserinfo`** - Analyse COMPLÈTE d'un utilisateur (6 pages d'infos !)
- **`/globalban`** - Bannir un user de TOUS les serveurs
- **`/eval`** - Exécuter du code JavaScript
- **`/backup_server`** - Sauvegarde complète de serveurs
- **Et 10+ autres commandes owner...**

### 🌐 Support Multilingue
- **Français** 🇫🇷
- **Anglais** 🇬🇧
- Changement facile avec `/language`

### 🎨 Personnalisation Totale
- **Couleurs des embeds** personnalisables
- **Messages de bienvenue/départ** customisables
- **Variables dynamiques** ({user}, {server}, etc.)
- **Emojis personnalisés**

### 📊 Panel Web Dashboard
- **Interface moderne** et responsive
- **OAuth Discord** pour l'authentification
- **Gestion complète** des serveurs
- **Panel Owner** avec contrôle total
- **Statistiques en temps réel**

### 💾 Base de Données JSON
- **Simple et efficace** - Pas besoin de MongoDB !
- **Lisible et éditable** facilement
- **Backups automatiques**
- **Structure claire**

---

## 🚀 Installation

### Prérequis
- [Node.js](https://nodejs.org/) v16 ou supérieur
- [Git](https://git-scm.com/)
- Un bot Discord ([Créer un bot](https://discord.com/developers/applications))

### Étape 1: Cloner le repository
```bash
git clone https://github.com/kofudev/tashky-bot.git
cd tashky-bot
```

### Étape 2: Installer les dépendances
```bash
npm install
```

### Étape 3: Configuration
1. Renommer `.env.example` en `.env`
2. Remplir les informations requises :

```env
DISCORD_TOKEN=votre_token_ici
DISCORD_CLIENT_ID=votre_client_id_ici
DISCORD_CLIENT_SECRET=votre_client_secret_ici
BOT_OWNERS=["votre_id_discord_ici"]
```

### Étape 4: Lancer le bot
```bash
# En développement
npm run dev

# En production
npm start
```

✅ **Le bot est maintenant en ligne !**

---

## ⚙️ Configuration

### Fichier `.env`
```env
# Bot Discord
DISCORD_TOKEN=votre_token
DISCORD_CLIENT_ID=votre_client_id
DISCORD_CLIENT_SECRET=votre_client_secret

# Owners (IDs Discord)
BOT_OWNERS=["YOUR_DISCORD_ID_HERE"]

# Panel Web
DASHBOARD_PORT=57010
DASHBOARD_URL=http://localhost:57010

# Base de données
DATABASE_TYPE=json
DATABASE_PATH=./database
AUTO_BACKUP=true

# Features
ENABLE_OWNER_PANEL=true
ENABLE_ANTI_SPAM=true
ENABLE_ANTI_RAID=true
```

### Configuration du serveur
Utilise `/config` pour configurer :
- ✅ Salons de logs
- ✅ Messages de bienvenue/départ
- ✅ Rôle automatique
- ✅ Système de tickets
- ✅ Langue du serveur
- ✅ Et bien plus...

---

## 📦 Commandes

### 📋 Générales (5 commandes)
| Commande | Description |
| --- | --- |
| `/help` | Afficher l'aide complète |
| `/ping` | Vérifier la latence du bot |
| `/botinfo` | Informations sur le bot |
| `/serverinfo` | Informations sur le serveur |
| `/language` | Changer la langue |

### 🛡️ Modération (20+ commandes)
| Commande | Description |
| --- | --- |
| `/ban` | Bannir un membre |
| `/tempban` | Bannir temporairement |
| `/kick` | Expulser un membre |
| `/mute` | Rendre muet un membre |
| `/warn` | Avertir un membre |
| `/clear` | Supprimer des messages |
| `/lock` | Verrouiller un salon |
| `/slowmode` | Activer le mode lent |
| *Et 12+ autres...* |  |

### 🎫 Tickets (10 commandes)
| Commande | Description |
| --- | --- |
| `/ticket setup` | Configurer le système |
| `/ticket panel` | Créer un panel |
| `/ticket close` | Fermer un ticket |
| `/ticket claim` | Prendre en charge |
| `/ticket add` | Ajouter un membre |
| *Et 5+ autres...* |  |

### 👑 Owner (15+ commandes)
| Commande | Description | Danger |
| --- | --- | --- |
| `/owner_panel` | Panel de contrôle total | 🔴🔴🔴🔴🔴 |
| `/alluserinfo` | Info COMPLÈTE sur un user | 🔴🔴🔴 |
| `/globalban` | Ban universel | 🔴🔴🔴🔴🔴 |
| `/eval` | Exécuter du code | 🔴🔴🔴🔴🔴 |
| `/backup_server` | Backup complet | 🔴🔴 |
| *Et 10+ autres...* |  |  |

> ⚠️ **Les commandes owner sont EXTRÊMEMENT puissantes et réservées aux propriétaires du bot !**

---

## 🛡️ Sécurité

### Protections Actives
✅ **Anti-Spam** - Détecte et sanctionne le spam de messages  
✅ **Anti-Raid** - Bloque les raids de membres  
✅ **Anti-Nuke** - Protège contre les attaques de destruction  
✅ **Rate Limiting** - Limite les commandes par minute  
✅ **Blacklist** - Liste noire d'utilisateurs/serveurs  

### Logs de Sécurité
Toutes les actions critiques sont enregistrées :
- ✅ Actions de modération
- ✅ Commandes owner
- ✅ Erreurs système
- ✅ Webhooks de notifications

---

## 🌐 Panel Web

### Accès au Panel
```
http://localhost:57010
```

### Fonctionnalités
- 📊 **Dashboard** avec statistiques globales
- 🏛️ **Gestion des serveurs** (config, membres, logs)
- 🔍 **User Lookup** - Recherche d'utilisateurs
- 👑 **Panel Owner** - Contrôle total (owners uniquement)
- 🎨 **Interface moderne** et responsive

### Screenshot
![Dashboard](./assets/screenshots/dashboard.png)

---

## 📸 Screenshots

<div align="center">

### Dashboard Principal
![Dashboard](./assets/screenshots/dashboard.png)

### Commande /alluserinfo
![AllUserInfo](./assets/screenshots/alluserinfo.png)

### Owner Panel
![Owner Panel](./assets/screenshots/owner-panel.png)

### Système de Tickets
![Tickets](./assets/screenshots/tickets.png)

</div>

---

## 🤝 Contribuer

Les contributions sont les bienvenues ! ❤️

### Comment contribuer ?
1. **Fork** le projet
2. **Créer** une branche (`git checkout -b feature/AmazingFeature`)
3. **Commit** les changements (`git commit -m 'Add some AmazingFeature'`)
4. **Push** vers la branche (`git push origin feature/AmazingFeature`)
5. **Ouvrir** une Pull Request

### Règles de Code
- ✅ Code **commenté** en français
- ✅ Variables avec **noms explicites**
- ✅ Suivre l'**architecture** existante
- ✅ Tester avant de commit
- ✅ Respecter le **style Kofu** (code humain !)

---

## 📄 Licence

Ce projet est sous licence **MIT** - voir le fichier [LICENSE](LICENSE) pour plus de détails.

```
MIT License

Copyright (c) 2026 Kofu (kofudev)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction...
```

---

## 💖 Crédits

### Développeur Principal

<div align="center">

<img src="https://via.placeholder.com/100x100/5865F2/FFFFFF?text=KOFU" width="100" style="border-radius: 50%"/>

**Kofu**

*Développeur passionné & Créateur de TASHKY Bot*

[![GitHub](https://img.shields.io/badge/GitHub-kofudev-black?logo=github)](https://github.com/kofudev)
[![Discord](https://img.shields.io/badge/Discord-Kofu%230001-5865F2?logo=discord&logoColor=white)](#)

</div>

### Remerciements
- 💙 **Discord.js** - Framework Discord incroyable
- 💚 **Node.js** - Runtime JavaScript
- 🎨 **Contributors** - Merci à tous les contributeurs !
- ❤️ **Vous** - Pour utiliser TASHKY Bot !

---

## 💬 Support

Besoin d'aide ? Rejoins notre serveur Discord !

<div align="center">

[![Discord Server](https://img.shields.io/discord/VOTRE_ID?color=5865F2&label=Support%20Server&logo=discord&logoColor=white)](#)

[**Rejoindre le Serveur de Support**](https://discord.gg/your-support-server)

</div>

### Autres moyens de contact
- 🐛 **Bugs** : [Ouvrir une issue](https://github.com/kofudev/tashky-bot/issues)
- 💡 **Features** : [Feature request](https://github.com/kofudev/tashky-bot/issues/new)
- 📧 **Email** : kofu@example.com

---

## ⭐ Star History

Si ce projet t'a plu, n'hésite pas à lui donner une ⭐ sur GitHub !

![Star History Chart](https://api.star-history.com/svg?repos=kofudev/tashky-bot&type=Date)

---

<div align="center">

### ✨ Made with ❤️ by Kofu

**TASHKY Bot** • Version 1.0.0

© 2026 Kofu - Tous droits réservés

[⬆ Retour en haut](#-tashky-bot---discord-bot-ultimate-edition)

</div>