/**
 * ====================================
 * COMMANDE OWNER: /globalban
 * ====================================
 * 
 * Bannir un utilisateur de tous les serveurs
 * où le bot est présent (EXTRÊME DANGER)
 * 
 * @author Kofu (github.com/kofudev)
 * @category Owner Commands
 * ====================================
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const KofuSignature = require('../../utils/kofu-signature');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('globalban')
        .setDescription('🚨 [OWNER] Bannir un utilisateur de TOUS les serveurs')
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('Utilisateur à bannir globalement')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('raison')
                .setDescription('Raison du ban global')
                .setRequired(true)
                .setMaxLength(512)
        )
        .addBooleanOption(option =>
            option.setName('blacklist')
                .setDescription('Ajouter à la blacklist du bot (défaut: true)')
                .setRequired(false)
        ),
    
    category: 'owner',
    cooldown: 60,
    ownerOnly: true,
    
    /**
     * Exécution de la commande globalban
     * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
     * @author Kofu
     */
    async execute(interaction) {
        // Vérifier que c'est un owner
        const owners = process.env.BOT_OWNERS ? JSON.parse(process.env.BOT_OWNERS) : [];
        if (!owners.includes(interaction.user.id)) {
            const errorEmbed = KofuSignature.createErrorEmbed(
                'Accès refusé !',
                'Cette commande est réservée aux propriétaires du bot (Kofu & co).'
            );
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
        
        const targetUser = interaction.options.getUser('utilisateur');
        const reason = interaction.options.getString('raison');
        const addToBlacklist = interaction.options.getBoolean('blacklist') ?? true;
        
        // Vérifications de sécurité critiques
        const securityCheck = this.performSecurityChecks(interaction, targetUser);
        if (!securityCheck.success) {
            return interaction.reply({ embeds: [securityCheck.embed], ephemeral: true });
        }
        
        // Créer l'embed de confirmation avec GROS AVERTISSEMENT
        const confirmEmbed = new EmbedBuilder()
            .setTitle('🚨 ATTENTION - ACTION EXTRÊME 🚨')
            .setDescription(
                '**VOUS ÊTES SUR LE POINT DE BANNIR UN UTILISATEUR DE TOUS LES SERVEURS !**\n\n' +
                '⚠️ **CETTE ACTION EST IRRÉVERSIBLE ET EXTRÊMEMENT PUISSANTE**\n' +
                '⚠️ **L\'UTILISATEUR SERA BANNI DE TOUS LES SERVEURS OÙ LE BOT EST PRÉSENT**\n' +
                '⚠️ **UTILISEZ CETTE COMMANDE UNIQUEMENT EN CAS D\'URGENCE ABSOLUE**\n\n' +
                '**Confirmez-vous cette action ?**'
            )
            .setColor('#F04747')
            .addFields(
                { name: '👤 Utilisateur cible', value: `${targetUser.tag}\n\`${targetUser.id}\``, inline: true },
                { name: '🛡️ Exécuteur', value: `${interaction.user.tag}\n\`${interaction.user.id}\``, inline: true },
                { name: '📝 Raison', value: reason, inline: false },
                { name: '🚫 Blacklist', value: addToBlacklist ? '✅ Oui' : '❌ Non', inline: true },
                { name: '🏛️ Serveurs affectés', value: `\`${interaction.client.guilds.cache.size}\` serveur(s)`, inline: true }
            )
            .setFooter({ text: '⚠️ RÉFLÉCHISSEZ BIEN AVANT DE CONFIRMER ⚠️' })
            .setTimestamp();
        
        // Boutons de confirmation
        const confirmButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('globalban_confirm')
                    .setLabel('🚨 CONFIRMER LE BAN GLOBAL')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('globalban_cancel')
                    .setLabel('❌ Annuler')
                    .setStyle(ButtonStyle.Secondary)
            );
        
        await interaction.reply({
            embeds: [confirmEmbed],
            components: [confirmButtons],
            ephemeral: true
        });
        
        // Attendre la confirmation
        const collector = interaction.channel.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 60000 // 1 minute
        });
        
        collector.on('collect', async i => {
            if (i.customId === 'globalban_confirm') {
                await this.executeGlobalBan(i, targetUser, reason, addToBlacklist);
            } else if (i.customId === 'globalban_cancel') {
                const cancelEmbed = KofuSignature.createInfoEmbed(
                    'Action annulée',
                    'Le ban global a été annulé. Aucune action n\'a été effectuée.'
                );
                await i.update({ embeds: [cancelEmbed], components: [] });
            }
            
            collector.stop();
        });
        
        collector.on('end', collected => {
            if (collected.size === 0) {
                const timeoutEmbed = KofuSignature.createWarningEmbed(
                    'Temps écoulé',
                    'Le ban global a été annulé par timeout. Aucune action n\'a été effectuée.'
                );
                interaction.editReply({ embeds: [timeoutEmbed], components: [] });
            }
        });
    },
    
    /**
     * Effectuer les vérifications de sécurité
     * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
     * @param {User} targetUser - L'utilisateur cible
     * @returns {object} Résultat des vérifications
     * @author Kofu
     */
    performSecurityChecks(interaction, targetUser) {
        // Vérifier que l'utilisateur n'essaie pas de se bannir lui-même
        if (targetUser.id === interaction.user.id) {
            return {
                success: false,
                embed: KofuSignature.createErrorEmbed(
                    'Action impossible !',
                    'Tu ne peux pas te bannir toi-même globalement ! 🤔'
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
        
        // Vérifier que ce n'est pas un autre owner
        const owners = process.env.BOT_OWNERS ? JSON.parse(process.env.BOT_OWNERS) : [];
        if (owners.includes(targetUser.id)) {
            return {
                success: false,
                embed: KofuSignature.createErrorEmbed(
                    'Action interdite !',
                    'Tu ne peux pas bannir globalement un autre propriétaire du bot !'
                )
            };
        }
        
        return { success: true };
    },
    
    /**
     * Exécuter le ban global
     * @param {ButtonInteraction} interaction - L'interaction du bouton
     * @param {User} targetUser - L'utilisateur à bannir
     * @param {string} reason - Raison du ban
     * @param {boolean} addToBlacklist - Ajouter à la blacklist
     * @author Kofu
     */
    async executeGlobalBan(interaction, targetUser, reason, addToBlacklist) {
        // Créer l'embed de progression
        const progressEmbed = new EmbedBuilder()
            .setTitle('🚨 Ban global en cours...')
            .setDescription(`Bannissement de ${targetUser.tag} en cours sur tous les serveurs...`)
            .setColor('#F04747')
            .addFields(
                { name: '⏳ Statut', value: 'En cours...', inline: true },
                { name: '📊 Progression', value: '0%', inline: true }
            )
            .setFooter(KofuSignature.getKofuFooter())
            .setTimestamp();
        
        await interaction.update({ embeds: [progressEmbed], components: [] });
        
        try {
            const results = {
                success: [],
                failed: [],
                notMember: [],
                noPermission: []
            };
            
            const guilds = interaction.client.guilds.cache;
            let processed = 0;
            
            // Envoyer une notification à l'utilisateur avant le ban global
            await this.sendGlobalBanNotification(targetUser, reason, interaction.user, guilds.size);
            
            // Bannir de chaque serveur
            for (const [guildId, guild] of guilds) {
                try {
                    // Vérifier si l'utilisateur est membre du serveur
                    const member = guild.members.cache.get(targetUser.id);
                    
                    if (!member) {
                        // Essayer de bannir quand même (ban par ID)
                        try {
                            await guild.members.ban(targetUser.id, {
                                reason: `[GLOBAL BAN] ${reason} | Exécuté par: ${interaction.user.tag}`,
                                deleteMessageDays: 1
                            });
                            results.success.push(guild.name);
                        } catch (error) {
                            if (error.code === 10026) { // Unknown Ban
                                results.notMember.push(guild.name);
                            } else {
                                results.failed.push({ guild: guild.name, error: error.message });
                            }
                        }
                    } else {
                        // L'utilisateur est membre, bannir normalement
                        await guild.members.ban(targetUser.id, {
                            reason: `[GLOBAL BAN] ${reason} | Exécuté par: ${interaction.user.tag}`,
                            deleteMessageDays: 1
                        });
                        results.success.push(guild.name);
                    }
                    
                } catch (error) {
                    if (error.code === 50013) { // Missing Permissions
                        results.noPermission.push(guild.name);
                    } else {
                        results.failed.push({ guild: guild.name, error: error.message });
                    }
                }
                
                processed++;
                
                // Mettre à jour la progression toutes les 10 guildes
                if (processed % 10 === 0) {
                    const percentage = Math.round((processed / guilds.size) * 100);
                    progressEmbed.setFields(
                        { name: '⏳ Statut', value: `${processed}/${guilds.size} serveurs traités`, inline: true },
                        { name: '📊 Progression', value: `${percentage}%`, inline: true }
                    );
                    await interaction.editReply({ embeds: [progressEmbed] });
                }
            }
            
            // Ajouter à la blacklist si demandé
            if (addToBlacklist) {
                await this.addToBlacklist(interaction.client, targetUser, reason, interaction.user);
            }
            
            // Enregistrer dans la base de données
            await this.saveGlobalBanToDatabase(interaction.client, targetUser, reason, interaction.user, results);
            
            // Logger l'action
            interaction.client.logger.logOwnerAction(
                interaction.user,
                'GLOBAL_BAN',
                {
                    targetUser: { id: targetUser.id, tag: targetUser.tag },
                    reason,
                    addToBlacklist,
                    results: {
                        success: results.success.length,
                        failed: results.failed.length,
                        notMember: results.notMember.length,
                        noPermission: results.noPermission.length
                    }
                }
            );
            
            // Créer l'embed de résultat
            const resultEmbed = this.createResultEmbed(targetUser, reason, results, addToBlacklist);
            
            await interaction.editReply({ embeds: [resultEmbed] });
            
            console.log(`🚨 [Kofu] Ban global exécuté par ${interaction.user.tag} sur ${targetUser.tag} - ${results.success.length} succès`);
            
        } catch (error) {
            console.error('❌ [Kofu] Erreur lors du ban global:', error);
            
            const errorEmbed = KofuSignature.createErrorEmbed(
                'Erreur lors du ban global !',
                `Une erreur critique est survenue.\n\n**Erreur:** \`${error.message}\``
            );
            
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },
    
    /**
     * Envoyer une notification de ban global à l'utilisateur
     * @param {User} user - L'utilisateur à notifier
     * @param {string} reason - Raison du ban
     * @param {User} executor - L'exécuteur
     * @param {number} serverCount - Nombre de serveurs
     * @author Kofu
     */
    async sendGlobalBanNotification(user, reason, executor, serverCount) {
        try {
            const notificationEmbed = new EmbedBuilder()
                .setTitle('🚨 Ban Global - TASHKY Bot')
                .setDescription('Tu as été banni globalement de tous les serveurs utilisant TASHKY Bot.')
                .setColor('#F04747')
                .addFields(
                    { name: '🛡️ Exécuté par', value: executor.tag, inline: true },
                    { name: '🏛️ Serveurs affectés', value: `${serverCount} serveur(s)`, inline: true },
                    { name: '📝 Raison', value: reason, inline: false },
                    { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                    { name: '⚠️ Information', value: 'Cette action a été prise pour des raisons de sécurité graves. Si tu penses qu\'il s\'agit d\'une erreur, contacte les administrateurs.', inline: false }
                )
                .setFooter(KofuSignature.getKofuFooter())
                .setTimestamp();
            
            await user.send({ embeds: [notificationEmbed] });
            console.log(`📨 [Kofu] Notification de ban global envoyée à ${user.tag}`);
            
        } catch (error) {
            console.log(`⚠️ [Kofu] Impossible d'envoyer la notification à ${user.tag}: ${error.message}`);
        }
    },
    
    /**
     * Ajouter à la blacklist
     * @param {Client} client - Le client Discord
     * @param {User} user - L'utilisateur à blacklister
     * @param {string} reason - Raison
     * @param {User} executor - L'exécuteur
     * @author Kofu
     */
    async addToBlacklist(client, user, reason, executor) {
        try {
            const blacklistData = client.database.read('blacklist.json') || { users: [], guilds: [], lastUpdated: new Date() };
            
            const blacklistEntry = {
                userId: user.id,
                userTag: user.tag,
                reason: reason,
                addedBy: executor.id,
                addedByTag: executor.tag,
                addedAt: new Date(),
                type: 'global_ban'
            };
            
            blacklistData.users.push(blacklistEntry);
            blacklistData.lastUpdated = new Date();
            
            client.database.write('blacklist.json', blacklistData);
            
            // Mettre à jour les données utilisateur
            const userData = client.database.getUser(user.id);
            userData.security.blacklisted = true;
            userData.security.blacklistReason = reason;
            userData.security.blacklistedAt = new Date();
            userData.security.blacklistedBy = executor.id;
            userData.updatedAt = new Date();
            
            client.database.setUser(user.id, userData);
            
            console.log(`🚫 [Kofu] ${user.tag} ajouté à la blacklist`);
            
        } catch (error) {
            console.error('❌ [Kofu] Erreur ajout blacklist:', error);
        }
    },
    
    /**
     * Sauvegarder le ban global dans la base de données
     * @param {Client} client - Le client Discord
     * @param {User} targetUser - L'utilisateur banni
     * @param {string} reason - Raison du ban
     * @param {User} executor - L'exécuteur
     * @param {object} results - Résultats du ban
     * @author Kofu
     */
    async saveGlobalBanToDatabase(client, targetUser, reason, executor, results) {
        try {
            const globalBanData = {
                id: `globalban_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                userId: targetUser.id,
                userTag: targetUser.tag,
                executorId: executor.id,
                executorTag: executor.tag,
                reason: reason,
                timestamp: new Date(),
                results: {
                    totalServers: results.success.length + results.failed.length + results.notMember.length + results.noPermission.length,
                    successfulBans: results.success.length,
                    failedBans: results.failed.length,
                    notMemberServers: results.notMember.length,
                    noPermissionServers: results.noPermission.length
                },
                type: 'global_ban'
            };
            
            // Ajouter à l'historique des bans globaux
            const globalBansData = client.database.read('sanctions/global_bans.json') || { bans: [], lastUpdated: new Date() };
            globalBansData.bans.push(globalBanData);
            globalBansData.lastUpdated = new Date();
            
            client.database.write('sanctions/global_bans.json', globalBansData);
            
            console.log(`💾 [Kofu] Ban global sauvegardé en base de données: ${globalBanData.id}`);
            
        } catch (error) {
            console.error('❌ [Kofu] Erreur sauvegarde ban global:', error);
        }
    },
    
    /**
     * Créer l'embed de résultat
     * @param {User} targetUser - L'utilisateur banni
     * @param {string} reason - Raison du ban
     * @param {object} results - Résultats du ban
     * @param {boolean} addToBlacklist - Ajouté à la blacklist
     * @returns {EmbedBuilder} Embed de résultat
     * @author Kofu
     */
    createResultEmbed(targetUser, reason, results, addToBlacklist) {
        const totalServers = results.success.length + results.failed.length + results.notMember.length + results.noPermission.length;
        const successRate = Math.round((results.success.length / totalServers) * 100);
        
        const embed = new EmbedBuilder()
            .setTitle('🚨 Ban Global Terminé')
            .setDescription(`Le ban global de ${targetUser.tag} a été exécuté.`)
            .setColor(results.success.length > 0 ? '#F04747' : '#FAA61A')
            .addFields(
                { name: '👤 Utilisateur banni', value: `${targetUser.tag}\n\`${targetUser.id}\``, inline: true },
                { name: '📊 Taux de succès', value: `${successRate}%`, inline: true },
                { name: '🚫 Blacklisté', value: addToBlacklist ? '✅ Oui' : '❌ Non', inline: true },
                { name: '✅ Bans réussis', value: `\`${results.success.length}\``, inline: true },
                { name: '❌ Échecs', value: `\`${results.failed.length}\``, inline: true },
                { name: '👻 Pas membre', value: `\`${results.notMember.length}\``, inline: true },
                { name: '🔒 Pas de permissions', value: `\`${results.noPermission.length}\``, inline: true },
                { name: '🏛️ Total serveurs', value: `\`${totalServers}\``, inline: true },
                { name: '📝 Raison', value: reason, inline: false }
            )
            .setFooter(KofuSignature.getKofuFooter())
            .setTimestamp();
        
        // Ajouter quelques exemples de serveurs réussis
        if (results.success.length > 0) {
            const successList = results.success.slice(0, 5).map(name => `• ${name}`).join('\n');
            const moreText = results.success.length > 5 ? `\n*... et ${results.success.length - 5} autre(s)*` : '';
            
            embed.addFields({
                name: '✅ Exemples de bans réussis',
                value: successList + moreText,
                inline: false
            });
        }
        
        // Ajouter quelques exemples d'échecs
        if (results.failed.length > 0) {
            const failedList = results.failed.slice(0, 3).map(f => `• ${f.guild}: ${f.error}`).join('\n');
            const moreText = results.failed.length > 3 ? `\n*... et ${results.failed.length - 3} autre(s)*` : '';
            
            embed.addFields({
                name: '❌ Exemples d\'échecs',
                value: failedList + moreText,
                inline: false
            });
        }
        
        return embed;
    }
};

/**
 * ====================================
 * ✨ Made with ❤️ by Kofu
 * github.com/kofudev
 * ====================================
 */