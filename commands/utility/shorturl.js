/**
 * ====================================
 * COMMANDE: /shorturl
 * ====================================
 * 
 * Raccourcir une URL longue
 * Service de raccourcissement d'URLs
 * 
 * @author Kofu (github.com/kofudev)
 * @category Utility
 * ====================================
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const KofuSignature = require('../../utils/kofu-signature');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shorturl')
        .setDescription('🔗 Raccourcir une URL')
        .addStringOption(option =>
            option.setName('url')
                .setDescription('URL à raccourcir')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('alias')
                .setDescription('Alias personnalisé (optionnel)')
                .setRequired(false)
                .setMaxLength(20)
        ),
    
    category: 'utility',
    cooldown: 5,
    
    /**
     * Exécution de la commande shorturl
     * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
     * @author Kofu
     */
    async execute(interaction) {
        const url = interaction.options.getString('url');
        const alias = interaction.options.getString('alias');
        
        // Vérifier que l'URL est valide
        if (!isValidUrl(url)) {
            const errorEmbed = KofuSignature.createErrorEmbed(
                'URL invalide !',
                `L'URL \`${url}\` n'est pas valide.\n\nAssure-toi qu'elle commence par \`http://\` ou \`https://\`.`
            );
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
        
        // Embed de traitement
        const processingEmbed = new EmbedBuilder()
            .setTitle('🔗 Raccourcissement en cours...')
            .setDescription(`Raccourcissement de l'URL en cours...`)
            .setColor('#4ECDC4')
            .setFooter(KofuSignature.getKofuFooter())
            .setTimestamp();
        
        await interaction.reply({ embeds: [processingEmbed] });
        
        try {
            // Simuler le raccourcissement (remplacer par une vraie API)
            const shortUrl = await simulateUrlShortening(url, alias);
            
            // Créer l'embed de résultat
            const resultEmbed = new EmbedBuilder()
                .setTitle('🔗 URL Raccourcie !')
                .setColor('#00FF00')
                .addFields(
                    { name: '🌐 URL Originale', value: `[Lien original](${url})`, inline: false },
                    { name: '✨ URL Raccourcie', value: `[${shortUrl}](${shortUrl})`, inline: false }
                )
                .addFields(
                    { name: '📏 Réduction', value: `${url.length} → ${shortUrl.length} caractères (-${url.length - shortUrl.length})`, inline: true },
                    { name: '📊 Économie', value: `${Math.round((1 - shortUrl.length / url.length) * 100)}%`, inline: true },
                    { name: '👤 Créé par', value: interaction.user.toString(), inline: true }
                )
                .addFields({
                    name: '💡 Informations',
                    value: 
                        '• L\'URL raccourcie redirige vers l\'URL originale\n' +
                        '• Parfait pour partager des liens longs\n' +
                        '• Clique sur le lien raccourci pour le copier',
                    inline: false
                })
                .setFooter({ text: 'Service simulé | ' + KofuSignature.getKofuFooter().text, iconURL: KofuSignature.getKofuFooter().iconURL })
                .setTimestamp();
            
            if (alias) {
                resultEmbed.addFields({
                    name: '🏷️ Alias personnalisé',
                    value: `Utilisé: **${alias}**`,
                    inline: true
                });
            }
            
            await interaction.editReply({ embeds: [resultEmbed] });
            
            console.log(`🔗 [Kofu] ${interaction.user.tag} a raccourci une URL: ${url} → ${shortUrl}`);
            
        } catch (error) {
            console.error('❌ [Kofu] Erreur raccourcissement URL:', error);
            
            const errorEmbed = KofuSignature.createErrorEmbed(
                'Erreur de raccourcissement !',
                `Impossible de raccourcir l'URL.\n\n**Erreur:** \`${error.message}\``
            );
            
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};

/**
 * Vérifier si une URL est valide
 * @param {string} url - URL à vérifier
 * @returns {boolean} Si l'URL est valide
 * @author Kofu
 */
function isValidUrl(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch (error) {
        return false;
    }
}

/**
 * Simuler le raccourcissement d'URL
 * @param {string} url - URL à raccourcir
 * @param {string} alias - Alias personnalisé
 * @returns {string} URL raccourcie
 * @author Kofu
 */
async function simulateUrlShortening(url, alias) {
    // Attendre pour simuler l'API
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Générer un identifiant court
    const shortId = alias || generateShortId();
    
    // Retourner l'URL raccourcie simulée
    return `https://kofu.sh/${shortId}`;
}

/**
 * Générer un identifiant court aléatoire
 * @returns {string} Identifiant court
 * @author Kofu
 */
function generateShortId() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
}

/**
 * ====================================
 * ✨ Made with ❤️ by Kofu
 * github.com/kofudev
 * ====================================
 */