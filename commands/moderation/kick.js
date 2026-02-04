/**
 * ====================================
 * COMMANDE: /kick
 * ====================================
 * 
 * Expulser un membre du serveur avec raison
 * Logs automatiques et notifications
 * 
 * @author Kofu (github.com/kofudev)
 * @category Moderation
 * ====================================
 */

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const KofuSignature = require('../../utils/kofu-signature');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('👢 Expulser un membre du serveur')
        .addUserOption(option =>
            option.setName('membre')
                .setDescription('Membre à expulser')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('raison')
                .setDescription('Raison de l\'expulsion')
                .setRequired(false)
                .setMaxLength(512)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    
    category: 'moderation',
    cooldown: 3,
    guildOnly: true,
    permissions: ['KickMembers'],
    botPermissions: ['KickMembers'],
    
    /**
     * Exécution de la commande kick
     * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
     * @author Kofu
     */
    async execute(interaction) {
        const targetUser = interaction.options.getUser('membre');
        const reason = interaction.options.getString('raison') || 'Aucune raison spécifiée';
        
        // Vérifications de sécurité
        const securityCheck = await performSecurityChecks(interaction, targetUser);
        if (!securityCheck.success) {
            return interaction.reply({ embeds: [securityCheck.embed], ephemeral: true });
        }
        
        const targetMember = securityCheck.member;
        
        try {
            // Créer l'embed de confirmation
            const confirmEmbed = new EmbedBuilder()
                .setTitle('👢 Expulsion en cours...')
                .setDescription(`Expulsion de ${targetUser.tag} en cours...`)
                .setColor('#FAA61A')
                .setFooter(KofuSignature.getKofuFooter())
                .setTimestamp();
            
            await interaction.reply({ embeds: [confirmEmbed] });
            
            // Envoyer un MP à l'utilisateur avant le kick (si possible)
            await sendKickNotification(targetUser, interaction.guild, reason, interaction.user);
            
            // Effectuer l'expulsion
            await targetMember.kick(`${reason} | Modérateur: ${interaction.user.tag}`);
            
            // Enregistrer dans la base de données
            await saveKickToDatabase(interaction, targetUser, reason);
            
            // Créer l'embed de succès
            const successEmbed = KofuSignature.createSuccessEmbed(
                'Membre expulsé avec succès !',
                `**${targetUser.tag}** a été expulsé du serveur.`
            );
            
            successEmbed.addFields(
                { name: '👤 Utilisateur expulsé', value: `${targetUser.tag}\n\`${targetUser.id}\``, inline: true },
                { name: '🛡️ Modérateur', value: `${interaction.user.tag}\n\`${interaction.user.id}\``, inline: true },
                { name: '📝 Raison', value: reason, inline: false },
                { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                { name: '🔄 Peut revenir', value: 'Oui (avec une nouvelle invitation)', inline: true }
            );
            
            await interaction.editReply({ embeds: [successEmbed] });
            
            // Logger l'action
            interaction.client.logger.logModeration(
                interaction.user,
                'KICK',
                targetUser,
                {
                    guild: interaction.guild,
                    reason: reason
                }
            );
            
            // Envoyer dans le salon de logs si configuré
            await sendToModerationLogs(interaction, targetUser, reason);
            
            console.log(`👢 [Kofu] ${targetUser.tag} expulsé de ${interaction.guild.name} par ${interaction.user.tag}`);
            
        } catch (error) {
            console.error('❌ [Kofu] Erreur lors de l\'expulsion:', error);
            
            const errorEmbed = KofuSignature.createErrorEmbed(
                'Erreur lors de l\'expulsion !',
                `Impossible d'expulser ${targetUser.tag}.\n\n**Erreur:** \`${error.message}\``
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
    // Vérifier que l'utilisateur n'essaie pas de s'expulser lui-même
    if (targetUser.id === interaction.user.id) {
        return {
            success: false,
            embed: KofuSignature.createErrorEmbed(
                'Action impossible !',
                'Tu ne peux pas t\'expulser toi-même ! 🤔'
            )
        };
    }
    
    // Vérifier que ce n'est pas le bot
    if (targetUser.id === interaction.client.user.id) {
        return {
            success: false,
            embed: KofuSignature.createErrorEmbed(
                'Action impossible !',
                'Je ne peux pas m\'expulser moi-même ! 😅'
            )
        };
    }
    
    // Vérifier que l'utilisateur est sur le serveur
    let targetMember;
    try {
        targetMember = await interaction.guild.members.fetch(targetUser.id);
    } catch (error) {
        return {
            success: false,
            embed: KofuSignature.createErrorEmbed(
                'Utilisateur introuvable !',
                'Cet utilisateur n\'est pas sur le serveur.'
            )
        };
    }
    
    // Vérifier que l'utilisateur n'est pas le propriétaire du serveur
    if (targetMember.id === interaction.guild.ownerId) {
        return {
            success: false,
            embed: KofuSignature.createErrorEmbed(
                'Action impossible !',
                'Tu ne peux pas expulser le propriétaire du serveur !'
            )
        };
    }
    
    // Vérifier la hiérarchie des rôles
    if (targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
        return {
            success: false,
            embed: KofuSignature.createErrorEmbed(
                'Hiérarchie insuffisante !',
                'Tu ne peux pas expulser quelqu\'un ayant un rôle égal ou supérieur au tien !'
            )
        };
    }
    
    // Vérifier que le bot peut expulser cet utilisateur
    if (targetMember.roles.highest.position >= interaction.guild.members.me.roles.highest.position) {
        return {
            success: false,
            embed: KofuSignature.createErrorEmbed(
                'Hiérarchie insuffisante !',
                'Je ne peux pas expulser quelqu\'un ayant un rôle égal ou supérieur au mien !'
            )
        };
    }
    
    return { success: true, member: targetMember };
}

/**
 * Envoyer une notification de kick à l'utilisateur
 * @param {User} user - L'utilisateur à notifier
 * @param {Guild} guild - Le serveur
 * @param {string} reason - Raison du kick
 * @param {User} moderator - Le modérateur
 * @author Kofu
 */
async function sendKickNotification(user, guild, reason, moderator) {
    try {
        const notificationEmbed = new EmbedBuilder()
            .setTitle('👢 Tu as été expulsé !')
            .setDescription(`Tu as été expulsé du serveur **${guild.name}**.`)
            .setColor('#FAA61A')
            .addFields(
                { name: '🏛️ Serveur', value: guild.name, inline: true },
                { name: '🛡️ Modérateur', value: moderator.tag, inline: true },
                { name: '📝 Raison', value: reason, inline: false },
                { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
                { name: '🔄 Information', value: 'Tu peux revenir sur le serveur avec une nouvelle invitation.', inline: false }
            )
            .setFooter(KofuSignature.getKofuFooter())
            .setTimestamp();
        
        await user.send({ embeds: [notificationEmbed] });
        console.log(`📨 [Kofu] Notification de kick envoyée à ${user.tag}`);
        
    } catch (error) {
        console.log(`⚠️ [Kofu] Impossible d'envoyer la notification à ${user.tag}: ${error.message}`);
    }
}

/**
 * Sauvegarder le kick dans la base de données
 * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
 * @param {User} targetUser - L'utilisateur expulsé
 * @param {string} reason - Raison du kick
 * @author Kofu
 */
async function saveKickToDatabase(interaction, targetUser, reason) {
    try {
        const kickData = {
            userId: targetUser.id,
            userTag: targetUser.tag,
            guildId: interaction.guild.id,
            guildName: interaction.guild.name,
            moderatorId: interaction.user.id,
            moderatorTag: interaction.user.tag,
            reason: reason,
            timestamp: new Date(),
            type: 'kick'
        };
        
        // Ajouter à la liste des kicks (on peut utiliser le même fichier que les bans)
        const sanctionsData = interaction.client.database.read('sanctions/bans.json') || { bans: [], lastUpdated: new Date() };
        sanctionsData.bans.push(kickData); // On stocke les kicks avec les bans pour simplifier
        sanctionsData.lastUpdated = new Date();
        
        interaction.client.database.write('sanctions/bans.json', sanctionsData);
        
        // Mettre à jour les stats de l'utilisateur
        const userData = interaction.client.database.getUser(targetUser.id);
        userData.moderation.kicks = userData.moderation.kicks || [];
        userData.moderation.totalKicks = (userData.moderation.totalKicks || 0) + 1;
        userData.moderation.kicks.push(kickData);
        userData.updatedAt = new Date();
        
        interaction.client.database.setUser(targetUser.id, userData);
        
        console.log(`💾 [Kofu] Kick sauvegardé en base de données pour ${targetUser.tag}`);
        
    } catch (error) {
        console.error('❌ [Kofu] Erreur sauvegarde kick:', error);
    }
}

/**
 * Envoyer le log dans le salon de modération
 * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
 * @param {User} targetUser - L'utilisateur expulsé
 * @param {string} reason - Raison du kick
 * @author Kofu
 */
async function sendToModerationLogs(interaction, targetUser, reason) {
    try {
        const guildData = interaction.client.database.getGuild(interaction.guild.id);
        const logChannelId = guildData.logs.moderation;
        
        if (!logChannelId) return;
        
        const logChannel = interaction.guild.channels.cache.get(logChannelId);
        if (!logChannel) return;
        
        const logEmbed = new EmbedBuilder()
            .setTitle('👢 Membre Expulsé')
            .setColor('#FAA61A')
            .addFields(
                { name: '👤 Utilisateur', value: `${targetUser.tag}\n\`${targetUser.id}\``, inline: true },
                { name: '🛡️ Modérateur', value: `${interaction.user.tag}\n\`${interaction.user.id}\``, inline: true },
                { name: '📝 Raison', value: reason, inline: false },
                { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                { name: '🔄 Peut revenir', value: 'Oui', inline: true }
            )
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .setFooter(KofuSignature.getKofuFooter())
            .setTimestamp();
        
        await logChannel.send({ embeds: [logEmbed] });
        console.log(`📝 [Kofu] Log de kick envoyé dans ${logChannel.name}`);
        
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