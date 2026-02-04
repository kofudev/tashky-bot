/**
 * ====================================
 * COMMANDE: /clear
 * ====================================
 * 
 * Supprimer des messages en masse
 * Filtres avancés et logs détaillés
 * 
 * @author Kofu (github.com/kofudev)
 * @category Moderation
 * ====================================
 */

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const KofuSignature = require('../../utils/kofu-signature');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('🗑️ Supprimer des messages en masse')
        .addIntegerOption(option =>
            option.setName('nombre')
                .setDescription('Nombre de messages à supprimer (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        )
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('Supprimer uniquement les messages de cet utilisateur')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('filtre')
                .setDescription('Type de messages à supprimer')
                .setRequired(false)
                .addChoices(
                    { name: '🤖 Bots uniquement', value: 'bots' },
                    { name: '👤 Humains uniquement', value: 'humans' },
                    { name: '🔗 Avec liens', value: 'links' },
                    { name: '📎 Avec fichiers', value: 'files' },
                    { name: '📌 Messages épinglés', value: 'pinned' }
                )
        )
        .addStringOption(option =>
            option.setName('raison')
                .setDescription('Raison de la suppression')
                .setRequired(false)
                .setMaxLength(512)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    
    category: 'moderation',
    cooldown: 5,
    guildOnly: true,
    permissions: ['ManageMessages'],
    botPermissions: ['ManageMessages', 'ReadMessageHistory'],
    
    /**
     * Exécution de la commande clear
     * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
     * @author Kofu
     */
    async execute(interaction) {
        const amount = interaction.options.getInteger('nombre');
        const targetUser = interaction.options.getUser('utilisateur');
        const filter = interaction.options.getString('filtre');
        const reason = interaction.options.getString('raison') || 'Nettoyage des messages';
        
        try {
            // Répondre immédiatement
            const loadingEmbed = new EmbedBuilder()
                .setTitle('🗑️ Suppression en cours...')
                .setDescription(`Suppression de ${amount} message(s) en cours...`)
                .setColor('#FAA61A')
                .setFooter(KofuSignature.getKofuFooter())
                .setTimestamp();
            
            await interaction.reply({ embeds: [loadingEmbed], ephemeral: true });
            
            // Récupérer les messages
            const messages = await interaction.channel.messages.fetch({ limit: amount + 1 }); // +1 pour exclure la commande
            
            // Filtrer les messages selon les critères
            let messagesToDelete = Array.from(messages.values()).slice(1); // Exclure la réponse du bot
            
            // Appliquer les filtres
            messagesToDelete = applyFilters(messagesToDelete, targetUser, filter);
            
            if (messagesToDelete.length === 0) {
                const noMessagesEmbed = KofuSignature.createWarningEmbed(
                    'Aucun message trouvé !',
                    'Aucun message correspondant aux critères n\'a été trouvé.'
                );
                
                return interaction.editReply({ embeds: [noMessagesEmbed] });
            }
            
            // Séparer les messages récents (< 14 jours) des anciens
            const twoWeeksAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
            const recentMessages = messagesToDelete.filter(msg => msg.createdTimestamp > twoWeeksAgo);
            const oldMessages = messagesToDelete.filter(msg => msg.createdTimestamp <= twoWeeksAgo);
            
            let deletedCount = 0;
            
            // Supprimer les messages récents en masse
            if (recentMessages.length > 0) {
                try {
                    const deleted = await interaction.channel.bulkDelete(recentMessages, true);
                    deletedCount += deleted.size;
                } catch (error) {
                    console.error('❌ [Kofu] Erreur suppression en masse:', error);
                }
            }
            
            // Supprimer les anciens messages un par un (plus lent)
            if (oldMessages.length > 0) {
                for (const message of oldMessages) {
                    try {
                        await message.delete();
                        deletedCount++;
                        
                        // Petite pause pour éviter le rate limit
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    } catch (error) {
                        console.error(`❌ [Kofu] Impossible de supprimer le message ${message.id}:`, error);
                    }
                }
            }
            
            // Créer l'embed de succès
            const successEmbed = KofuSignature.createSuccessEmbed(
                'Messages supprimés !',
                `**${deletedCount}** message(s) ont été supprimés avec succès.`
            );
            
            successEmbed.addFields(
                { name: '📊 Messages demandés', value: `\`${amount}\``, inline: true },
                { name: '🗑️ Messages supprimés', value: `\`${deletedCount}\``, inline: true },
                { name: '🛡️ Modérateur', value: `${interaction.user.tag}`, inline: true },
                { name: '📝 Raison', value: reason, inline: false }
            );
            
            // Ajouter des détails sur les filtres
            if (targetUser) {
                successEmbed.addFields({ name: '👤 Utilisateur ciblé', value: targetUser.tag, inline: true });
            }
            
            if (filter) {
                const filterNames = {
                    'bots': '🤖 Bots uniquement',
                    'humans': '👤 Humains uniquement',
                    'links': '🔗 Avec liens',
                    'files': '📎 Avec fichiers',
                    'pinned': '📌 Messages épinglés'
                };
                successEmbed.addFields({ name: '🔍 Filtre appliqué', value: filterNames[filter], inline: true });
            }
            
            await interaction.editReply({ embeds: [successEmbed] });
            
            // Logger l'action
            interaction.client.logger.logModeration(
                interaction.user,
                'CLEAR',
                { id: 'messages', tag: `${deletedCount} messages` },
                {
                    guild: interaction.guild,
                    channel: interaction.channel,
                    reason: reason,
                    amount: amount,
                    deleted: deletedCount,
                    targetUser: targetUser?.tag,
                    filter: filter
                }
            );
            
            // Envoyer dans le salon de logs si configuré
            await sendToModerationLogs(interaction, deletedCount, amount, targetUser, filter, reason);
            
            console.log(`🗑️ [Kofu] ${deletedCount} messages supprimés dans ${interaction.channel.name} par ${interaction.user.tag}`);
            
        } catch (error) {
            console.error('❌ [Kofu] Erreur lors de la suppression:', error);
            
            const errorEmbed = KofuSignature.createErrorEmbed(
                'Erreur lors de la suppression !',
                `Impossible de supprimer les messages.\n\n**Erreur:** \`${error.message}\``
            );
            
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};

/**
 * Appliquer les filtres aux messages
 * @param {Array} messages - Messages à filtrer
 * @param {User} targetUser - Utilisateur cible (optionnel)
 * @param {string} filter - Type de filtre (optionnel)
 * @returns {Array} Messages filtrés
 * @author Kofu
 */
function applyFilters(messages, targetUser, filter) {
    let filteredMessages = [...messages];
    
    // Filtre par utilisateur
    if (targetUser) {
        filteredMessages = filteredMessages.filter(msg => msg.author.id === targetUser.id);
    }
    
    // Filtre par type
    if (filter) {
        switch (filter) {
            case 'bots':
                filteredMessages = filteredMessages.filter(msg => msg.author.bot);
                break;
            case 'humans':
                filteredMessages = filteredMessages.filter(msg => !msg.author.bot);
                break;
            case 'links':
                filteredMessages = filteredMessages.filter(msg => 
                    msg.content.includes('http://') || 
                    msg.content.includes('https://') || 
                    msg.content.includes('www.')
                );
                break;
            case 'files':
                filteredMessages = filteredMessages.filter(msg => msg.attachments.size > 0);
                break;
            case 'pinned':
                filteredMessages = filteredMessages.filter(msg => msg.pinned);
                break;
        }
    }
    
    return filteredMessages;
}

/**
 * Envoyer le log dans le salon de modération
 * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
 * @param {number} deletedCount - Nombre de messages supprimés
 * @param {number} requestedAmount - Nombre de messages demandés
 * @param {User} targetUser - Utilisateur ciblé (optionnel)
 * @param {string} filter - Filtre appliqué (optionnel)
 * @param {string} reason - Raison de la suppression
 * @author Kofu
 */
async function sendToModerationLogs(interaction, deletedCount, requestedAmount, targetUser, filter, reason) {
    try {
        const guildData = interaction.client.database.getGuild(interaction.guild.id);
        const logChannelId = guildData.logs.moderation;
        
        if (!logChannelId) return;
        
        const logChannel = interaction.guild.channels.cache.get(logChannelId);
        if (!logChannel) return;
        
        const logEmbed = new EmbedBuilder()
            .setTitle('🗑️ Messages Supprimés')
            .setColor('#FAA61A')
            .addFields(
                { name: '📺 Salon', value: `${interaction.channel}\n\`${interaction.channel.id}\``, inline: true },
                { name: '🛡️ Modérateur', value: `${interaction.user.tag}\n\`${interaction.user.id}\``, inline: true },
                { name: '📊 Messages', value: `${deletedCount}/${requestedAmount}`, inline: true },
                { name: '📝 Raison', value: reason, inline: false },
                { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
            .setFooter(KofuSignature.getKofuFooter())
            .setTimestamp();
        
        // Ajouter les détails des filtres
        if (targetUser) {
            logEmbed.addFields({ name: '👤 Utilisateur ciblé', value: `${targetUser.tag}\n\`${targetUser.id}\``, inline: true });
        }
        
        if (filter) {
            const filterNames = {
                'bots': '🤖 Bots uniquement',
                'humans': '👤 Humains uniquement',
                'links': '🔗 Avec liens',
                'files': '📎 Avec fichiers',
                'pinned': '📌 Messages épinglés'
            };
            logEmbed.addFields({ name: '🔍 Filtre', value: filterNames[filter], inline: true });
        }
        
        await logChannel.send({ embeds: [logEmbed] });
        console.log(`📝 [Kofu] Log de suppression envoyé dans ${logChannel.name}`);
        
    } catch (error) {
        console.error('❌ [Kofu] Erreur envoi log modération:', error);
    }
}

/**
 * ====================================
 * ✨ Made with ❤️ by Kofu
 * github.com/kofudev
 * ====================================
 */