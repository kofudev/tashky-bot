/**
 * ====================================
 * COMMANDE: /avatar
 * ====================================
 * 
 * Afficher l'avatar d'un utilisateur
 * En haute qualité avec liens de téléchargement
 * 
 * @author Kofu (github.com/kofudev)
 * @category General
 * ====================================
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const KofuSignature = require('../../utils/kofu-signature');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('🖼️ Afficher l\'avatar d\'un utilisateur')
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('Utilisateur dont afficher l\'avatar (vous par défaut)')
                .setRequired(false)
        )
        .addIntegerOption(option =>
            option.setName('taille')
                .setDescription('Taille de l\'avatar')
                .setRequired(false)
                .addChoices(
                    { name: '128px', value: 128 },
                    { name: '256px', value: 256 },
                    { name: '512px', value: 512 },
                    { name: '1024px', value: 1024 },
                    { name: '2048px (Max)', value: 2048 }
                )
        ),
    
    category: 'general',
    cooldown: 3,
    guildOnly: false,
    
    /**
     * Exécution de la commande avatar
     * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
     * @author Kofu
     */
    async execute(interaction) {
        const targetUser = interaction.options.getUser('utilisateur') || interaction.user;
        const size = interaction.options.getInteger('taille') || 1024;
        
        try {
            // Récupérer les avatars
            const avatarInfo = await this.getAvatarInfo(targetUser, interaction, size);
            
            // Créer l'embed principal
            const avatarEmbed = this.createAvatarEmbed(avatarInfo, targetUser, size);
            
            // Créer les boutons de téléchargement
            const buttons = this.createDownloadButtons(avatarInfo);
            
            await interaction.reply({
                embeds: [avatarEmbed],
                components: buttons.length > 0 ? [buttons] : []
            });
            
            console.log(`🖼️ [Kofu] ${interaction.user.tag} a consulté l'avatar de ${targetUser.tag}`);
            
        } catch (error) {
            console.error('❌ [Kofu] Erreur dans avatar:', error);
            
            const errorEmbed = KofuSignature.createErrorEmbed(
                'Erreur !',
                `Impossible de récupérer l'avatar de ${targetUser.tag}.\n\n**Erreur:** \`${error.message}\``
            );
            
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    },
    
    /**
     * Récupérer les informations d'avatar
     * @param {User} user - L'utilisateur Discord
     * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
     * @param {number} size - Taille de l'avatar
     * @returns {object} Informations d'avatar
     * @author Kofu
     */
    async getAvatarInfo(user, interaction, size) {
        const info = {
            global: null,
            server: null,
            hasServerAvatar: false,
            hasGlobalAvatar: false
        };
        
        // === AVATAR GLOBAL ===
        if (user.avatar) {
            info.hasGlobalAvatar = true;
            info.global = {
                url: user.displayAvatarURL({ dynamic: true, size: size }),
                png: user.displayAvatarURL({ extension: 'png', size: size }),
                jpg: user.displayAvatarURL({ extension: 'jpg', size: size }),
                webp: user.displayAvatarURL({ extension: 'webp', size: size }),
                gif: user.avatar.startsWith('a_') ? user.displayAvatarURL({ extension: 'gif', size: size }) : null,
                animated: user.avatar.startsWith('a_'),
                hash: user.avatar
            };
        } else {
            // Avatar par défaut
            info.hasGlobalAvatar = false;
            info.global = {
                url: user.displayAvatarURL({ size: size }),
                png: user.displayAvatarURL({ extension: 'png', size: size }),
                jpg: null,
                webp: null,
                gif: null,
                animated: false,
                hash: null,
                isDefault: true
            };
        }
        
        // === AVATAR DU SERVEUR ===
        if (interaction.guild) {
            try {
                const member = await interaction.guild.members.fetch(user.id);
                
                if (member.avatar) {
                    info.hasServerAvatar = true;
                    info.server = {
                        url: member.displayAvatarURL({ dynamic: true, size: size }),
                        png: member.displayAvatarURL({ extension: 'png', size: size }),
                        jpg: member.displayAvatarURL({ extension: 'jpg', size: size }),
                        webp: member.displayAvatarURL({ extension: 'webp', size: size }),
                        gif: member.avatar.startsWith('a_') ? member.displayAvatarURL({ extension: 'gif', size: size }) : null,
                        animated: member.avatar.startsWith('a_'),
                        hash: member.avatar
                    };
                }
            } catch (error) {
                // L'utilisateur n'est pas sur le serveur
            }
        }
        
        return info;
    },
    
    /**
     * Créer l'embed d'avatar
     * @param {object} avatarInfo - Informations d'avatar
     * @param {User} user - L'utilisateur Discord
     * @param {number} size - Taille de l'avatar
     * @returns {EmbedBuilder} Embed d'avatar
     * @author Kofu
     */
    createAvatarEmbed(avatarInfo, user, size) {
        const embed = new EmbedBuilder()
            .setTitle(`🖼️ Avatar de ${user.tag}`)
            .setColor('#5865F2')
            .setFooter(KofuSignature.getKofuFooter())
            .setTimestamp();
        
        // Déterminer quel avatar afficher
        let displayAvatar, avatarType, avatarDetails;
        
        if (avatarInfo.hasServerAvatar) {
            displayAvatar = avatarInfo.server.url;
            avatarType = '🏛️ Avatar du serveur';
            avatarDetails = avatarInfo.server;
        } else {
            displayAvatar = avatarInfo.global.url;
            avatarType = avatarInfo.global.isDefault ? '🎭 Avatar par défaut' : '🌍 Avatar global';
            avatarDetails = avatarInfo.global;
        }
        
        embed.setImage(displayAvatar);
        
        // Description avec informations
        let description = `**${avatarType}** - Taille: ${size}px\n\n`;
        
        if (avatarDetails.animated) {
            description += '✨ **Avatar animé (GIF)**\n';
        }
        
        if (avatarInfo.hasServerAvatar && avatarInfo.hasGlobalAvatar) {
            description += '💡 Cet utilisateur a un avatar spécifique à ce serveur.\n';
        }
        
        if (avatarDetails.isDefault) {
            description += '💡 Cet utilisateur utilise l\'avatar par défaut de Discord.\n';
        }
        
        embed.setDescription(description);
        
        // Informations techniques
        embed.addFields(
            { name: '👤 Utilisateur', value: `${user.tag}\n\`${user.id}\``, inline: true },
            { name: '📏 Résolution', value: `${size}x${size}px`, inline: true },
            { name: '🎨 Type', value: avatarDetails.animated ? 'GIF Animé' : 'Image Statique', inline: true }
        );
        
        if (avatarDetails.hash) {
            embed.addFields({
                name: '🔗 Hash',
                value: `\`${avatarDetails.hash}\``,
                inline: false
            });
        }
        
        // Formats disponibles
        const formats = [];
        if (avatarDetails.png) formats.push('PNG');
        if (avatarDetails.jpg) formats.push('JPG');
        if (avatarDetails.webp) formats.push('WebP');
        if (avatarDetails.gif) formats.push('GIF');
        
        if (formats.length > 0) {
            embed.addFields({
                name: '📁 Formats disponibles',
                value: formats.join(' • '),
                inline: false
            });
        }
        
        // Note sur les avatars multiples
        if (avatarInfo.hasServerAvatar && avatarInfo.hasGlobalAvatar) {
            embed.addFields({
                name: '💡 Note',
                value: 'Cet utilisateur a deux avatars : un global et un spécifique à ce serveur. L\'avatar du serveur est affiché en priorité.',
                inline: false
            });
        }
        
        return embed;
    },
    
    /**
     * Créer les boutons de téléchargement
     * @param {object} avatarInfo - Informations d'avatar
     * @returns {ActionRowBuilder} Row de boutons
     * @author Kofu
     */
    createDownloadButtons(avatarInfo) {
        const buttons = new ActionRowBuilder();
        
        // Déterminer quel avatar utiliser pour les boutons
        const avatar = avatarInfo.hasServerAvatar ? avatarInfo.server : avatarInfo.global;
        
        // Bouton PNG (toujours disponible)
        if (avatar.png) {
            buttons.addComponents(
                new ButtonBuilder()
                    .setLabel('PNG')
                    .setURL(avatar.png)
                    .setStyle(ButtonStyle.Link)
                    .setEmoji('🖼️')
            );
        }
        
        // Bouton JPG (si disponible)
        if (avatar.jpg) {
            buttons.addComponents(
                new ButtonBuilder()
                    .setLabel('JPG')
                    .setURL(avatar.jpg)
                    .setStyle(ButtonStyle.Link)
                    .setEmoji('📸')
            );
        }
        
        // Bouton WebP (si disponible)
        if (avatar.webp) {
            buttons.addComponents(
                new ButtonBuilder()
                    .setLabel('WebP')
                    .setURL(avatar.webp)
                    .setStyle(ButtonStyle.Link)
                    .setEmoji('🌐')
            );
        }
        
        // Bouton GIF (si animé)
        if (avatar.gif) {
            buttons.addComponents(
                new ButtonBuilder()
                    .setLabel('GIF')
                    .setURL(avatar.gif)
                    .setStyle(ButtonStyle.Link)
                    .setEmoji('✨')
            );
        }
        
        // Bouton avatar global (si on affiche l'avatar du serveur)
        if (avatarInfo.hasServerAvatar && avatarInfo.hasGlobalAvatar) {
            buttons.addComponents(
                new ButtonBuilder()
                    .setLabel('Avatar Global')
                    .setURL(avatarInfo.global.url)
                    .setStyle(ButtonStyle.Link)
                    .setEmoji('🌍')
            );
        }
        
        return buttons;
    }
};

/**
 * ====================================
 * ✨ Made with ❤️ by Kofu
 * github.com/kofudev
 * ====================================
 */