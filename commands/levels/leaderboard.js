/**
 * ====================================
 * COMMANDE: /leaderboard
 * ====================================
 * 
 * Afficher le classement des niveaux
 * Leaderboard avec pagination
 * 
 * @author Kofu (github.com/kofudev)
 * @category Levels
 * ====================================
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const KofuSignature = require('../../utils/kofu-signature');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('🏆 Afficher le classement des niveaux')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Type de classement')
                .setRequired(false)
                .addChoices(
                    { name: '🏛️ Serveur', value: 'server' },
                    { name: '🌍 Global', value: 'global' }
                )
        ),
    
    category: 'levels',
    cooldown: 10,
    
    /**
     * Exécution de la commande leaderboard
     * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
     * @author Kofu
     */
    async execute(interaction) {
        const type = interaction.options.getString('type') || 'server';
        const isGlobal = type === 'global';
        
        // Embed de chargement
        const loadingEmbed = new EmbedBuilder()
            .setTitle('🏆 Chargement du classement...')
            .setDescription('Récupération des données de classement...')
            .setColor('#FFD700')
            .setFooter(KofuSignature.getKofuFooter())
            .setTimestamp();
        
        await interaction.reply({ embeds: [loadingEmbed] });
        
        try {
            // Récupérer et trier les utilisateurs
            const leaderboardData = await getLeaderboardData(interaction.client, interaction.guild.id, isGlobal);
            
            if (leaderboardData.length === 0) {
                const emptyEmbed = KofuSignature.createWarningEmbed(
                    'Classement vide !',
                    'Aucun utilisateur trouvé dans le classement.'
                );
                return interaction.editReply({ embeds: [emptyEmbed] });
            }
            
            // Pagination
            const itemsPerPage = 10;
            const totalPages = Math.ceil(leaderboardData.length / itemsPerPage);
            let currentPage = 1;
            
            // Créer l'embed de la première page
            const leaderboardEmbed = await createLeaderboardEmbed(
                interaction.client,
                leaderboardData,
                currentPage,
                totalPages,
                isGlobal,
                interaction.user.id
            );
            
            // Créer les boutons de navigation si nécessaire
            const components = totalPages > 1 ? [createNavigationButtons(currentPage, totalPages)] : [];
            
            await interaction.editReply({ embeds: [leaderboardEmbed], components });
            
            // Gérer la pagination si nécessaire
            if (totalPages > 1) {
                const collector = interaction.channel.createMessageComponentCollector({
                    filter: i => i.user.id === interaction.user.id,
                    time: 300000 // 5 minutes
                });
                
                collector.on('collect', async i => {
                    if (i.customId === 'first') currentPage = 1;
                    else if (i.customId === 'previous') currentPage = Math.max(1, currentPage - 1);
                    else if (i.customId === 'next') currentPage = Math.min(totalPages, currentPage + 1);
                    else if (i.customId === 'last') currentPage = totalPages;
                    
                    const newEmbed = await createLeaderboardEmbed(
                        interaction.client,
                        leaderboardData,
                        currentPage,
                        totalPages,
                        isGlobal,
                        interaction.user.id
                    );
                    
                    const newComponents = [createNavigationButtons(currentPage, totalPages)];
                    
                    await i.update({ embeds: [newEmbed], components: newComponents });
                });
                
                collector.on('end', () => {
                    // Désactiver les boutons après expiration
                    const disabledComponents = [createNavigationButtons(currentPage, totalPages, true)];
                    interaction.editReply({ components: disabledComponents }).catch(() => {});
                });
            }
            
            console.log(`🏆 [Kofu] ${interaction.user.tag} a consulté le leaderboard (${type})`);
            
        } catch (error) {
            console.error('❌ [Kofu] Erreur leaderboard:', error);
            
            const errorEmbed = KofuSignature.createErrorEmbed(
                'Erreur de classement !',
                `Impossible de récupérer le classement.\n\n**Erreur:** \`${error.message}\``
            );
            
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};

/**
 * Récupérer les données du leaderboard
 * @param {Client} client - Client Discord
 * @param {string} guildId - ID du serveur
 * @param {boolean} isGlobal - Si c'est le classement global
 * @returns {Array} Données du leaderboard
 * @author Kofu
 */
async function getLeaderboardData(client, guildId, isGlobal) {
    const usersData = client.database.read('users.json') || {};
    const leaderboard = [];
    
    for (const [userId, userData] of Object.entries(usersData)) {
        if (!userData.levels) continue;
        
        // Pour le classement serveur, vérifier que l'utilisateur est sur le serveur
        if (!isGlobal && (!userData.servers || !userData.servers.includes(guildId))) {
            continue;
        }
        
        leaderboard.push({
            userId: userId,
            username: userData.username || 'Utilisateur inconnu',
            discriminator: userData.discriminator || '0000',
            avatar: userData.avatar || null,
            level: userData.levels.level || 1,
            totalXp: userData.levels.totalXp || 0,
            messagesCount: userData.levels.messagesCount || 0,
            voiceTime: userData.levels.voiceTime || 0
        });
    }
    
    // Trier par XP total (décroissant)
    leaderboard.sort((a, b) => b.totalXp - a.totalXp);
    
    return leaderboard;
}

/**
 * Créer l'embed du leaderboard
 * @param {Client} client - Client Discord
 * @param {Array} leaderboardData - Données du leaderboard
 * @param {number} page - Page actuelle
 * @param {number} totalPages - Nombre total de pages
 * @param {boolean} isGlobal - Si c'est le classement global
 * @param {string} requesterId - ID de l'utilisateur qui a fait la demande
 * @returns {EmbedBuilder} Embed du leaderboard
 * @author Kofu
 */
async function createLeaderboardEmbed(client, leaderboardData, page, totalPages, isGlobal, requesterId) {
    const itemsPerPage = 10;
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, leaderboardData.length);
    const pageData = leaderboardData.slice(startIndex, endIndex);
    
    const embed = new EmbedBuilder()
        .setTitle(`🏆 Classement ${isGlobal ? 'Global' : 'du Serveur'} - Niveaux`)
        .setColor('#FFD700')
        .setFooter({ 
            text: `Page ${page}/${totalPages} | ${leaderboardData.length} utilisateur(s) | ` + KofuSignature.getKofuFooter().text,
            iconURL: KofuSignature.getKofuFooter().iconURL
        })
        .setTimestamp();
    
    // Créer la liste du classement
    let leaderboardText = '';
    
    for (let i = 0; i < pageData.length; i++) {
        const user = pageData[i];
        const rank = startIndex + i + 1;
        const isRequester = user.userId === requesterId;
        
        // Emojis de rang
        let rankEmoji = '';
        if (rank === 1) rankEmoji = '🥇';
        else if (rank === 2) rankEmoji = '🥈';
        else if (rank === 3) rankEmoji = '🥉';
        else rankEmoji = `**${rank}.**`;
        
        // Titre de niveau
        const levelTitle = getLevelTitle(user.level);
        
        // Formatage spécial pour l'utilisateur qui a fait la demande
        const userDisplay = isRequester ? `**${user.username}#${user.discriminator}**` : `${user.username}#${user.discriminator}`;
        
        leaderboardText += `${rankEmoji} ${userDisplay}\n`;
        leaderboardText += `   ${levelTitle} • Niveau **${user.level}** • **${user.totalXp.toLocaleString('fr-FR')}** XP\n`;
        leaderboardText += `   💬 ${user.messagesCount.toLocaleString('fr-FR')} messages • 🎤 ${formatVoiceTime(user.voiceTime)}\n\n`;
    }
    
    embed.setDescription(leaderboardText || 'Aucun utilisateur trouvé.');
    
    // Ajouter des statistiques générales
    if (page === 1) {
        const totalXp = leaderboardData.reduce((sum, user) => sum + user.totalXp, 0);
        const totalMessages = leaderboardData.reduce((sum, user) => sum + user.messagesCount, 0);
        const avgLevel = leaderboardData.length > 0 ? 
            (leaderboardData.reduce((sum, user) => sum + user.level, 0) / leaderboardData.length).toFixed(1) : 0;
        
        embed.addFields({
            name: '📊 Statistiques générales',
            value: 
                `👥 **Utilisateurs actifs:** ${leaderboardData.length}\n` +
                `✨ **XP total:** ${totalXp.toLocaleString('fr-FR')}\n` +
                `💬 **Messages total:** ${totalMessages.toLocaleString('fr-FR')}\n` +
                `📈 **Niveau moyen:** ${avgLevel}`,
            inline: false
        });
    }
    
    // Ajouter la position de l'utilisateur s'il n'est pas sur cette page
    const requesterIndex = leaderboardData.findIndex(user => user.userId === requesterId);
    if (requesterIndex !== -1 && (requesterIndex < startIndex || requesterIndex >= endIndex)) {
        const requesterRank = requesterIndex + 1;
        const requesterData = leaderboardData[requesterIndex];
        
        embed.addFields({
            name: '📍 Ta position',
            value: `**#${requesterRank}** • Niveau **${requesterData.level}** • **${requesterData.totalXp.toLocaleString('fr-FR')}** XP`,
            inline: false
        });
    }
    
    return embed;
}

/**
 * Créer les boutons de navigation
 * @param {number} currentPage - Page actuelle
 * @param {number} totalPages - Nombre total de pages
 * @param {boolean} disabled - Si les boutons sont désactivés
 * @returns {ActionRowBuilder} Ligne de boutons
 * @author Kofu
 */
function createNavigationButtons(currentPage, totalPages, disabled = false) {
    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('first')
                .setLabel('⏮️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(disabled || currentPage === 1),
            new ButtonBuilder()
                .setCustomId('previous')
                .setLabel('◀️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(disabled || currentPage === 1),
            new ButtonBuilder()
                .setCustomId('page_info')
                .setLabel(`${currentPage}/${totalPages}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId('next')
                .setLabel('▶️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(disabled || currentPage === totalPages),
            new ButtonBuilder()
                .setCustomId('last')
                .setLabel('⏭️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(disabled || currentPage === totalPages)
        );
}

/**
 * Obtenir le titre selon le niveau
 * @param {number} level - Niveau
 * @returns {string} Titre
 * @author Kofu
 */
function getLevelTitle(level) {
    if (level >= 100) return '🏆 Légende';
    if (level >= 75) return '👑 Maître';
    if (level >= 50) return '⭐ Expert';
    if (level >= 25) return '🎖️ Vétéran';
    if (level >= 10) return '🥉 Expérimenté';
    if (level >= 5) return '🌟 Actif';
    return '🌱 Débutant';
}

/**
 * Formater le temps vocal
 * @param {number} seconds - Temps en secondes
 * @returns {string} Temps formaté
 * @author Kofu
 */
function formatVoiceTime(seconds) {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    
    const hours = Math.floor(seconds / 3600);
    return `${hours}h`;
}

/**
 * ====================================
 * ✨ Made with ❤️ by Kofu
 * github.com/kofudev
 * ====================================
 */