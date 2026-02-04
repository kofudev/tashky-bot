/**
 * ====================================
 * COMMANDE: /serverinfo
 * ====================================
 * 
 * Affiche toutes les informations du serveur
 * Membres, salons, rôles, boost, etc.
 * 
 * @author Kofu (github.com/kofudev)
 * @category General
 * ====================================
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const KofuSignature = require('../../utils/kofu-signature');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('🏛️ Informations complètes sur le serveur'),
    
    category: 'general',
    cooldown: 5,
    guildOnly: true,
    
    /**
     * Exécution de la commande serverinfo
     * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
     * @author Kofu
     */
    async execute(interaction) {
        const guild = interaction.guild;
        
        // Récupérer les informations du serveur
        const owner = await guild.fetchOwner();
        const createdTimestamp = Math.floor(guild.createdTimestamp / 1000);
        
        // Calculer les statistiques des membres
        const totalMembers = guild.memberCount;
        const botCount = guild.members.cache.filter(member => member.user.bot).size;
        const humanCount = totalMembers - botCount;
        
        // Calculer les statistiques des salons
        const textChannels = guild.channels.cache.filter(c => c.type === 0).size;
        const voiceChannels = guild.channels.cache.filter(c => c.type === 2).size;
        const categories = guild.channels.cache.filter(c => c.type === 4).size;
        const totalChannels = guild.channels.cache.size;
        
        // Informations sur les rôles
        const totalRoles = guild.roles.cache.size;
        const highestRole = guild.roles.highest;
        
        // Informations sur les boosts
        const boostLevel = guild.premiumTier;
        const boostCount = guild.premiumSubscriptionCount || 0;
        const boostEmoji = ['❌', '🥉', '🥈', '🥇'][boostLevel];
        
        // Fonctionnalités du serveur
        const features = guild.features.length > 0 ? guild.features.map(feature => 
            feature.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        ).join(', ') : 'Aucune';
        
        // Niveau de vérification
        const verificationLevels = {
            0: 'Aucune',
            1: 'Faible',
            2: 'Moyenne',
            3: 'Élevée',
            4: 'Très élevée'
        };
        
        // Créer l'embed principal
        const serverInfoEmbed = new EmbedBuilder()
            .setTitle(`🏛️ Informations du Serveur`)
            .setDescription(`**${guild.name}**\n\n*Serveur créé le <t:${createdTimestamp}:F>*`)
            .setColor('#5865F2')
            .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
            .addFields(
                {
                    name: '👑 Propriétaire',
                    value: `${owner.user.tag}\n\`${owner.id}\``,
                    inline: true
                },
                {
                    name: '🆔 ID du Serveur',
                    value: `\`${guild.id}\``,
                    inline: true
                },
                {
                    name: '📅 Créé le',
                    value: `<t:${createdTimestamp}:R>`,
                    inline: true
                },
                {
                    name: '👥 Membres',
                    value: 
                        `👤 **Humains:** \`${humanCount}\`\n` +
                        `🤖 **Bots:** \`${botCount}\`\n` +
                        `📊 **Total:** \`${totalMembers}\``,
                    inline: true
                },
                {
                    name: '📺 Salons',
                    value: 
                        `💬 **Texte:** \`${textChannels}\`\n` +
                        `🔊 **Vocal:** \`${voiceChannels}\`\n` +
                        `📁 **Catégories:** \`${categories}\`\n` +
                        `📊 **Total:** \`${totalChannels}\``,
                    inline: true
                },
                {
                    name: '🎭 Rôles',
                    value: 
                        `📊 **Total:** \`${totalRoles}\`\n` +
                        `👑 **Plus haut:** ${highestRole}\n` +
                        `🎨 **Couleur:** \`${highestRole.hexColor}\``,
                    inline: true
                },
                {
                    name: '🚀 Boost Nitro',
                    value: 
                        `${boostEmoji} **Niveau:** \`${boostLevel}\`\n` +
                        `💎 **Boosts:** \`${boostCount}\`\n` +
                        `📈 **Progression:** ${getBoostProgress(boostLevel, boostCount)}`,
                    inline: true
                },
                {
                    name: '🔒 Sécurité',
                    value: 
                        `🛡️ **Vérification:** ${verificationLevels[guild.verificationLevel]}\n` +
                        `🔞 **Filtre contenu:** ${getContentFilterLevel(guild.explicitContentFilter)}\n` +
                        `📱 **MFA requis:** ${guild.mfaLevel ? '✅ Oui' : '❌ Non'}`,
                    inline: true
                },
                {
                    name: '⚡ Fonctionnalités',
                    value: features.length > 1024 ? features.substring(0, 1021) + '...' : features,
                    inline: false
                }
            )
            .setFooter(KofuSignature.getKofuFooter())
            .setTimestamp();
        
        // Ajouter la bannière si elle existe
        if (guild.bannerURL()) {
            serverInfoEmbed.setImage(guild.bannerURL({ dynamic: true, size: 1024 }));
        }
        
        await interaction.reply({ embeds: [serverInfoEmbed] });
        
        console.log(`🏛️ [Kofu] ServerInfo affiché pour ${guild.name} par ${interaction.user.tag}`);
    }
};

/**
 * Obtenir la progression des boosts
 * @param {number} level - Niveau actuel
 * @param {number} boosts - Nombre de boosts
 * @returns {string} Barre de progression
 * @author Kofu
 */
function getBoostProgress(level, boosts) {
    const requirements = [0, 2, 7, 14];
    const nextLevel = level + 1;
    
    if (nextLevel > 3) {
        return '🏆 **Maximum atteint !**';
    }
    
    const needed = requirements[nextLevel];
    const progress = Math.min(boosts / needed, 1);
    const progressBar = '█'.repeat(Math.floor(progress * 10)) + '░'.repeat(10 - Math.floor(progress * 10));
    
    return `\`${progressBar}\` ${boosts}/${needed}`;
}

/**
 * Obtenir le niveau de filtre de contenu
 * @param {number} level - Niveau de filtre
 * @returns {string} Description du niveau
 * @author Kofu
 */
function getContentFilterLevel(level) {
    const levels = {
        0: 'Désactivé',
        1: 'Membres sans rôle',
        2: 'Tous les membres'
    };
    return levels[level] || 'Inconnu';
}

/**
 * ====================================
 * ✨ Made with ❤️ by Kofu
 * github.com/kofudev
 * ====================================
 */