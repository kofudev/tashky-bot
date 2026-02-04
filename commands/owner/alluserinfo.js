/**
 * ====================================
 * COMMANDE OWNER: /alluserinfo
 * ====================================
 * 
 * Récupère le MAXIMUM d'informations possibles
 * sur n'importe quel utilisateur Discord.
 * 
 * Affichage dans plusieurs embeds détaillés avec
 * pagination pour une lecture facile.
 * 
 * @author Kofu (github.com/kofudev)
 * @version 1.0.0
 * @category Owner Commands
 * 
 * ====================================
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const KofuSignature = require('../../utils/kofu-signature');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('alluserinfo')
        .setDescription('📊 [OWNER] Obtenir TOUTES les informations sur un utilisateur')
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('L\'utilisateur à analyser')
                .setRequired(true)
        ),
    
    category: 'owner',
    cooldown: 10,
    ownerOnly: true,
    
    /**
     * Exécution de la commande
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
        
        // Répondre immédiatement car ça peut prendre du temps
        await interaction.deferReply({ ephemeral: true });
        
        const targetUser = interaction.options.getUser('utilisateur');
        console.log(`🔍 [Kofu] ${interaction.user.tag} analyse l'utilisateur ${targetUser.tag}`);
        
        // Logger l'action owner
        interaction.client.logger.logOwnerAction(
            interaction.user,
            'ALLUSERINFO',
            { targetUser: { id: targetUser.id, tag: targetUser.tag } }
        );
        
        try {
            // Récupérer TOUTES les infos possibles
            const userInfo = await this.collectAllUserInfo(targetUser, interaction.client);
            
            // Créer les embeds
            const embeds = this.createInfoEmbeds(userInfo, targetUser);
            
            // Créer les boutons de navigation
            const buttons = this.createNavigationButtons();
            
            // Envoyer le premier embed
            await interaction.editReply({
                embeds: [embeds[0]],
                components: [buttons]
            });
            
            // Gérer la pagination
            this.handlePagination(interaction, embeds, buttons);
            
        } catch (error) {
            console.error('❌ [Kofu] Erreur dans alluserinfo:', error);
            
            const errorEmbed = KofuSignature.createErrorEmbed(
                'Erreur !',
                `Impossible de récupérer les informations.\\n\\n\`\`\`${error.message}\`\`\``
            );
            
            await interaction.editReply({
                embeds: [errorEmbed]
            });
        }
    },
    
    /**
     * Collecter toutes les informations possibles sur un utilisateur
     * @param {User} user - L'utilisateur Discord
     * @param {Client} client - Le client Discord
     * @returns {object} Toutes les infos collectées
     * @author Kofu
     */
    async collectAllUserInfo(user, client) {
        console.log(`📊 [Kofu] Collecte des infos pour ${user.tag}...`);
        
        const info = {
            basic: {},
            servers: [],
            moderation: {},
            activity: {},
            advanced: {}
        };
        
        // === INFORMATIONS DE BASE ===
        info.basic = {
            id: user.id,
            tag: user.tag,
            username: user.username,
            discriminator: user.discriminator,
            globalName: user.globalName || user.username,
            bot: user.bot,
            system: user.system,
            avatar: user.displayAvatarURL({ dynamic: true, size: 2048 }),
            banner: user.bannerURL({ dynamic: true, size: 2048 }),
            accentColor: user.accentColor,
            createdAt: user.createdAt,
            createdTimestamp: user.createdTimestamp
        };
        
        // Calculer l'âge du compte
        const accountAge = Date.now() - user.createdTimestamp;
        const days = Math.floor(accountAge / (1000 * 60 * 60 * 24));
        const years = Math.floor(days / 365);
        const months = Math.floor((days % 365) / 30);
        const remainingDays = (days % 365) % 30;
        info.basic.accountAge = `${years} ans, ${months} mois, ${remainingDays} jours`;
        
        // Badges de l'utilisateur
        const flags = user.flags ? user.flags.toArray() : [];
        info.basic.badges = flags;
        
        // === SERVEURS MUTUELS ===
        console.log(`🔍 [Kofu] Recherche des serveurs mutuels...`);
        const mutualGuilds = client.guilds.cache.filter(guild =>
            guild.members.cache.has(user.id)
        );
        
        for (const [guildId, guild] of mutualGuilds) {
            try {
                const member = await guild.members.fetch(user.id);
                const serverInfo = {
                    guildId: guild.id,
                    guildName: guild.name,
                    joined: member.joinedAt,
                    nickname: member.nickname,
                    roles: member.roles.cache
                        .filter(r => r.id !== guild.id) // Exclure @everyone
                        .map(r => r.name)
                        .slice(0, 10), // Limiter à 10 rôles
                    roleCount: member.roles.cache.size - 1,
                    highestRole: member.roles.highest.name,
                    color: member.displayHexColor,
                    permissions: member.permissions.toArray().slice(0, 10),
                    boosting: member.premiumSince !== null,
                    boostingSince: member.premiumSince,
                    timeout: member.communicationDisabledUntil
                };
                
                info.servers.push(serverInfo);
            } catch (err) {
                console.log(`⚠️ [Kofu] Impossible de récupérer les infos du serveur ${guild.name}`);
            }
        }
        
        info.servers.totalCount = mutualGuilds.size;
        
        // === MODÉRATION ===
        console.log(`⚠️ [Kofu] Vérification de l'historique de modération...`);
        const userData = client.database.getUser(user.id);
        const warnings = client.database.getWarnings(user.id);
        const bans = client.database.getBans(user.id);
        const mutes = client.database.getMutes(user.id);
        
        info.moderation = {
            warnings: warnings.length,
            bans: bans.length,
            mutes: mutes.length,
            blacklisted: userData.security.blacklisted,
            riskScore: userData.security.riskScore || 0,
            lastWarning: warnings[warnings.length - 1] || null,
            lastBan: bans[bans.length - 1] || null
        };
        
        // === ACTIVITÉ ===
        info.activity = {
            totalMessages: userData.globalStats.totalMessages || 0,
            totalCommands: userData.globalStats.totalCommands || 0,
            firstSeen: userData.globalStats.firstSeen,
            lastSeen: userData.globalStats.lastSeen,
            favoriteChannels: userData.analytics?.favoriteChannels || [],
            mostUsedCommands: userData.analytics?.mostUsedCommands || []
        };
        
        // === AVANCÉ ===
        const userFetched = await user.fetch(true); // Forcer le fetch complet
        info.advanced = {
            locale: userFetched.locale || 'Inconnu',
            publicFlags: userFetched.publicFlags?.bitfield || 0,
            accentColorHex: userFetched.accentColor ? `#${userFetched.accentColor.toString(16)}` : 'Aucune'
        };
        
        console.log(`✅ [Kofu] Toutes les infos collectées !`);
        return info;
    },
    
    /**
     * Créer les embeds d'information
     * @param {object} info - Les informations collectées
     * @param {User} user - L'utilisateur Discord
     * @returns {Array} Tableau d'embeds
     * @author Kofu
     */
    createInfoEmbeds(info, user) {
        const embeds = [];
        
        // === EMBED 1: INFORMATIONS GÉNÉRALES ===
        const generalEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`📊 Informations Complètes - ${user.tag}`)
            .setThumbnail(info.basic.avatar)
            .setDescription('**Page 1/6 - Informations Générales** 🪪')
            .addFields(
                { name: '👤 Nom d\'utilisateur', value: `\`${info.basic.tag}\``, inline: true },
                { name: '🆔 ID', value: `\`${info.basic.id}\``, inline: true },
                { name: '🏷️ Nom global', value: `\`${info.basic.globalName}\``, inline: true },
                { name: '🤖 Bot ?', value: info.basic.bot ? '✅ Oui' : '❌ Non', inline: true },
                { name: '🔧 Système ?', value: info.basic.system ? '✅ Oui' : '❌ Non', inline: true },
                { name: '📅 Compte créé le', value: `<t:${Math.floor(info.basic.createdTimestamp / 1000)}:F>`, inline: false },
                { name: '⏰ Âge du compte', value: `\`${info.basic.accountAge}\``, inline: false },
                { name: '🎖️ Badges', value: info.basic.badges.length > 0 ? info.basic.badges.join(', ') : 'Aucun badge', inline: false }
            )
            .setImage(info.basic.banner || null)
            .setFooter({ text: '✨ Made with ❤️ by Kofu | Page 1/6' })
            .setTimestamp();
        
        embeds.push(generalEmbed);
        
        // === EMBED 2: SERVEURS MUTUELS ===
        const serversEmbed = new EmbedBuilder()
            .setColor('#43B581')
            .setTitle(`🏛️ Serveurs Mutuels - ${user.tag}`)
            .setThumbnail(info.basic.avatar)
            .setDescription(`**Page 2/6 - Serveurs** 🏛️\\n\\nPrésent dans **${info.servers.totalCount}** serveur(s) mutuel(s)`);
        
        // Ajouter les 5 premiers serveurs
        info.servers.slice(0, 5).forEach((server, index) => {
            const joinedTimestamp = Math.floor(server.joined.getTime() / 1000);
            serversEmbed.addFields({
                name: `${index + 1}. ${server.guildName}`,
                value: 
                    `> **ID:** \`${server.guildId}\`\\n` +
                    `> **Surnom:** ${server.nickname || 'Aucun'}\\n` +
                    `> **Rejoint le:** <t:${joinedTimestamp}:R>\\n` +
                    `> **Rôles:** ${server.roleCount} (Highest: ${server.highestRole})\\n` +
                    `> **Boost:** ${server.boosting ? '✅ Oui' : '❌ Non'}`,
                inline: false
            });
        });
        
        if (info.servers.totalCount > 5) {
            serversEmbed.addFields({
                name: '➕ Et plus encore...',
                value: `*${info.servers.totalCount - 5} autre(s) serveur(s)*`,
                inline: false
            });
        }
        
        serversEmbed.setFooter({ text: '✨ Made with ❤️ by Kofu | Page 2/6' });
        embeds.push(serversEmbed);
        
        // === EMBED 3: MODÉRATION ===
        const modEmbed = new EmbedBuilder()
            .setColor(info.moderation.blacklisted ? '#F04747' : '#FAA61A')
            .setTitle(`🚨 Historique de Modération - ${user.tag}`)
            .setThumbnail(info.basic.avatar)
            .setDescription('**Page 3/6 - Modération & Sécurité** 🚨')
            .addFields(
                { name: '⚠️ Avertissements', value: `\`${info.moderation.warnings}\` warn(s)`, inline: true },
                { name: '🔨 Bannissements', value: `\`${info.moderation.bans}\` ban(s)`, inline: true },
                { name: '🔇 Mutes', value: `\`${info.moderation.mutes}\` mute(s)`, inline: true },
                { name: '🚫 Blacklisté', value: info.moderation.blacklisted ? '✅ OUI' : '❌ Non', inline: true },
                { name: '📊 Score de risque', value: `\`${info.moderation.riskScore}/100\``, inline: true },
                { name: '\\u200b', value: '\\u200b', inline: true }
            );
        
        if (info.moderation.lastWarning) {
            modEmbed.addFields({
                name: '📝 Dernier avertissement',
                value: 
                    `> **Raison:** ${info.moderation.lastWarning.reason}\\n` +
                    `> **Serveur:** ${info.moderation.lastWarning.guildName}\\n` +
                    `> **Date:** <t:${Math.floor(new Date(info.moderation.lastWarning.timestamp).getTime() / 1000)}:R>`,
                inline: false
            });
        }
        
        modEmbed.setFooter({ text: '✨ Made with ❤️ by Kofu | Page 3/6' });
        embeds.push(modEmbed);
        
        // === EMBED 4: ACTIVITÉ ===
        const activityEmbed = new EmbedBuilder()
            .setColor('#00B0F4')
            .setTitle(`📊 Statistiques & Activité - ${user.tag}`)
            .setThumbnail(info.basic.avatar)
            .setDescription('**Page 4/6 - Activité** 📊')
            .addFields(
                { name: '💬 Messages totaux', value: `\`${info.activity.totalMessages}\``, inline: true },
                { name: '⚙️ Commandes utilisées', value: `\`${info.activity.totalCommands}\``, inline: true },
                { name: '\\u200b', value: '\\u200b', inline: true },
                { name: '👁️ Première activité', value: `<t:${Math.floor(new Date(info.activity.firstSeen).getTime() / 1000)}:R>`, inline: true },
                { name: '🕐 Dernière activité', value: `<t:${Math.floor(new Date(info.activity.lastSeen).getTime() / 1000)}:R>`, inline: true },
                { name: '\\u200b', value: '\\u200b', inline: true }
            )
            .setFooter({ text: '✨ Made with ❤️ by Kofu | Page 4/6' });
        
        embeds.push(activityEmbed);
        
        // === EMBED 5: DONNÉES AVANCÉES ===
        const advancedEmbed = new EmbedBuilder()
            .setColor('#9B59B6')
            .setTitle(`🔬 Données Avancées - ${user.tag}`)
            .setThumbnail(info.basic.avatar)
            .setDescription('**Page 5/6 - Informations Techniques** 🔬')
            .addFields(
                { name: '🌐 Locale', value: `\`${info.advanced.locale}\``, inline: true },
                { name: '🎨 Couleur d\'accentuation', value: `\`${info.advanced.accentColorHex}\``, inline: true },
                { name: '🔢 Public Flags', value: `\`${info.advanced.publicFlags}\``, inline: true },
                { name: '🔗 Avatar URL', value: `[Cliquer ici](${info.basic.avatar})`, inline: true },
                { name: '🖼️ Banner URL', value: info.basic.banner ? `[Cliquer ici](${info.basic.banner})` : '❌ Aucune', inline: true },
                { name: '\\u200b', value: '\\u200b', inline: true }
            )
            .setFooter({ text: '✨ Made with ❤️ by Kofu | Page 5/6' });
        
        embeds.push(advancedEmbed);
        
        // === EMBED 6: RÉSUMÉ ===
        const summaryEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`📋 Résumé - ${user.tag}`)
            .setThumbnail(info.basic.avatar)
            .setDescription('**Page 6/6 - Résumé Général** 📋')
            .addFields(
                { name: '👤 Utilisateur', value: `\`${info.basic.tag}\`\\n🆔 \`${info.basic.id}\``, inline: true },
                { name: '🏛️ Serveurs', value: `\`${info.servers.totalCount}\` serveur(s)`, inline: true },
                { name: '⚠️ Sanctions', value: `\`${info.moderation.warnings + info.moderation.bans + info.moderation.mutes}\` total`, inline: true },
                { name: '💬 Activité', value: `\`${info.activity.totalMessages}\` messages\\n\`${info.activity.totalCommands}\` commandes`, inline: true },
                { name: '📊 Risque', value: info.moderation.blacklisted ? '🚨 **BLACKLISTÉ**' : `\`${info.moderation.riskScore}/100\``, inline: true },
                { name: '⏰ Âge compte', value: `\`${info.basic.accountAge}\``, inline: true }
            )
            .setFooter({ text: '✨ Made with ❤️ by Kofu | Page 6/6' })
            .setTimestamp();
        
        embeds.push(summaryEmbed);
        
        return embeds;
    },
    
    /**
     * Créer les boutons de navigation
     * @returns {ActionRowBuilder} Row de boutons
     * @author Kofu
     */
    createNavigationButtons() {
        return new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('first')
                    .setLabel('⏮️ Début')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('previous')
                    .setLabel('◀️ Précédent')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('next')
                    .setLabel('Suivant ▶️')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('last')
                    .setLabel('Fin ⏭️')
                    .setStyle(ButtonStyle.Primary)
            );
    },
    
    /**
     * Gérer la pagination des embeds
     * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
     * @param {Array} embeds - Les embeds à paginer
     * @param {ActionRowBuilder} buttons - Les boutons de navigation
     * @author Kofu
     */
    async handlePagination(interaction, embeds, buttons) {
        let currentPage = 0;
        
        const collector = interaction.channel.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 300000 // 5 minutes
        });
        
        collector.on('collect', async i => {
            if (i.customId === 'first') currentPage = 0;
            if (i.customId === 'previous') currentPage = currentPage > 0 ? currentPage - 1 : embeds.length - 1;
            if (i.customId === 'next') currentPage = currentPage < embeds.length - 1 ? currentPage + 1 : 0;
            if (i.customId === 'last') currentPage = embeds.length - 1;
            
            await i.update({
                embeds: [embeds[currentPage]],
                components: [buttons]
            });
        });
        
        collector.on('end', () => {
            console.log(`⏱️ [Kofu] Fin de la pagination pour ${interaction.user.tag}`);
        });
    }
};

/**
 * ====================================
 * ✨ Made with ❤️ by Kofu
 * github.com/kofudev
 * ====================================
 */