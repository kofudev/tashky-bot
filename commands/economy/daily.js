/**
 * ====================================
 * COMMANDE: /daily
 * ====================================
 * 
 * Récupérer sa récompense quotidienne
 * Système de streak avec bonus
 * 
 * @author Kofu (github.com/kofudev)
 * @category Economy
 * ====================================
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const KofuSignature = require('../../utils/kofu-signature');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('🎁 Récupérer ta récompense quotidienne'),
    
    category: 'economy',
    cooldown: 5,
    
    /**
     * Exécution de la commande daily
     * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
     * @author Kofu
     */
    async execute(interaction) {
        const userData = interaction.client.database.getUser(interaction.user.id);
        
        // Initialiser les données économiques si nécessaire
        if (!userData.economy) {
            userData.economy = {
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
        }
        
        const economyData = userData.economy;
        const lastDaily = economyData.lastDaily ? new Date(economyData.lastDaily) : null;
        const now = new Date();
        
        // Vérifier si l'utilisateur peut récupérer sa récompense
        if (lastDaily && (now.getTime() - lastDaily.getTime()) < 24 * 60 * 60 * 1000) {
            const nextDaily = new Date(lastDaily.getTime() + 24 * 60 * 60 * 1000);
            
            const errorEmbed = KofuSignature.createWarningEmbed(
                'Récompense déjà récupérée !',
                `Tu as déjà récupéré ta récompense quotidienne aujourd'hui.\n\n` +
                `🕐 **Prochaine récompense:** <t:${Math.floor(nextDaily.getTime() / 1000)}:R>`
            );
            
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
        
        // Calculer le streak
        let newStreak = 1;
        if (lastDaily) {
            const timeDiff = now.getTime() - lastDaily.getTime();
            const daysDiff = Math.floor(timeDiff / (24 * 60 * 60 * 1000));
            
            if (daysDiff === 1) {
                // Streak continue
                newStreak = economyData.dailyStreak + 1;
            } else if (daysDiff > 1) {
                // Streak cassé
                newStreak = 1;
            }
        }
        
        // Calculer la récompense
        const baseReward = 100;
        const streakBonus = Math.min(newStreak * 10, 500); // Max 500 de bonus
        const randomBonus = Math.floor(Math.random() * 50); // 0-49 bonus aléatoire
        const totalReward = baseReward + streakBonus + randomBonus;
        
        // Bonus spéciaux selon le streak
        let specialBonus = 0;
        let specialMessage = '';
        
        if (newStreak === 7) {
            specialBonus = 500;
            specialMessage = '🎉 **Bonus 7 jours:** +500 Kofu Coins !';
        } else if (newStreak === 30) {
            specialBonus = 2000;
            specialMessage = '🏆 **Bonus 30 jours:** +2000 Kofu Coins !';
        } else if (newStreak === 100) {
            specialBonus = 10000;
            specialMessage = '💎 **Bonus 100 jours:** +10000 Kofu Coins !';
        } else if (newStreak % 10 === 0 && newStreak > 0) {
            specialBonus = newStreak * 5;
            specialMessage = `✨ **Bonus ${newStreak} jours:** +${specialBonus} Kofu Coins !`;
        }
        
        const finalReward = totalReward + specialBonus;
        
        // Mettre à jour les données
        economyData.coins += finalReward;
        economyData.totalEarned += finalReward;
        economyData.dailyStreak = newStreak;
        economyData.lastDaily = now;
        economyData.xp += 10; // XP pour le daily
        
        // Vérifier le level up
        const levelUpInfo = checkLevelUp(economyData);
        
        // Sauvegarder
        interaction.client.database.setUser(interaction.user.id, userData);
        
        // Créer l'embed de récompense
        const rewardEmbed = new EmbedBuilder()
            .setTitle('🎁 Récompense quotidienne récupérée !')
            .setDescription(`Tu as récupéré ta récompense quotidienne !`)
            .setColor('#00FF00')
            .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '💰 Récompense de base', value: `${baseReward} Kofu Coins`, inline: true },
                { name: '🔥 Bonus streak', value: `${streakBonus} Kofu Coins`, inline: true },
                { name: '🎲 Bonus aléatoire', value: `${randomBonus} Kofu Coins`, inline: true },
                { name: '💎 Total reçu', value: `**${finalReward} Kofu Coins**`, inline: false },
                { name: '🔥 Série actuelle', value: `**${newStreak} jour(s)**`, inline: true },
                { name: '💵 Nouveau solde', value: `${economyData.coins.toLocaleString('fr-FR')} Kofu Coins`, inline: true }
            )
            .setFooter(KofuSignature.getKofuFooter())
            .setTimestamp();
        
        // Ajouter le bonus spécial si applicable
        if (specialBonus > 0) {
            rewardEmbed.addFields({
                name: '🌟 Bonus spécial !',
                value: specialMessage,
                inline: false
            });
        }
        
        // Ajouter l'info de level up si applicable
        if (levelUpInfo.leveledUp) {
            rewardEmbed.addFields({
                name: '🆙 Level Up !',
                value: `Félicitations ! Tu es maintenant **niveau ${levelUpInfo.newLevel}** !\n+${levelUpInfo.reward} Kofu Coins de bonus !`,
                inline: false
            });
        }
        
        // Ajouter des conseils selon le streak
        let tip = '';
        if (newStreak === 1) {
            tip = '💡 **Astuce:** Reviens chaque jour pour augmenter ton streak et gagner plus !';
        } else if (newStreak < 7) {
            tip = `💡 **Objectif:** Plus que ${7 - newStreak} jour(s) pour le bonus 7 jours !`;
        } else if (newStreak < 30) {
            tip = `💡 **Objectif:** Plus que ${30 - newStreak} jour(s) pour le bonus 30 jours !`;
        } else {
            tip = '💡 **Champion !** Continue comme ça pour débloquer d\'autres bonus !';
        }
        
        rewardEmbed.addFields({
            name: '💡 Conseil',
            value: tip,
            inline: false
        });
        
        await interaction.reply({ embeds: [rewardEmbed] });
        
        // Logger l'action
        console.log(`🎁 [Kofu] ${interaction.user.tag} a récupéré sa récompense quotidienne: ${finalReward} coins (streak: ${newStreak})`);
        
        // Mettre à jour les statistiques globales
        updateGlobalStats(interaction.client, 'dailyRewards', finalReward);
    }
};

/**
 * Vérifier et gérer le level up
 * @param {object} economyData - Données économiques de l'utilisateur
 * @returns {object} Informations sur le level up
 * @author Kofu
 */
function checkLevelUp(economyData) {
    const currentLevel = economyData.level;
    const currentXp = economyData.xp;
    const xpForNextLevel = currentLevel * 100;
    
    if (currentXp >= xpForNextLevel) {
        // Level up !
        economyData.level += 1;
        economyData.xp -= xpForNextLevel;
        
        // Récompense de level up
        const levelUpReward = currentLevel * 50;
        economyData.coins += levelUpReward;
        economyData.totalEarned += levelUpReward;
        
        return {
            leveledUp: true,
            newLevel: economyData.level,
            reward: levelUpReward
        };
    }
    
    return { leveledUp: false };
}

/**
 * Mettre à jour les statistiques globales
 * @param {Client} client - Client Discord
 * @param {string} stat - Nom de la statistique
 * @param {number} value - Valeur à ajouter
 * @author Kofu
 */
function updateGlobalStats(client, stat, value) {
    try {
        const statsData = client.database.read('stats/global.json') || {
            totalCommands: 0,
            totalUsers: 0,
            totalServers: 0,
            economy: {
                totalCoinsEarned: 0,
                totalCoinsSpent: 0,
                dailyRewards: 0,
                workRewards: 0
            },
            lastUpdated: new Date()
        };
        
        if (stat === 'dailyRewards') {
            statsData.economy.totalCoinsEarned += value;
            statsData.economy.dailyRewards += value;
        }
        
        statsData.lastUpdated = new Date();
        client.database.write('stats/global.json', statsData);
        
    } catch (error) {
        console.error('❌ [Kofu] Erreur mise à jour stats globales:', error);
    }
}

/**
 * ====================================
 * ✨ Made with ❤️ by Kofu
 * github.com/kofudev
 * ====================================
 */