/**
 * ====================================
 * COMMANDE: /help
 * ====================================
 * 
 * Système d'aide complet avec pagination
 * Affiche toutes les commandes par catégorie
 * 
 * @author Kofu (github.com/kofudev)
 * @category General
 * ====================================
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const KofuSignature = require('../../utils/kofu-signature');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('📚 Afficher l\'aide du bot')
        .addStringOption(option =>
            option.setName('commande')
                .setDescription('Commande spécifique à afficher')
                .setRequired(false)
        ),
    
    category: 'general',
    cooldown: 5,
    
    /**
     * Exécution de la commande help
     * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
     * @author Kofu
     */
    async execute(interaction) {
        const specificCommand = interaction.options.getString('commande');
        
        // Si une commande spécifique est demandée
        if (specificCommand) {
            return await showSpecificCommand(interaction, specificCommand);
        }
        
        // Sinon, afficher l'aide générale
        await showGeneralHelp(interaction);
    }
};

/**
 * Afficher l'aide pour une commande spécifique
 * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
 * @param {string} commandName - Nom de la commande
 * @author Kofu
 */
async function showSpecificCommand(interaction, commandName) {
    const command = interaction.client.commands.get(commandName);
    
    if (!command) {
        const errorEmbed = KofuSignature.createErrorEmbed(
            'Commande introuvable !',
            `La commande \`/${commandName}\` n'existe pas.\\n\\nUtilise \`/help\` pour voir toutes les commandes disponibles.`
        );
        
        return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
    
    // Créer l'embed de la commande spécifique
    const commandEmbed = new EmbedBuilder()
        .setTitle(`📖 Aide - /${command.data.name}`)
        .setDescription(command.data.description)
        .setColor('#5865F2')
        .addFields(
            {
                name: '📂 Catégorie',
                value: `\`${command.category || 'Inconnue'}\``,
                inline: true
            },
            {
                name: '⏱️ Cooldown',
                value: `\`${command.cooldown || 3}s\``,
                inline: true
            }
        )
        .setFooter(KofuSignature.getKofuFooter())
        .setTimestamp();
    
    // Ajouter les options si elles existent
    if (command.data.options && command.data.options.length > 0) {
        const optionsText = command.data.options.map(option => {
            const required = option.required ? '**[Requis]**' : '*[Optionnel]*';
            return `• **${option.name}** ${required}\\n  ${option.description}`;
        }).join('\\n\\n');
        
        commandEmbed.addFields({
            name: '⚙️ Options',
            value: optionsText,
            inline: false
        });
    }
    
    await interaction.reply({ embeds: [commandEmbed] });
}

/**
 * Afficher l'aide générale avec menu de sélection
 * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
 * @author Kofu
 */
async function showGeneralHelp(interaction) {
    // Créer l'embed principal
    const mainEmbed = new EmbedBuilder()
        .setTitle('📚 TASHKY Bot - Guide d\\'utilisation')
        .setDescription(
            '**Bienvenue dans l\\'aide de TASHKY Bot !** 🎉\\n\\n' +
            '🤖 **Bot multifonction** créé avec passion par **Kofu**\\n' +
            '✨ **Code humain**, lisible et bien commenté\\n' +
            '🛡️ **Modération avancée**, tickets, logs et bien plus !\\n\\n' +
            '**Utilise le menu ci-dessous pour explorer les catégories** 👇'
        )
        .setColor('#5865F2')
        .setThumbnail(interaction.client.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
            {
                name: '📊 Statistiques',
                value: 
                    `🏛️ **Serveurs:** \`${interaction.client.guilds.cache.size}\`\\n` +
                    `👥 **Utilisateurs:** \`${interaction.client.users.cache.size}\`\\n` +
                    `⚙️ **Commandes:** \`${interaction.client.commands.size}\`\\n` +
                    `🏓 **Ping:** \`${interaction.client.ws.ping}ms\``,
                inline: true
            },
            {
                name: '🔗 Liens utiles',
                value: 
                    '[📥 Inviter le bot](https://discord.com/oauth2/authorize)\\n' +
                    '[💬 Serveur de support](https://discord.gg/support)\\n' +
                    '[📖 GitHub](https://github.com/kofudev/tashky-bot)\\n' +
                    '[💖 Faire un don](https://paypal.me/kofu)',
                inline: true
            }
        )
        .setFooter(KofuSignature.getKofuFooter())
        .setTimestamp();
    
    // Créer le menu de sélection des catégories
    const categoryMenu = new StringSelectMenuBuilder()
        .setCustomId('help_category_select')
        .setPlaceholder('📂 Sélectionne une catégorie...')
        .addOptions([
            {
                label: 'Général',
                description: 'Commandes générales (ping, help, info...)',
                value: 'general',
                emoji: '📋'
            },
            {
                label: 'Modération',
                description: 'Commandes de modération (ban, kick, warn...)',
                value: 'moderation',
                emoji: '🛡️'
            },
            {
                label: 'Tickets',
                description: 'Système de tickets complet',
                value: 'tickets',
                emoji: '🎫'
            },
            {
                label: 'Owner',
                description: 'Commandes réservées aux propriétaires',
                value: 'owner',
                emoji: '👑'
            },
            {
                label: 'Utilitaires',
                description: 'Outils et utilitaires divers',
                value: 'utility',
                emoji: '🔧'
            },
            {
                label: 'Fun',
                description: 'Commandes amusantes et jeux',
                value: 'fun',
                emoji: '🎮'
            }
        ]);
    
    const row = new ActionRowBuilder().addComponents(categoryMenu);
    
    await interaction.reply({
        embeds: [mainEmbed],
        components: [row]
    });
    
    // Gérer les interactions du menu
    const collector = interaction.channel.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id && i.customId === 'help_category_select',
        time: 300000 // 5 minutes
    });
    
    collector.on('collect', async i => {
        const category = i.values[0];
        const categoryEmbed = await createCategoryEmbed(category, interaction.client);
        
        await i.update({
            embeds: [categoryEmbed],
            components: [row]
        });
    });
    
    collector.on('end', () => {
        // Désactiver le menu après expiration
        const disabledRow = new ActionRowBuilder()
            .addComponents(categoryMenu.setDisabled(true));
        
        interaction.editReply({ components: [disabledRow] }).catch(() => {});
    });
}

/**
 * Créer l'embed pour une catégorie spécifique
 * @param {string} category - Nom de la catégorie
 * @param {Client} client - Le client Discord
 * @returns {EmbedBuilder} Embed de la catégorie
 * @author Kofu
 */
async function createCategoryEmbed(category, client) {
    const categoryInfo = {
        general: {
            title: '📋 Commandes Générales',
            description: 'Commandes de base disponibles pour tous',
            color: '#5865F2'
        },
        moderation: {
            title: '🛡️ Commandes de Modération',
            description: 'Outils pour modérer votre serveur',
            color: '#F04747'
        },
        tickets: {
            title: '🎫 Système de Tickets',
            description: 'Gestion complète des tickets de support',
            color: '#43B581'
        },
        owner: {
            title: '👑 Commandes Owner',
            description: 'Commandes réservées aux propriétaires du bot',
            color: '#FFD700'
        },
        utility: {
            title: '🔧 Utilitaires',
            description: 'Outils et fonctionnalités utiles',
            color: '#00B0F4'
        },
        fun: {
            title: '🎮 Commandes Fun',
            description: 'Divertissement et jeux',
            color: '#9B59B6'
        }
    };
    
    const info = categoryInfo[category] || categoryInfo.general;
    
    const embed = new EmbedBuilder()
        .setTitle(info.title)
        .setDescription(info.description)
        .setColor(info.color)
        .setFooter(KofuSignature.getKofuFooter())
        .setTimestamp();
    
    // Filtrer les commandes par catégorie
    const commands = client.commands.filter(cmd => cmd.category === category);
    
    if (commands.size === 0) {
        embed.addFields({
            name: '❌ Aucune commande',
            value: 'Aucune commande disponible dans cette catégorie pour le moment.',
            inline: false
        });
    } else {
        const commandList = commands.map(cmd => 
            `**/${cmd.data.name}** - ${cmd.data.description}`
        ).join('\\n');
        
        embed.addFields({
            name: `⚙️ Commandes (${commands.size})`,
            value: commandList.length > 1024 ? commandList.substring(0, 1021) + '...' : commandList,
            inline: false
        });
    }
    
    return embed;
}

/**
 * ====================================
 * ✨ Made with ❤️ by Kofu
 * github.com/kofudev
 * ====================================
 */