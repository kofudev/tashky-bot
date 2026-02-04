/**
 * ====================================
 * COMMANDE: /ban
 * ====================================
 * 
 * Bannir un membre du serveur avec raison
 * Logs automatiques et gestion des erreurs
 * 
 * @author Kofu (github.com/kofudev)
 * @category Moderation
 * ====================================
 */

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const KofuSignature = require('../../utils/kofu-signature');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('🔨 Bannir un membre du serveur')
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('Membre à bannir')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('raison')
                .setDescription('Raison du bannissement')
                .setRequired(false)
                .setMaxLength(512)
        )
        .addIntegerOption(option =>
            option.setName('supprimer_messages')
                .setDescription('Supprimer les messages des X derniers jours (0-7)')
                .setRequired(false)
                .setMinValue(0)
                .setMaxValue(7)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    
    category: 'moderation',
    cooldown: 3,
    guildOnly: true,
    permissions: ['BanMembers'],
    botPermissions: ['BanMembers'],
    
    /**
     * Exécution de la commande ban
     * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
     * @author Kofu
     */
    async execute(interaction) {
        const targetUser = interaction.options.getUser('utilisateur');
        const reason = interaction.options.getString('raison') || 'Aucune raison spécifiée';
        const deleteMessageDays = interaction.options.getInteger('supprimer_messages') || 0;
        
        // Vérifications de sécurité
        const securityCheck = await performSecurityChecks(interaction, targetUser);
        if (!securityCheck.success) {
            return interaction.reply({ embeds: [securityCheck.embed], ephemeral: true });
        }
        
        const targetMember = securityCheck.member;
        
        try {
            // Créer l'embed de confirmation
            const confirmEmbed = new EmbedBuilder()
                .setTitle('🔨 Bannissement en cours...')
                .setDescription(`Bannissement de ${targetUser.tag} en cours...`)
                .setColor('#FAA61A')
                .setFooter(KofuSignature.getKofuFooter())
                .setTimestamp();
            
            await interaction.reply({ embeds: [confirmEmbed] });
            
            // Envoyer un MP à l'utilisateur avant le ban (si possible)
            await sendBanNotification(targetUser, interaction.guild, reason, interaction.user);
            
            // Effectuer le bannissement
            await interaction.guild.members.ban(targetUser, {
                reason: `${reason} | Modérateur: ${interaction.user.tag}`,
                deleteMessageDays: deleteMessageDays
            });
            
            // Enregistrer dans la base de données
            await saveBanToDatabase(interaction, targetUser, reason);
            
            // Créer l'embed de succès
            const successEmbed = KofuSignature.createSuccessEmbed(
                'Membre banni avec succès !',
                `**${targetUser.tag}** a été banni du serveur.`
            );
            
            successEmbed.addFields(
                { name: '👤 Utilisateur banni', value: `${targetUser.tag}\n\`${targetUser.id}\``, inline: true },
                { name: '🛡️ Modérateur', value: `${interaction.user.tag}\n\`${interaction.user.id}\``, inline: true },
                { name: '📝 Raison', value: reason, inline: false },
                { name: '🗑️ Messages supprimés', value: `${deleteMessageDays} jour(s)`, inline: true },
                { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            );
            
            await interaction.editReply({ embeds: [successEmbed] });
            
            // Logger l'action
            interaction.client.logger.logModeration(
                interaction.user,
                'BAN',
                targetUser,
                {
                    guild: interaction.guild,
                    reason: reason,
                    deleteMessageDays: deleteMessageDays
                }
            );
            
            // Envoyer dans le salon de logs si configuré
            await sendToModerationLogs(interaction, targetUser, reason, deleteMessageDays);
            
            console.log(`🔨 [Kofu] ${targetUser.tag} banni de ${interaction.guild.name} par ${interaction.user.tag}`);
            
        } catch (error) {
            console.error('❌ [Kofu] Erreur lors du bannissement:', error);
            
            const errorEmbed = KofuSignature.createErrorEmbed(
                'Erreur lors du bannissement !',
                `Impossible de bannir ${targetUser.tag}.\n\n**Erreur:** \`${error.message}\``
            );
            
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};

/**
 * Effectuer les vérifications de sécurité
 * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
 * @param {User} targetUser - L'utilisateur cible
 * @returns {object} Résultat des vérifications
 * @author Kofu
 */
async function performSecurityChecks(interaction, targetUser) {
    // Vérifier que l'utilisateur n'essaie pas de se bannir lui-même
    if (targetUser.id === interaction.user.id) {
        return {
            success: false,
            embed: KofuSignature.createErrorEmbed(
                'Action impossible !',
                'Tu ne peux pas te bannir toi-même ! 🤔'
            )
        };
    }
    
    // Vérifier que ce n'est pas le bot
    if (targetUser.id === interaction.client.user.id) {
        return {
            success: false,
            embed: KofuSignature.createErrorEmbed(
                'Action impossible !',
                'Je ne peux pas me bannir moi-même ! 😅'
            )
        };
    }
    
    // Vérifier que l'utilisateur est sur le serveur
    let targetMember;
    try {
        targetMember = await interaction.guild.members.fetch(targetUser.id);
    } catch (error) {
        // L'utilisateur n'est pas sur le serveur, on peut quand même le bannir
        return { success: true, member: null };
    }
    
    // Vérifier que l'utilisateur n'est pas le propriétaire du serveur
    if (targetMember.id === interaction.guild.ownerId) {
        return {
            success: false,
            embed: KofuSignature.createErrorEmbed(
                'Action impossible !',
                'Tu ne peux pas bannir le propriétaire du serveur !'
            )
        };
    }
    
    // Vérifier la hiérarchie des rôles
    if (targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
        return {
            success: false,
            embed: KofuSignature.createErrorEmbed(
                'Hiérarchie insuffisante !',
                'Tu ne peux pas bannir quelqu\'un ayant un rôle égal ou supérieur au tien !'
            )
        };
    }
    
    // Vérifier que le bot peut bannir cet utilisateur
    if (targetMember.roles.highest.position >= interaction.guild.members.me.roles.highest.position) {
        return {
            success: false,
            embed: KofuSignature.createErrorEmbed(
                'Hiérarchie insuffisante !',
                'Je ne peux pas bannir quelqu\'un ayant un rôle égal ou supérieur au mien !'
            )
        };
    }
    
    return { success: true, member: targetMember };
}

/**
 * Envoyer une notification de ban à l'utilisateur
 * @param {User} user - L'utilisateur à notifier
 * @param {Guild} guild - Le serveur
 * @param {string} reason - Raison du ban
 * @param {User} moderator - Le modérateur
 * @author Kofu
 */
async function sendBanNotification(user, guild, reason, moderator) {
    try {
        const notificationEmbed = new EmbedBuilder()
            .setTitle('🔨 Tu as été banni !')
            .setDescription(`Tu as été banni du serveur **${guild.name}**.`)
            .setColor('#F04747')
            .addFields(
                { name: '🏛️ Serveur', value: guild.name, inline: true },
                { name: '🛡️ Modérateur', value: moderator.tag, inline: true },
                { name: '📝 Raison', value: reason, inline: false },
                { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
            )
            .setFooter(KofuSignature.getKofuFooter())
            .setTimestamp();
        
        await user.send({ embeds: [notificationEmbed] });
        console.log(`📨 [Kofu] Notification de ban envoyée à ${user.tag}`);
        
    } catch (error) {
        console.log(`⚠️ [Kofu] Impossible d'envoyer la notification à ${user.tag}: ${error.message}`);
    }
}

/**
 * Sauvegarder le ban dans la base de données
 * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
 * @param {User} targetUser - L'utilisateur banni
 * @param {string} reason - Raison du ban
 * @author Kofu
 */
async function saveBanToDatabase(interaction, targetUser, reason) {
    try {
        const banData = {
            userId: targetUser.id,
            userTag: targetUser.tag,
            guildId: interaction.guild.id,
            guildName: interaction.guild.name,
            moderatorId: interaction.user.id,
            moderatorTag: interaction.user.tag,
            reason: reason,
            timestamp: new Date(),
            type: 'ban'
        };
        
        // Ajouter à la liste des bans
        const bansData = interaction.client.database.read('sanctions/bans.json') || { bans: [], lastUpdated: new Date() };
        bansData.bans.push(banData);
        bansData.lastUpdated = new Date();
        
        interaction.client.database.write('sanctions/bans.json', bansData);
        
        // Mettre à jour les stats de l'utilisateur
        const userData = interaction.client.database.getUser(targetUser.id);
        userData.moderation.totalBans++;
        userData.moderation.bans.push(banData);
        userData.updatedAt = new Date();
        
        interaction.client.database.setUser(targetUser.id, userData);
        
        console.log(`💾 [Kofu] Ban sauvegardé en base de données pour ${targetUser.tag}`);
        
    } catch (error) {
        console.error('❌ [Kofu] Erreur sauvegarde ban:', error);
    }
}

/**
 * Envoyer le log dans le salon de modération
 * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
 * @param {User} targetUser - L'utilisateur banni
 * @param {string} reason - Raison du ban
 * @param {number} deleteMessageDays - Jours de messages supprimés
 * @author Kofu
 */
async function sendToModerationLogs(interaction, targetUser, reason, deleteMessageDays) {
    try {
        const guildData = interaction.client.database.getGuild(interaction.guild.id);
        const logChannelId = guildData.logs.moderation;
        
        if (!logChannelId) return;
        
        const logChannel = interaction.guild.channels.cache.get(logChannelId);
        if (!logChannel) return;
        
        const logEmbed = new EmbedBuilder()
            .setTitle('🔨 Membre Banni')
            .setColor('#F04747')
            .addFields(
                { name: '👤 Utilisateur', value: `${targetUser.tag}\n\`${targetUser.id}\``, inline: true },
                { name: '🛡️ Modérateur', value: `${interaction.user.tag}\n\`${interaction.user.id}\``, inline: true },
                { name: '📝 Raison', value: reason, inline: false },
                { name: '🗑️ Messages supprimés', value: `${deleteMessageDays} jour(s)`, inline: true },
                { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .setFooter(KofuSignature.getKofuFooter())
            .setTimestamp();
        
        await logChannel.send({ embeds: [logEmbed] });
        console.log(`📝 [Kofu] Log de ban envoyé dans ${logChannel.name}`);
        
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