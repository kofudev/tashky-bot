/**
 * ====================================
 * GESTIONNAIRE: Boutons et Menus de Tickets
 * ====================================
 * 
 * Gestion AVANCÉE des interactions de tickets
 * Système professionnel complet comme Ticket Tool
 * 
 * @author Kofu (github.com/kofudev)
 * ====================================
 */

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, StringSelectMenuBuilder, PermissionFlagsBits } = require('discord.js');
const EmbedFactory = require('../../utils/embed');
const colors = require('../../config/colors');

/**
 * Gérer les interactions des tickets - SYSTÈME AVANCÉ !
 * @param {Interaction} interaction - L'interaction Discord
 * @author Kofu
 */
async function handleTicketButtons(interaction) {
    const customId = interaction.customId;
    
    // Menu de sélection de catégorie
    if (customId === 'ticket_category_select') {
        await handleCategorySelect(interaction);
        return;
    }
    
    // Boutons de gestion
    if (customId === 'confirm_close_ticket') {
        await handleConfirmClose(interaction);
        return;
    }
    
    if (customId === 'cancel_close_ticket') {
        await interaction.update({
            embeds: [EmbedFactory.info('❌ Annulé', 'La fermeture du ticket a été annulée.')],
            components: []
        });
        return;
    }
    
    // Boutons du panel de contrôle
    if (customId.startsWith('ticket_')) {
        await handleTicketAction(interaction);
        return;
    }
}

/**
 * Gérer la sélection de catégorie
 * @param {StringSelectMenuInteraction} interaction - L'interaction de menu
 * @author Kofu
 */
async function handleCategorySelect(interaction) {
    const categoryId = interaction.values[0];
    const guildData = interaction.client.database.getGuild(interaction.guild.id);
    
    // Vérifier si le système est activé
    if (!guildData.tickets?.enabled) {
        return interaction.reply({
            embeds: [EmbedFactory.error(
                'Système désactivé',
                'Le système de tickets n\'est pas configuré sur ce serveur.'
            )],
            ephemeral: true
        });
    }
    
    // Vérifier la limite de tickets
    const maxTickets = guildData.tickets.maxTickets || 3;
    const existingTickets = interaction.guild.channels.cache.filter(channel => 
        channel.name.includes(`ticket-${interaction.user.id}`) && 
        channel.parentId === guildData.tickets.category
    );
    
    if (existingTickets.size >= maxTickets) {
        const ticketsList = existingTickets.map(ticket => `• ${ticket}`).join('\n');
        return interaction.reply({
            embeds: [EmbedFactory.error(
                '🚫 Limite atteinte',
                `Vous avez atteint la limite de **${maxTickets} ticket(s)** simultané(s).\n\n` +
                `**Vos tickets ouverts :**\n${ticketsList}\n\n` +
                `Fermez un ticket existant avant d'en créer un nouveau.`
            )],
            ephemeral: true
        });
    }
    
    await interaction.deferReply({ ephemeral: true });
    
    try {
        // Trouver la catégorie sélectionnée
        const category = guildData.tickets.categories.find(cat => cat.id === categoryId);
        if (!category) {
            throw new Error('Catégorie introuvable');
        }
        
        // Créer ou récupérer la catégorie Discord
        let discordCategory = interaction.guild.channels.cache.get(guildData.tickets.category);
        if (!discordCategory) {
            discordCategory = await interaction.guild.channels.create({
                name: '🎫・TICKETS',
                type: ChannelType.GuildCategory,
                permissionOverwrites: [
                    {
                        id: interaction.guild.roles.everyone,
                        deny: ['ViewChannel']
                    },
                    {
                        id: interaction.client.user.id,
                        allow: ['ViewChannel', 'ManageChannels', 'SendMessages', 'EmbedLinks']
                    }
                ]
            });
            
            guildData.tickets.category = discordCategory.id;
            interaction.client.database.setGuild(interaction.guild.id, guildData);
        }
        
        // Générer un ID unique pour le ticket
        const ticketId = Date.now().toString().slice(-6);
        const channelName = `ticket-${interaction.user.id}-${categoryId}-${ticketId}`;
        
        // Permissions du salon
        const permissions = [
            {
                id: interaction.guild.roles.everyone,
                deny: ['ViewChannel']
            },
            {
                id: interaction.user.id,
                allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'AttachFiles', 'EmbedLinks', 'UseExternalEmojis']
            },
            {
                id: interaction.client.user.id,
                allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'ManageChannels', 'ManageMessages', 'EmbedLinks']
            }
        ];
        
        // Ajouter les rôles staff
        if (guildData.tickets.staffRoles) {
            guildData.tickets.staffRoles.forEach(roleId => {
                const role = interaction.guild.roles.cache.get(roleId);
                if (role) {
                    permissions.push({
                        id: roleId,
                        allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'ManageMessages', 'EmbedLinks']
                    });
                }
            });
        }
        
        // Ajouter automatiquement les admins et modérateurs
        const adminRoles = interaction.guild.roles.cache.filter(role => 
            role.permissions.has(PermissionFlagsBits.Administrator) || 
            role.permissions.has(PermissionFlagsBits.ManageChannels)
        );
        
        adminRoles.forEach(role => {
            if (!permissions.find(p => p.id === role.id)) {
                permissions.push({
                    id: role.id,
                    allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'ManageMessages', 'EmbedLinks']
                });
            }
        });
        
        // Créer le salon de ticket
        const ticketChannel = await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: discordCategory.id,
            topic: `${category.emoji} ${category.name} • Créé par ${interaction.user.tag} • ID: ${ticketId}`,
            permissionOverwrites: permissions
        });
        
        // Créer l'embed du ticket
        const ticketEmbed = EmbedFactory.base()
            .setTitle(`${category.emoji} ${category.name} • Ticket #${ticketId}`)
            .setDescription(
                `**Salut ${interaction.user} !** 👋\n\n` +
                `🎫 **Votre ticket a été créé avec succès**\n` +
                `📋 **Catégorie :** ${category.name}\n` +
                `🆔 **ID :** \`${ticketId}\`\n` +
                `⏰ **Créé le :** <t:${Math.floor(Date.now() / 1000)}:F>\n\n` +
                `**📝 Décrivez votre demande en détail ci-dessous.**\n` +
                `Notre équipe vous répondra dans les plus brefs délais !\n\n` +
                `*Utilisez les boutons ci-dessous pour gérer votre ticket.*`
            )
            .setColor('#8B5CF6') // Violet
            .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
            .addFields(
                {
                    name: '📊 Informations',
                    value: `**Priorité :** 🟡 Normale\n**Statut :** 🟢 Ouvert\n**Assigné :** Aucun`,
                    inline: true
                },
                {
                    name: '🛠️ Actions disponibles',
                    value: `🔒 Fermer le ticket\n✋ Demander une prise en charge\n📄 Générer un transcript`,
                    inline: true
                }
            );
        
        // Boutons de gestion du ticket
        const ticketButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_close')
                    .setLabel('Fermer')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔒'),
                new ButtonBuilder()
                    .setCustomId('ticket_claim')
                    .setLabel('Prendre en charge')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✋'),
                new ButtonBuilder()
                    .setCustomId('ticket_transcript')
                    .setLabel('Transcript')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📄')
            );
        
        const ticketButtons2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_priority')
                    .setLabel('Priorité')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎯'),
                new ButtonBuilder()
                    .setCustomId('ticket_add_user')
                    .setLabel('Ajouter utilisateur')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('➕'),
                new ButtonBuilder()
                    .setCustomId('ticket_info')
                    .setLabel('Informations')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('ℹ️')
            );
        
        // Message d'accueil dans le ticket
        const welcomeMessage = await ticketChannel.send({
            content: `${interaction.user} ${guildData.tickets.staffRoles?.map(id => `<@&${id}>`).join(' ') || ''}`,
            embeds: [ticketEmbed],
            components: [ticketButtons, ticketButtons2]
        });
        
        // Épingler le message d'accueil
        await welcomeMessage.pin();
        
        // Sauvegarder les données du ticket
        const ticketData = {
            id: ticketId,
            channelId: ticketChannel.id,
            userId: interaction.user.id,
            guildId: interaction.guild.id,
            category: categoryId,
            categoryName: category.name,
            priority: 'normal',
            status: 'open',
            claimedBy: null,
            createdAt: new Date().toISOString(),
            welcomeMessageId: welcomeMessage.id
        };
        
        // Sauvegarder dans la base de données
        const activeTickets = interaction.client.database.read('tickets/active.json') || {};
        activeTickets[ticketId] = ticketData;
        interaction.client.database.write('tickets/active.json', activeTickets);
        
        // Réponse de succès
        await interaction.editReply({
            embeds: [EmbedFactory.success(
                '🎫 Ticket créé avec succès !',
                `**Votre ticket ${category.emoji} ${category.name} a été créé !**\n\n` +
                `**Salon :** ${ticketChannel}\n` +
                `**ID :** \`${ticketId}\`\n` +
                `**Catégorie :** ${category.name}\n\n` +
                `🚀 **Rendez-vous dans votre ticket pour décrire votre demande !**`
            )]
        });
        
        // Log dans le salon de logs si configuré
        if (guildData.tickets.logsChannel) {
            const logChannel = interaction.guild.channels.cache.get(guildData.tickets.logsChannel);
            if (logChannel) {
                const logEmbed = EmbedFactory.info(
                    '🎫 Nouveau ticket créé',
                    `**Utilisateur :** ${interaction.user} (${interaction.user.tag})\n` +
                    `**Catégorie :** ${category.emoji} ${category.name}\n` +
                    `**Salon :** ${ticketChannel}\n` +
                    `**ID :** \`${ticketId}\`\n` +
                    `**Créé le :** <t:${Math.floor(Date.now() / 1000)}:F>`
                )
                .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                .setColor('#00FF00');
                
                await logChannel.send({ embeds: [logEmbed] });
            }
        }
        
        console.log(`🎫 [Kofu] Ticket #${ticketId} (${category.name}) créé par ${interaction.user.tag} sur ${interaction.guild.name}`);
        
    } catch (error) {
        console.error('❌ [Kofu] Erreur création ticket:', error);
        
        await interaction.editReply({
            embeds: [EmbedFactory.error(
                'Erreur de création',
                `Impossible de créer le ticket.\n\n**Erreur :** \`${error.message}\`\n\n` +
                `Contactez un administrateur si le problème persiste.`
            )]
        });
    }
}

/**
 * Gérer les actions des boutons de ticket
 * @param {ButtonInteraction} interaction - L'interaction de bouton
 * @author Kofu
 */
async function handleTicketAction(interaction) {
    const action = interaction.customId.replace('ticket_', '');
    
    switch (action) {
        case 'close':
            await handleTicketClose(interaction);
            break;
        case 'claim':
            await handleTicketClaim(interaction);
            break;
        case 'transcript':
            await handleTicketTranscript(interaction);
            break;
        case 'priority':
            await handleTicketPriority(interaction);
            break;
        case 'add_user':
            await handleTicketAddUser(interaction);
            break;
        case 'info':
            await handleTicketInfo(interaction);
            break;
    }
}

/**
 * Fermer un ticket via bouton
 */
async function handleTicketClose(interaction) {
    const confirmEmbed = EmbedFactory.warning(
        '🔒 Fermer le ticket ?',
        `**Êtes-vous sûr de vouloir fermer ce ticket ?**\n\n` +
        `⚠️ **Cette action est irréversible !**\n` +
        `🗑️ **Le salon sera supprimé définitivement**\n\n` +
        `**Cliquez sur "Confirmer" pour fermer le ticket**`
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
 * Confirmer la fermeture du ticket
 */
async function handleConfirmClose(interaction) {
    try {
        await interaction.deferUpdate();
        
        // Générer le transcript
        const messages = await interaction.channel.messages.fetch({ limit: 100 });
        const sortedMessages = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
        
        let transcript = `TRANSCRIPT DU TICKET - ${interaction.channel.name}\n`;
        transcript += `${'='.repeat(60)}\n`;
        transcript += `Généré le: ${new Date().toLocaleString('fr-FR')}\n`;
        transcript += `Salon: #${interaction.channel.name} (${interaction.channel.id})\n`;
        transcript += `Serveur: ${interaction.guild.name} (${interaction.guild.id})\n`;
        transcript += `Fermé par: ${interaction.user.tag} (${interaction.user.id})\n`;
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
        
        // Récupérer les données du ticket
        const activeTickets = interaction.client.database.read('tickets/active.json') || {};
        const ticketData = Object.values(activeTickets).find(ticket => ticket.channelId === interaction.channel.id);
        
        // Sauvegarder dans les tickets fermés
        if (ticketData) {
            const closedTickets = interaction.client.database.read('tickets/closed.json') || {};
            ticketData.status = 'closed';
            ticketData.closedBy = interaction.user.id;
            ticketData.closedAt = new Date().toISOString();
            ticketData.transcript = transcript;
            
            closedTickets[ticketData.id] = ticketData;
            delete activeTickets[ticketData.id];
            
            interaction.client.database.write('tickets/active.json', activeTickets);
            interaction.client.database.write('tickets/closed.json', closedTickets);
        }
        
        // Log dans le salon de logs
        const guildData = interaction.client.database.getGuild(interaction.guild.id);
        if (guildData.tickets?.logsChannel) {
            const logChannel = interaction.guild.channels.cache.get(guildData.tickets.logsChannel);
            if (logChannel) {
                const logEmbed = EmbedFactory.warning(
                    '🔒 Ticket fermé',
                    `**Salon :** ${interaction.channel.name}\n` +
                    `**Fermé par :** ${interaction.user} (${interaction.user.tag})\n` +
                    `**ID :** \`${ticketData?.id || 'Inconnu'}\`\n` +
                    `**Catégorie :** ${ticketData?.categoryName || 'Inconnue'}\n` +
                    `**Fermé le :** <t:${Math.floor(Date.now() / 1000)}:F>`
                )
                .setColor('#FF6B6B');
                
                const transcriptFile = {
                    attachment: Buffer.from(transcript, 'utf8'),
                    name: `transcript-${interaction.channel.name}.txt`
                };
                
                await logChannel.send({
                    embeds: [logEmbed],
                    files: [transcriptFile]
                });
            }
        }
        
        // Message final
        const closeEmbed = EmbedFactory.success(
            '🔒 Ticket fermé avec succès',
            `**Ce ticket a été fermé définitivement.**\n\n` +
            `**Fermé par :** ${interaction.user}\n` +
            `**Le transcript a été sauvegardé.**\n\n` +
            `**Ce salon sera supprimé dans 10 secondes...**`
        );
        
        await interaction.editReply({
            embeds: [closeEmbed],
            components: []
        });
        
        await interaction.channel.send({ embeds: [closeEmbed] });
        
        console.log(`🔒 [Kofu] Ticket ${interaction.channel.name} fermé par ${interaction.user.tag}`);
        
        // Supprimer le salon après 10 secondes
        setTimeout(async () => {
            try {
                await interaction.channel.delete('Ticket fermé');
            } catch (error) {
                console.error('❌ [Kofu] Erreur suppression salon ticket:', error);
            }
        }, 10000);
        
    } catch (error) {
        console.error('❌ [Kofu] Erreur fermeture ticket:', error);
        
        await interaction.editReply({
            embeds: [EmbedFactory.error(
                'Erreur de fermeture',
                `Impossible de fermer le ticket.\n\n**Erreur :** \`${error.message}\``
            )],
            components: []
        });
    }
}

/**
 * Prendre en charge un ticket
 */
async function handleTicketClaim(interaction) {
    const guildData = interaction.client.database.getGuild(interaction.guild.id);
    
    // Vérifier les permissions
    const isStaff = guildData.tickets?.staffRoles?.some(roleId => 
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
            `**${interaction.user} a pris en charge ce ticket !**\n\n` +
            `Le créateur du ticket sera notifié de votre prise en charge.`
        );
        
        await interaction.reply({ embeds: [claimEmbed] });
        
        console.log(`✋ [Kofu] Ticket ${interaction.channel.name} pris en charge par ${interaction.user.tag}`);
        
    } catch (error) {
        await interaction.reply({
            embeds: [EmbedFactory.error(
                'Erreur',
                `Impossible de prendre en charge le ticket.\n\n**Erreur :** \`${error.message}\``
            )],
            ephemeral: true
        });
    }
}

/**
 * Générer un transcript
 */
async function handleTicketTranscript(interaction) {
    const guildData = interaction.client.database.getGuild(interaction.guild.id);
    
    // Vérifier les permissions
    const isStaff = guildData.tickets?.staffRoles?.some(roleId => 
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
            `**Messages :** ${sortedMessages.size}\n` +
            `**Taille :** ${Math.round(transcript.length / 1024)} KB`
        );
        
        await interaction.editReply({
            embeds: [transcriptEmbed],
            files: [transcriptFile]
        });
        
    } catch (error) {
        await interaction.editReply({
            embeds: [EmbedFactory.error(
                'Erreur',
                `Impossible de générer le transcript.\n\n**Erreur :** \`${error.message}\``
            )]
        });
    }
}

/**
 * Gérer la priorité
 */
async function handleTicketPriority(interaction) {
    const priorityMenu = new StringSelectMenuBuilder()
        .setCustomId('ticket_priority_select')
        .setPlaceholder('🎯 Sélectionnez une priorité...')
        .addOptions([
            {
                label: 'Basse',
                description: 'Priorité basse - Non urgent',
                value: 'low',
                emoji: '🟢'
            },
            {
                label: 'Normale',
                description: 'Priorité normale - Standard',
                value: 'normal',
                emoji: '🟡'
            },
            {
                label: 'Haute',
                description: 'Priorité haute - Important',
                value: 'high',
                emoji: '🟠'
            },
            {
                label: 'Critique',
                description: 'Priorité critique - Urgent',
                value: 'critical',
                emoji: '🔴'
            }
        ]);
    
    const row = new ActionRowBuilder().addComponents(priorityMenu);
    
    await interaction.reply({
        embeds: [EmbedFactory.info('🎯 Changer la priorité', 'Sélectionnez le niveau de priorité pour ce ticket :')],
        components: [row],
        ephemeral: true
    });
}

/**
 * Ajouter un utilisateur
 */
async function handleTicketAddUser(interaction) {
    await interaction.reply({
        embeds: [EmbedFactory.info(
            '➕ Ajouter un utilisateur',
            'Utilisez la commande `/ticket add @utilisateur` pour ajouter un utilisateur à ce ticket.'
        )],
        ephemeral: true
    });
}

/**
 * Informations du ticket
 */
async function handleTicketInfo(interaction) {
    const activeTickets = interaction.client.database.read('tickets/active.json') || {};
    const ticketData = Object.values(activeTickets).find(ticket => ticket.channelId === interaction.channel.id);
    
    const infoEmbed = EmbedFactory.info(
        '🎫 Informations du ticket',
        `**Salon :** ${interaction.channel}\n` +
        `**ID :** \`${ticketData?.id || 'Inconnu'}\`\n` +
        `**Catégorie :** ${ticketData?.categoryName || 'Inconnue'}\n` +
        `**Créé le :** <t:${Math.floor(interaction.channel.createdTimestamp / 1000)}:F>\n` +
        `**Créé par :** <@${ticketData?.userId || 'Inconnu'}>\n` +
        `**Priorité :** ${getPriorityDisplay(ticketData?.priority || 'normal')}\n` +
        `**Statut :** ${getStatusDisplay(ticketData?.status || 'open')}\n` +
        `**Pris en charge :** ${ticketData?.claimedBy ? `<@${ticketData.claimedBy}>` : 'Non'}\n` +
        `**Membres :** ${interaction.channel.members.size}`
    );
    
    await interaction.reply({ embeds: [infoEmbed], ephemeral: true });
}

/**
 * Obtenir l'affichage d'une priorité
 */
function getPriorityDisplay(priority) {
    const priorities = {
        low: '🟢 Basse',
        normal: '🟡 Normale',
        high: '🟠 Haute',
        critical: '🔴 Critique'
    };
    return priorities[priority] || '🟡 Normale';
}

/**
 * Obtenir l'affichage d'un statut
 */
function getStatusDisplay(status) {
    const statuses = {
        open: '🟢 Ouvert',
        closed: '🔴 Fermé',
        pending: '🟡 En attente'
    };
    return statuses[status] || '🟢 Ouvert';
}

module.exports = { handleTicketButtons };

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