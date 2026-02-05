/**
 * ====================================
 * COMMANDE: /qrcode
 * ====================================
 * 
 * Générer un QR Code à partir de texte
 * Création de QR codes personnalisés
 * 
 * @author Kofu (github.com/kofudev)
 * @category Utility
 * ====================================
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const KofuSignature = require('../../utils/kofu-signature');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('qrcode')
        .setDescription('📱 Générer un QR Code')
        .addStringOption(option =>
            option.setName('texte')
                .setDescription('Texte à encoder dans le QR Code')
                .setRequired(true)
                .setMaxLength(500)
        )
        .addIntegerOption(option =>
            option.setName('taille')
                .setDescription('Taille du QR Code (100-500px)')
                .setRequired(false)
                .setMinValue(100)
                .setMaxValue(500)
        ),
    
    category: 'utility',
    cooldown: 5,
    
    /**
     * Exécution de la commande qrcode
     * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
     * @author Kofu
     */
    async execute(interaction) {
        const text = interaction.options.getString('texte');
        const size = interaction.options.getInteger('taille') || 200;
        
        // Embed de génération
        const generatingEmbed = new EmbedBuilder()
            .setTitle('📱 Génération du QR Code...')
            .setDescription(`Génération d'un QR Code pour: **${text}**`)
            .setColor('#4ECDC4')
            .setFooter(KofuSignature.getKofuFooter())
            .setTimestamp();
        
        await interaction.reply({ embeds: [generatingEmbed] });
        
        try {
            // Générer l'URL du QR Code (utilise une API publique)
            const encodedText = encodeURIComponent(text);
            const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedText}&format=png&bgcolor=FFFFFF&color=000000&qzone=2&margin=10`;
            
            // Créer l'embed de résultat
            const qrEmbed = new EmbedBuilder()
                .setTitle('📱 QR Code Généré !')
                .setDescription(`**Contenu:** ${text}`)
                .setColor('#00FF00')
                .setImage(qrCodeUrl)
                .addFields(
                    { name: '📏 Taille', value: `${size}x${size}px`, inline: true },
                    { name: '📝 Longueur', value: `${text.length} caractères`, inline: true },
                    { name: '👤 Créé par', value: interaction.user.toString(), inline: true }
                )
                .addFields({
                    name: '💡 Instructions',
                    value: 'Scanne ce QR Code avec ton téléphone pour accéder au contenu !',
                    inline: false
                })
                .setFooter(KofuSignature.getKofuFooter())
                .setTimestamp();
            
            await interaction.editReply({ embeds: [qrEmbed] });
            
            console.log(`📱 [Kofu] ${interaction.user.tag} a généré un QR Code: "${text}"`);
            
        } catch (error) {
            console.error('❌ [Kofu] Erreur génération QR Code:', error);
            
            const errorEmbed = KofuSignature.createErrorEmbed(
                'Erreur de génération !',
                `Impossible de générer le QR Code.\n\n**Erreur:** \`${error.message}\``
            );
            
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};

/**
 * ====================================
 * ✨ Made with ❤️ by Kofu
 * github.com/kofudev
 * ====================================
 */