/**
 * ====================================
 * COMMANDE: /translate
 * ====================================
 * 
 * Traduire du texte entre différentes langues
 * Système de traduction multilingue
 * 
 * @author Kofu (github.com/kofudev)
 * @category Utility
 * ====================================
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const KofuSignature = require('../../utils/kofu-signature');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('translate')
        .setDescription('🌍 Traduire du texte')
        .addStringOption(option =>
            option.setName('texte')
                .setDescription('Texte à traduire')
                .setRequired(true)
                .setMaxLength(1000)
        )
        .addStringOption(option =>
            option.setName('vers')
                .setDescription('Langue de destination')
                .setRequired(true)
                .addChoices(
                    { name: '🇫🇷 Français', value: 'fr' },
                    { name: '🇬🇧 Anglais', value: 'en' },
                    { name: '🇪🇸 Espagnol', value: 'es' },
                    { name: '🇩🇪 Allemand', value: 'de' },
                    { name: '🇮🇹 Italien', value: 'it' },
                    { name: '🇯🇵 Japonais', value: 'ja' },
                    { name: '🇰🇷 Coréen', value: 'ko' },
                    { name: '🇨🇳 Chinois', value: 'zh' },
                    { name: '🇷🇺 Russe', value: 'ru' },
                    { name: '🇵🇹 Portugais', value: 'pt' }
                )
        )
        .addStringOption(option =>
            option.setName('depuis')
                .setDescription('Langue source (auto-détection si non spécifiée)')
                .setRequired(false)
                .addChoices(
                    { name: '🔍 Auto-détection', value: 'auto' },
                    { name: '🇫🇷 Français', value: 'fr' },
                    { name: '🇬🇧 Anglais', value: 'en' },
                    { name: '🇪🇸 Espagnol', value: 'es' },
                    { name: '🇩🇪 Allemand', value: 'de' },
                    { name: '🇮🇹 Italien', value: 'it' },
                    { name: '🇯🇵 Japonais', value: 'ja' },
                    { name: '🇰🇷 Coréen', value: 'ko' },
                    { name: '🇨🇳 Chinois', value: 'zh' },
                    { name: '🇷🇺 Russe', value: 'ru' },
                    { name: '🇵🇹 Portugais', value: 'pt' }
                )
        ),
    
    category: 'utility',
    cooldown: 5,
    
    /**
     * Exécution de la commande translate
     * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
     * @author Kofu
     */
    async execute(interaction) {
        const text = interaction.options.getString('texte');
        const targetLang = interaction.options.getString('vers');
        const sourceLang = interaction.options.getString('depuis') || 'auto';
        
        // Vérifier que les langues sont différentes
        if (sourceLang !== 'auto' && sourceLang === targetLang) {
            const errorEmbed = KofuSignature.createErrorEmbed(
                'Langues identiques !',
                'La langue source et la langue de destination ne peuvent pas être identiques.'
            );
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
        
        // Embed de chargement
        const loadingEmbed = new EmbedBuilder()
            .setTitle('🌍 Traduction en cours...')
            .setDescription(`Traduction de **${getLanguageName(sourceLang)}** vers **${getLanguageName(targetLang)}**...`)
            .setColor('#4285F4')
            .setFooter(KofuSignature.getKofuFooter())
            .setTimestamp();
        
        await interaction.reply({ embeds: [loadingEmbed] });
        
        try {
            // Simulation de traduction (remplacer par une vraie API)
            const translationResult = await simulateTranslation(text, sourceLang, targetLang);
            
            const translationEmbed = new EmbedBuilder()
                .setTitle('🌍 Traduction terminée !')
                .setColor('#34A853')
                .addFields(
                    { 
                        name: `📝 Texte original (${getLanguageFlag(translationResult.detectedLang)} ${getLanguageName(translationResult.detectedLang)})`, 
                        value: `\`\`\`${text}\`\`\``, 
                        inline: false 
                    },
                    { 
                        name: `✨ Traduction (${getLanguageFlag(targetLang)} ${getLanguageName(targetLang)})`, 
                        value: `\`\`\`${translationResult.translatedText}\`\`\``, 
                        inline: false 
                    }
                )
                .addFields(
                    { name: '📊 Confiance', value: `${translationResult.confidence}%`, inline: true },
                    { name: '📏 Longueur', value: `${text.length} → ${translationResult.translatedText.length} caractères`, inline: true },
                    { name: '👤 Demandé par', value: interaction.user.toString(), inline: true }
                )
                .setFooter({ text: 'Traduction simulée | ' + KofuSignature.getKofuFooter().text, iconURL: KofuSignature.getKofuFooter().iconURL })
                .setTimestamp();
            
            await interaction.editReply({ embeds: [translationEmbed] });
            
            console.log(`🌍 [Kofu] ${interaction.user.tag} a traduit du ${translationResult.detectedLang} vers ${targetLang}`);
            
        } catch (error) {
            console.error('❌ [Kofu] Erreur traduction:', error);
            
            const errorEmbed = KofuSignature.createErrorEmbed(
                'Erreur de traduction !',
                `Impossible de traduire le texte.\n\n**Erreur:** \`${error.message}\``
            );
            
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};

/**
 * Simuler une traduction
 * @param {string} text - Texte à traduire
 * @param {string} sourceLang - Langue source
 * @param {string} targetLang - Langue cible
 * @returns {object} Résultat de traduction
 * @author Kofu
 */
async function simulateTranslation(text, sourceLang, targetLang) {
    // Attendre pour simuler l'API
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Détection de langue simulée
    const detectedLang = sourceLang === 'auto' ? detectLanguage(text) : sourceLang;
    
    // Traductions simulées
    const translations = {
        'hello': { fr: 'bonjour', es: 'hola', de: 'hallo', it: 'ciao', ja: 'こんにちは', ko: '안녕하세요', zh: '你好', ru: 'привет', pt: 'olá' },
        'bonjour': { en: 'hello', es: 'hola', de: 'hallo', it: 'ciao', ja: 'こんにちは', ko: '안녕하세요', zh: '你好', ru: 'привет', pt: 'olá' },
        'merci': { en: 'thank you', es: 'gracias', de: 'danke', it: 'grazie', ja: 'ありがとう', ko: '감사합니다', zh: '谢谢', ru: 'спасибо', pt: 'obrigado' },
        'thank you': { fr: 'merci', es: 'gracias', de: 'danke', it: 'grazie', ja: 'ありがとう', ko: '감사합니다', zh: '谢谢', ru: 'спасибо', pt: 'obrigado' }
    };
    
    const lowerText = text.toLowerCase();
    let translatedText = text;
    
    // Chercher une traduction simple
    for (const [original, translationMap] of Object.entries(translations)) {
        if (lowerText.includes(original) && translationMap[targetLang]) {
            translatedText = text.replace(new RegExp(original, 'gi'), translationMap[targetLang]);
            break;
        }
    }
    
    // Si aucune traduction trouvée, générer une traduction générique
    if (translatedText === text) {
        translatedText = `[Traduction ${getLanguageName(targetLang)}] ${text}`;
    }
    
    return {
        translatedText: translatedText,
        detectedLang: detectedLang,
        confidence: Math.floor(Math.random() * 20) + 80 // 80-100%
    };
}

/**
 * Détecter la langue d'un texte (simulation)
 * @param {string} text - Texte à analyser
 * @returns {string} Code de langue détecté
 * @author Kofu
 */
function detectLanguage(text) {
    const lowerText = text.toLowerCase();
    
    // Détection simple basée sur des mots courants
    if (lowerText.includes('hello') || lowerText.includes('the') || lowerText.includes('and')) return 'en';
    if (lowerText.includes('bonjour') || lowerText.includes('le') || lowerText.includes('et')) return 'fr';
    if (lowerText.includes('hola') || lowerText.includes('el') || lowerText.includes('y')) return 'es';
    if (lowerText.includes('hallo') || lowerText.includes('der') || lowerText.includes('und')) return 'de';
    if (lowerText.includes('ciao') || lowerText.includes('il') || lowerText.includes('e')) return 'it';
    
    // Par défaut, supposer que c'est de l'anglais
    return 'en';
}

/**
 * Obtenir le nom d'une langue
 * @param {string} langCode - Code de langue
 * @returns {string} Nom de la langue
 * @author Kofu
 */
function getLanguageName(langCode) {
    const names = {
        'auto': 'Auto-détection',
        'fr': 'Français',
        'en': 'Anglais',
        'es': 'Espagnol',
        'de': 'Allemand',
        'it': 'Italien',
        'ja': 'Japonais',
        'ko': 'Coréen',
        'zh': 'Chinois',
        'ru': 'Russe',
        'pt': 'Portugais'
    };
    
    return names[langCode] || langCode;
}

/**
 * Obtenir le drapeau d'une langue
 * @param {string} langCode - Code de langue
 * @returns {string} Emoji drapeau
 * @author Kofu
 */
function getLanguageFlag(langCode) {
    const flags = {
        'fr': '🇫🇷',
        'en': '🇬🇧',
        'es': '🇪🇸',
        'de': '🇩🇪',
        'it': '🇮🇹',
        'ja': '🇯🇵',
        'ko': '🇰🇷',
        'zh': '🇨🇳',
        'ru': '🇷🇺',
        'pt': '🇵🇹'
    };
    
    return flags[langCode] || '🌍';
}

/**
 * ====================================
 * ✨ Made with ❤️ by Kofu
 * github.com/kofudev
 * ====================================
 */