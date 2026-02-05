/**
 * ====================================
 * COMMANDE: /ticket
 * ====================================
 * 
 * Gestion AVANCÉE des tickets
 * Système professionnel complet comme Ticket Tool
 * 
 * @author Kofu (github.com/kofudev)
 * @category Tickets
 * ====================================
 */

const { SlashCommandBuilder, ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const EmbedFactory = require('../../utils/embed');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('🎫 Gestion avancée des tickets')
        .addSubcommand(subcommand =>
            subcommand
                .setName('close')
                .setDescription('Fermer le ticket actuel')
                .addStringOption(option =>
                    option.setName('raison')
                        .setDescription('Raison de la fermeture')
                        .setRequired(false)
                        .setMaxLength(200)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Ajouter un utilisateur au ticket')
                .addUserOption(option =>
                    option.setName('utilisateur')
                        .setDescription('Utilisateur à ajouter')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Retirer un utilisateur du ticket')
                .addUserOption(option =>
                    option.setName('utilisateur')
                        .setDescription('Utilisateur à retirer')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('claim')
                .setDescription('Prendre en charge le ticket')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('unclaim')
                .setDescription('Abandonner la prise en charge')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('rename')
                .setDescription('Renommer le ticket')
                .addStringOption(option =>
                    option.setName('nom')
                        .setDescription('Nouveau nom du ticket')
                        .setRequired(true)
                        .setMaxLength(50)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('priority')
                .setDescription('Changer la priorité du ticket')
                .addStringOption(option =>
                    option.setName('niveau')
                        .setDescription('Niveau de priorité')
                        .setRequired(true)
                        .addChoices(
                            { name: '🟢 Basse', value: 'low' },
                            { name: '🟡 Normale', value: 'normal' },
                            { name: '🟠 Haute', value: 'high' },
                            { name: '🔴 Critique', value: 'critical' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('transcript')
                .setDescription('Générer un transcript du ticket')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Afficher les informations du ticket')
        ),
    
    category: 'tickets',
    cooldown: 3,
    guildOnly: true,
    
    /**
     * Gestion avancée des tickets
     * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
     * @author Kofu
     */
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        
        // Vérifier si on est dans un ticket
        if (!interaction.channel.name.startsWith('ticket-')) {
            return interaction.reply({
                embeds: [EmbedFactory.error(
                    'Salon invalide',
                    'Cette commande ne peut être utilisée que dans un salon de ticket.'
                )],
                ephemeral: true
            });
        }
        
        const guildData = interaction.client.database.getGuild(interaction.guild.id);
        if (!guildData.tickets?.enabled) {
            return interaction.reply({
                embeds: [EmbedFactory.error(
                    'Système désactivé',
                    'Le système de tickets n\'est pas configuré sur ce serveur.'
                )],
                ephemeral: true
            });
        }
        
        switch (subcommand) {
            case 'close':
                await handleClose(interaction, guildData);
                break;
            case 'add':
                await handleAdd(interaction, guildData);
                break;
            case 'remove':
                await handleRemove(interaction, guildData);
                break;
            case 'claim':
                await handleClaim(interaction, guildData);
                break;
            case 'unclaim':
                await handleUnclaim(interaction, guildData);
                break;
            case 'rename':
                await handleRename(interaction, guildData);
                break;
            case 'priority':
                await handlePriority(interaction, guildData);
                break;
            case 'transcript':
                await handleTranscript(interaction, guildData);
                break;
            case 'info':
                await handleInfo(interaction, guildData);
                break;
        }
    }
};

/**
 * Fermer un ticket
 */
async function handleClose(interaction, guildData) {
    const raison = interaction.options.getString('raison') || 'Aucune raison spécifiée';
    
    // Vérifier les permissions
    const isStaff = guildData.tickets.staffRoles?.some(roleId => 
        interaction.member.roles.cache.has(roleId)
    ) || interaction.member.permissions.has(PermissionFlagsBits.ManageChannels);
    
    const ticketData = getTicketData(interaction.channel);
    const isOwner = ticketData && ticketData.userId === interaction.user.id;
    
    if (!isStaff && !isOwner) {
        return interaction.reply({
            embeds: [EmbedFactory.error(
                'Permissions insuffisantes',
                'Seul le créateur du ticket ou un membre du staff peut le fermer.'
            )],
            ephemeral: true
        });
    }
    
    // Créer l'embed de confirmation
    const confirmEmbed = EmbedFactory.warning(
        '🔒 Fermeture du ticket',
        `**Êtes-vous sûr de vouloir fermer ce ticket ?**\n\n` +
        `**Fermé par:** ${interaction.user}\n` +
        `**Raison:** ${raison}\n\n` +
        `⚠️ **Cette action est irréversible !**`
    );
    
    const confirmButtons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('confirm_close_ticket')
                .setLabel('✅ Confirmer')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('✅'),
            new ButtonBuilder()
                .setCustomId('cancel_close_ticket')
                .setLabel('❌ Annuler')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('❌')
        );
    
    await interaction.reply({
        embeds: [confirmEmbed],
        components: [confirmButtons],
        ephemeral: true
    });
}

/**
 * Ajouter un utilisateur
 */
async function handleAdd(interaction, guildData) {
    const utilisateur = interaction.options.getUser('utilisateur');
    
    // Vérifier les permissions
    const isStaff = guildData.tickets.staffRoles?.some(roleId => 
        interaction.member.roles.cache.has(roleId)
    ) || interaction.member.permissions.has(PermissionFlagsBits.ManageChannels);
    
    if (!isStaff) {
        return interaction.reply({
            embeds: [EmbedFactory.error(
                'Permissions insuffisantes',
                'Seul un membre du staff peut ajouter des utilisateurs.'
            )],
            ephemeral: true
        });
    }
    
    try {
        await interaction.channel.permissionOverwrites.create(utilisateur, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true,
            AttachFiles: true,
            EmbedLinks: true
        });
        
        const addEmbed = EmbedFactory.success(
            '➕ Utilisateur ajouté',
            `${utilisateur} a été ajouté au ticket avec succès !`
        );
        
        await interaction.reply({ embeds: [addEmbed] });
        
        // Notifier l'utilisateur
        await interaction.channel.send({
            content: `${utilisateur}`,
            embeds: [EmbedFactory.info(
                '🎫 Ajouté au ticket',
                `Vous avez été ajouté à ce ticket par ${interaction.user}.`
            )]
        });
        
    } catch (error) {
        await interaction.reply({
            embeds: [EmbedFactory.error(
                'Erreur',
                `Impossible d'ajouter l'utilisateur.\n\n**Erreur:** \`${error.message}\``
            )],
            ephemeral: true
        });
    }
}

/**
 * Retirer un utilisateur
 */
async function handleRemove(interaction, guildData) {
    const utilisateur = interaction.options.getUser('utilisateur');
    
    // Vérifier les permissions
    const isStaff = guildData.tickets.staffRoles?.some(roleId => 
        interaction.member.roles.cache.has(roleId)
    ) || interaction.member.permissions.has(PermissionFlagsBits.ManageChannels);
    
    if (!isStaff) {
        return interaction.reply({
            embeds: [EmbedFactory.error(
                'Permissions insuffisantes',
                'Seul un membre du staff peut retirer des utilisateurs.'
            )],
            ephemeral: true
        });
    }
    
    const ticketData = getTicketData(interaction.channel);
    if (ticketData && utilisateur.id === ticketData.userId) {
        return interaction.reply({
            embeds: [EmbedFactory.error(
                'Action interdite',
                'Impossible de retirer le créateur du ticket.'
            )],
            ephemeral: true
        });
    }
    
    try {
        await interaction.channel.permissionOverwrites.delete(utilisateur);
        
        const removeEmbed = EmbedFactory.success(
            '➖ Utilisateur retiré',
            `${utilisateur} a été retiré du ticket avec succès !`
        );
        
        await interaction.reply({ embeds: [removeEmbed] });
        
    } catch (error) {
        await interaction.reply({
            embeds: [EmbedFactory.error(
                'Erreur',
                `Impossible de retirer l'utilisateur.\n\n**Erreur:** \`${error.message}\``
            )],
            ephemeral: true
        });
    }
}

/**
 * Prendre en charge un ticket
 */
async function handleClaim(interaction, guildData) {
    // Vérifier les permissions
    const isStaff = guildData.tickets.staffRoles?.some(roleId => 
        interaction.member.roles.cache.has(roleId)
    ) || interaction.member.permissions.has(PermissionFlagsBits.ManageChannels);
    
    if (!isStaff) {
        return interaction.reply({
            embeds: [EmbedFactory.error(
                'Permissions insuffisantes',
                'Seul un membre du staff peut prendre en charge un ticket.'
            )],
            ephemeral: true
        });
    }
    
    try {
        // Renommer le salon
        const newName = `${interaction.channel.name}-${interaction.user.username.toLowerCase()}`;
        await interaction.channel.setName(newName);
        
        const claimEmbed = EmbedFactory.success(
            '✋ Ticket pris en charge',
            `${interaction.user} a pris en charge ce ticket !`
        );
        
        await interaction.reply({ embeds: [claimEmbed] });
        
    } catch (error) {
        await interaction.reply({
            embeds: [EmbedFactory.error(
                'Erreur',
                `Impossible de prendre en charge le ticket.\n\n**Erreur:** \`${error.message}\``
            )],
            ephemeral: true
        });
    }
}

/**
 * Abandonner la prise en charge
 */
async function handleUnclaim(interaction, guildData) {
    try {
        // Restaurer le nom original
        const originalName = interaction.channel.name.split('-').slice(0, -1).join('-');
        await interaction.channel.setName(originalName);
        
        const unclaimEmbed = EmbedFactory.warning(
            '🚫 Prise en charge abandonnée',
            `${interaction.user} a abandonné la prise en charge de ce ticket.`
        );
        
        await interaction.reply({ embeds: [unclaimEmbed] });
        
    } catch (error) {
        await interaction.reply({
            embeds: [EmbedFactory.error(
                'Erreur',
                `Impossible d'abandonner la prise en charge.\n\n**Erreur:** \`${error.message}\``
            )],
            ephemeral: true
        });
    }
}

/**
 * Renommer un ticket
 */
async function handleRename(interaction, guildData) {
    const nom = interaction.options.getString('nom');
    
    // Vérifier les permissions
    const isStaff = guildData.tickets.staffRoles?.some(roleId => 
        interaction.member.roles.cache.has(roleId)
    ) || interaction.member.permissions.has(PermissionFlagsBits.ManageChannels);
    
    if (!isStaff) {
        return interaction.reply({
            embeds: [EmbedFactory.error(
                'Permissions insuffisantes',
                'Seul un membre du staff peut renommer un ticket.'
            )],
            ephemeral: true
        });
    }
    
    try {
        const oldName = interaction.channel.name;
        const newName = `ticket-${nom.toLowerCase().replace(/\s+/g, '-')}`;
        
        await interaction.channel.setName(newName);
        
        const renameEmbed = EmbedFactory.success(
            '✏️ Ticket renommé',
            `**Ancien nom:** ${oldName}\n**Nouveau nom:** ${newName}\n\n**Renommé par:** ${interaction.user}`
        );
        
        await interaction.reply({ embeds: [renameEmbed] });
        
    } catch (error) {
        await interaction.reply({
            embeds: [EmbedFactory.error(
                'Erreur',
                `Impossible de renommer le ticket.\n\n**Erreur:** \`${error.message}\``
            )],
            ephemeral: true
        });
    }
}

/**
 * Changer la priorité
 */
async function handlePriority(interaction, guildData) {
    const niveau = interaction.options.getString('niveau');
    
    // Vérifier les permissions
    const isStaff = guildData.tickets.staffRoles?.some(roleId => 
        interaction.member.roles.cache.has(roleId)
    ) || interaction.member.permissions.has(PermissionFlagsBits.ManageChannels);
    
    if (!isStaff) {
        return interaction.reply({
            embeds: [EmbedFactory.error(
                'Permissions insuffisantes',
                'Seul un membre du staff peut changer la priorité.'
            )],
            ephemeral: true
        });
    }
    
    const priorityDisplay = {
        low: '🟢 Basse',
        normal: '🟡 Normale',
        high: '🟠 Haute',
        critical: '🔴 Critique'
    };
    
    const priorityEmbed = EmbedFactory.success(
        '🎯 Priorité mise à jour',
        `**Nouvelle priorité:** ${priorityDisplay[niveau]}\n**Modifiée par:** ${interaction.user}`
    );
    
    await interaction.reply({ embeds: [priorityEmbed] });
}

/**
 * Générer un transcript
 */
async function handleTranscript(interaction, guildData) {
    // Vérifier les permissions
    const isStaff = guildData.tickets.staffRoles?.some(roleId => 
        interaction.member.roles.cache.has(roleId)
    ) || interaction.member.permissions.has(PermissionFlagsBits.ManageChannels);
    
    if (!isStaff) {
        return interaction.reply({
            embeds: [EmbedFactory.error(
                'Permissions insuffisantes',
                'Seul un membre du staff peut générer un transcript.'
            )],
            ephemeral: true
        });
    }
    
    await interaction.deferReply({ ephemeral: true });
    
    try {
        const messages = await interaction.channel.messages.fetch({ limit: 100 });
        const sortedMessages = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
        
        let transcript = `TRANSCRIPT DU TICKET - ${interaction.channel.name}\n`;
        transcript += `${'='.repeat(60)}\n`;
        transcript += `Généré le: ${new Date().toLocaleString('fr-FR')}\n`;
        transcript += `Salon: #${interaction.channel.name} (${interaction.channel.id})\n`;
        transcript += `Serveur: ${interaction.guild.name} (${interaction.guild.id})\n`;
        transcript += `Généré par: ${interaction.user.tag} (${interaction.user.id})\n`;
        transcript += `\n${'='.repeat(60)}\n\n`;
        
        for (const message of sortedMessages.values()) {
            if (message.system) continue;
            
            const timestamp = message.createdAt.toLocaleString('fr-FR');
            const author = `${message.author.tag} (${message.author.id})`;
            
            transcript += `[${timestamp}] ${author}:\n`;
            
            if (message.content) {
                transcript += `${message.content}\n`;
            }
            
            if (message.embeds.length > 0) {
                transcript += `[EMBED: ${message.embeds.length} embed(s)]\n`;
            }
            
            if (message.attachments.size > 0) {
                transcript += `[FICHIERS: ${message.attachments.size} fichier(s)]\n`;
                message.attachments.forEach(attachment => {
                    transcript += `  - ${attachment.name} (${attachment.url})\n`;
                });
            }
            
            transcript += '\n';
        }
        
        transcript += `\n${'='.repeat(60)}\n`;
        transcript += `Fin du transcript - ${sortedMessages.size} messages\n`;
        transcript += `Généré par TASHKY Bot - Made with ❤️ by Kofu\n`;
        
        const transcriptFile = {
            attachment: Buffer.from(transcript, 'utf8'),
            name: `transcript-${interaction.channel.name}-${Date.now()}.txt`
        };
        
        const transcriptEmbed = EmbedFactory.success(
            '📄 Transcript généré',
            `**Transcript créé avec succès !**\n\n` +
            `**Messages:** ${sortedMessages.size}\n` +
            `**Taille:** ${Math.round(transcript.length / 1024)} KB`
        );
        
        await interaction.editReply({
            embeds: [transcriptEmbed],
            files: [transcriptFile]
        });
        
    } catch (error) {
        await interaction.editReply({
            embeds: [EmbedFactory.error(
                'Erreur',
                `Impossible de générer le transcript.\n\n**Erreur:** \`${error.message}\``
            )]
        });
    }
}

/**
 * Afficher les informations du ticket
 */
async function handleInfo(interaction, guildData) {
    const ticketData = getTicketData(interaction.channel);
    
    const infoEmbed = EmbedFactory.info(
        '🎫 Informations du ticket',
        `**Salon:** ${interaction.channel}\n` +
        `**Créé le:** <t:${Math.floor(interaction.channel.createdTimestamp / 1000)}:F>\n` +
        `**Catégorie:** ${interaction.channel.parent || 'Aucune'}\n` +
        `**Membres:** ${interaction.channel.members.size}\n` +
        `**Permissions:** ${interaction.channel.permissionOverwrites.cache.size} règles`
    );
    
    await interaction.reply({ embeds: [infoEmbed], ephemeral: true });
}

/**
 * Obtenir les données d'un ticket depuis le nom du salon
 */
function getTicketData(channel) {
    const nameParts = channel.name.split('-');
    if (nameParts.length >= 2 && nameParts[0] === 'ticket') {
        return {
            userId: nameParts[1],
            category: nameParts[2] || 'general'
        };
    }
    return null;
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