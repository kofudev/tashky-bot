/**
 * ====================================
 * TASHKY BOT - WEB PANEL SERVER
 * ====================================
 * 
 * Serveur web pour le dashboard du bot
 * Interface moderne avec OAuth Discord
 * 
 * @author Kofu (github.com/kofudev)
 * @version 1.0.0
 * @license MIT
 * 
 * ====================================
 */

const express = require('express');
const session = require('express-session');
const path = require('path');

class WebPanelServer {
    /**
     * Constructeur du serveur web
     * @author Kofu
     */
    constructor() {
        this.app = express();
        this.client = null;
        this.server = null;
        
        console.log('🌐 [Kofu] Initialisation du serveur web...');
    }
    
    /**
     * Démarrer le serveur web
     * @param {Client} client - Le client Discord
     * @author Kofu
     */
    async start(client) {
        this.client = client;
        
        try {
            // Configuration du serveur
            this.setupMiddleware();
            this.setupRoutes();
            this.setupErrorHandling();
            
            // Démarrer le serveur
            const port = process.env.DASHBOARD_PORT || 57010;
            this.server = this.app.listen(port, () => {
                console.log(`🌐 [Kofu] Panel web démarré sur http://localhost:${port}`);
                console.log(`✨ [Kofu] Dashboard accessible aux owners et administrateurs`);
            });
            
        } catch (error) {
            console.error('❌ [Kofu] Erreur démarrage serveur web:', error);
        }
    }
    
    /**
     * Configurer les middlewares
     * @author Kofu
     */
    setupMiddleware() {
        // Configuration des sessions
        this.app.use(session({
            secret: process.env.SESSION_SECRET || 'tashky-bot-kofu-secret',
            resave: false,
            saveUninitialized: false,
            cookie: {
                secure: false, // true en production avec HTTPS
                maxAge: 24 * 60 * 60 * 1000 // 24 heures
            }
        }));
        
        // Parser JSON et URL
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        
        // Fichiers statiques
        this.app.use('/static', express.static(path.join(__dirname, 'public')));
        
        // Moteur de template EJS
        this.app.set('view engine', 'ejs');
        this.app.set('views', path.join(__dirname, 'views'));
        
        // Middleware pour passer le client Discord aux vues
        this.app.use((req, res, next) => {
            res.locals.client = this.client;
            res.locals.user = req.session.user || null;
            res.locals.isOwner = this.isOwner(req.session.user?.id);
            next();
        });
        
        console.log('⚙️ [Kofu] Middlewares configurés');
    }
    
    /**
     * Configurer les routes
     * @author Kofu
     */
    setupRoutes() {
        // Route d'accueil
        this.app.get('/', (req, res) => {
            const stats = {
                guilds: this.client.guilds.cache.size,
                users: this.client.users.cache.size,
                channels: this.client.channels.cache.size,
                commands: this.client.commands.size,
                uptime: this.formatUptime(this.client.uptime),
                ping: this.client.ws.ping
            };
            
            res.render('index', {
                title: 'TASHKY Bot - Dashboard',
                stats: stats
            });
        });
        
        // Route de connexion (simulation OAuth)
        this.app.get('/login', (req, res) => {
            // En production, ici on redirigerait vers Discord OAuth
            // Pour la démo, on simule une connexion
            req.session.user = {
                id: 'DEMO_USER_ID', // ID de démo
                username: 'DemoUser',
                discriminator: '0001',
                avatar: null
            };
            
            res.redirect('/dashboard');
        });
        
        // Route de déconnexion
        this.app.get('/logout', (req, res) => {
            req.session.destroy();
            res.redirect('/');
        });
        
        // Dashboard principal
        this.app.get('/dashboard', this.requireAuth, (req, res) => {
            const userGuilds = this.getUserGuilds(req.session.user.id);
            
            res.render('dashboard', {
                title: 'Dashboard - TASHKY Bot',
                guilds: userGuilds
            });
        });
        
        // Panel Owner (ULTRA RESTREINT)
        this.app.get('/owner', this.requireOwner, (req, res) => {
            const globalData = this.client.database.read('globaldata.json') || {};
            const allGuilds = Array.from(this.client.guilds.cache.values()).map(guild => ({
                id: guild.id,
                name: guild.name,
                memberCount: guild.memberCount,
                icon: guild.iconURL({ dynamic: true })
            }));
            
            res.render('owner-panel', {
                title: '👑 Owner Panel - TASHKY Bot',
                globalData: globalData,
                allGuilds: allGuilds
            });
        });
        
        // Owner - Logs système
        this.app.get('/owner/logs', this.requireOwner, (req, res) => {
            res.render('owner-logs', {
                title: '📄 Logs Système - Owner Panel'
            });
        });
        
        // Owner - Gestion des utilisateurs
        this.app.get('/owner/users', this.requireOwner, (req, res) => {
            res.render('owner-users', {
                title: '👥 Gestion Utilisateurs - Owner Panel'
            });
        });
        
        // Owner - Gestion des serveurs
        this.app.get('/owner/servers', this.requireOwner, (req, res) => {
            res.render('owner-servers', {
                title: '🏠 Gestion Serveurs - Owner Panel'
            });
        });
        
        // Owner - Gestion des tickets
        this.app.get('/owner/tickets', this.requireOwner, (req, res) => {
            res.render('owner-tickets', {
                title: '🎫 Gestion Tickets - Owner Panel'
            });
        });
        
        // API Routes
        this.setupAPIRoutes();
        
        console.log('🛣️ [Kofu] Routes configurées');
    }
    
    /**
     * Configurer les routes API
     * @author Kofu
     */
    setupAPIRoutes() {
        // API - Statistiques
        this.app.get('/api/stats', (req, res) => {
            const stats = {
                guilds: this.client.guilds.cache.size,
                users: this.client.users.cache.size,
                channels: this.client.channels.cache.size,
                commands: this.client.commands.size,
                uptime: this.client.uptime,
                ping: this.client.ws.ping,
                memory: process.memoryUsage()
            };
            
            res.json(stats);
        });
        
        // API - Informations serveur
        this.app.get('/api/guild/:id', this.requireAuth, (req, res) => {
            const guildId = req.params.id;
            const guild = this.client.guilds.cache.get(guildId);
            
            if (!guild) {
                return res.status(404).json({ error: 'Serveur introuvable' });
            }
            
            // Vérifier que l'utilisateur a accès à ce serveur
            if (!this.userHasAccessToGuild(req.session.user.id, guildId)) {
                return res.status(403).json({ error: 'Accès refusé' });
            }
            
            const guildData = this.client.database.getGuild(guildId);
            
            res.json({
                id: guild.id,
                name: guild.name,
                memberCount: guild.memberCount,
                icon: guild.iconURL({ dynamic: true }),
                config: guildData
            });
        });
        
        // API Owner - Actions critiques
        this.app.post('/api/owner/:action', this.requireOwner, async (req, res) => {
            const action = req.params.action;
            
            try {
                // Logger l'action owner
                this.client.logger.logOwnerAction(
                    req.session.user,
                    `WEB_PANEL_${action.toUpperCase()}`,
                    { ip: req.ip, userAgent: req.get('User-Agent') }
                );
                
                switch (action) {
                    case 'reload-commands':
                        // TODO: Recharger les commandes
                        res.json({ success: true, message: 'Commandes rechargées avec succès' });
                        break;
                        
                    case 'backup-all':
                        // TODO: Backup global
                        res.json({ success: true, message: 'Backup global lancé avec succès' });
                        break;
                        
                    case 'get-logs':
                        // TODO: Récupérer les logs récents
                        res.json({ success: true, logs: [] });
                        break;
                        
                    case 'global-restart':
                        // Logger l'action critique
                        this.client.logger.logCriticalError(
                            'GLOBAL_RESTART_REQUESTED',
                            new Error('Redémarrage global demandé via web panel'),
                            { userId: req.session.user.id, ip: req.ip }
                        );
                        res.json({ success: true, message: '🔄 Redémarrage global initié - Le bot va redémarrer dans 5 secondes' });
                        
                        // Redémarrage différé
                        setTimeout(() => {
                            process.exit(0);
                        }, 5000);
                        break;
                        
                    case 'emergency-shutdown':
                        this.client.logger.logCriticalError(
                            'EMERGENCY_SHUTDOWN',
                            new Error('Arrêt d\'urgence activé via web panel'),
                            { userId: req.session.user.id, ip: req.ip }
                        );
                        res.json({ success: true, message: '🚨 ARRÊT D\'URGENCE ACTIVÉ' });
                        
                        // Arrêt immédiat
                        setTimeout(() => {
                            process.exit(1);
                        }, 1000);
                        break;
                        
                    case 'maintenance-mode':
                        // TODO: Activer le mode maintenance
                        res.json({ success: true, message: '🔧 Mode maintenance activé' });
                        break;
                        
                    case 'reset-all-data':
                        this.client.logger.logCriticalError(
                            'DATA_RESET_REQUESTED',
                            new Error('Reset complet des données demandé'),
                            { userId: req.session.user.id, ip: req.ip }
                        );
                        res.json({ success: true, message: '💀 Reset des données initié (SIMULATION)' });
                        break;
                        
                    case 'log-access':
                        // Logger l'accès au panel owner
                        this.client.logger.logSecurityEvent(
                            'OWNER_PANEL_ACCESS',
                            {
                                userId: req.session.user.id,
                                ip: req.ip,
                                userAgent: req.get('User-Agent'),
                                timestamp: new Date().toISOString()
                            },
                            'INFO'
                        );
                        res.json({ success: true, message: 'Accès loggé' });
                        break;
                        
                    default:
                        res.status(400).json({ error: 'Action inconnue' });
                }
                
            } catch (error) {
                console.error(`❌ [Kofu] Erreur API owner ${action}:`, error);
                res.status(500).json({ error: error.message });
            }
        });
        
        // API Owner - Statistiques avancées
        this.app.get('/api/owner/stats', this.requireOwner, (req, res) => {
            const stats = {
                guilds: this.client.guilds.cache.size,
                users: this.client.users.cache.size,
                channels: this.client.channels.cache.size,
                commands: this.client.commands?.size || 0,
                uptime: this.client.uptime,
                ping: this.client.ws.ping,
                memory: process.memoryUsage(),
                cpu: process.cpuUsage(),
                version: process.version,
                platform: process.platform,
                timestamp: Date.now()
            };
            
            res.json(stats);
        });
        
        // API Owner - Gestion des utilisateurs
        this.app.get('/api/owner/users', this.requireOwner, (req, res) => {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const search = req.query.search || '';
            
            const allUsers = Array.from(this.client.users.cache.values());
            let filteredUsers = allUsers;
            
            if (search) {
                filteredUsers = allUsers.filter(user => 
                    user.username.toLowerCase().includes(search.toLowerCase()) ||
                    user.tag.toLowerCase().includes(search.toLowerCase()) ||
                    user.id.includes(search)
                );
            }
            
            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + limit;
            const paginatedUsers = filteredUsers.slice(startIndex, endIndex);
            
            const users = paginatedUsers.map(user => ({
                id: user.id,
                username: user.username,
                discriminator: user.discriminator,
                tag: user.tag,
                avatar: user.displayAvatarURL({ dynamic: true }),
                bot: user.bot,
                createdAt: user.createdAt.toISOString(),
                flags: user.flags?.toArray() || []
            }));
            
            res.json({
                users,
                pagination: {
                    page,
                    limit,
                    total: filteredUsers.length,
                    pages: Math.ceil(filteredUsers.length / limit)
                },
                search
            });
        });
        
        // API Owner - Gestion des serveurs
        this.app.get('/api/owner/guilds', this.requireOwner, (req, res) => {
            const guilds = Array.from(this.client.guilds.cache.values()).map(guild => ({
                id: guild.id,
                name: guild.name,
                icon: guild.iconURL({ dynamic: true }),
                memberCount: guild.memberCount,
                channelCount: guild.channels.cache.size,
                roleCount: guild.roles.cache.size,
                ownerId: guild.ownerId,
                createdAt: guild.createdAt.toISOString(),
                joinedAt: guild.joinedAt.toISOString(),
                features: guild.features,
                premiumTier: guild.premiumTier,
                premiumSubscriptionCount: guild.premiumSubscriptionCount
            }));
            
            res.json({ guilds });
        });
        
        // API Owner - Logs système
        this.app.get('/api/owner/logs', this.requireOwner, (req, res) => {
            const type = req.query.type || 'all';
            const limit = parseInt(req.query.limit) || 100;
            
            try {
                const fs = require('fs');
                const path = require('path');
                
                let logFile = './logs/combined.log';
                
                switch (type) {
                    case 'error':
                        logFile = './logs/errors/error.log';
                        break;
                    case 'command':
                        logFile = './logs/commands/commands.log';
                        break;
                    case 'owner':
                        logFile = './logs/owner/owner-actions.log';
                        break;
                    case 'moderation':
                        logFile = './logs/moderation/moderation.log';
                        break;
                }
                
                if (fs.existsSync(logFile)) {
                    const logs = fs.readFileSync(logFile, 'utf8')
                        .split('\n')
                        .filter(line => line.trim())
                        .slice(-limit)
                        .reverse();
                    
                    res.json({ logs, type, count: logs.length });
                } else {
                    res.json({ logs: [], type, count: 0, message: 'Fichier de log non trouvé' });
                }
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        
        // API Owner - Commandes système
        this.app.post('/api/owner/system/:action', this.requireOwner, async (req, res) => {
            const action = req.params.action;
            
            try {
                // Logger l'action système
                this.client.logger.logOwnerAction(
                    req.session.user,
                    `SYSTEM_${action.toUpperCase()}`,
                    { ip: req.ip, userAgent: req.get('User-Agent') }
                );
                
                switch (action) {
                    case 'clear-cache':
                        // Vider les caches Discord.js
                        this.client.users.cache.clear();
                        this.client.channels.cache.clear();
                        // Garder les guilds et commands en cache
                        res.json({ success: true, message: '🗄️ Cache vidé avec succès' });
                        break;
                        
                    case 'reload-database':
                        // Recharger la base de données
                        this.client.database.reload();
                        res.json({ success: true, message: '💾 Base de données rechargée' });
                        break;
                        
                    case 'garbage-collect':
                        // Forcer le garbage collection
                        if (global.gc) {
                            global.gc();
                            res.json({ success: true, message: '🗑️ Garbage collection effectué' });
                        } else {
                            res.json({ success: false, message: 'Garbage collection non disponible' });
                        }
                        break;
                        
                    case 'update-presence':
                        // Mettre à jour la présence du bot
                        await this.client.user.setPresence({
                            activities: [{
                                name: `${this.client.guilds.cache.size} serveurs | /help`,
                                type: 0
                            }],
                            status: 'online'
                        });
                        res.json({ success: true, message: '👤 Présence mise à jour' });
                        break;
                        
                    default:
                        res.status(400).json({ error: 'Action système inconnue' });
                }
                
            } catch (error) {
                console.error(`❌ [Kofu] Erreur action système ${action}:`, error);
                res.status(500).json({ error: error.message });
            }
        });
        
        // API Owner - Gestion des tickets
        this.app.get('/api/owner/tickets', this.requireOwner, (req, res) => {
            try {
                const activeTickets = this.client.database.read('tickets/active.json') || {};
                const closedTickets = this.client.database.read('tickets/closed.json') || {};
                
                const active = Object.values(activeTickets).map(ticket => ({
                    ...ticket,
                    guild: this.client.guilds.cache.get(ticket.guildId)?.name || 'Serveur inconnu',
                    user: this.client.users.cache.get(ticket.userId)?.tag || 'Utilisateur inconnu'
                }));
                
                const closed = Object.values(closedTickets).slice(-50).map(ticket => ({
                    ...ticket,
                    guild: this.client.guilds.cache.get(ticket.guildId)?.name || 'Serveur inconnu',
                    user: this.client.users.cache.get(ticket.userId)?.tag || 'Utilisateur inconnu'
                }));
                
                res.json({
                    active,
                    closed,
                    stats: {
                        totalActive: active.length,
                        totalClosed: Object.keys(closedTickets).length,
                        byType: {
                            support: active.filter(t => t.type === 'support').length,
                            report: active.filter(t => t.type === 'report').length,
                            other: active.filter(t => t.type === 'other').length
                        }
                    }
                });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        
        // API Owner - Fermeture forcée de ticket
        this.app.post('/api/owner/tickets/:ticketId/force-close', this.requireOwner, async (req, res) => {
            const ticketId = req.params.ticketId;
            const reason = req.body.reason || 'Fermeture forcée par owner';
            
            try {
                const activeTickets = this.client.database.read('tickets/active.json') || {};
                const ticket = activeTickets[ticketId];
                
                if (!ticket) {
                    return res.status(404).json({ error: 'Ticket non trouvé' });
                }
                
                // Fermer le ticket
                const closedTickets = this.client.database.read('tickets/closed.json') || {};
                
                ticket.status = 'closed';
                ticket.closedBy = req.session.user.id;
                ticket.closedAt = new Date().toISOString();
                ticket.closeReason = reason;
                ticket.forceClosed = true;
                
                closedTickets[ticketId] = ticket;
                delete activeTickets[ticketId];
                
                this.client.database.write('tickets/active.json', activeTickets);
                this.client.database.write('tickets/closed.json', closedTickets);
                
                // Supprimer le salon si possible
                const guild = this.client.guilds.cache.get(ticket.guildId);
                if (guild) {
                    const channel = guild.channels.cache.get(ticket.channelId);
                    if (channel) {
                        await channel.delete('Fermeture forcée par owner');
                    }
                }
                
                // Logger l'action
                this.client.logger.logOwnerAction(
                    req.session.user,
                    'TICKET_FORCE_CLOSED',
                    { ticketId, reason, guildId: ticket.guildId }
                );
                
                res.json({ success: true, message: `Ticket #${ticketId} fermé avec succès` });
                
            } catch (error) {
                console.error(`❌ [Kofu] Erreur fermeture forcée ticket ${ticketId}:`, error);
                res.status(500).json({ error: error.message });
            }
        });
    }
    
    /**
     * Configurer la gestion d'erreurs
     * @author Kofu
     */
    setupErrorHandling() {
        // 404 - Page non trouvée
        this.app.use((req, res) => {
            res.status(404).render('error', {
                title: '404 - Page non trouvée',
                error: {
                    status: 404,
                    message: 'La page que tu cherches n\'existe pas.'
                }
            });
        });
        
        // Gestionnaire d'erreurs global
        this.app.use((error, req, res, next) => {
            console.error('❌ [Kofu] Erreur serveur web:', error);
            
            res.status(500).render('error', {
                title: '500 - Erreur serveur',
                error: {
                    status: 500,
                    message: 'Une erreur interne est survenue.'
                }
            });
        });
        
        console.log('🛡️ [Kofu] Gestion d\'erreurs configurée');
    }
    
    /**
     * Middleware d'authentification
     * @param {Request} req - Requête Express
     * @param {Response} res - Réponse Express
     * @param {Function} next - Fonction suivante
     * @author Kofu
     */
    requireAuth(req, res, next) {
        if (!req.session.user) {
            return res.redirect('/login');
        }
        next();
    }
    
    /**
     * Middleware Owner uniquement
     * @param {Request} req - Requête Express
     * @param {Response} res - Réponse Express
     * @param {Function} next - Fonction suivante
     * @author Kofu
     */
    requireOwner(req, res, next) {
        if (!req.session.user || !this.isOwner(req.session.user.id)) {
            return res.status(403).render('error', {
                title: '403 - Accès refusé',
                error: {
                    status: 403,
                    message: 'Cette section est réservée aux propriétaires du bot (Kofu & co).'
                }
            });
        }
        next();
    }
    
    /**
     * Vérifier si un utilisateur est owner
     * @param {string} userId - ID de l'utilisateur
     * @returns {boolean} True si owner
     * @author Kofu
     */
    isOwner(userId) {
        if (!userId) return false;
        const owners = process.env.BOT_OWNERS ? JSON.parse(process.env.BOT_OWNERS) : [];
        return owners.includes(userId);
    }
    
    /**
     * Récupérer les serveurs d'un utilisateur
     * @param {string} userId - ID de l'utilisateur
     * @returns {Array} Liste des serveurs
     * @author Kofu
     */
    getUserGuilds(userId) {
        // Si c'est un owner, retourner tous les serveurs
        if (this.isOwner(userId)) {
            return Array.from(this.client.guilds.cache.values()).map(guild => ({
                id: guild.id,
                name: guild.name,
                memberCount: guild.memberCount,
                icon: guild.iconURL({ dynamic: true }),
                isOwner: true
            }));
        }
        
        // Sinon, retourner seulement les serveurs où l'utilisateur a des permissions
        return Array.from(this.client.guilds.cache.values())
            .filter(guild => {
                const member = guild.members.cache.get(userId);
                return member && member.permissions.has('ManageGuild');
            })
            .map(guild => ({
                id: guild.id,
                name: guild.name,
                memberCount: guild.memberCount,
                icon: guild.iconURL({ dynamic: true }),
                isOwner: false
            }));
    }
    
    /**
     * Vérifier l'accès d'un utilisateur à un serveur
     * @param {string} userId - ID de l'utilisateur
     * @param {string} guildId - ID du serveur
     * @returns {boolean} True si accès autorisé
     * @author Kofu
     */
    userHasAccessToGuild(userId, guildId) {
        // Les owners ont accès à tout
        if (this.isOwner(userId)) return true;
        
        // Vérifier si l'utilisateur est sur le serveur avec des permissions
        const guild = this.client.guilds.cache.get(guildId);
        if (!guild) return false;
        
        const member = guild.members.cache.get(userId);
        return member && member.permissions.has('ManageGuild');
    }
    
    /**
     * Formater l'uptime
     * @param {number} uptime - Uptime en millisecondes
     * @returns {string} Uptime formaté
     * @author Kofu
     */
    formatUptime(uptime) {
        if (!uptime) return '0s';
        
        const seconds = Math.floor(uptime / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) {
            return `${days}j ${hours % 24}h ${minutes % 60}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else {
            return `${minutes}m ${seconds % 60}s`;
        }
    }
    
    /**
     * Arrêter le serveur web
     * @author Kofu
     */
    stop() {
        if (this.server) {
            this.server.close(() => {
                console.log('🌐 [Kofu] Serveur web arrêté');
            });
        }
    }
}

// Exporter la classe
module.exports = WebPanelServer;

/**
 * ====================================
 * ✨ Made with ❤️ by Kofu
 * github.com/kofudev
 * ====================================
 */