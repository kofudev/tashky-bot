/**
 * ====================================
 * COMMANDE: /8ball
 * ====================================
 * 
 * Boule magique 8 pour répondre aux questions
 * Réponses aléatoires et amusantes
 * 
 * @author Kofu (github.com/kofudev)
 * @category Fun
 * ====================================
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const KofuSignature = require('../../utils/kofu-signature');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('8ball')
        .setDescription('🎱 Pose une question à la boule magique')
        .addStringOption(option =>
            option.setName('question')
                .setDescription('Ta question pour la boule magique')
                .setRequired(true)
                .setMaxLength(200)
        ),
    
    category: 'fun',
    cooldown: 3,
    guildOnly: false,
    
    async execute(interaction) {
        const question = interaction.options.getString('question');
        
        const responses = [
            // Réponses positives
            '✅ Oui, absolument !',
            '✅ C\'est certain !',
            '✅ Sans aucun doute !',
            '✅ Oui, définitivement !',
            '✅ Tu peux compter dessus !',
            '✅ Comme je le vois, oui !',
            '✅ Très probablement !',
            '✅ Les perspectives sont bonnes !',
            '✅ Oui !',
            '✅ Les signes pointent vers oui !',
            
            // Réponses neutres
            '🤔 Réponse floue, réessaie !',
            '🤔 Demande à nouveau plus tard !',
            '🤔 Mieux vaut ne pas te le dire maintenant !',
            '🤔 Impossible de prédire maintenant !',
            '🤔 Concentre-toi et demande à nouveau !',
            
            // Réponses négatives
            '❌ N\'y compte pas !',
            '❌ Ma réponse est non !',
            '❌ Mes sources disent non !',
            '❌ Les perspectives ne sont pas si bonnes !',
            '❌ Très douteux !',
            '❌ Non, certainement pas !',
            '❌ Absolument pas !',
            
            // Réponses amusantes (style Kofu)
            '✨ Kofu dit que oui !',
            '🎯 C\'est dans le mille !',
            '🚀 Fonce, c\'est le moment !',
            '💎 Précieux comme une gemme !',
            '🔮 Les étoiles s\'alignent pour toi !',
            '🎪 C\'est le cirque, mais oui !',
            '🍀 La chance te sourit !',
            '⚡ Électrisant ! C\'est oui !',
            '🌟 Brillante idée !',
            '🎨 Créatif et positif !'
        ];
        
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        
        const embed = new EmbedBuilder()
            .setTitle('🎱 Boule Magique 8')
            .setColor('#9B59B6')
            .addFields(
                { name: '❓ Question', value: `*"${question}"*`, inline: false },
                { name: '🔮 Réponse', value: randomResponse, inline: false }
            )
            .setFooter(KofuSignature.getKofuFooter())
            .setTimestamp();
        
        // Ajouter une image selon le type de réponse
        if (randomResponse.includes('✅')) {
            embed.setColor('#43B581');
        } else if (randomResponse.includes('❌')) {
            embed.setColor('#F04747');
        } else if (randomResponse.includes('🤔')) {
            embed.setColor('#FAA61A');
        }
        
        await interaction.reply({ embeds: [embed] });
        
        console.log(`🎱 [Kofu] ${interaction.user.tag} a posé une question à la boule magique`);
    }
};

/**
 * ====================================
 * ✨ Made with ❤️ by Kofu
 * github.com/kofudev
 * ====================================
 */