/**
 * ====================================
 * COMMANDE: /dice
 * ====================================
 * 
 * Lancer des dés personnalisables
 * Système de dés avancé avec multiple faces
 * 
 * @author Kofu (github.com/kofudev)
 * @category Fun
 * ====================================
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const KofuSignature = require('../../utils/kofu-signature');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dice')
        .setDescription('🎲 Lancer des dés')
        .addIntegerOption(option =>
            option.setName('nombre')
                .setDescription('Nombre de dés à lancer (1-10)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(10)
        )
        .addIntegerOption(option =>
            option.setName('faces')
                .setDescription('Nombre de faces par dé (2-100)')
                .setRequired(false)
                .setMinValue(2)
                .setMaxValue(100)
        ),
    
    category: 'fun',
    cooldown: 3,
    
    /**
     * Exécution de la commande dice
     * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
     * @author Kofu
     */
    async execute(interaction) {
        const numberOfDice = interaction.options.getInteger('nombre') || 1;
        const numberOfFaces = interaction.options.getInteger('faces') || 6;
        
        // Animation de lancement
        const loadingEmbed = new EmbedBuilder()
            .setTitle('🎲 Lancement des dés...')
            .setDescription(`*Lancement de ${numberOfDice} dé(s) à ${numberOfFaces} faces...*`)
            .setColor('#FF6B6B')
            .setFooter(KofuSignature.getKofuFooter())
            .setTimestamp();
        
        await interaction.reply({ embeds: [loadingEmbed] });
        
        // Attendre pour l'effet
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Lancer les dés
        const results = [];
        let total = 0;
        
        for (let i = 0; i < numberOfDice; i++) {
            const result = Math.floor(Math.random() * numberOfFaces) + 1;
            results.push(result);
            total += result;
        }
        
        // Créer l'embed de résultat
        const resultEmbed = new EmbedBuilder()
            .setTitle('🎲 Résultats des dés !')
            .setColor('#4ECDC4')
            .addFields(
                { name: '🎯 Résultats', value: results.map((r, i) => `**Dé ${i + 1}:** ${r}`).join('\n'), inline: true },
                { name: '📊 Statistiques', value: `**Total:** ${total}\n**Moyenne:** ${(total / numberOfDice).toFixed(1)}`, inline: true },
                { name: '⚙️ Configuration', value: `**Dés:** ${numberOfDice}\n**Faces:** ${numberOfFaces}`, inline: true }
            )
            .setFooter(KofuSignature.getKofuFooter())
            .setTimestamp();
        
        // Ajouter des emojis selon les résultats
        if (numberOfFaces === 6) {
            const diceEmojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
            const emojiResults = results.map(r => diceEmojis[r - 1]).join(' ');
            resultEmbed.setDescription(`${emojiResults}\n\n**Total: ${total}**`);
        } else {
            resultEmbed.setDescription(`**Résultats:** ${results.join(', ')}\n**Total: ${total}**`);
        }
        
        // Ajouter des commentaires selon le résultat
        if (numberOfDice === 1) {
            if (results[0] === numberOfFaces) {
                resultEmbed.addFields({ name: '🎉 Félicitations !', value: 'Tu as fait le maximum possible !', inline: false });
            } else if (results[0] === 1) {
                resultEmbed.addFields({ name: '😅 Pas de chance !', value: 'Tu as fait le minimum possible !', inline: false });
            }
        } else {
            const maxPossible = numberOfDice * numberOfFaces;
            const minPossible = numberOfDice;
            
            if (total === maxPossible) {
                resultEmbed.addFields({ name: '🏆 INCROYABLE !', value: 'Tu as fait le score maximum possible !', inline: false });
            } else if (total === minPossible) {
                resultEmbed.addFields({ name: '💀 CATASTROPHE !', value: 'Tu as fait le score minimum possible !', inline: false });
            } else if (total >= maxPossible * 0.8) {
                resultEmbed.addFields({ name: '🔥 Excellent !', value: 'Très bon score !', inline: false });
            } else if (total <= minPossible * 1.5) {
                resultEmbed.addFields({ name: '😬 Pas terrible...', value: 'Tu peux mieux faire !', inline: false });
            }
        }
        
        await interaction.editReply({ embeds: [resultEmbed] });
        
        console.log(`🎲 [Kofu] ${interaction.user.tag} a lancé ${numberOfDice} dé(s) à ${numberOfFaces} faces: ${results.join(', ')} (total: ${total})`);
    }
};

/**
 * ====================================
 * ✨ Made with ❤️ by Kofu
 * github.com/kofudev
 * ====================================
 */