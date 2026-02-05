/**
 * ====================================
 * COMMANDE: /balance
 * ====================================
 * 
 * Afficher le solde d'un utilisateur
 * Système d'économie complet
 * 
 * @author Kofu (github.com/kofudev)
 * @category Economy
 * ====================================
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const KofuSignature = require('../../utils/kofu-signature');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('💰 Afficher ton solde ou celui d\'un autre utilisateur')
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('Utilisateur dont afficher le solde')
                .setRequired(false)
        ),
    
    category: 'economy',
    cooldown: 3,
    
    /**
     * Exécution de la commande balance
     * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
     * @author Kofu
     */
    async execute(interaction) {
        const targetUser = interaction.options.getUser('utilisateur') || interaction.user;
        const isOwnBalance = targetUser.id === interaction.user.id;
        
        // Récupérer les données utilisateur
        const userData = interaction.client.database.getUser(targetUser.id);
        const economyData = userData.economy || {
            coins: 0,
            bank: 0,
            totalEarned: 0,
            totalSpent: 0,
            dailyStreak: 0,
            lastDaily: null,
            lastWork: null,
            job: null,
            level: 1,
            xp: 0
        };
        
        // Calculer le total
        const totalMoney = economyData.coins + economyData.bank;
        const maxBank = calculateBankLimit(economyData.level);
        
        // Créer l'embed
        const balanceEmbed = new EmbedBuilder()
            .setTitle(`💰 ${isOwnBalance ? 'Ton solde' : `Solde de ${targetUser.displayName}`}`)
            .setColor('#FFD700')
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '💵 Portefeuille', value: `**${formatMoney(economyData.coins)}** Kofu Coins`, inline: true },
                { name: '🏦 Banque', value: `**${formatMoney(economyData.bank)}** / ${formatMoney(maxBank)}`, inline: true },
                { name: '💎 Total', value: `**${formatMoney(totalMoney)}** Kofu Coins`, inline: true },
                { name: '📊 Niveau économique', value: `**Niveau ${economyData.level}**\n${getProgressBar(economyData.xp, getXpForNextLevel(economyData.level))}`, inline: false },
                { name: '📈 Statistiques', value: 
                    `💰 **Total gagné:** ${formatMoney(economyData.totalEarned)}\n` +
                    `💸 **Total dépensé:** ${formatMoney(economyData.totalSpent)}\n` +
                    `🔥 **Série daily:** ${economyData.dailyStreak} jour(s)\n` +
                    `💼 **Métier:** ${economyData.job || 'Chômeur'}`, 
                    inline: false 
                }
            )
            .setFooter(KofuSignature.getKofuFooter())
            .setTimestamp();
        
        // Ajouter des informations sur les prochaines actions disponibles
        const nextActions = [];
        
        // Vérifier le daily
        const lastDaily = economyData.lastDaily ? new Date(economyData.lastDaily) : null;
        const canDaily = !lastDaily || (Date.now() - lastDaily.getTime()) >= 24 * 60 * 60 * 1000;
        
        if (canDaily) {
            nextActions.push('🎁 `/daily` disponible !');
        } else {
            const nextDaily = new Date(lastDaily.getTime() + 24 * 60 * 60 * 1000);
            nextActions.push(`🎁 Prochain daily: <t:${Math.floor(nextDaily.getTime() / 1000)}:R>`);
        }
        
        // Vérifier le work
        const lastWork = economyData.lastWork ? new Date(economyData.lastWork) : null;
        const canWork = !lastWork || (Date.now() - lastWork.getTime()) >= 60 * 60 * 1000; // 1 heure
        
        if (canWork) {
            nextActions.push('💼 `/work` disponible !');
        } else {
            const nextWork = new Date(lastWork.getTime() + 60 * 60 * 1000);
            nextActions.push(`💼 Prochain work: <t:${Math.floor(nextWork.getTime() / 1000)}:R>`);
        }
        
        if (nextActions.length > 0 && isOwnBalance) {
            balanceEmbed.addFields({
                name: '⏰ Prochaines actions',
                value: nextActions.join('\n'),
                inline: false
            });
        }
        
        // Ajouter un classement si c'est son propre solde
        if (isOwnBalance) {
            const rank = calculateUserRank(interaction.client, targetUser.id, totalMoney);
            balanceEmbed.addFields({
                name: '🏆 Classement',
                value: `Tu es **#${rank}** sur le serveur !`,
                inline: true
            });
        }
        
        await interaction.reply({ embeds: [balanceEmbed] });
        
        console.log(`💰 [Kofu] ${interaction.user.tag} a consulté le solde de ${targetUser.tag}`);
    }
};

/**
 * Formater un montant d'argent
 * @param {number} amount - Montant
 * @returns {string} Montant formaté
 * @author Kofu
 */
function formatMoney(amount) {
    return amount.toLocaleString('fr-FR');
}

/**
 * Calculer la limite de banque selon le niveau
 * @param {number} level - Niveau de l'utilisateur
 * @returns {number} Limite de banque
 * @author Kofu
 */
function calculateBankLimit(level) {
    return 1000 + (level * 500);
}

/**
 * Obtenir l'XP nécessaire pour le prochain niveau
 * @param {number} currentLevel - Niveau actuel
 * @returns {number} XP nécessaire
 * @author Kofu
 */
function getXpForNextLevel(currentLevel) {
    return currentLevel * 100;
}

/**
 * Créer une barre de progression
 * @param {number} current - Valeur actuelle
 * @param {number} max - Valeur maximale
 * @returns {string} Barre de progression
 * @author Kofu
 */
function getProgressBar(current, max) {
    const percentage = Math.min(current / max, 1);
    const filledBars = Math.floor(percentage * 10);
    const emptyBars = 10 - filledBars;
    
    const progressBar = '█'.repeat(filledBars) + '░'.repeat(emptyBars);
    return `${progressBar} ${current}/${max} XP (${Math.floor(percentage * 100)}%)`;
}

/**
 * Calculer le rang d'un utilisateur
 * @param {Client} client - Client Discord
 * @param {string} userId - ID de l'utilisateur
 * @param {number} totalMoney - Argent total de l'utilisateur
 * @returns {number} Rang de l'utilisateur
 * @author Kofu
 */
function calculateUserRank(client, userId, totalMoney) {
    try {
        // Récupérer tous les utilisateurs avec leur argent total
        const allUsers = [];
        const usersData = client.database.read('users.json') || {};
        
        for (const [id, userData] of Object.entries(usersData)) {
            if (userData.economy) {
                const userTotal = (userData.economy.coins || 0) + (userData.economy.bank || 0);
                allUsers.push({ id, total: userTotal });
            }
        }
        
        // Trier par argent total (décroissant)
        allUsers.sort((a, b) => b.total - a.total);
        
        // Trouver le rang de l'utilisateur
        const userIndex = allUsers.findIndex(user => user.id === userId);
        return userIndex !== -1 ? userIndex + 1 : allUsers.length + 1;
        
    } catch (error) {
        console.error('❌ [Kofu] Erreur calcul rang:', error);
        return 1;
    }
}

/**
 * ====================================
 * ✨ Made with ❤️ by Kofu
 * github.com/kofudev
 * ====================================
 */