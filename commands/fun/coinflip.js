/**
 * ====================================
 * COMMANDE: /coinflip
 * ====================================
 * 
 * Lancer une pièce de monnaie
 * Pile ou face avec animation
 * 
 * @author Kofu (github.com/kofudev)
 * @category Fun
 * ====================================
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const KofuSignature = require('../../utils/kofu-signature');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('🪙 Lancer une pièce de monnaie'),
    
    category: 'fun',
    cooldown: 3,
    
    /**
     * Exécution de la commande coinflip
     * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
     * @author Kofu
     */
    async execute(interaction) {
        // Animation de lancement
        const loadingEmbed = new EmbedBuilder()
            .setTitle('🪙 Lancement de la pièce...')
            .setDescription('*La pièce tourne dans les airs...*')
            .setColor('#FFD700')
            .setFooter(KofuSignature.getKofuFooter())
            .setTimestamp();
        
        await interaction.reply({ embeds: [loadingEmbed] });
        
        // Attendre 2 secondes pour l'effet
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Résultat aléatoire
        const result = Math.random() < 0.5 ? 'pile' : 'face';
        const emoji = result === 'pile' ? '🟡' : '⚪';
        const color = result === 'pile' ? '#FFD700' : '#C0C0C0';
        
        const resultEmbed = new EmbedBuilder()
            .setTitle(`${emoji} Résultat: ${result.toUpperCase()} !`)
            .setDescription(`La pièce est tombée sur **${result}** !`)
            .setColor(color)
            .addFields(
                { name: '🎯 Résultat', value: `**${result.toUpperCase()}**`, inline: true },
                { name: '👤 Lancé par', value: interaction.user.toString(), inline: true }
            )
            .setFooter(KofuSignature.getKofuFooter())
            .setTimestamp();
        
        await interaction.editReply({ embeds: [resultEmbed] });
        
        console.log(`🪙 [Kofu] ${interaction.user.tag} a lancé une pièce: ${result}`);
    }
};

/**
 * ====================================
 * ✨ Made with ❤️ by Kofu
 * github.com/kofudev
 * ====================================
 */