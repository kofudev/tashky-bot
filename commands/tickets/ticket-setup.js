/**
 * ====================================
 * COMMANDE: /ticket-setup
 * ====================================
 * 
 * Setup AVANCÉ du système de tickets
 * Comme Ticket Tool - Système professionnel complet
 * 
 * @author Kofu (github.com/kofudev)
 * @category Tickets
 * ====================================
 */

const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, StringSelectMenuBuilder } = require('discord.js');
const EmbedFactory = require('../../utils/embed');
const colors = require('../../config/colors');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-setup')
        .setDescription('🎫 Configuration avancée du système de tickets professionnel')
        .addSubcommand(subcommand =>
            subcommand
                .setName('panel')
                .setDescription('Créer un panel de tickets avec sélecteur')
                .addChannelOption(option =>
                    option.setName('salon')
                        .setDescription('Salon où envoyer le panel')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildText)
                )
                .addStringOption(option =>
                    option.setName('titre')
                        .setDescription('Titre du panel (optionnel)')
                        .setRequired(false)
                        .setMaxLength(100)
                )
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Description du panel (optionnel)')
                        .setRequired(false)
                        .setMaxLength(500)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('config')
                .setDescription('Configurer les paramètres du système')
                .addChannelOption(option =>
                    option.setName('categorie')
                        .setDescription('Catégorie pour les tickets')
                        .setRequired(false)
                        .addChannelTypes(ChannelType.GuildCategory)
                )
                .addChannelOption(option =>
                    option.setName('logs')
                        .setDescription('Salon pour les logs de tickets')
                        .setRequired(false)
                        .addChannelTypes(ChannelType.GuildText)
                )
                .addRoleOption(option =>
                    option.setName('staff')
                        .setDescription('Rôle staff pour les tickets')
                        .setRequired(false)
                )
                .addIntegerOption(option =>
                    option.setName('max-tickets')
                        .setDescription('Nombre max de tickets par utilisateur (1-5)')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(5)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('categories')
                .setDescription('Gérer les catégories de tickets')
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Action à effectuer')
                        .setRequired(true)
                        .addChoices(
                            { name: '➕ Ajouter une catégorie', value: 'add' },
                            { name: '❌ Supprimer une catégorie', value: 'remove' },
                            { name: '📋 Lister les catégories', value: 'list' }
                        )
                )
                .addStringOption(option =>
                    option.setName('nom')
                        .setDescription('Nom de la catégorie')
                        .setRequired(false)
                        .setMaxLength(50)
                )
                .addStringOption(option =>
                    option.setName('emoji')
                        .setDescription('Emoji de la catégorie')
                        .setRequired(false)
                        .setMaxLength(10)
                )
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Description de la catégorie')
                        .setRequired(false)
                        .setMaxLength(100)
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    category: 'tickets',
    cooldown: 5,
    guildOnly: true,
    permissions: ['Administrator'],
    
    /**
     * Configuration avancée du système de tickets
     * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
     * @author Kofu
     */
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case 'panel':
                await handleCreatePanel(interaction);
                break;
            case 'config':
                await handleConfig(interaction);
                break;
            case 'categories':
                await handleCategories(interaction);
                break;
        }
    }
};

/**
 * Créer un panel de tickets avancé
 * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
 * @author Kofu
 */
async function handleCreatePanel(interaction) {
    const salon = interaction.options.getChannel('salon');
    const titre = interaction.options.getString('titre') || '🎫 SYSTÈME DE SUPPORT';
    const description = interaction.options.getString('description') || 
        '**Besoin d\'aide ? Créez un ticket !**\n\n' +
        '🔹 Sélectionnez le type de votre demande\n' +
        '🔹 Un salon privé sera créé instantanément\n' +
        '🔹 Notre équipe vous répondra rapidement\n\n' +
        '**Choisissez une catégorie ci-dessous :**';
    
    await interaction.deferReply({ ephemeral: true });
    
    try {
        const guildData = interaction.client.database.getGuild(interaction.guild.id);
        
        // Initialiser les données de tickets si nécessaire
        if (!guildData.tickets) {
            guildData.tickets = {
                enabled: true,
                categories: [
                    { id: 'support', name: 'Support Technique', emoji: '🛠️', description: 'Problèmes techniques et bugs' },
                    { id: 'question', name: 'Question Générale', emoji: '❓', description: 'Questions diverses' },
                    { id: 'report', name: 'Signalement', emoji: '🚨', description: 'Signaler un problème' },
                    { id: 'suggestion', name: 'Suggestion', emoji: '💡', description: 'Proposer une amélioration' },
                    { id: 'other', name: 'Autre', emoji: '📝', description: 'Autre demande' }
                ],
                maxTickets: 3,
                staffRoles: [],
                logsChannel: null,
                category: null
            };
        }
        
        // Créer l'embed du panel
        const panelEmbed = EmbedFactory.base()
            .setTitle(titre)
            .setDescription(description)
            .setColor('#8B5CF6') // Violet
            .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
            .addFields(
                {
                    name: '📊 Statistiques',
                    value: `🎫 **Tickets actifs:** 0\n📈 **Total créés:** 0\n⏱️ **Temps de réponse moyen:** < 1h`,
                    inline: true
                },
                {
                    name: '🔧 Support',
                    value: `👥 **Équipe disponible 24/7**\n🚀 **Réponse rapide garantie**\n🔒 **Confidentialité assurée**`,
                    inline: true
                }
            )
            .setFooter({ text: '✨ Made with ❤️ by Kofu • Système de tickets professionnel' })
            .setTimestamp();
        
        // Créer le menu de sélection
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('ticket_category_select')
            .setPlaceholder('🎫 Sélectionnez le type de votre ticket...')
            .setMinValues(1)
            .setMaxValues(1);
        
        // Ajouter les options du menu
        guildData.tickets.categories.forEach(category => {
            selectMenu.addOptions({
                label: category.name,
                description: category.description,
                value: category.id,
                emoji: category.emoji
            });
        });
        
        const row = new ActionRowBuilder().addComponents(selectMenu);
        
        // Envoyer le panel
        await salon.send({
            embeds: [panelEmbed],
            components: [row]
        });
        
        // Sauvegarder la configuration
        guildData.tickets.panelChannel = salon.id;
        interaction.client.database.setGuild(interaction.guild.id, guildData);
        
        // Réponse de succès
        const successEmbed = EmbedFactory.success(
            '🎫 Panel de tickets créé !',
            `**Panel professionnel déployé avec succès !** 🚀\n\n` +
            `✅ **Salon:** ${salon}\n` +
            `✅ **Catégories:** ${guildData.tickets.categories.length}\n` +
            `✅ **Menu de sélection:** Activé\n\n` +
            `**Le système est maintenant opérationnel !**`
        );
        
        await interaction.editReply({ embeds: [successEmbed] });
        
        console.log(`🎫 [Kofu] Panel de tickets avancé créé sur ${interaction.guild.name} par ${interaction.user.tag}`);
        
    } catch (error) {
        console.error('❌ [Kofu] Erreur création panel tickets:', error);
        
        await interaction.editReply({
            embeds: [EmbedFactory.error(
                'Erreur de création',
                `Impossible de créer le panel.\n\n**Erreur:** \`${error.message}\``
            )]
        });
    }
}

/**
 * Configurer les paramètres du système
 * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
 * @author Kofu
 */
async function handleConfig(interaction) {
    const categorie = interaction.options.getChannel('categorie');
    const logs = interaction.options.getChannel('logs');
    const staff = interaction.options.getRole('staff');
    const maxTickets = interaction.options.getInteger('max-tickets');
    
    await interaction.deferReply({ ephemeral: true });
    
    try {
        const guildData = interaction.client.database.getGuild(interaction.guild.id);
        
        if (!guildData.tickets) {
            guildData.tickets = { enabled: true };
        }
        
        let changes = [];
        
        // Configurer la catégorie
        if (categorie) {
            guildData.tickets.category = categorie.id;
            changes.push(`✅ **Catégorie:** ${categorie}`);
        }
        
        // Configurer les logs
        if (logs) {
            guildData.tickets.logsChannel = logs.id;
            changes.push(`✅ **Logs:** ${logs}`);
        }
        
        // Configurer le rôle staff
        if (staff) {
            if (!guildData.tickets.staffRoles) guildData.tickets.staffRoles = [];
            if (!guildData.tickets.staffRoles.includes(staff.id)) {
                guildData.tickets.staffRoles.push(staff.id);
                changes.push(`✅ **Rôle staff ajouté:** ${staff}`);
            } else {
                changes.push(`⚠️ **Rôle staff déjà configuré:** ${staff}`);
            }
        }
        
        // Configurer le max de tickets
        if (maxTickets) {
            guildData.tickets.maxTickets = maxTickets;
            changes.push(`✅ **Max tickets par utilisateur:** ${maxTickets}`);
        }
        
        // Sauvegarder
        interaction.client.database.setGuild(interaction.guild.id, guildData);
        
        if (changes.length === 0) {
            return interaction.editReply({
                embeds: [EmbedFactory.warning(
                    'Aucun changement',
                    'Aucun paramètre n\'a été modifié. Spécifiez au moins une option.'
                )]
            });
        }
        
        const configEmbed = EmbedFactory.success(
            '⚙️ Configuration mise à jour',
            `**Paramètres modifiés avec succès !**\n\n${changes.join('\n')}\n\n` +
            `**Configuration actuelle :**\n` +
            `🎫 **Catégorie:** ${guildData.tickets.category ? `<#${guildData.tickets.category}>` : 'Non configurée'}\n` +
            `📝 **Logs:** ${guildData.tickets.logsChannel ? `<#${guildData.tickets.logsChannel}>` : 'Non configurés'}\n` +
            `👥 **Rôles staff:** ${guildData.tickets.staffRoles?.length || 0}\n` +
            `🔢 **Max tickets:** ${guildData.tickets.maxTickets || 3}`
        );
        
        await interaction.editReply({ embeds: [configEmbed] });
        
    } catch (error) {
        console.error('❌ [Kofu] Erreur configuration tickets:', error);
        
        await interaction.editReply({
            embeds: [EmbedFactory.error(
                'Erreur de configuration',
                `Impossible de modifier la configuration.\n\n**Erreur:** \`${error.message}\``
            )]
        });
    }
}

/**
 * Gérer les catégories de tickets
 * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
 * @author Kofu
 */
async function handleCategories(interaction) {
    const action = interaction.options.getString('action');
    const nom = interaction.options.getString('nom');
    const emoji = interaction.options.getString('emoji');
    const description = interaction.options.getString('description');
    
    await interaction.deferReply({ ephemeral: true });
    
    try {
        const guildData = interaction.client.database.getGuild(interaction.guild.id);
        
        if (!guildData.tickets) {
            guildData.tickets = { enabled: true, categories: [] };
        }
        
        if (!guildData.tickets.categories) {
            guildData.tickets.categories = [];
        }
        
        switch (action) {
            case 'add':
                if (!nom || !emoji || !description) {
                    return interaction.editReply({
                        embeds: [EmbedFactory.error(
                            'Paramètres manquants',
                            'Pour ajouter une catégorie, vous devez spécifier : **nom**, **emoji** et **description**.'
                        )]
                    });
                }
                
                const categoryId = nom.toLowerCase().replace(/\s+/g, '-');
                
                // Vérifier si la catégorie existe déjà
                if (guildData.tickets.categories.find(cat => cat.id === categoryId)) {
                    return interaction.editReply({
                        embeds: [EmbedFactory.error(
                            'Catégorie existante',
                            `Une catégorie avec le nom "${nom}" existe déjà.`
                        )]
                    });
                }
                
                guildData.tickets.categories.push({
                    id: categoryId,
                    name: nom,
                    emoji: emoji,
                    description: description
                });
                
                interaction.client.database.setGuild(interaction.guild.id, guildData);
                
                await interaction.editReply({
                    embeds: [EmbedFactory.success(
                        '➕ Catégorie ajoutée',
                        `**${emoji} ${nom}** a été ajoutée avec succès !\n\n` +
                        `**Description:** ${description}\n` +
                        `**ID:** \`${categoryId}\``
                    )]
                });
                break;
                
            case 'remove':
                if (!nom) {
                    return interaction.editReply({
                        embeds: [EmbedFactory.error(
                            'Nom manquant',
                            'Spécifiez le nom de la catégorie à supprimer.'
                        )]
                    });
                }
                
                const removeId = nom.toLowerCase().replace(/\s+/g, '-');
                const categoryIndex = guildData.tickets.categories.findIndex(cat => cat.id === removeId);
                
                if (categoryIndex === -1) {
                    return interaction.editReply({
                        embeds: [EmbedFactory.error(
                            'Catégorie introuvable',
                            `Aucune catégorie trouvée avec le nom "${nom}".`
                        )]
                    });
                }
                
                const removedCategory = guildData.tickets.categories.splice(categoryIndex, 1)[0];
                interaction.client.database.setGuild(interaction.guild.id, guildData);
                
                await interaction.editReply({
                    embeds: [EmbedFactory.success(
                        '❌ Catégorie supprimée',
                        `**${removedCategory.emoji} ${removedCategory.name}** a été supprimée avec succès !`
                    )]
                });
                break;
                
            case 'list':
                if (guildData.tickets.categories.length === 0) {
                    return interaction.editReply({
                        embeds: [EmbedFactory.info(
                            '📋 Aucune catégorie',
                            'Aucune catégorie de ticket n\'est configurée.\n\nUtilisez `/ticket-setup categories add` pour en ajouter.'
                        )]
                    });
                }
                
                const categoriesList = guildData.tickets.categories.map((cat, index) => 
                    `**${index + 1}.** ${cat.emoji} **${cat.name}**\n` +
                    `   └ *${cat.description}*\n   └ ID: \`${cat.id}\``
                ).join('\n\n');
                
                const listEmbed = EmbedFactory.info(
                    '📋 Catégories de tickets',
                    `**${guildData.tickets.categories.length} catégorie(s) configurée(s) :**\n\n${categoriesList}`
                );
                
                await interaction.editReply({ embeds: [listEmbed] });
                break;
        }
        
    } catch (error) {
        console.error('❌ [Kofu] Erreur gestion catégories:', error);
        
        await interaction.editReply({
            embeds: [EmbedFactory.error(
                'Erreur',
                `Impossible de gérer les catégories.\n\n**Erreur:** \`${error.message}\``
            )]
        });
    }
}

/**
 * ====================================
 * ✨ Made with ❤️ by Kofu
 * github.com/kofudev
 * ====================================
 */

/**
 * ====================================
 * ✨ Made with ❤️ by Kofu
 * github.com/kofudev
 * ====================================
 */