/**
 * ====================================
 * COMMANDE OWNER: /backup-server
 * ====================================
 * 
 * Créer une sauvegarde complète d'un serveur
 * Inclut rôles, salons, permissions, etc.
 * 
 * @author Kofu (github.com/kofudev)
 * @category Owner Commands
 * ====================================
 */

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const KofuSignature = require('../../utils/kofu-signature');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('backup-server')
        .setDescription('💾 [OWNER] Créer une sauvegarde complète du serveur')
        .addStringOption(option =>
            option.setName('nom')
                .setDescription('Nom de la sauvegarde (optionnel)')
                .setRequired(false)
                .setMaxLength(50)
        )
        .addBooleanOption(option =>
            option.setName('inclure-messages')
                .setDescription('Inclure un échantillon de messages (défaut: false)')
                .setRequired(false)
        ),
    
    category: 'owner',
    cooldown: 30,
    ownerOnly: true,
    guildOnly: true,
    
    /**
     * Exécution de la commande backup-server
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
        
        const backupName = interaction.options.getString('nom') || `backup-${Date.now()}`;
        const includeMessages = interaction.options.getBoolean('inclure-messages') || false;
        
        // Créer l'embed de démarrage
        const startEmbed = new EmbedBuilder()
            .setTitle('💾 Sauvegarde en cours...')
            .setDescription(`Création de la sauvegarde "${backupName}" en cours...\n\n⏳ Cette opération peut prendre plusieurs minutes.`)
            .setColor('#FAA61A')
            .addFields(
                { name: '🏛️ Serveur', value: interaction.guild.name, inline: true },
                { name: '📝 Nom de sauvegarde', value: backupName, inline: true },
                { name: '💬 Messages inclus', value: includeMessages ? '✅ Oui' : '❌ Non', inline: true }
            )
            .setFooter(KofuSignature.getKofuFooter())
            .setTimestamp();
        
        await interaction.reply({ embeds: [startEmbed], ephemeral: true });
        
        try {
            // Créer la sauvegarde
            const backupData = await this.createBackup(interaction.guild, includeMessages);
            
            // Sauvegarder dans un fichier
            const backupPath = await this.saveBackupToFile(backupData, backupName, interaction.guild.id);
            
            // Enregistrer dans la base de données
            await this.saveBackupToDatabase(interaction, backupName, backupPath, backupData);
            
            // Logger l'action
            interaction.client.logger.logOwnerAction(
                interaction.user,
                'BACKUP_SERVER',
                {
                    guildId: interaction.guild.id,
                    guildName: interaction.guild.name,
                    backupName,
                    includeMessages,
                    backupSize: JSON.stringify(backupData).length
                }
            );
            
            // Créer l'embed de succès
            const successEmbed = this.createSuccessEmbed(backupData, backupName, backupPath);
            
            await interaction.editReply({ embeds: [successEmbed] });
            
            console.log(`💾 [Kofu] Sauvegarde "${backupName}" créée pour ${interaction.guild.name} par ${interaction.user.tag}`);
            
        } catch (error) {
            console.error('❌ [Kofu] Erreur lors de la sauvegarde:', error);
            
            const errorEmbed = KofuSignature.createErrorEmbed(
                'Erreur lors de la sauvegarde !',
                `Impossible de créer la sauvegarde du serveur.\n\n**Erreur:** \`${error.message}\``
            );
            
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },
    
    /**
     * Créer la sauvegarde complète du serveur
     * @param {Guild} guild - Le serveur Discord
     * @param {boolean} includeMessages - Inclure les messages
     * @returns {object} Données de sauvegarde
     * @author Kofu
     */
    async createBackup(guild, includeMessages = false) {
        console.log(`💾 [Kofu] Début de la sauvegarde pour ${guild.name}...`);
        
        const backup = {
            metadata: {
                guildId: guild.id,
                guildName: guild.name,
                createdAt: new Date(),
                createdBy: 'TASHKY Bot - Kofu',
                version: '1.0.0',
                includeMessages
            },
            guild: {},
            roles: [],
            channels: [],
            members: [],
            emojis: [],
            stickers: [],
            messages: includeMessages ? [] : null
        };
        
        // === INFORMATIONS DU SERVEUR ===
        console.log(`📊 [Kofu] Sauvegarde des informations du serveur...`);
        backup.guild = {
            name: guild.name,
            description: guild.description,
            icon: guild.iconURL({ dynamic: true, size: 2048 }),
            banner: guild.bannerURL({ dynamic: true, size: 2048 }),
            splash: guild.splashURL({ dynamic: true, size: 2048 }),
            discoverySplash: guild.discoverySplashURL({ dynamic: true, size: 2048 }),
            ownerId: guild.ownerId,
            region: guild.preferredLocale,
            afkChannelId: guild.afkChannelId,
            afkTimeout: guild.afkTimeout,
            systemChannelId: guild.systemChannelId,
            systemChannelFlags: guild.systemChannelFlags?.bitfield,
            rulesChannelId: guild.rulesChannelId,
            publicUpdatesChannelId: guild.publicUpdatesChannelId,
            verificationLevel: guild.verificationLevel,
            explicitContentFilter: guild.explicitContentFilter,
            defaultMessageNotifications: guild.defaultMessageNotifications,
            mfaLevel: guild.mfaLevel,
            nsfwLevel: guild.nsfwLevel,
            premiumTier: guild.premiumTier,
            premiumSubscriptionCount: guild.premiumSubscriptionCount,
            features: guild.features,
            memberCount: guild.memberCount,
            createdAt: guild.createdAt
        };
        
        // === RÔLES ===
        console.log(`🎭 [Kofu] Sauvegarde des rôles (${guild.roles.cache.size})...`);
        for (const [roleId, role] of guild.roles.cache) {
            if (role.name === '@everyone') continue; // Skip @everyone
            
            backup.roles.push({
                id: role.id,
                name: role.name,
                color: role.color,
                hoist: role.hoist,
                position: role.position,
                permissions: role.permissions.bitfield.toString(),
                mentionable: role.mentionable,
                managed: role.managed,
                icon: role.iconURL({ dynamic: true }),
                unicodeEmoji: role.unicodeEmoji,
                createdAt: role.createdAt
            });
        }
        
        // === SALONS ===
        console.log(`📺 [Kofu] Sauvegarde des salons (${guild.channels.cache.size})...`);
        for (const [channelId, channel] of guild.channels.cache) {
            const channelData = {
                id: channel.id,
                name: channel.name,
                type: channel.type,
                position: channel.position,
                parentId: channel.parentId,
                topic: channel.topic || null,
                nsfw: channel.nsfw || false,
                rateLimitPerUser: channel.rateLimitPerUser || 0,
                createdAt: channel.createdAt,
                permissionOverwrites: []
            };
            
            // Permissions spécifiques du salon
            for (const [overwriteId, overwrite] of channel.permissionOverwrites.cache) {
                channelData.permissionOverwrites.push({
                    id: overwrite.id,
                    type: overwrite.type,
                    allow: overwrite.allow.bitfield.toString(),
                    deny: overwrite.deny.bitfield.toString()
                });
            }
            
            // Propriétés spécifiques selon le type de salon
            if (channel.isVoiceBased()) {
                channelData.bitrate = channel.bitrate;
                channelData.userLimit = channel.userLimit;
                channelData.rtcRegion = channel.rtcRegion;
            }
            
            if (channel.isThread()) {
                channelData.archived = channel.archived;
                channelData.autoArchiveDuration = channel.autoArchiveDuration;
                channelData.locked = channel.locked;
            }
            
            backup.channels.push(channelData);
        }
        
        // === MEMBRES (échantillon) ===
        console.log(`👥 [Kofu] Sauvegarde des membres (échantillon de 100)...`);
        const members = await guild.members.fetch({ limit: 100 });
        for (const [memberId, member] of members) {
            backup.members.push({
                id: member.id,
                username: member.user.username,
                discriminator: member.user.discriminator,
                globalName: member.user.globalName,
                avatar: member.user.displayAvatarURL({ dynamic: true }),
                bot: member.user.bot,
                nickname: member.nickname,
                joinedAt: member.joinedAt,
                premiumSince: member.premiumSince,
                roles: member.roles.cache.map(r => r.id).filter(id => id !== guild.id),
                communicationDisabledUntil: member.communicationDisabledUntil
            });
        }
        
        // === EMOJIS ===
        console.log(`😀 [Kofu] Sauvegarde des emojis (${guild.emojis.cache.size})...`);
        for (const [emojiId, emoji] of guild.emojis.cache) {
            backup.emojis.push({
                id: emoji.id,
                name: emoji.name,
                animated: emoji.animated,
                url: emoji.url,
                managed: emoji.managed,
                available: emoji.available,
                createdAt: emoji.createdAt
            });
        }
        
        // === STICKERS ===
        console.log(`🏷️ [Kofu] Sauvegarde des stickers (${guild.stickers.cache.size})...`);
        for (const [stickerId, sticker] of guild.stickers.cache) {
            backup.stickers.push({
                id: sticker.id,
                name: sticker.name,
                description: sticker.description,
                tags: sticker.tags,
                format: sticker.format,
                url: sticker.url,
                available: sticker.available,
                createdAt: sticker.createdAt
            });
        }
        
        // === MESSAGES (échantillon) ===
        if (includeMessages) {
            console.log(`💬 [Kofu] Sauvegarde des messages (échantillon)...`);
            
            const textChannels = guild.channels.cache.filter(c => c.isTextBased() && !c.isThread());
            let messageCount = 0;
            const maxMessages = 1000; // Limite pour éviter les sauvegardes trop lourdes
            
            for (const [channelId, channel] of textChannels) {
                if (messageCount >= maxMessages) break;
                
                try {
                    const messages = await channel.messages.fetch({ limit: 50 });
                    
                    for (const [messageId, message] of messages) {
                        if (messageCount >= maxMessages) break;
                        
                        backup.messages.push({
                            id: message.id,
                            channelId: message.channelId,
                            authorId: message.author.id,
                            authorTag: message.author.tag,
                            content: message.content,
                            embeds: message.embeds.length,
                            attachments: message.attachments.size,
                            createdAt: message.createdAt,
                            editedAt: message.editedAt,
                            pinned: message.pinned,
                            reactions: message.reactions.cache.size
                        });
                        
                        messageCount++;
                    }
                } catch (error) {
                    console.log(`⚠️ [Kofu] Impossible de récupérer les messages de #${channel.name}`);
                }
            }
            
            console.log(`💬 [Kofu] ${messageCount} messages sauvegardés`);
        }
        
        console.log(`✅ [Kofu] Sauvegarde terminée pour ${guild.name}`);
        return backup;
    },
    
    /**
     * Sauvegarder dans un fichier
     * @param {object} backupData - Données de sauvegarde
     * @param {string} backupName - Nom de la sauvegarde
     * @param {string} guildId - ID du serveur
     * @returns {string} Chemin du fichier
     * @author Kofu
     */
    async saveBackupToFile(backupData, backupName, guildId) {
        const backupsDir = path.join(__dirname, '..', '..', 'database', 'backups');
        
        // Créer le dossier s'il n'existe pas
        if (!fs.existsSync(backupsDir)) {
            fs.mkdirSync(backupsDir, { recursive: true });
        }
        
        const fileName = `${backupName}-${guildId}-${Date.now()}.json`;
        const filePath = path.join(backupsDir, fileName);
        
        // Écrire le fichier
        fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));
        
        console.log(`💾 [Kofu] Sauvegarde écrite dans ${fileName}`);
        return filePath;
    },
    
    /**
     * Enregistrer la sauvegarde dans la base de données
     * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
     * @param {string} backupName - Nom de la sauvegarde
     * @param {string} backupPath - Chemin du fichier
     * @param {object} backupData - Données de sauvegarde
     * @author Kofu
     */
    async saveBackupToDatabase(interaction, backupName, backupPath, backupData) {
        try {
            const backupRecord = {
                id: `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name: backupName,
                guildId: interaction.guild.id,
                guildName: interaction.guild.name,
                createdBy: interaction.user.id,
                createdByTag: interaction.user.tag,
                createdAt: new Date(),
                filePath: backupPath,
                fileSize: JSON.stringify(backupData).length,
                includeMessages: backupData.metadata.includeMessages,
                statistics: {
                    roles: backupData.roles.length,
                    channels: backupData.channels.length,
                    members: backupData.members.length,
                    emojis: backupData.emojis.length,
                    stickers: backupData.stickers.length,
                    messages: backupData.messages ? backupData.messages.length : 0
                }
            };
            
            // Ajouter à la liste des sauvegardes
            const backupsData = interaction.client.database.read('backups/list.json') || { backups: [], lastUpdated: new Date() };
            backupsData.backups.push(backupRecord);
            backupsData.lastUpdated = new Date();
            
            interaction.client.database.write('backups/list.json', backupsData);
            
            console.log(`💾 [Kofu] Sauvegarde enregistrée en base de données: ${backupRecord.id}`);
            
        } catch (error) {
            console.error('❌ [Kofu] Erreur sauvegarde en BDD:', error);
        }
    },
    
    /**
     * Créer l'embed de succès
     * @param {object} backupData - Données de sauvegarde
     * @param {string} backupName - Nom de la sauvegarde
     * @param {string} backupPath - Chemin du fichier
     * @returns {EmbedBuilder} Embed de succès
     * @author Kofu
     */
    createSuccessEmbed(backupData, backupName, backupPath) {
        const fileSize = (JSON.stringify(backupData).length / 1024 / 1024).toFixed(2); // MB
        
        const embed = KofuSignature.createSuccessEmbed(
            'Sauvegarde créée !',
            `La sauvegarde "${backupName}" a été créée avec succès.`
        );
        
        embed.addFields(
            { name: '🏛️ Serveur', value: `${backupData.guild.name}\n\`${backupData.metadata.guildId}\``, inline: true },
            { name: '📝 Nom de sauvegarde', value: `\`${backupName}\``, inline: true },
            { name: '📊 Taille du fichier', value: `\`${fileSize} MB\``, inline: true },
            { name: '🎭 Rôles sauvegardés', value: `\`${backupData.roles.length}\``, inline: true },
            { name: '📺 Salons sauvegardés', value: `\`${backupData.channels.length}\``, inline: true },
            { name: '👥 Membres sauvegardés', value: `\`${backupData.members.length}\``, inline: true },
            { name: '😀 Emojis sauvegardés', value: `\`${backupData.emojis.length}\``, inline: true },
            { name: '🏷️ Stickers sauvegardés', value: `\`${backupData.stickers.length}\``, inline: true },
            { name: '💬 Messages sauvegardés', value: backupData.messages ? `\`${backupData.messages.length}\`` : '`0`', inline: true }
        );
        
        embed.addFields({
            name: '📁 Emplacement',
            value: `\`${path.basename(backupPath)}\``,
            inline: false
        });
        
        embed.addFields({
            name: '💡 Information',
            value: 'Cette sauvegarde peut être utilisée pour restaurer le serveur en cas de problème. Gardez-la précieusement !',
            inline: false
        });
        
        return embed;
    }
};

/**
 * ====================================
 * ✨ Made with ❤️ by Kofu
 * github.com/kofudev
 * ====================================
 */