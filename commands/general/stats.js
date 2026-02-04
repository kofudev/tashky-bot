/**
 * ====================================
 * COMMANDE: /stats
 * ====================================
 * 
 * Afficher les statistiques du bot
 * Performance, utilisation, serveurs, etc.
 * 
 * @author Kofu (github.com/kofudev)
 * @category General
 * ====================================
 */

const { SlashCommandBuilder, EmbedBuilder, version: djsVersion } = require('discord.js');
const KofuSignature = require('../../utils/kofu-signature');
const os = require('os');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('📊 Afficher les statistiques du bot'),
    
    category: 'general',
    cooldown: 10,
    guildOnly: false,
    
    /**
     * Exécution de la commande stats
     * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
     * @author Kofu
     */
    async execute(interaction) {
        try {
            // Créer l'embed de chargement
            const loadingEmbed = new EmbedBuilder()
                .setTitle('📊 Chargement des statistiques...')
                .setDescription('Collecte des données en cours, veuillez patienter...')
                .setColor('#FAA61A')
                .setFooter(KofuSignature.getKofuFooter())
                .setTimestamp();
            
            await interaction.reply({ embeds: [loadingEmbed] });
            
            // Collecter toutes les statistiques
            const stats = await this.collectStats(interaction.client);
            
            // Créer l'embed des statistiques
            const statsEmbed = this.createStatsEmbed(stats, interaction.client);
            
            await interaction.editReply({ embeds: [statsEmbed] });
            
            console.log(`📊 [Kofu] ${interaction.user.tag} a consulté les statistiques du bot`);
            
        } catch (error) {
            console.error('❌ [Kofu] Erreur dans stats:', error);
            
            const errorEmbed = KofuSignature.createErrorEmbed(
                'Erreur !',
                `Impossible de récupérer les statistiques.\n\n**Erreur:** \`${error.message}\``
            );
            
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },
    
    /**
     * Collecter toutes les statistiques
     * @param {Client} client - Le client Discord
     * @returns {object} Statistiques collectées
     * @author Kofu
     */
    async collectStats(client) {
        const stats = {
            bot: {},
            discord: {},
            system: {},
            database: {},
            performance: {}
        };
        
        // === STATISTIQUES DU BOT ===
        const uptime = process.uptime();
        stats.bot = {
            uptime: uptime,
            uptimeFormatted: this.formatUptime(uptime),
            version: '1.0.0',
            author: 'Kofu',
            startedAt: new Date(Date.now() - uptime * 1000),
            nodeVersion: process.version,
            djsVersion: djsVersion
        };
        
        // === STATISTIQUES DISCORD ===
        stats.discord = {
            guilds: client.guilds.cache.size,
            users: client.users.cache.size,
            channels: client.channels.cache.size,
            commands: client.commands ? client.commands.size : 0,
            ping: client.ws.ping,
            shards: client.shard ? client.shard.count : 1
        };
        
        // Calculer les utilisateurs uniques dans tous les serveurs
        const uniqueUsers = new Set();
        client.guilds.cache.forEach(guild => {
            guild.members.cache.forEach(member => {
                uniqueUsers.add(member.id);
            });
        });
        stats.discord.uniqueUsers = uniqueUsers.size;
        
        // Types de salons
        const channelTypes = {};
        client.channels.cache.forEach(channel => {
            const type = channel.type;
            channelTypes[type] = (channelTypes[type] || 0) + 1;
        });
        stats.discord.channelTypes = channelTypes;
        
        // === STATISTIQUES SYSTÈME ===
        const memUsage = process.memoryUsage();
        stats.system = {
            platform: os.platform(),
            arch: os.arch(),
            nodeVersion: process.version,
            cpuUsage: process.cpuUsage(),
            memoryUsage: {
                rss: memUsage.rss,
                heapUsed: memUsage.heapUsed,
                heapTotal: memUsage.heapTotal,
                external: memUsage.external
            },
            systemMemory: {
                total: os.totalmem(),
                free: os.freemem(),
                used: os.totalmem() - os.freemem()
            },
            cpuCount: os.cpus().length,
            loadAverage: os.loadavg(),
            hostname: os.hostname()
        };
        
        // === STATISTIQUES BASE DE DONNÉES ===
        if (client.database) {
            try {
                const globalData = client.database.read('globaldata.json') || {};
                stats.database = {
                    totalCommands: globalData.statistics?.totalCommands || 0,
                    totalMessages: globalData.statistics?.totalMessages || 0,
                    totalGuilds: globalData.statistics?.totalGuilds || 0,
                    totalUsers: globalData.statistics?.totalUsers || 0,
                    lastUpdated: globalData.lastUpdated || new Date()
                };
                
                // Compter les sanctions
                const warnings = client.database.read('sanctions/warnings.json') || { warnings: [] };
                const bans = client.database.read('sanctions/bans.json') || { bans: [] };
                const mutes = client.database.read('sanctions/mutes.json') || { mutes: [] };
                
                stats.database.sanctions = {
                    warnings: warnings.warnings.length,
                    bans: bans.bans.length,
                    mutes: mutes.mutes.length,
                    total: warnings.warnings.length + bans.bans.length + mutes.mutes.length
                };
                
            } catch (error) {
                stats.database = {
                    error: 'Impossible de lire la base de données',
                    totalCommands: 0,
                    totalMessages: 0,
                    sanctions: { warnings: 0, bans: 0, mutes: 0, total: 0 }
                };
            }
        }
        
        // === STATISTIQUES DE PERFORMANCE ===
        stats.performance = {
            memoryUsagePercent: Math.round((stats.system.memoryUsage.heapUsed / stats.system.memoryUsage.heapTotal) * 100),
            systemMemoryPercent: Math.round((stats.system.systemMemory.used / stats.system.systemMemory.total) * 100),
            avgLoadPercent: Math.round((stats.system.loadAverage[0] / stats.system.cpuCount) * 100),
            pingCategory: this.getPingCategory(stats.discord.ping)
        };
        
        return stats;
    },
    
    /**
     * Créer l'embed des statistiques
     * @param {object} stats - Statistiques collectées
     * @param {Client} client - Le client Discord
     * @returns {EmbedBuilder} Embed des statistiques
     * @author Kofu
     */
    createStatsEmbed(stats, client) {
        const embed = new EmbedBuilder()
            .setTitle('📊 Statistiques TASHKY Bot')
            .setDescription('**Statistiques en temps réel du bot**')
            .setColor('#5865F2')
            .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
            .setFooter(KofuSignature.getKofuFooter())
            .setTimestamp();
        
        // === INFORMATIONS GÉNÉRALES ===
        embed.addFields(
            { name: '🤖 Version', value: `\`${stats.bot.version}\``, inline: true },
            { name: '⏱️ Uptime', value: stats.bot.uptimeFormatted, inline: true },
            { name: '📡 Ping', value: `${stats.discord.ping}ms ${stats.performance.pingCategory}`, inline: true }
        );
        
        // === STATISTIQUES DISCORD ===
        embed.addFields(
            { name: '🏛️ Serveurs', value: `\`${stats.discord.guilds.toLocaleString()}\``, inline: true },
            { name: '👥 Utilisateurs', value: `\`${stats.discord.uniqueUsers.toLocaleString()}\``, inline: true },
            { name: '📺 Salons', value: `\`${stats.discord.channels.toLocaleString()}\``, inline: true }
        );
        
        // === UTILISATION ===
        if (stats.database.totalCommands > 0) {
            embed.addFields(
                { name: '⚙️ Commandes exécutées', value: `\`${stats.database.totalCommands.toLocaleString()}\``, inline: true },
                { name: '💬 Messages traités', value: `\`${stats.database.totalMessages.toLocaleString()}\``, inline: true },
                { name: '⚠️ Sanctions', value: `\`${stats.database.sanctions.total.toLocaleString()}\``, inline: true }
            );
        }
        
        // === PERFORMANCE ===
        embed.addFields(
            { name: '🧠 Mémoire Bot', value: `${this.formatBytes(stats.system.memoryUsage.heapUsed)} / ${this.formatBytes(stats.system.memoryUsage.heapTotal)} (${stats.performance.memoryUsagePercent}%)`, inline: true },
            { name: '💾 Mémoire Système', value: `${this.formatBytes(stats.system.systemMemory.used)} / ${this.formatBytes(stats.system.systemMemory.total)} (${stats.performance.systemMemoryPercent}%)`, inline: true },
            { name: '⚡ CPU', value: `${stats.system.cpuCount} cœur(s) - ${stats.performance.avgLoadPercent}%`, inline: true }
        );
        
        // === INFORMATIONS TECHNIQUES ===
        embed.addFields(
            { name: '🔧 Node.js', value: `\`${stats.bot.nodeVersion}\``, inline: true },
            { name: '📚 Discord.js', value: `\`v${stats.bot.djsVersion}\``, inline: true },
            { name: '🖥️ Système', value: `\`${stats.system.platform} ${stats.system.arch}\``, inline: true }
        );
        
        // === DÉTAILS SUPPLÉMENTAIRES ===
        let additionalInfo = '';
        
        if (stats.discord.shards > 1) {
            additionalInfo += `🔀 **Shards:** ${stats.discord.shards}\n`;
        }
        
        if (stats.database.error) {
            additionalInfo += `⚠️ **Base de données:** ${stats.database.error}\n`;
        }
        
        additionalInfo += `🚀 **Démarré:** <t:${Math.floor(stats.bot.startedAt.getTime() / 1000)}:R>\n`;
        additionalInfo += `👨‍💻 **Développeur:** ${stats.bot.author}`;
        
        embed.addFields({
            name: '📋 Informations supplémentaires',
            value: additionalInfo,
            inline: false
        });
        
        // Indicateur de santé général
        const healthScore = this.calculateHealthScore(stats);
        const healthEmoji = healthScore >= 80 ? '🟢' : healthScore >= 60 ? '🟡' : '🔴';
        
        embed.addFields({
            name: `${healthEmoji} État de santé`,
            value: `**${healthScore}/100** - ${this.getHealthStatus(healthScore)}`,
            inline: false
        });
        
        return embed;
    },
    
    /**
     * Formater l'uptime
     * @param {number} uptime - Uptime en secondes
     * @returns {string} Uptime formaté
     * @author Kofu
     */
    formatUptime(uptime) {
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        
        if (days > 0) {
            return `${days}j ${hours}h ${minutes}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m ${seconds}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        } else {
            return `${seconds}s`;
        }
    },
    
    /**
     * Formater les bytes
     * @param {number} bytes - Bytes à formater
     * @returns {string} Bytes formatés
     * @author Kofu
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },
    
    /**
     * Obtenir la catégorie de ping
     * @param {number} ping - Ping en ms
     * @returns {string} Catégorie de ping
     * @author Kofu
     */
    getPingCategory(ping) {
        if (ping < 100) return '🟢';
        if (ping < 200) return '🟡';
        if (ping < 500) return '🟠';
        return '🔴';
    },
    
    /**
     * Calculer le score de santé
     * @param {object} stats - Statistiques
     * @returns {number} Score de santé (0-100)
     * @author Kofu
     */
    calculateHealthScore(stats) {
        let score = 100;
        
        // Pénalités basées sur les performances
        if (stats.performance.memoryUsagePercent > 80) score -= 20;
        else if (stats.performance.memoryUsagePercent > 60) score -= 10;
        
        if (stats.performance.systemMemoryPercent > 90) score -= 15;
        else if (stats.performance.systemMemoryPercent > 75) score -= 5;
        
        if (stats.discord.ping > 500) score -= 20;
        else if (stats.discord.ping > 200) score -= 10;
        else if (stats.discord.ping > 100) score -= 5;
        
        if (stats.performance.avgLoadPercent > 80) score -= 15;
        else if (stats.performance.avgLoadPercent > 60) score -= 5;
        
        // Bonus pour la stabilité
        if (stats.bot.uptime > 86400) score += 5; // +5 si uptime > 1 jour
        if (stats.bot.uptime > 604800) score += 5; // +5 si uptime > 1 semaine
        
        return Math.max(0, Math.min(100, score));
    },
    
    /**
     * Obtenir le statut de santé
     * @param {number} score - Score de santé
     * @returns {string} Statut de santé
     * @author Kofu
     */
    getHealthStatus(score) {
        if (score >= 80) return 'Excellent';
        if (score >= 60) return 'Bon';
        if (score >= 40) return 'Moyen';
        if (score >= 20) return 'Faible';
        return 'Critique';
    }
};

/**
 * ====================================
 * ✨ Made with ❤️ by Kofu
 * github.com/kofudev
 * ====================================
 */