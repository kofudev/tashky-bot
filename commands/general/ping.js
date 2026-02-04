/**
 * ====================================
 * COMMANDE: /ping
 * ====================================
 * 
 * Commande simple pour tester la latence du bot
 * Affiche le ping WebSocket et API
 * 
 * @author Kofu (github.com/kofudev)
 * @category General
 * ====================================
 */

const { SlashCommandBuilder } = require('discord.js');
const KofuSignature = require('../../utils/kofu-signature');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('🏓 Vérifier la latence du bot'),
    
    category: 'general',
    cooldown: 3,
    
    /**
     * Exécution de la commande ping
     * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
     * @author Kofu
     */
    async execute(interaction) {
        // Mesurer le temps de réponse
        const sent = await interaction.reply({
            content: '🏓 Pong ! Calcul de la latence...',
            fetchReply: true
        });
        
        // Calculer les latences
        const wsLatency = interaction.client.ws.ping;
        const apiLatency = sent.createdTimestamp - interaction.createdTimestamp;
        
        // Déterminer la qualité de la connexion
        let connectionQuality = '🟢 Excellente';
        let color = '#43B581';
        
        if (wsLatency > 100 || apiLatency > 200) {
            connectionQuality = '🟡 Correcte';
            color = '#FAA61A';
        }
        
        if (wsLatency > 200 || apiLatency > 500) {
            connectionQuality = '🔴 Lente';
            color = '#F04747';
        }
        
        // Créer l'embed de réponse
        const pingEmbed = KofuSignature.createKofuEmbed(
            '🏓 Pong !',
            `**Latences du bot TASHKY**\n\n` +
            `🌐 **WebSocket:** \`${wsLatency}ms\`\n` +
            `📡 **API Discord:** \`${apiLatency}ms\`\n` +
            `📊 **Qualité:** ${connectionQuality}\n\n` +
            `*Bot développé avec ❤️ par Kofu*`,
            color
        );
        
        // Ajouter des informations supplémentaires
        pingEmbed.addFields(
            {
                name: '⏱️ Uptime',
                value: `\`${formatUptime(interaction.client.uptime)}\``,
                inline: true
            },
            {
                name: '🏛️ Serveurs',
                value: `\`${interaction.client.guilds.cache.size}\``,
                inline: true
            },
            {
                name: '👥 Utilisateurs',
                value: `\`${interaction.client.users.cache.size}\``,
                inline: true
            }
        );
        
        // Mettre à jour la réponse
        await interaction.editReply({
            content: null,
            embeds: [pingEmbed]
        });
        
        console.log(`🏓 [Kofu] Ping exécuté par ${interaction.user.tag} - WS: ${wsLatency}ms, API: ${apiLatency}ms`);
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
        return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
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