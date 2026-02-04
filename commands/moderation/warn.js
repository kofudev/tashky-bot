/**
 * ====================================
 * COMMANDE: /warn
 * ====================================
 * 
 * Avertir un membre avec système de comptage
 * Auto-sanctions selon le nombre de warns
 * 
 * @author Kofu (github.com/kofudev)
 * @category Moderation
 * ====================================
 */

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const KofuSignature = require('../../utils/kofu-signature');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('⚠️ Avertir un membre')
        .addUserOption(option =>
            option.setName('membre')
                .setDescription('Membre à avertir')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('raison')
                .setDescription('Raison de l\'avertissement')
                .setRequired(true)
                .setMaxLength(512)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    
    category: 'moderation',
    cooldown: 3,
    guildOnly: true,
    permissions: ['ModerateMembers'],
    
    /**
     * Exécution de la commande warn
     * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
     * @author Kofu
     */
    async execute(interaction) {
        const targetUser = interaction.options.getUser('membre');
        const reason = interaction.options.getString('raison');
        
        // Vérifications de sécurité
        const securityCheck = await performSecurityChecks(interaction, targetUser);
        if (!securityCheck.success) {
            return interaction.reply({ embeds: [securityCheck.embed], ephemeral: true });
        }
        
        const targetMember = securityCheck.member;
        
        try {
            // Ajouter l'avertissement à la base de données
            const warnId = await addWarningToDatabase(interaction, targetUser, reason);
            
            if (!warnId) {
                throw new Error('Impossible de sauvegarder l\'avertissement');
            }
            
            // Récupérer le nombre total de warns de l'utilisateur sur ce serveur
            const userWarnings = interaction.client.database.getWarnings(targetUser.id, interaction.guild.id);
            const warnCount = userWarnings.length;
            
            // Envoyer une notification à l'utilisateur
            await sendWarnNotification(targetUser, interaction.guild, reason, interaction.user, warnCount, warnId);
            
            // Créer l'embed de succès
            const successEmbed = KofuSignature.createSuccessEmbed(
                'Avertissement donné !',
                `**${targetUser.tag}** a reçu un avertissement.`
            );
            
            successEmbed.addFields(
                { name: '👤 Utilisateur averti', value: `${targetUser.tag}\n\`${targetUser.id}\``, inline: true },
                { name: '🛡️ Modérateur', value: `${interaction.user.tag}\n\`${interaction.user.id}\``, inline: true },
                { name: '📝 Raison', value: reason, inline: false },
                { name: '⚠️ Nombre de warns', value: `\`${warnCount}\` avertissement(s)`, inline: true },
                { name: '🆔 ID du warn', value: `\`${warnId}\``, inline: true },
                { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            );
            
            // Ajouter un avertissement sur les auto-sanctions
            if (warnCount >= 3) {
                successEmbed.addFields({
                    name: '🚨 Attention !',
                    value: `Cet utilisateur a maintenant **${warnCount}** avertissement(s). Considérez des sanctions plus sévères.`,
                    inline: false
                });
                successEmbed.setColor('#F04747');
            }
            
            await interaction.reply({ embeds: [successEmbed] });
            
            // Logger l'action
            interaction.client.logger.logModeration(
                interaction.user,
                'WARN',
                targetUser,
                {
                    guild: interaction.guild,
                    reason: reason,
                    warnId: warnId,
                    totalWarns: warnCount
                }
            );
            
            // Envoyer dans le salon de logs si configuré
            await sendToModerationLogs(interaction, targetUser, reason, warnCount, warnId);
            
            // Vérifier si des auto-sanctions doivent être appliquées
            await checkAutoSanctions(interaction, targetMember, warnCount);
            
            console.log(`⚠️ [Kofu] ${targetUser.tag} averti sur ${interaction.guild.name} par ${interaction.user.tag} (${warnCount} warns)`);
            
        } catch (error) {
            console.error('❌ [Kofu] Erreur lors de l\'avertissement:', error);
            
            const errorEmbed = KofuSignature.createErrorEmbed(
                'Erreur lors de l\'avertissement !',
                `Impossible d'avertir ${targetUser.tag}.\n\n**Erreur:** \`${error.message}\``
            );
            
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
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
    // Vérifier que l'utilisateur n'essaie pas de s'avertir lui-même
    if (targetUser.id === interaction.user.id) {
        return {
            success: false,
            embed: KofuSignature.createErrorEmbed(
                'Action impossible !',
                'Tu ne peux pas t\'avertir toi-même ! 🤔'
            )
        };
    }
    
    // Vérifier que ce n'est pas le bot
    if (targetUser.id === interaction.client.user.id) {
        return {
            success: false,
            embed: KofuSignature.createErrorEmbed(
                'Action impossible !',
                'Je ne peux pas m\'avertir moi-même ! 😅'
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
                'Tu ne peux pas avertir le propriétaire du serveur !'
            )
        };
    }
    
    // Vérifier la hiérarchie des rôles
    if (targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
        return {
            success: false,
            embed: KofuSignature.createErrorEmbed(
                'Hiérarchie insuffisante !',
                'Tu ne peux pas avertir quelqu\'un ayant un rôle égal ou supérieur au tien !'
            )
        };
    }
    
    return { success: true, member: targetMember };
}

/**
 * Ajouter l'avertissement à la base de données
 * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
 * @param {User} targetUser - L'utilisateur averti
 * @param {string} reason - Raison de l'avertissement
 * @returns {string|null} ID de l'avertissement
 * @author Kofu
 */
async function addWarningToDatabase(interaction, targetUser, reason) {
    try {
        const warningData = {
            userId: targetUser.id,
            userTag: targetUser.tag,
            guildId: interaction.guild.id,
            guildName: interaction.guild.name,
            moderatorId: interaction.user.id,
            moderatorTag: interaction.user.tag,
            reason: reason,
            channelId: interaction.channel.id,
            channelName: interaction.channel.name
        };
        
        // Utiliser la méthode de la classe Database
        const warnId = interaction.client.database.addWarning(warningData);
        
        if (warnId) {
            // Mettre à jour les stats de l'utilisateur
            const userData = interaction.client.database.getUser(targetUser.id);
            userData.moderation.totalWarnings++;
            userData.updatedAt = new Date();
            
            interaction.client.database.setUser(targetUser.id, userData);
            
            console.log(`💾 [Kofu] Avertissement sauvegardé: ${warnId}`);
        }
        
        return warnId;
        
    } catch (error) {
        console.error('❌ [Kofu] Erreur sauvegarde avertissement:', error);
        return null;
    }
}

/**
 * Envoyer une notification d'avertissement à l'utilisateur
 * @param {User} user - L'utilisateur à notifier
 * @param {Guild} guild - Le serveur
 * @param {string} reason - Raison de l'avertissement
 * @param {User} moderator - Le modérateur
 * @param {number} warnCount - Nombre total de warns
 * @param {string} warnId - ID de l'avertissement
 * @author Kofu
 */
async function sendWarnNotification(user, guild, reason, moderator, warnCount, warnId) {
    try {
        const notificationEmbed = new EmbedBuilder()
            .setTitle('⚠️ Tu as reçu un avertissement !')
            .setDescription(`Tu as reçu un avertissement sur le serveur **${guild.name}**.`)
            .setColor('#FAA61A')
            .addFields(
                { name: '🏛️ Serveur', value: guild.name, inline: true },
                { name: '🛡️ Modérateur', value: moderator.tag, inline: true },
                { name: '📝 Raison', value: reason, inline: false },
                { name: '⚠️ Nombre de warns', value: `${warnCount} avertissement(s)`, inline: true },
                { name: '🆔 ID du warn', value: `\`${warnId}\``, inline: true },
                { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
            )
            .setFooter(KofuSignature.getKofuFooter())
            .setTimestamp();
        
        // Ajouter un avertissement si beaucoup de warns
        if (warnCount >= 3) {
            notificationEmbed.addFields({
                name: '🚨 Attention !',
                value: `Tu as maintenant **${warnCount}** avertissement(s). Fais attention à ton comportement pour éviter des sanctions plus sévères.`,
                inline: false
            });
            notificationEmbed.setColor('#F04747');
        }
        
        await user.send({ embeds: [notificationEmbed] });
        console.log(`📨 [Kofu] Notification d'avertissement envoyée à ${user.tag}`);
        
    } catch (error) {
        console.log(`⚠️ [Kofu] Impossible d'envoyer la notification à ${user.tag}: ${error.message}`);
    }
}

/**
 * Envoyer le log dans le salon de modération
 * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
 * @param {User} targetUser - L'utilisateur averti
 * @param {string} reason - Raison de l'avertissement
 * @param {number} warnCount - Nombre total de warns
 * @param {string} warnId - ID de l'avertissement
 * @author Kofu
 */
async function sendToModerationLogs(interaction, targetUser, reason, warnCount, warnId) {
    try {
        const guildData = interaction.client.database.getGuild(interaction.guild.id);
        const logChannelId = guildData.logs.moderation;
        
        if (!logChannelId) return;
        
        const logChannel = interaction.guild.channels.cache.get(logChannelId);
        if (!logChannel) return;
        
        const logEmbed = new EmbedBuilder()
            .setTitle('⚠️ Membre Averti')
            .setColor(warnCount >= 3 ? '#F04747' : '#FAA61A')
            .addFields(
                { name: '👤 Utilisateur', value: `${targetUser.tag}\n\`${targetUser.id}\``, inline: true },
                { name: '🛡️ Modérateur', value: `${interaction.user.tag}\n\`${interaction.user.id}\``, inline: true },
                { name: '📝 Raison', value: reason, inline: false },
                { name: '⚠️ Total warns', value: `${warnCount} avertissement(s)`, inline: true },
                { name: '🆔 ID warn', value: `\`${warnId}\``, inline: true },
                { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .setFooter(KofuSignature.getKofuFooter())
            .setTimestamp();
        
        if (warnCount >= 3) {
            logEmbed.addFields({
                name: '🚨 Attention !',
                value: `Cet utilisateur a maintenant **${warnCount}** avertissement(s).`,
                inline: false
            });
        }
        
        await logChannel.send({ embeds: [logEmbed] });
        console.log(`📝 [Kofu] Log d'avertissement envoyé dans ${logChannel.name}`);
        
    } catch (error) {
        console.error('❌ [Kofu] Erreur envoi log modération:', error);
    }
}

/**
 * Vérifier et appliquer les auto-sanctions
 * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
 * @param {GuildMember} targetMember - Le membre cible
 * @param {number} warnCount - Nombre de warns
 * @author Kofu
 */
async function checkAutoSanctions(interaction, targetMember, warnCount) {
    try {
        const guildData = interaction.client.database.getGuild(interaction.guild.id);
        const maxWarnings = guildData.defaults?.maxWarnings || 5;
        
        // Auto-sanctions selon le nombre de warns
        if (warnCount >= maxWarnings && interaction.guild.members.me.permissions.has('BanMembers')) {
            // Auto-ban après X warns
            try {
                await targetMember.ban({ 
                    reason: `Auto-ban: ${warnCount} avertissements | Système automatique TASHKY Bot` 
                });
                
                const autoBanEmbed = KofuSignature.createWarningEmbed(
                    'Auto-sanction appliquée !',
                    `**${targetMember.user.tag}** a été automatiquement banni après **${warnCount}** avertissements.`
                );
                
                await interaction.followUp({ embeds: [autoBanEmbed] });
                
                console.log(`🔨 [Kofu] Auto-ban appliqué à ${targetMember.user.tag} (${warnCount} warns)`);
                
            } catch (error) {
                console.error('❌ [Kofu] Erreur auto-ban:', error);
            }
            
        } else if (warnCount >= 3 && interaction.guild.members.me.permissions.has('ModerateMembers')) {
            // Auto-timeout après 3 warns
            try {
                const timeoutDuration = 10 * 60 * 1000; // 10 minutes
                await targetMember.timeout(timeoutDuration, `Auto-timeout: ${warnCount} avertissements | Système automatique TASHKY Bot`);
                
                const autoTimeoutEmbed = KofuSignature.createWarningEmbed(
                    'Auto-sanction appliquée !',
                    `**${targetMember.user.tag}** a été automatiquement mis en timeout pour 10 minutes après **${warnCount}** avertissements.`
                );
                
                await interaction.followUp({ embeds: [autoTimeoutEmbed] });
                
                console.log(`🔇 [Kofu] Auto-timeout appliqué à ${targetMember.user.tag} (${warnCount} warns)`);
                
            } catch (error) {
                console.error('❌ [Kofu] Erreur auto-timeout:', error);
            }
        }
        
    } catch (error) {
        console.error('❌ [Kofu] Erreur vérification auto-sanctions:', error);
    }
}

/**
 * ====================================
 * ✨ Made with ❤️ by Kofu
 * github.com/kofudev
 * ====================================
 */