/**
 * ====================================
 * COMMANDE: /rank
 * ====================================
 * 
 * Afficher le niveau et l'XP d'un utilisateur
 * Système de niveaux avec progression
 * 
 * @author Kofu (github.com/kofudev)
 * @category Levels
 * ====================================
 */

const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const KofuSignature = require('../../utils/kofu-signature');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('📊 Afficher ton niveau ou celui d\'un autre utilisateur')
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('Utilisateur dont afficher le niveau')
                .setRequired(false)
        ),
    
    category: 'levels',
    cooldown: 5,
    
    /**
     * Exécution de la commande rank
     * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
     * @author Kofu
     */
    async execute(interaction) {
        const targetUser = interaction.options.getUser('utilisateur') || interaction.user;
        const isOwnRank = targetUser.id === interaction.user.id;
        
        // Récupérer les données utilisateur
        const userData = interaction.client.database.getUser(targetUser.id);
        const levelData = userData.levels || {
            xp: 0,
            level: 1,
            totalXp: 0,
            messagesCount: 0,
            voiceTime: 0,
            lastXpGain: null
        };
        
        // Calculer les informations de niveau
        const currentLevel = levelData.level;
        const currentXp = levelData.xp;
        const xpForCurrentLevel = getXpForLevel(currentLevel);
        const xpForNextLevel = getXpForLevel(currentLevel + 1);
        const xpNeeded = xpForNextLevel - levelData.totalXp;
        const xpProgress = levelData.totalXp - xpForCurrentLevel;
        const xpForLevelUp = xpForNextLevel - xpForCurrentLevel;
        
        // Calculer le rang sur le serveur
        const serverRank = await calculateServerRank(interaction.client, interaction.guild.id, targetUser.id);
        const globalRank = await calculateGlobalRank(interaction.client, targetUser.id);
        
        // Créer l'embed
        const rankEmbed = new EmbedBuilder()
            .setTitle(`📊 ${isOwnRank ? 'Ton niveau' : `Niveau de ${targetUser.displayName}`}`)
            .setColor(getLevelColor(currentLevel))
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields(
                { name: '🏆 Niveau', value: `**${currentLevel}**`, inline: true },
                { name: '✨ XP Total', value: `**${levelData.totalXp.toLocaleString('fr-FR')}**`, inline: true },
                { name: '📈 Progression', value: `**${xpProgress}** / **${xpForLevelUp}** XP`, inline: true },
                { name: '🎯 Prochain niveau', value: `**${xpNeeded.toLocaleString('fr-FR')}** XP restants`, inline: true },
                { name: '🏅 Rang serveur', value: `**#${serverRank}**`, inline: true },
                { name: '🌍 Rang global', value: `**#${globalRank}**`, inline: true }
            )
            .addFields({
                name: '📊 Progression vers le niveau suivant',
                value: createProgressBar(xpProgress, xpForLevelUp),
                inline: false
            })
            .addFields(
                { name: '💬 Messages envoyés', value: `**${levelData.messagesCount.toLocaleString('fr-FR')}**`, inline: true },
                { name: '🎤 Temps vocal', value: formatVoiceTime(levelData.voiceTime), inline: true },
                { name: '⭐ Titre', value: getLevelTitle(currentLevel), inline: true }
            )
            .setFooter(KofuSignature.getKofuFooter())
            .setTimestamp();
        
        // Ajouter des informations sur les récompenses de niveau
        const nextRewards = getNextLevelRewards(currentLevel);
        if (nextRewards.length > 0) {
            rankEmbed.addFields({
                name: '🎁 Prochaines récompenses',
                value: nextRewards.slice(0, 3).map(reward => 
                    `**Niveau ${reward.level}:** ${reward.description}`
                ).join('\n'),
                inline: false
            });
        }
        
        // Ajouter des statistiques détaillées si c'est son propre rang
        if (isOwnRank) {
            const avgXpPerMessage = levelData.messagesCount > 0 ? Math.floor(levelData.totalXp / levelData.messagesCount) : 0;
            const lastXpGain = levelData.lastXpGain ? new Date(levelData.lastXpGain) : null;
            
            rankEmbed.addFields({
                name: '📈 Statistiques détaillées',
                value: 
                    `📊 **XP moyen/message:** ${avgXpPerMessage}\n` +
                    `🕐 **Dernier gain XP:** ${lastXpGain ? `<t:${Math.floor(lastXpGain.getTime() / 1000)}:R>` : 'Jamais'}\n` +
                    `🎯 **Pourcentage niveau:** ${Math.floor((xpProgress / xpForLevelUp) * 100)}%`,
                inline: false
            });
        }
        
        await interaction.reply({ embeds: [rankEmbed] });
        
        console.log(`📊 [Kofu] ${interaction.user.tag} a consulté le niveau de ${targetUser.tag}`);
    }
};

/**
 * Calculer l'XP nécessaire pour un niveau donné
 * @param {number} level - Niveau
 * @returns {number} XP nécessaire
 * @author Kofu
 */
function getXpForLevel(level) {
    if (level <= 1) return 0;
    return Math.floor(100 * Math.pow(1.2, level - 1));
}

/**
 * Obtenir la couleur selon le niveau
 * @param {number} level - Niveau
 * @returns {string} Code couleur hex
 * @author Kofu
 */
function getLevelColor(level) {
    if (level >= 100) return '#FF0000'; // Rouge - Légendaire
    if (level >= 75) return '#FF4500';  // Orange rouge - Épique
    if (level >= 50) return '#FFD700';  // Or - Rare
    if (level >= 25) return '#00FF00';  // Vert - Uncommon
    if (level >= 10) return '#0080FF';  // Bleu - Common
    return '#808080'; // Gris - Débutant
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
 * Créer une barre de progression
 * @param {number} current - Valeur actuelle
 * @param {number} max - Valeur maximale
 * @returns {string} Barre de progression
 * @author Kofu
 */
function createProgressBar(current, max) {
    const percentage = Math.min(current / max, 1);
    const filledBars = Math.floor(percentage * 20);
    const emptyBars = 20 - filledBars;
    
    const progressBar = '█'.repeat(filledBars) + '░'.repeat(emptyBars);
    const percentageText = Math.floor(percentage * 100);
    
    return `${progressBar} **${percentageText}%**\n**${current.toLocaleString('fr-FR')}** / **${max.toLocaleString('fr-FR')}** XP`;
}

/**
 * Formater le temps vocal
 * @param {number} seconds - Temps en secondes
 * @returns {string} Temps formaté
 * @author Kofu
 */
function formatVoiceTime(seconds) {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
}

/**
 * Calculer le rang sur le serveur
 * @param {Client} client - Client Discord
 * @param {string} guildId - ID du serveur
 * @param {string} userId - ID de l'utilisateur
 * @returns {number} Rang sur le serveur
 * @author Kofu
 */
async function calculateServerRank(client, guildId, userId) {
    try {
        const guildData = client.database.getGuild(guildId);
        const serverUsers = [];
        
        // Récupérer tous les utilisateurs du serveur avec leurs niveaux
        const usersData = client.database.read('users.json') || {};
        
        for (const [id, userData] of Object.entries(usersData)) {
            if (userData.servers && userData.servers.includes(guildId) && userData.levels) {
                serverUsers.push({
                    id: id,
                    totalXp: userData.levels.totalXp || 0
                });
            }
        }
        
        // Trier par XP total (décroissant)
        serverUsers.sort((a, b) => b.totalXp - a.totalXp);
        
        // Trouver le rang de l'utilisateur
        const userIndex = serverUsers.findIndex(user => user.id === userId);
        return userIndex !== -1 ? userIndex + 1 : serverUsers.length + 1;
        
    } catch (error) {
        console.error('❌ [Kofu] Erreur calcul rang serveur:', error);
        return 1;
    }
}

/**
 * Calculer le rang global
 * @param {Client} client - Client Discord
 * @param {string} userId - ID de l'utilisateur
 * @returns {number} Rang global
 * @author Kofu
 */
async function calculateGlobalRank(client, userId) {
    try {
        const allUsers = [];
        const usersData = client.database.read('users.json') || {};
        
        for (const [id, userData] of Object.entries(usersData)) {
            if (userData.levels) {
                allUsers.push({
                    id: id,
                    totalXp: userData.levels.totalXp || 0
                });
            }
        }
        
        // Trier par XP total (décroissant)
        allUsers.sort((a, b) => b.totalXp - a.totalXp);
        
        // Trouver le rang de l'utilisateur
        const userIndex = allUsers.findIndex(user => user.id === userId);
        return userIndex !== -1 ? userIndex + 1 : allUsers.length + 1;
        
    } catch (error) {
        console.error('❌ [Kofu] Erreur calcul rang global:', error);
        return 1;
    }
}

/**
 * Obtenir les prochaines récompenses de niveau
 * @param {number} currentLevel - Niveau actuel
 * @returns {Array} Liste des prochaines récompenses
 * @author Kofu
 */
function getNextLevelRewards(currentLevel) {
    const rewards = [
        { level: 5, description: '🎁 Bonus daily +50 coins' },
        { level: 10, description: '🏪 Accès au shop' },
        { level: 15, description: '🎨 Couleur de rôle personnalisée' },
        { level: 20, description: '💰 Bonus work +100 coins' },
        { level: 25, description: '🎖️ Badge Vétéran' },
        { level: 30, description: '🏦 Limite banque +5000' },
        { level: 40, description: '🎪 Commandes fun exclusives' },
        { level: 50, description: '⭐ Badge Expert' },
        { level: 75, description: '👑 Badge Maître' },
        { level: 100, description: '🏆 Badge Légende' }
    ];
    
    return rewards.filter(reward => reward.level > currentLevel);
}

/**
 * ====================================
 * ✨ Made with ❤️ by Kofu
 * github.com/kofudev
 * ====================================
 */