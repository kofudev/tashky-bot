/**
 * ====================================
 * COMMANDE: /userinfo
 * ====================================
 * 
 * Afficher les informations d'un utilisateur
 * Version publique avec infos de base
 * 
 * @author Kofu (github.com/kofudev)
 * @category General
 * ====================================
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const KofuSignature = require('../../utils/kofu-signature');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('👤 Afficher les informations d\'un utilisateur')
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('Utilisateur à analyser (vous par défaut)')
                .setRequired(false)
        ),
    
    category: 'general',
    cooldown: 5,
    guildOnly: false,
    
    /**
     * Exécution de la commande userinfo
     * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
     * @author Kofu
     */
    async execute(interaction) {
        const targetUser = interaction.options.getUser('utilisateur') || interaction.user;
        
        try {
            // Récupérer les informations de base
            const userInfo = await this.collectUserInfo(targetUser, interaction);
            
            // Créer l'embed principal
            const userEmbed = this.createUserEmbed(userInfo, targetUser, interaction);
            
            await interaction.reply({ embeds: [userEmbed] });
            
            console.log(`👤 [Kofu] ${interaction.user.tag} a consulté les infos de ${targetUser.tag}`);
            
        } catch (error) {
            console.error('❌ [Kofu] Erreur dans userinfo:', error);
            
            const errorEmbed = KofuSignature.createErrorEmbed(
                'Erreur !',
                `Impossible de récupérer les informations de ${targetUser.tag}.\n\n**Erreur:** \`${error.message}\``
            );
            
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    },
    
    /**
     * Collecter les informations de l'utilisateur
     * @param {User} user - L'utilisateur Discord
     * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
     * @returns {object} Informations collectées
     * @author Kofu
     */
    async collectUserInfo(user, interaction) {
        const info = {
            basic: {},
            server: null,
            activity: {},
            badges: []
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
            avatar: user.displayAvatarURL({ dynamic: true, size: 1024 }),
            banner: user.bannerURL({ dynamic: true, size: 1024 }),
            accentColor: user.accentColor,
            createdAt: user.createdAt,
            createdTimestamp: user.createdTimestamp
        };
        
        // Calculer l'âge du compte
        const accountAge = Date.now() - user.createdTimestamp;
        const days = Math.floor(accountAge / (1000 * 60 * 60 * 24));
        info.basic.accountAgeDays = days;
        
        // Badges de l'utilisateur
        const flags = user.flags ? user.flags.toArray() : [];
        info.badges = this.formatBadges(flags);
        
        // === INFORMATIONS DU SERVEUR (si dans un serveur) ===
        if (interaction.guild) {
            try {
                const member = await interaction.guild.members.fetch(user.id);
                
                info.server = {
                    nickname: member.nickname,
                    joinedAt: member.joinedAt,
                    premiumSince: member.premiumSince,
                    roles: member.roles.cache
                        .filter(r => r.id !== interaction.guild.id) // Exclure @everyone
                        .sort((a, b) => b.position - a.position)
                        .map(r => r.name)
                        .slice(0, 15), // Limiter à 15 rôles
                    roleCount: member.roles.cache.size - 1,
                    highestRole: member.roles.highest,
                    color: member.displayHexColor,
                    permissions: this.getKeyPermissions(member.permissions.toArray()),
                    boosting: member.premiumSince !== null,
                    timeout: member.communicationDisabledUntil,
                    avatar: member.displayAvatarURL({ dynamic: true, size: 1024 })
                };
                
                // Calculer le temps sur le serveur
                if (member.joinedAt) {
                    const serverTime = Date.now() - member.joinedAt.getTime();
                    const serverDays = Math.floor(serverTime / (1000 * 60 * 60 * 24));
                    info.server.serverTimeDays = serverDays;
                }
                
            } catch (error) {
                // L'utilisateur n'est pas sur le serveur
                info.server = null;
            }
        }
        
        // === ACTIVITÉ (depuis la base de données) ===
        if (interaction.client.database) {
            try {
                const userData = interaction.client.database.getUser(user.id);
                info.activity = {
                    totalMessages: userData.globalStats.totalMessages || 0,
                    totalCommands: userData.globalStats.totalCommands || 0,
                    firstSeen: userData.globalStats.firstSeen,
                    lastSeen: userData.globalStats.lastSeen
                };
            } catch (error) {
                info.activity = {
                    totalMessages: 0,
                    totalCommands: 0,
                    firstSeen: null,
                    lastSeen: null
                };
            }
        }
        
        return info;
    },
    
    /**
     * Créer l'embed utilisateur
     * @param {object} info - Informations collectées
     * @param {User} user - L'utilisateur Discord
     * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
     * @returns {EmbedBuilder} Embed utilisateur
     * @author Kofu
     */
    createUserEmbed(info, user, interaction) {
        const embed = new EmbedBuilder()
            .setTitle(`👤 Informations - ${user.tag}`)
            .setColor(info.server?.color || '#5865F2')
            .setThumbnail(info.server?.avatar || info.basic.avatar)
            .setFooter(KofuSignature.getKofuFooter())
            .setTimestamp();
        
        // Description avec statut
        let description = `**Profil de ${info.basic.globalName}**\n\n`;
        
        if (info.basic.bot) {
            description += '🤖 **Bot Discord**\n';
        }
        if (info.basic.system) {
            description += '🔧 **Compte Système**\n';
        }
        if (info.server?.boosting) {
            description += '💎 **Boost ce serveur**\n';
        }
        if (info.server?.timeout) {
            description += '🔇 **Actuellement en timeout**\n';
        }
        
        embed.setDescription(description);
        
        // === INFORMATIONS GÉNÉRALES ===
        embed.addFields(
            { name: '🆔 ID', value: `\`${info.basic.id}\``, inline: true },
            { name: '📅 Compte créé', value: `<t:${Math.floor(info.basic.createdTimestamp / 1000)}:R>`, inline: true },
            { name: '⏰ Âge du compte', value: `${info.basic.accountAgeDays} jour(s)`, inline: true }
        );
        
        // === BADGES ===
        if (info.badges.length > 0) {
            embed.addFields({
                name: '🎖️ Badges',
                value: info.badges.join(' '),
                inline: false
            });
        }
        
        // === INFORMATIONS DU SERVEUR ===
        if (info.server && interaction.guild) {
            embed.addFields(
                { name: '📥 Rejoint le serveur', value: `<t:${Math.floor(info.server.joinedAt.getTime() / 1000)}:R>`, inline: true },
                { name: '⏱️ Temps sur le serveur', value: `${info.server.serverTimeDays} jour(s)`, inline: true },
                { name: '🎭 Rôles', value: `${info.server.roleCount} rôle(s)`, inline: true }
            );
            
            // Surnom
            if (info.server.nickname) {
                embed.addFields({
                    name: '🏷️ Surnom',
                    value: info.server.nickname,
                    inline: true
                });
            }
            
            // Rôle le plus élevé
            if (info.server.highestRole && info.server.highestRole.name !== '@everyone') {
                embed.addFields({
                    name: '👑 Rôle le plus élevé',
                    value: info.server.highestRole.name,
                    inline: true
                });
            }
            
            // Boost du serveur
            if (info.server.boosting && info.server.premiumSince) {
                embed.addFields({
                    name: '💎 Boost depuis',
                    value: `<t:${Math.floor(info.server.premiumSince.getTime() / 1000)}:R>`,
                    inline: true
                });
            }
            
            // Quelques rôles (max 10)
            if (info.server.roles.length > 0) {
                const rolesList = info.server.roles.slice(0, 10).join(', ');
                const moreText = info.server.roles.length > 10 ? ` (+${info.server.roles.length - 10})` : '';
                
                embed.addFields({
                    name: `🎭 Rôles (${info.server.roleCount})`,
                    value: rolesList + moreText,
                    inline: false
                });
            }
            
            // Permissions importantes
            if (info.server.permissions.length > 0) {
                embed.addFields({
                    name: '🔑 Permissions clés',
                    value: info.server.permissions.join(', '),
                    inline: false
                });
            }
        }
        
        // === ACTIVITÉ ===
        if (info.activity.totalMessages > 0 || info.activity.totalCommands > 0) {
            embed.addFields(
                { name: '💬 Messages', value: `${info.activity.totalMessages}`, inline: true },
                { name: '⚙️ Commandes', value: `${info.activity.totalCommands}`, inline: true }
            );
            
            if (info.activity.lastSeen) {
                embed.addFields({
                    name: '👁️ Dernière activité',
                    value: `<t:${Math.floor(new Date(info.activity.lastSeen).getTime() / 1000)}:R>`,
                    inline: true
                });
            }
        }
        
        // Ajouter la bannière si disponible
        if (info.basic.banner) {
            embed.setImage(info.basic.banner);
        }
        
        return embed;
    },
    
    /**
     * Formater les badges utilisateur
     * @param {Array} flags - Flags de l'utilisateur
     * @returns {Array} Badges formatés
     * @author Kofu
     */
    formatBadges(flags) {
        const badgeMap = {
            'Staff': '<:staff:123456789> Staff Discord',
            'Partner': '<:partner:123456789> Partenaire Discord',
            'Hypesquad': '<:hypesquad:123456789> HypeSquad Events',
            'BugHunterLevel1': '<:bughunter1:123456789> Bug Hunter',
            'BugHunterLevel2': '<:bughunter2:123456789> Bug Hunter Gold',
            'HypeSquadOnlineHouse1': '<:bravery:123456789> HypeSquad Bravery',
            'HypeSquadOnlineHouse2': '<:brilliance:123456789> HypeSquad Brilliance',
            'HypeSquadOnlineHouse3': '<:balance:123456789> HypeSquad Balance',
            'PremiumEarlySupporter': '<:early:123456789> Early Supporter',
            'VerifiedDeveloper': '<:developer:123456789> Développeur Vérifié',
            'CertifiedModerator': '<:moderator:123456789> Modérateur Certifié',
            'BotHTTPInteractions': '<:interactions:123456789> Bot Interactions',
            'ActiveDeveloper': '<:activedev:123456789> Développeur Actif'
        };
        
        return flags.map(flag => badgeMap[flag] || `🏷️ ${flag}`);
    },
    
    /**
     * Obtenir les permissions importantes
     * @param {Array} permissions - Toutes les permissions
     * @returns {Array} Permissions importantes
     * @author Kofu
     */
    getKeyPermissions(permissions) {
        const keyPerms = [
            'Administrator',
            'ManageGuild',
            'ManageRoles',
            'ManageChannels',
            'ManageMessages',
            'BanMembers',
            'KickMembers',
            'ModerateMembers',
            'ManageNicknames',
            'ManageWebhooks'
        ];
        
        const permMap = {
            'Administrator': '👑 Administrateur',
            'ManageGuild': '🏛️ Gérer le serveur',
            'ManageRoles': '🎭 Gérer les rôles',
            'ManageChannels': '📺 Gérer les salons',
            'ManageMessages': '💬 Gérer les messages',
            'BanMembers': '🔨 Bannir des membres',
            'KickMembers': '👢 Expulser des membres',
            'ModerateMembers': '🔇 Modérer des membres',
            'ManageNicknames': '🏷️ Gérer les surnoms',
            'ManageWebhooks': '🔗 Gérer les webhooks'
        };
        
        return permissions
            .filter(perm => keyPerms.includes(perm))
            .map(perm => permMap[perm] || perm)
            .slice(0, 5); // Limiter à 5 permissions
    }
};

/**
 * ====================================
 * ✨ Made with ❤️ by Kofu
 * github.com/kofudev
 * ====================================
 */