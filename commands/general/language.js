/**
 * ====================================
 * COMMANDE: /language
 * ====================================
 * 
 * Changer la langue du bot sur le serveur
 * Support FR/EN avec interface interactive
 * 
 * @author Kofu (github.com/kofudev)
 * @category General
 * ====================================
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const KofuSignature = require('../../utils/kofu-signature');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('language')
        .setDescription('🌐 Changer la langue du bot sur ce serveur')
        .addStringOption(option =>
            option.setName('langue')
                .setDescription('Langue à définir')
                .setRequired(false)
                .addChoices(
                    { name: '🇫🇷 Français', value: 'fr' },
                    { name: '🇬🇧 English', value: 'en' }
                )
        ),
    
    category: 'general',
    cooldown: 5,
    guildOnly: true,
    permissions: ['ManageGuild'],
    
    /**
     * Exécution de la commande language
     * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
     * @author Kofu
     */
    async execute(interaction) {
        const selectedLanguage = interaction.options.getString('langue');
        const guildData = interaction.client.database.getGuild(interaction.guild.id);
        const currentLanguage = guildData.settings.language || 'fr';
        
        // Si une langue est spécifiée directement
        if (selectedLanguage) {
            return await setLanguage(interaction, selectedLanguage);
        }
        
        // Sinon, afficher le menu de sélection
        await showLanguageMenu(interaction, currentLanguage);
    }
};

/**
 * Afficher le menu de sélection de langue
 * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
 * @param {string} currentLanguage - Langue actuelle
 * @author Kofu
 */
async function showLanguageMenu(interaction, currentLanguage) {
    const languages = {
        fr: {
            name: '🇫🇷 Français',
            description: 'Langue française - Développé par Kofu',
            status: currentLanguage === 'fr' ? ' ✅ (Actuel)' : ''
        },
        en: {
            name: '🇬🇧 English',
            description: 'English language - Made by Kofu',
            status: currentLanguage === 'en' ? ' ✅ (Current)' : ''
        }
    };
    
    const embed = new EmbedBuilder()
        .setTitle('🌐 Configuration de la Langue')
        .setDescription(
            `**Langue actuelle:** ${languages[currentLanguage].name}\n\n` +
            `Sélectionne une langue dans le menu ci-dessous pour changer la langue du bot sur ce serveur.\n\n` +
            `**Langues disponibles:**\n` +
            `🇫🇷 **Français** - Langue par défaut, développée par Kofu\n` +
            `🇬🇧 **English** - English translation available\n\n` +
            `*Note: Cette commande nécessite la permission "Gérer le serveur"*`
        )
        .setColor('#5865F2')
        .setThumbnail('🌐')
        .setFooter(KofuSignature.getKofuFooter())
        .setTimestamp();
    
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('language_select')
        .setPlaceholder('🌐 Sélectionne une langue...')
        .addOptions([
            {
                label: languages.fr.name + languages.fr.status,
                description: languages.fr.description,
                value: 'fr',
                emoji: '🇫🇷'
            },
            {
                label: languages.en.name + languages.en.status,
                description: languages.en.description,
                value: 'en',
                emoji: '🇬🇧'
            }
        ]);
    
    const row = new ActionRowBuilder().addComponents(selectMenu);
    
    await interaction.reply({
        embeds: [embed],
        components: [row]
    });
    
    // Gérer la sélection
    const collector = interaction.channel.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id && i.customId === 'language_select',
        time: 60000 // 1 minute
    });
    
    collector.on('collect', async i => {
        const newLanguage = i.values[0];
        await setLanguage(i, newLanguage, true);
    });
    
    collector.on('end', () => {
        // Désactiver le menu après expiration
        const disabledRow = new ActionRowBuilder()
            .addComponents(selectMenu.setDisabled(true));
        
        interaction.editReply({ components: [disabledRow] }).catch(() => {});
    });
}

/**
 * Définir la langue du serveur
 * @param {ChatInputCommandInteraction|SelectMenuInteraction} interaction - L'interaction Discord
 * @param {string} language - Code de la langue
 * @param {boolean} isUpdate - Si c'est une mise à jour d'interaction
 * @author Kofu
 */
async function setLanguage(interaction, language, isUpdate = false) {
    // Vérifier les permissions
    if (!interaction.member.permissions.has('ManageGuild')) {
        const errorEmbed = KofuSignature.createErrorEmbed(
            'Permission manquante !',
            'Tu as besoin de la permission **Gérer le serveur** pour changer la langue.'
        );
        
        const method = isUpdate ? 'update' : 'reply';
        return interaction[method]({ embeds: [errorEmbed], ephemeral: true });
    }
    
    // Mettre à jour la base de données
    const guildData = interaction.client.database.getGuild(interaction.guild.id);
    const oldLanguage = guildData.settings.language || 'fr';
    
    if (oldLanguage === language) {
        const warningEmbed = KofuSignature.createWarningEmbed(
            'Langue déjà définie !',
            `La langue **${getLanguageName(language)}** est déjà configurée sur ce serveur.`
        );
        
        const method = isUpdate ? 'update' : 'reply';
        return interaction[method]({ embeds: [warningEmbed], ephemeral: true });
    }
    
    // Sauvegarder la nouvelle langue
    guildData.settings.language = language;
    guildData.updatedAt = new Date();
    
    const success = interaction.client.database.setGuild(interaction.guild.id, guildData);
    
    if (success) {
        const successEmbed = KofuSignature.createSuccessEmbed(
            'Langue mise à jour !',
            `La langue du bot a été changée vers **${getLanguageName(language)}** sur ce serveur.\n\n` +
            `**Ancienne langue:** ${getLanguageName(oldLanguage)}\n` +
            `**Nouvelle langue:** ${getLanguageName(language)}\n\n` +
            `*Les nouveaux messages du bot utiliseront cette langue.*`
        );
        
        successEmbed.addFields({
            name: '📝 Changement effectué par',
            value: `${interaction.user.tag} (\`${interaction.user.id}\`)`,
            inline: false
        });
        
        const method = isUpdate ? 'update' : 'reply';
        await interaction[method]({ embeds: [successEmbed], components: [] });
        
        // Logger le changement
        interaction.client.logger.info(
            `Langue changée sur ${interaction.guild.name}: ${oldLanguage} -> ${language} par ${interaction.user.tag}`
        );
        
        console.log(`🌐 [Kofu] Langue changée sur ${interaction.guild.name}: ${oldLanguage} -> ${language}`);
        
    } else {
        const errorEmbed = KofuSignature.createErrorEmbed(
            'Erreur de sauvegarde !',
            'Impossible de sauvegarder la nouvelle langue. Réessaye plus tard.'
        );
        
        const method = isUpdate ? 'update' : 'reply';
        await interaction[method]({ embeds: [errorEmbed], components: [] });
    }
}

/**
 * Obtenir le nom complet d'une langue
 * @param {string} code - Code de la langue
 * @returns {string} Nom de la langue
 * @author Kofu
 */
function getLanguageName(code) {
    const languages = {
        fr: '🇫🇷 Français',
        en: '🇬🇧 English'
    };
    return languages[code] || code;
}

/**
 * ====================================
 * ✨ Made with ❤️ by Kofu
 * github.com/kofudev
 * ====================================
 */