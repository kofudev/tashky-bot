/**
 * ====================================
 * ÉVÉNEMENT: INTERACTION CREATE
 * ====================================
 * 
 * Gère toutes les interactions (commandes, boutons, etc.)
 * Système complet avec cooldowns et permissions
 * 
 * @author Kofu (github.com/kofudev)
 * ====================================
 */

const { Events, Collection } = require('discord.js');
const KofuSignature = require('../../utils/kofu-signature');

module.exports = {
    name: Events.InteractionCreate,
    
    /**
     * Exécution de l'événement interactionCreate
     * @param {Interaction} interaction - L'interaction Discord
     * @param {Client} client - Le client Discord
     * @author Kofu
     */
    async execute(interaction, client) {
        // Gérer les commandes slash
        if (interaction.isChatInputCommand()) {
            await handleSlashCommand(interaction, client);
        }
        
        // Gérer les boutons
        if (interaction.isButton()) {
            await handleButton(interaction, client);
        }
        
        // Gérer les menus déroulants
        if (interaction.isStringSelectMenu()) {
            await handleSelectMenu(interaction, client);
        }
        
        // Gérer les modals
        if (interaction.isModalSubmit()) {
            await handleModal(interaction, client);
        }
    }
};

/**
 * Gérer les commandes slash
 * @param {ChatInputCommandInteraction} interaction - L'interaction de commande
 * @param {Client} client - Le client Discord
 * @author Kofu
 */
async function handleSlashCommand(interaction, client) {
    const command = client.commands.get(interaction.commandName);
    
    if (!command) {
        console.warn(`⚠️ [Kofu] Commande inconnue: ${interaction.commandName}`);
        return;
    }
    
    try {
        // Vérifier si la commande est réservée aux owners
        if (command.ownerOnly) {
            const owners = process.env.BOT_OWNERS ? JSON.parse(process.env.BOT_OWNERS) : [];
            if (!owners.includes(interaction.user.id)) {
                const errorEmbed = KofuSignature.createErrorEmbed(
                    'Accès refusé !',
                    'Cette commande est réservée aux propriétaires du bot (Kofu & co).'
                );
                return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
        
        // Vérifier si la commande nécessite un serveur
        if (command.guildOnly && !interaction.guild) {
            const errorEmbed = KofuSignature.createErrorEmbed(
                'Serveur requis !',
                'Cette commande ne peut être utilisée qu\'sur un serveur Discord.'
            );
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
        
        // Vérifier les permissions de l'utilisateur
        if (command.permissions && interaction.guild) {
            const userPermissions = interaction.member.permissions;
            const missingPermissions = command.permissions.filter(perm => !userPermissions.has(perm));
            
            if (missingPermissions.length > 0) {
                const errorEmbed = KofuSignature.createErrorEmbed(
                    'Permissions insuffisantes !',
                    `Tu n'as pas les permissions nécessaires pour utiliser cette commande.\n\n` +
                    `**Permissions manquantes:**\n${missingPermissions.map(p => `• ${p}`).join('\n')}`
                );
                return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
        
        // Vérifier les permissions du bot
        if (command.botPermissions && interaction.guild) {
            const botPermissions = interaction.guild.members.me.permissions;
            const missingBotPermissions = command.botPermissions.filter(perm => !botPermissions.has(perm));
            
            if (missingBotPermissions.length > 0) {
                const errorEmbed = KofuSignature.createErrorEmbed(
                    'Permissions du bot insuffisantes !',
                    `Je n'ai pas les permissions nécessaires pour exécuter cette commande.\n\n` +
                    `**Permissions manquantes:**\n${missingBotPermissions.map(p => `• ${p}`).join('\n')}`
                );
                return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
        
        // Vérifier les cooldowns
        if (!client.cooldowns.has(command.data.name)) {
            client.cooldowns.set(command.data.name, new Collection());
        }
        
        const now = Date.now();
        const timestamps = client.cooldowns.get(command.data.name);
        const cooldownAmount = (command.cooldown || 3) * 1000;
        
        if (timestamps.has(interaction.user.id)) {
            const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;
            
            if (now < expirationTime) {
                const timeLeft = (expirationTime - now) / 1000;
                const embed = KofuSignature.createWarningEmbed(
                    'Cooldown actif !',
                    `Attends encore **${timeLeft.toFixed(1)}** secondes avant de réutiliser cette commande.`
                );
                
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
        }
        
        // Définir le cooldown
        timestamps.set(interaction.user.id, now);
        setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);
        
        // Exécuter la commande
        await command.execute(interaction);
        
        // Logger la commande
        client.logger.logCommand(interaction, command.data.name, true);
        
        // Mettre à jour les statistiques utilisateur
        await updateUserStats(interaction, client);
        
        console.log(`⚙️ [Kofu] Commande exécutée: ${command.data.name} par ${interaction.user.tag}`);
        
    } catch (error) {
        console.error(`❌ [Kofu] Erreur commande ${command.data.name}:`, error);
        
        // Logger l'erreur
        client.logger.logCommand(interaction, command.data.name, false);
        client.logger.error(`Erreur commande ${command.data.name}`, error);
        
        // Répondre avec une erreur
        const embed = KofuSignature.createErrorEmbed(
            'Erreur !',
            `Une erreur est survenue lors de l'exécution de cette commande.\n\n\`\`\`${error.message}\`\`\``
        );
        
        const method = interaction.replied || interaction.deferred ? 'followUp' : 'reply';
        await interaction[method]({ embeds: [embed], ephemeral: true }).catch(() => {});
    }
}

/**
 * Gérer les interactions de boutons
 * @param {ButtonInteraction} interaction - L'interaction de bouton
 * @param {Client} client - Le client Discord
 * @author Kofu
 */
async function handleButton(interaction, client) {
    const buttonId = interaction.customId;
    
    console.log(`🔘 [Kofu] Bouton cliqué: ${buttonId} par ${interaction.user.tag}`);
    
    try {
        // Gérer les boutons de tickets
        if (buttonId.startsWith('ticket_')) {
            await handleTicketButton(interaction, client);
            return;
        }
        
        // Gérer les boutons du panel owner
        if (buttonId.startsWith('owner_')) {
            await handleOwnerButton(interaction, client);
            return;
        }
        
        // Gérer les boutons de pagination
        if (['first', 'previous', 'next', 'last'].includes(buttonId)) {
            // La pagination est gérée dans les commandes individuelles
            return;
        }
        
        // Bouton non reconnu
        const errorEmbed = KofuSignature.createWarningEmbed(
            'Bouton non reconnu',
            'Ce bouton n\'est plus actif ou n\'est pas reconnu par le système.'
        );
        
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        
    } catch (error) {
        console.error(`❌ [Kofu] Erreur bouton ${buttonId}:`, error);
        
        const errorEmbed = KofuSignature.createErrorEmbed(
            'Erreur de bouton !',
            `Une erreur est survenue: \`${error.message}\``
        );
        
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
    }
}

/**
 * Gérer les menus déroulants
 * @param {StringSelectMenuInteraction} interaction - L'interaction de menu
 * @param {Client} client - Le client Discord
 * @author Kofu
 */
async function handleSelectMenu(interaction, client) {
    const menuId = interaction.customId;
    const selectedValues = interaction.values;
    
    console.log(`📋 [Kofu] Menu utilisé: ${menuId} par ${interaction.user.tag} - Valeurs: ${selectedValues.join(', ')}`);
    
    try {
        // Gérer le menu d'aide
        if (menuId === 'help_category_select') {
            // Géré dans la commande help
            return;
        }
        
        // Gérer le menu de langue
        if (menuId === 'language_select') {
            // Géré dans la commande language
            return;
        }
        
        // Gérer les menus du panel owner
        if (menuId.startsWith('owner_')) {
            await handleOwnerMenu(interaction, client);
            return;
        }
        
        // Menu non reconnu
        const errorEmbed = KofuSignature.createWarningEmbed(
            'Menu non reconnu',
            'Ce menu n\'est plus actif ou n\'est pas reconnu par le système.'
        );
        
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        
    } catch (error) {
        console.error(`❌ [Kofu] Erreur menu ${menuId}:`, error);
        
        const errorEmbed = KofuSignature.createErrorEmbed(
            'Erreur de menu !',
            `Une erreur est survenue: \`${error.message}\``
        );
        
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
    }
}

/**
 * Gérer les modals
 * @param {ModalSubmitInteraction} interaction - L'interaction de modal
 * @param {Client} client - Le client Discord
 * @author Kofu
 */
async function handleModal(interaction, client) {
    const modalId = interaction.customId;
    
    console.log(`📝 [Kofu] Modal soumis: ${modalId} par ${interaction.user.tag}`);
    
    try {
        // Gérer les modals de tickets
        if (modalId.startsWith('ticket_')) {
            await handleTicketModal(interaction, client);
            return;
        }
        
        // Modal non reconnu
        const errorEmbed = KofuSignature.createWarningEmbed(
            'Modal non reconnu',
            'Ce formulaire n\'est plus actif ou n\'est pas reconnu par le système.'
        );
        
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        
    } catch (error) {
        console.error(`❌ [Kofu] Erreur modal ${modalId}:`, error);
        
        const errorEmbed = KofuSignature.createErrorEmbed(
            'Erreur de formulaire !',
            `Une erreur est survenue: \`${error.message}\``
        );
        
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
    }
}

/**
 * Mettre à jour les statistiques utilisateur
 * @param {ChatInputCommandInteraction} interaction - L'interaction
 * @param {Client} client - Le client Discord
 * @author Kofu
 */
async function updateUserStats(interaction, client) {
    try {
        const userData = client.database.getUser(interaction.user.id);
        
        // Mettre à jour les stats de base
        userData.username = interaction.user.username;
        userData.discriminator = interaction.user.discriminator;
        userData.avatar = interaction.user.displayAvatarURL({ dynamic: true });
        userData.globalStats.totalCommands++;
        userData.globalStats.lastSeen = new Date();
        
        // Ajouter le serveur s'il n'est pas déjà dans la liste
        if (interaction.guild && !userData.servers.includes(interaction.guild.id)) {
            userData.servers.push(interaction.guild.id);
        }
        
        // Sauvegarder
        client.database.setUser(interaction.user.id, userData);
        
    } catch (error) {
        console.error('❌ [Kofu] Erreur mise à jour stats utilisateur:', error);
    }
}

// Fonctions de gestion spécialisées
async function handleTicketButton(interaction, client) {
    const { handleTicketButtons } = require('./ticketButtons');
    await handleTicketButtons(interaction);
}

async function handleOwnerButton(interaction, client) {
    // TODO: Implémenter la gestion des boutons owner
    await interaction.reply({ content: '👑 Panel owner en cours de développement...', ephemeral: true });
}

async function handleOwnerMenu(interaction, client) {
    // TODO: Implémenter la gestion des menus owner
    await interaction.reply({ content: '👑 Menu owner en cours de développement...', ephemeral: true });
}

async function handleTicketModal(interaction, client) {
    // TODO: Implémenter la gestion des modals de tickets
    await interaction.reply({ content: '🎫 Modal de ticket en cours de développement...', ephemeral: true });
}

/**
 * ====================================
 * ✨ Made with ❤️ by Kofu
 * github.com/kofudev
 * ====================================
 */