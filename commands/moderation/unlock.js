/**
 * ====================================
 * COMMANDE: /unlock
 * ====================================
 * 
 * Déverrouiller un salon
 * Permettre aux membres d'envoyer des messages
 * 
 * @author Kofu (github.com/kofudev)
 * @category Moderation
 * ====================================
 */

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const KofuSignature = require('../../utils/kofu-signature');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('🔓 Déverrouiller un salon')
        .addChannelOption(option =>
            option.setName('salon')
                .setDescription('Salon à déverrouiller (salon actuel par défaut)')
                .setRequired(false)
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildNews, ChannelType.GuildForum)
        )
        .addStringOption(option =>
            option.setName('raison')
                .setDescription('Raison du déverrouillage')
                .setRequired(false)
                .setMaxLength(512)
        )
        .addBooleanOption(option =>
            option.setName('annoncer')
                .setDescription('Annoncer le déverrouillage dans le salon (défaut: true)')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    
    category: 'moderation',
    cooldown: 3,
    guildOnly: true,
    permissions: ['ManageChannels'],
    botPermissions: ['ManageChannels'],
    
    /**
     * Exécution de la commande unlock
     * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
     * @author Kofu
     */
    async execute(interaction) {
        const targetChannel = interaction.options.getChannel('salon') || interaction.channel;
        const reason = interaction.options.getString('raison') || 'Aucune raison spécifiée';
        const announce = interaction.options.getBoolean('annoncer') ?? true;
        
        // Vérifications de sécurité
        const securityCheck = performSecurityChecks(interaction, targetChannel);
        if (!securityCheck.success) {
            return interaction.reply({ embeds: [securityCheck.embed], ephemeral: true });
        }
        
        try {
            // Vérifier si le salon est verrouillé
            const everyoneRole = interaction.guild.roles.everyone;
            const currentPermissions = targetChannel.permissionOverwrites.cache.get(everyoneRole.id);
            
            if (!currentPermissions || !currentPermissions.deny.has(PermissionFlagsBits.SendMessages)) {
                const errorEmbed = KofuSignature.createErrorEmbed(
                    'Salon pas verrouillé !',
                    `Le salon ${targetChannel} n'est pas actuellement verrouillé.`
                );
                return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
            
            // Créer l'embed de confirmation
            const confirmEmbed = new EmbedBuilder()
                .setTitle('🔓 Déverrouillage en cours...')
                .setDescription(`Déverrouillage de ${targetChannel} en cours...`)
                .setColor('#43B581')
                .setFooter(KofuSignature.getKofuFooter())
                .setTimestamp();
            
            await interaction.reply({ embeds: [confirmEmbed] });
            
            // Récupérer les permissions originales depuis la base de données
            const originalPermissions = await getOriginalPermissions(interaction.client, targetChannel.id);
            
            // Déverrouiller le salon
            if (originalPermissions) {
                // Restaurer les permissions originales
                await targetChannel.permissionOverwrites.edit(everyoneRole, {
                    SendMessages: null,
                    SendMessagesInThreads: null,
                    CreatePublicThreads: null,
                    CreatePrivateThreads: null
                }, {
                    reason: `[UNLOCK] ${reason} | Modérateur: ${interaction.user.tag}`
                });
            } else {
                // Simplement retirer les restrictions
                await targetChannel.permissionOverwrites.edit(everyoneRole, {
                    SendMessages: null,
                    SendMessagesInThreads: null,
                    CreatePublicThreads: null,
                    CreatePrivateThreads: null
                }, {
                    reason: `[UNLOCK] ${reason} | Modérateur: ${interaction.user.tag}`
                });
            }
            
            // Mettre à jour la base de données
            await updateLockInDatabase(interaction, targetChannel, reason);
            
            // Créer l'embed de succès
            const successEmbed = KofuSignature.createSuccessEmbed(
                'Salon déverrouillé !',
                `${targetChannel} a été déverrouillé avec succès.`
            );
            
            successEmbed.addFields(
                { name: '📺 Salon', value: `${targetChannel.name}\n\`${targetChannel.id}\``, inline: true },
                { name: '🛡️ Modérateur', value: `${interaction.user.tag}\n\`${interaction.user.id}\``, inline: true },
                { name: '📝 Raison', value: reason, inline: false },
                { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                { name: '🔓 Information', value: 'Les membres peuvent maintenant envoyer des messages dans ce salon.', inline: false }
            );
            
            await interaction.editReply({ embeds: [successEmbed] });
            
            // Annoncer dans le salon si demandé
            if (announce && targetChannel.id !== interaction.channel.id) {
                await sendUnlockAnnouncement(targetChannel, reason, interaction.user);
            }
            
            // Logger l'action
            interaction.client.logger.logModeration(
                interaction.user,
                'UNLOCK',
                null,
                {
                    guild: interaction.guild,
                    channel: targetChannel,
                    reason: reason
                }
            );
            
            // Envoyer dans le salon de logs si configuré
            await sendToModerationLogs(interaction, targetChannel, reason);
            
            console.log(`🔓 [Kofu] Salon #${targetChannel.name} déverrouillé sur ${interaction.guild.name} par ${interaction.user.tag}`);
            
        } catch (error) {
            console.error('❌ [Kofu] Erreur lors du déverrouillage:', error);
            
            const errorEmbed = KofuSignature.createErrorEmbed(
                'Erreur lors du déverrouillage !',
                `Impossible de déverrouiller ${targetChannel}.\n\n**Erreur:** \`${error.message}\``
            );
            
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};

/**
 * Effectuer les vérifications de sécurité
 * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
 * @param {Channel} targetChannel - Le salon cible
 * @returns {object} Résultat des vérifications
 * @author Kofu
 */
function performSecurityChecks(interaction, targetChannel) {
    // Vérifier que le salon est dans le même serveur
    if (targetChannel.guild.id !== interaction.guild.id) {
        return {
            success: false,
            embed: KofuSignature.createErrorEmbed(
                'Salon invalide !',
                'Tu ne peux pas déverrouiller un salon d\'un autre serveur !'
            )
        };
    }
    
    // Vérifier le type de salon
    const validChannelTypes = [ChannelType.GuildText, ChannelType.GuildNews, ChannelType.GuildForum];
    if (!validChannelTypes.includes(targetChannel.type)) {
        return {
            success: false,
            embed: KofuSignature.createErrorEmbed(
                'Type de salon invalide !',
                'Seuls les salons textuels, d\'annonces ou de forum peuvent être déverrouillés.'
            )
        };
    }
    
    // Vérifier que l'utilisateur a les permissions sur ce salon
    if (!targetChannel.permissionsFor(interaction.member).has(PermissionFlagsBits.ManageChannels)) {
        return {
            success: false,
            embed: KofuSignature.createErrorEmbed(
                'Permissions insuffisantes !',
                `Tu n'as pas la permission de gérer le salon ${targetChannel} !`
            )
        };
    }
    
    // Vérifier que le bot a les permissions sur ce salon
    if (!targetChannel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.ManageChannels)) {
        return {
            success: false,
            embed: KofuSignature.createErrorEmbed(
                'Permissions insuffisantes !',
                `Je n'ai pas la permission de gérer le salon ${targetChannel} !`
            )
        };
    }
    
    return { success: true };
}

/**
 * Récupérer les permissions originales depuis la base de données
 * @param {Client} client - Le client Discord
 * @param {string} channelId - ID du salon
 * @returns {object|null} Permissions originales ou null
 * @author Kofu
 */
async function getOriginalPermissions(client, channelId) {
    try {
        const locksData = client.database.read('channels/locks.json') || { locks: [], lastUpdated: new Date() };
        
        // Trouver le verrouillage actif le plus récent pour ce salon
        const activeLock = locksData.locks
            .filter(l => l.channelId === channelId && l.active)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
        
        return activeLock ? activeLock.originalPermissions : null;
        
    } catch (error) {
        console.error('❌ [Kofu] Erreur récupération permissions originales:', error);
        return null;
    }
}

/**
 * Envoyer l'annonce de déverrouillage dans le salon
 * @param {Channel} channel - Le salon déverrouillé
 * @param {string} reason - Raison du déverrouillage
 * @param {User} moderator - Le modérateur
 * @author Kofu
 */
async function sendUnlockAnnouncement(channel, reason, moderator) {
    try {
        const announcementEmbed = new EmbedBuilder()
            .setTitle('🔓 Salon Déverrouillé')
            .setDescription('Ce salon a été déverrouillé ! Vous pouvez maintenant envoyer des messages.')
            .setColor('#43B581')
            .addFields(
                { name: '🛡️ Modérateur', value: moderator.tag, inline: true },
                { name: '📝 Raison', value: reason, inline: true },
                { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                { name: '✅ Information', value: 'N\'oubliez pas de respecter les règles du serveur !', inline: false }
            )
            .setFooter(KofuSignature.getKofuFooter())
            .setTimestamp();
        
        await channel.send({ embeds: [announcementEmbed] });
        console.log(`📢 [Kofu] Annonce de déverrouillage envoyée dans #${channel.name}`);
        
    } catch (error) {
        console.log(`⚠️ [Kofu] Impossible d'envoyer l'annonce dans #${channel.name}: ${error.message}`);
    }
}

/**
 * Mettre à jour le verrouillage dans la base de données
 * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
 * @param {Channel} targetChannel - Le salon déverrouillé
 * @param {string} reason - Raison du déverrouillage
 * @author Kofu
 */
async function updateLockInDatabase(interaction, targetChannel, reason) {
    try {
        // Marquer le verrouillage comme inactif dans la base de données
        const locksData = interaction.client.database.read('channels/locks.json') || { locks: [], lastUpdated: new Date() };
        
        // Trouver le verrouillage actif le plus récent pour ce salon
        const activeLock = locksData.locks
            .filter(l => l.channelId === targetChannel.id && l.active)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
        
        if (activeLock) {
            activeLock.active = false;
            activeLock.unlockDate = new Date();
            activeLock.unlockedBy = interaction.user.id;
            activeLock.unlockReason = reason;
        }
        
        locksData.lastUpdated = new Date();
        interaction.client.database.write('channels/locks.json', locksData);
        
        console.log(`💾 [Kofu] Déverrouillage sauvegardé en base de données pour #${targetChannel.name}`);
        
    } catch (error) {
        console.error('❌ [Kofu] Erreur sauvegarde déverrouillage:', error);
    }
}

/**
 * Envoyer le log dans le salon de modération
 * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
 * @param {Channel} targetChannel - Le salon déverrouillé
 * @param {string} reason - Raison du déverrouillage
 * @author Kofu
 */
async function sendToModerationLogs(interaction, targetChannel, reason) {
    try {
        const guildData = interaction.client.database.getGuild(interaction.guild.id);
        const logChannelId = guildData.logs.moderation;
        
        if (!logChannelId) return;
        
        const logChannel = interaction.guild.channels.cache.get(logChannelId);
        if (!logChannel) return;
        
        const logEmbed = new EmbedBuilder()
            .setTitle('🔓 Salon Déverrouillé')
            .setColor('#43B581')
            .addFields(
                { name: '📺 Salon', value: `${targetChannel.name}\n\`${targetChannel.id}\``, inline: true },
                { name: '🛡️ Modérateur', value: `${interaction.user.tag}\n\`${interaction.user.id}\``, inline: true },
                { name: '📝 Raison', value: reason, inline: false },
                { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
            .setFooter(KofuSignature.getKofuFooter())
            .setTimestamp();
        
        await logChannel.send({ embeds: [logEmbed] });
        console.log(`📝 [Kofu] Log de déverrouillage envoyé dans ${logChannel.name}`);
        
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