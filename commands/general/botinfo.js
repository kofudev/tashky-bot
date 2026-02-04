/**
 * ====================================
 * COMMANDE: /botinfo
 * ====================================
 * 
 * Affiche toutes les informations du bot
 * Statistiques, version, développeur, etc.
 * 
 * @author Kofu (github.com/kofudev)
 * @category General
 * ====================================
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const KofuSignature = require('../../utils/kofu-signature');
const os = require('os');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('botinfo')
        .setDescription('🤖 Informations complètes sur TASHKY Bot'),
    
    category: 'general',
    cooldown: 5,
    
    /**
     * Exécution de la commande botinfo
     * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
     * @author Kofu
     */
    async execute(interaction) {
        const client = interaction.client;
        
        // Calculer l'uptime
        const uptime = formatUptime(client.uptime);
        
        // Calculer l'utilisation mémoire
        const memoryUsage = process.memoryUsage();
        const memoryUsed = (memoryUsage.heapUsed / 1024 / 1024).toFixed(2);
        const memoryTotal = (memoryUsage.heapTotal / 1024 / 1024).toFixed(2);
        
        // Récupérer les stats globales
        const globalData = client.database.read('globaldata.json') || client.database.getDefaultGlobalData();
        
        // Créer l'embed principal
        const botInfoEmbed = new EmbedBuilder()
            .setTitle('🤖 TASHKY Bot - Informations Complètes')
            .setDescription(
                '**Bot Discord multifonction fait avec ❤️ par Kofu**\n\n' +
                '✨ Code humain, lisible et passionné\n' +
                '🛡️ Modération avancée et système de tickets\n' +
                '👑 Panel owner ultra-puissant\n' +
                '🌐 Support multilingue (FR/EN)'
            )
            .setColor('#5865F2')
            .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields(
                {
                    name: '📊 Statistiques Générales',
                    value: 
                        `🏛️ **Serveurs:** \`${client.guilds.cache.size}\`\n` +
                        `👥 **Utilisateurs:** \`${client.users.cache.size}\`\n` +
                        `📺 **Salons:** \`${client.channels.cache.size}\`\n` +
                        `⚙️ **Commandes:** \`${client.commands.size}\``,
                    inline: true
                },
                {
                    name: '⚡ Performance',
                    value: 
                        `🏓 **Ping:** \`${client.ws.ping}ms\`\n` +
                        `⏱️ **Uptime:** \`${uptime}\`\n` +
                        `💾 **RAM:** \`${memoryUsed}MB / ${memoryTotal}MB\`\n` +
                        `🖥️ **CPU:** \`${os.cpus()[0].model.split(' ')[0]}\``,
                    inline: true
                },
                {
                    name: '🔧 Informations Techniques',
                    value: 
                        `📦 **Version:** \`${process.env.BOT_VERSION || '1.0.0'}\`\n` +
                        `🟢 **Node.js:** \`${process.version}\`\n` +
                        `📚 **Discord.js:** \`14.14.1\`\n` +
                        `🖥️ **Plateforme:** \`${process.platform}\``,
                    inline: true
                },
                {
                    name: '👨‍💻 Développeur',
                    value: 
                        `**Kofu** - Développeur passionné\n` +
                        `🔗 [GitHub](https://github.com/kofudev)\n` +
                        `💬 [Support Discord](https://discord.gg/support)\n` +
                        `💖 [Faire un don](https://paypal.me/kofu)`,
                    inline: false
                },
                {
                    name: '🎯 Fonctionnalités Principales',
                    value: 
                        `🛡️ **Modération:** 20+ commandes avancées\n` +
                        `🎫 **Tickets:** Système complet avec transcriptions\n` +
                        `👑 **Owner Panel:** Contrôle total sur tous les serveurs\n` +
                        `📊 **Logs:** Système de logging détaillé\n` +
                        `🌐 **Dashboard:** Panel web moderne\n` +
                        `🔒 **Sécurité:** Anti-spam, anti-raid, anti-nuke`,
                    inline: false
                }
            )
            .setFooter(KofuSignature.getKofuFooter())
            .setTimestamp();
        
        // Créer les boutons d'action
        const actionButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('📥 Inviter le Bot')
                    .setStyle(ButtonStyle.Link)
                    .setURL(`https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`),
                new ButtonBuilder()
                    .setLabel('💬 Support')
                    .setStyle(ButtonStyle.Link)
                    .setURL('https://discord.gg/support'),
                new ButtonBuilder()
                    .setLabel('📖 GitHub')
                    .setStyle(ButtonStyle.Link)
                    .setURL('https://github.com/kofudev/tashky-bot'),
                new ButtonBuilder()
                    .setLabel('💖 Donation')
                    .setStyle(ButtonStyle.Link)
                    .setURL('https://paypal.me/kofu')
            );
        
        await interaction.reply({
            embeds: [botInfoEmbed],
            components: [actionButtons]
        });
        
        console.log(`🤖 [Kofu] BotInfo affiché pour ${interaction.user.tag}`);
    }
};

/**
 * Formater l'uptime en format lisible
 * @param {number} uptime - Uptime en millisecondes
 * @returns {string} Uptime formaté
 * @author Kofu
 */
function formatUptime(uptime) {
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
        return `${days}j ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    } else {
        return `${seconds}s`;
    }
}

/**
 * ====================================
 * ✨ Made with ❤️ by Kofu
 * github.com/kofudev
 * ====================================
 */