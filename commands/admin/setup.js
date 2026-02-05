/**
 * ====================================
 * COMMANDE: /setup
 * ====================================
 * 
 * Configuration complète du serveur
 * Assistant de configuration interactif
 * 
 * @author Kofu (github.com/kofudev)
 * @category Admin
 * ====================================
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const KofuSignature = require('../../utils/kofu-signature');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('⚙️ Configuration complète du serveur')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    category: 'admin',
    cooldown: 10,
    guildOnly: true,
    permissions: ['Administrator'],
    
    /**
     * Exécution de la commande setup
     * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
     * @author Kofu
     */
    async execute(interaction) {
        // Récupérer les données du serveur
        const guildData = interaction.client.database.getGuild(interaction.guild.id);
        
        // Créer l'embed principal
        const setupEmbed = new EmbedBuilder()
            .setTitle('⚙️ Configuration du Serveur')
            .setDescription(
                '**Bienvenue dans l\'assistant de configuration TASHKY Bot !**\n\n' +
                'Utilise le menu ci-dessous pour configurer les différents aspects du bot sur ton serveur.\n\n' +
                '🔧 **Fonctionnalités disponibles :**\n' +
                '• Salons de logs et modération\n' +
                '• Système de niveaux et XP\n' +
                '• Économie et récompenses\n' +
                '• Messages de bienvenue/départ\n' +
                '• Système anti-spam/raid\n' +
                '• Rôles automatiques\n' +
                '• Et bien plus encore !'
            )
            .setColor('#5865F2')
            .setThumbnail(interaction.guild.iconURL({ dynamic: true, size: 256 }))
            .addFields(
                { name: '🏛️ Serveur', value: interaction.guild.name, inline: true },
                { name: '👥 Membres', value: interaction.guild.memberCount.toString(), inline: true },
                { name: '📅 Créé le', value: `<t:${Math.floor(interaction.guild.createdTimestamp / 1000)}:D>`, inline: true }
            )
            .setFooter(KofuSignature.getKofuFooter())
            .setTimestamp();
        
        // Créer le menu de sélection
        const setupMenu = new StringSelectMenuBuilder()
            .setCustomId('setup_category_select')
            .setPlaceholder('🔧 Sélectionne une catégorie à configurer...')
            .addOptions([
                {
                    label: 'Logs & Modération',
                    description: 'Configurer les salons de logs et la modération',
                    value: 'logs',
                    emoji: '📝'
                },
                {
                    label: 'Système de Niveaux',
                    description: 'Configurer le système XP et niveaux',
                    value: 'levels',
                    emoji: '📊'
                },
                {
                    label: 'Économie',
                    description: 'Configurer le système économique',
                    value: 'economy',
                    emoji: '💰'
                },
                {
                    label: 'Messages de Bienvenue',
                    description: 'Configurer les messages d\'arrivée/départ',
                    value: 'welcome',
                    emoji: '👋'
                },
                {
                    label: 'Anti-Spam & Sécurité',
                    description: 'Configurer les protections automatiques',
                    value: 'security',
                    emoji: '🛡️'
                },
                {
                    label: 'Rôles Automatiques',
                    description: 'Configurer l\'attribution automatique de rôles',
                    value: 'autoroles',
                    emoji: '🎭'
                },
                {
                    label: 'Tickets',
                    description: 'Configurer le système de tickets',
                    value: 'tickets',
                    emoji: '🎫'
                },
                {
                    label: 'Configuration Actuelle',
                    description: 'Voir la configuration actuelle du serveur',
                    value: 'current',
                    emoji: '📋'
                }
            ]);
        
        const row = new ActionRowBuilder().addComponents(setupMenu);
        
        await interaction.reply({
            embeds: [setupEmbed],
            components: [row]
        });
        
        // Gérer les interactions du menu
        const collector = interaction.channel.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id && i.customId === 'setup_category_select',
            time: 600000 // 10 minutes
        });
        
        collector.on('collect', async i => {
            const category = i.values[0];
            
            try {
                let responseEmbed;
                
                switch (category) {
                    case 'logs':
                        responseEmbed = await createLogsSetupEmbed(interaction.guild, guildData);
                        break;
                    case 'levels':
                        responseEmbed = await createLevelsSetupEmbed(interaction.guild, guildData);
                        break;
                    case 'economy':
                        responseEmbed = await createEconomySetupEmbed(interaction.guild, guildData);
                        break;
                    case 'welcome':
                        responseEmbed = await createWelcomeSetupEmbed(interaction.guild, guildData);
                        break;
                    case 'security':
                        responseEmbed = await createSecuritySetupEmbed(interaction.guild, guildData);
                        break;
                    case 'autoroles':
                        responseEmbed = await createAutorolesSetupEmbed(interaction.guild, guildData);
                        break;
                    case 'tickets':
                        responseEmbed = await createTicketsSetupEmbed(interaction.guild, guildData);
                        break;
                    case 'current':
                        responseEmbed = await createCurrentConfigEmbed(interaction.guild, guildData);
                        break;
                    default:
                        responseEmbed = KofuSignature.createErrorEmbed('Erreur', 'Catégorie non reconnue.');
                }
                
                await i.update({
                    embeds: [responseEmbed],
                    components: [row]
                });
                
            } catch (error) {
                console.error('❌ [Kofu] Erreur setup menu:', error);
                
                const errorEmbed = KofuSignature.createErrorEmbed(
                    'Erreur de configuration !',
                    `Une erreur est survenue: \`${error.message}\``
                );
                
                await i.update({ embeds: [errorEmbed], components: [row] });
            }
        });
        
        collector.on('end', () => {
            // Désactiver le menu après expiration
            const disabledRow = new ActionRowBuilder()
                .addComponents(setupMenu.setDisabled(true));
            
            interaction.editReply({ components: [disabledRow] }).catch(() => {});
        });
        
        console.log(`⚙️ [Kofu] ${interaction.user.tag} a ouvert la configuration sur ${interaction.guild.name}`);
    }
};

/**
 * Créer l'embed de configuration des logs
 * @param {Guild} guild - Le serveur Discord
 * @param {object} guildData - Données du serveur
 * @returns {EmbedBuilder} Embed de configuration
 * @author Kofu
 */
async function createLogsSetupEmbed(guild, guildData) {
    const embed = new EmbedBuilder()
        .setTitle('📝 Configuration - Logs & Modération')
        .setDescription('Configure les salons de logs pour suivre les activités du serveur.')
        .setColor('#F04747')
        .setFooter(KofuSignature.getKofuFooter())
        .setTimestamp();
    
    const logs = guildData.logs || {};
    
    embed.addFields(
        { 
            name: '🛡️ Logs de Modération', 
            value: logs.moderation ? `<#${logs.moderation}>` : '❌ Non configuré', 
            inline: true 
        },
        { 
            name: '👥 Logs de Membres', 
            value: logs.members ? `<#${logs.members}>` : '❌ Non configuré', 
            inline: true 
        },
        { 
            name: '💬 Logs de Messages', 
            value: logs.messages ? `<#${logs.messages}>` : '❌ Non configuré', 
            inline: true 
        },
        { 
            name: '🔊 Logs Vocaux', 
            value: logs.voice ? `<#${logs.voice}>` : '❌ Non configuré', 
            inline: true 
        },
        { 
            name: '⚙️ Logs du Serveur', 
            value: logs.server ? `<#${logs.server}>` : '❌ Non configuré', 
            inline: true 
        },
        { 
            name: '🤖 Logs du Bot', 
            value: logs.bot ? `<#${logs.bot}>` : '❌ Non configuré', 
            inline: true 
        }
    );
    
    embed.addFields({
        name: '🔧 Configuration rapide',
        value: 
            '**Commandes disponibles :**\n' +
            '• `/config logs moderation #salon` - Logs de modération\n' +
            '• `/config logs members #salon` - Logs de membres\n' +
            '• `/config logs messages #salon` - Logs de messages\n' +
            '• `/config logs voice #salon` - Logs vocaux\n' +
            '• `/config logs server #salon` - Logs du serveur\n' +
            '• `/config logs bot #salon` - Logs du bot\n\n' +
            '💡 **Astuce :** Tu peux utiliser le même salon pour plusieurs types de logs.',
        inline: false
    });
    
    return embed;
}

/**
 * Créer l'embed de configuration des niveaux
 * @param {Guild} guild - Le serveur Discord
 * @param {object} guildData - Données du serveur
 * @returns {EmbedBuilder} Embed de configuration
 * @author Kofu
 */
async function createLevelsSetupEmbed(guild, guildData) {
    const embed = new EmbedBuilder()
        .setTitle('📊 Configuration - Système de Niveaux')
        .setDescription('Configure le système XP et niveaux pour récompenser l\'activité.')
        .setColor('#00FF00')
        .setFooter(KofuSignature.getKofuFooter())
        .setTimestamp();
    
    const levels = guildData.levels || {};
    
    embed.addFields(
        { 
            name: '✅ Système activé', 
            value: levels.enabled ? '✅ Oui' : '❌ Non', 
            inline: true 
        },
        { 
            name: '💬 XP par message', 
            value: `${levels.xpPerMessage || 15}-${levels.xpPerMessage + 10 || 25}`, 
            inline: true 
        },
        { 
            name: '🎤 XP vocal (par minute)', 
            value: `${levels.xpPerVoiceMinute || 5}`, 
            inline: true 
        },
        { 
            name: '📢 Salon d\'annonces', 
            value: levels.levelUpChannel ? `<#${levels.levelUpChannel}>` : '❌ Messages privés', 
            inline: true 
        },
        { 
            name: '⏱️ Cooldown XP', 
            value: `${levels.xpCooldown || 60} secondes`, 
            inline: true 
        },
        { 
            name: '🚫 Salons ignorés', 
            value: levels.ignoredChannels?.length > 0 ? `${levels.ignoredChannels.length} salon(s)` : 'Aucun', 
            inline: true 
        }
    );
    
    embed.addFields({
        name: '🔧 Configuration rapide',
        value: 
            '**Commandes disponibles :**\n' +
            '• `/config levels enable` - Activer le système\n' +
            '• `/config levels disable` - Désactiver le système\n' +
            '• `/config levels channel #salon` - Salon d\'annonces\n' +
            '• `/config levels xp-message 15-25` - XP par message\n' +
            '• `/config levels xp-voice 5` - XP vocal par minute\n' +
            '• `/config levels ignore #salon` - Ignorer un salon\n\n' +
            '💡 **Astuce :** Les utilisateurs gagnent de l\'XP en envoyant des messages et en restant en vocal.',
        inline: false
    });
    
    return embed;
}

/**
 * Créer l'embed de configuration de l'économie
 * @param {Guild} guild - Le serveur Discord
 * @param {object} guildData - Données du serveur
 * @returns {EmbedBuilder} Embed de configuration
 * @author Kofu
 */
async function createEconomySetupEmbed(guild, guildData) {
    const embed = new EmbedBuilder()
        .setTitle('💰 Configuration - Économie')
        .setDescription('Configure le système économique avec coins, daily, work, etc.')
        .setColor('#FFD700')
        .setFooter(KofuSignature.getKofuFooter())
        .setTimestamp();
    
    const economy = guildData.economy || {};
    
    embed.addFields(
        { 
            name: '✅ Système activé', 
            value: economy.enabled ? '✅ Oui' : '❌ Non', 
            inline: true 
        },
        { 
            name: '💰 Monnaie', 
            value: economy.currency || 'Kofu Coins', 
            inline: true 
        },
        { 
            name: '🎁 Daily de base', 
            value: `${economy.dailyAmount || 100} coins`, 
            inline: true 
        },
        { 
            name: '💼 Work de base', 
            value: `${economy.workAmount || 50}-${economy.workAmount + 50 || 100} coins`, 
            inline: true 
        },
        { 
            name: '🏦 Limite banque', 
            value: `${economy.bankLimit || 10000} coins`, 
            inline: true 
        },
        { 
            name: '💸 Taxe transfert', 
            value: `${economy.transferTax || 5}%`, 
            inline: true 
        }
    );
    
    embed.addFields({
        name: '🔧 Configuration rapide',
        value: 
            '**Commandes disponibles :**\n' +
            '• `/config economy enable` - Activer le système\n' +
            '• `/config economy disable` - Désactiver le système\n' +
            '• `/config economy currency "Nom"` - Changer la monnaie\n' +
            '• `/config economy daily 100` - Montant daily\n' +
            '• `/config economy work 50-100` - Montant work\n' +
            '• `/config economy bank-limit 10000` - Limite banque\n\n' +
            '💡 **Astuce :** L\'économie encourage l\'activité avec des récompenses quotidiennes.',
        inline: false
    });
    
    return embed;
}

/**
 * Créer l'embed de configuration actuelle
 * @param {Guild} guild - Le serveur Discord
 * @param {object} guildData - Données du serveur
 * @returns {EmbedBuilder} Embed de configuration
 * @author Kofu
 */
async function createCurrentConfigEmbed(guild, guildData) {
    const embed = new EmbedBuilder()
        .setTitle('📋 Configuration Actuelle')
        .setDescription(`Configuration actuelle de **${guild.name}**`)
        .setColor('#5865F2')
        .setThumbnail(guild.iconURL({ dynamic: true }))
        .setFooter(KofuSignature.getKofuFooter())
        .setTimestamp();
    
    // Résumé des systèmes
    const systems = [];
    if (guildData.levels?.enabled) systems.push('📊 Niveaux');
    if (guildData.economy?.enabled) systems.push('💰 Économie');
    if (guildData.welcome?.enabled) systems.push('👋 Bienvenue');
    if (guildData.security?.enabled) systems.push('🛡️ Sécurité');
    if (guildData.tickets?.enabled) systems.push('🎫 Tickets');
    
    embed.addFields({
        name: '🔧 Systèmes actifs',
        value: systems.length > 0 ? systems.join('\n') : 'Aucun système configuré',
        inline: true
    });
    
    // Logs configurés
    const logs = guildData.logs || {};
    const configuredLogs = [];
    if (logs.moderation) configuredLogs.push('🛡️ Modération');
    if (logs.members) configuredLogs.push('👥 Membres');
    if (logs.messages) configuredLogs.push('💬 Messages');
    if (logs.voice) configuredLogs.push('🔊 Vocal');
    
    embed.addFields({
        name: '📝 Logs configurés',
        value: configuredLogs.length > 0 ? configuredLogs.join('\n') : 'Aucun log configuré',
        inline: true
    });
    
    // Statistiques
    embed.addFields({
        name: '📊 Statistiques',
        value: 
            `👥 **Membres:** ${guild.memberCount}\n` +
            `📅 **Configuré le:** <t:${Math.floor((guildData.createdAt || Date.now()) / 1000)}:D>\n` +
            `🔄 **Dernière MAJ:** <t:${Math.floor((guildData.updatedAt || Date.now()) / 1000)}:R>`,
        inline: false
    });
    
    return embed;
}

// Fonctions similaires pour les autres catégories...
async function createWelcomeSetupEmbed(guild, guildData) {
    return new EmbedBuilder()
        .setTitle('👋 Configuration - Messages de Bienvenue')
        .setDescription('Configuration des messages d\'arrivée et de départ en cours de développement...')
        .setColor('#43B581')
        .setFooter(KofuSignature.getKofuFooter());
}

async function createSecuritySetupEmbed(guild, guildData) {
    return new EmbedBuilder()
        .setTitle('🛡️ Configuration - Anti-Spam & Sécurité')
        .setDescription('Configuration des protections automatiques en cours de développement...')
        .setColor('#F04747')
        .setFooter(KofuSignature.getKofuFooter());
}

async function createAutorolesSetupEmbed(guild, guildData) {
    return new EmbedBuilder()
        .setTitle('🎭 Configuration - Rôles Automatiques')
        .setDescription('Configuration de l\'attribution automatique de rôles en cours de développement...')
        .setColor('#9B59B6')
        .setFooter(KofuSignature.getKofuFooter());
}

async function createTicketsSetupEmbed(guild, guildData) {
    return new EmbedBuilder()
        .setTitle('🎫 Configuration - Système de Tickets')
        .setDescription('Configuration du système de tickets en cours de développement...')
        .setColor('#00B0F4')
        .setFooter(KofuSignature.getKofuFooter());
}

/**
 * ====================================
 * ✨ Made with ❤️ by Kofu
 * github.com/kofudev
 * ====================================
 */