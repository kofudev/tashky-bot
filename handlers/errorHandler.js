/**
 * ====================================
 * TASHKY BOT - GESTIONNAIRE D'ERREURS
 * ====================================
 * 
 * Système complet de gestion des erreurs
 * Logging, notifications et récupération
 * 
 * @author Kofu (github.com/kofudev)
 * @version 1.0.0
 * @license MIT
 * 
 * ====================================
 */

/**
 * Initialiser le gestionnaire d'erreurs global
 * @param {Client} client - Le client Discord
 * @author Kofu
 */
function initializeErrorHandler(client) {
    console.log('🛡️ [Kofu] Initialisation du gestionnaire d\'erreurs...');
    
    // Erreurs Discord.js
    client.on('error', error => {
        console.error('❌ [Kofu] Erreur client Discord:', error);
        client.logger.logCriticalError('Discord Client Error', error);
    });
    
    client.on('warn', warning => {
        console.warn('⚠️ [Kofu] Avertissement Discord:', warning);
        client.logger.warn('Discord Warning', warning);
    });
    
    client.on('debug', info => {
        if (process.env.DEBUG_MODE === 'true') {
            console.log('🔍 [Kofu] Debug Discord:', info);
        }
    });
    
    // Erreurs de connexion
    client.on('shardError', error => {
        console.error('❌ [Kofu] Erreur shard:', error);
        client.logger.logCriticalError('Shard Error', error);
    });
    
    client.on('shardDisconnect', (event, id) => {
        console.warn(`⚠️ [Kofu] Shard ${id} déconnecté:`, event);
        client.logger.warn('Shard Disconnect', { event, shardId: id });
    });
    
    client.on('shardReconnecting', id => {
        console.log(`🔄 [Kofu] Shard ${id} en reconnexion...`);
        client.logger.info('Shard Reconnecting', { shardId: id });
    });
    
    console.log('✅ [Kofu] Gestionnaire d\'erreurs initialisé !');
}

/**
 * Gérer une erreur de commande
 * @param {Error} error - L'erreur
 * @param {Interaction} interaction - L'interaction Discord
 * @param {Client} client - Le client Discord
 * @author Kofu
 */
async function handleCommandError(error, interaction, client) {
    console.error(`❌ [Kofu] Erreur commande ${interaction.commandName}:`, error);
    
    // Logger l'erreur
    client.logger.logCriticalError(
        `Command Error: ${interaction.commandName}`,
        error,
        {
            user: {
                id: interaction.user.id,
                tag: interaction.user.tag
            },
            guild: interaction.guild ? {
                id: interaction.guild.id,
                name: interaction.guild.name
            } : null,
            channel: {
                id: interaction.channel.id,
                type: interaction.channel.type
            }
        }
    );
    
    // Créer un rapport d'erreur
    const errorReport = createErrorReport(error, interaction);
    
    // Envoyer le rapport via webhook si configuré
    await sendErrorWebhook(errorReport, client);
    
    // Créer un embed d'erreur pour l'utilisateur
    const errorEmbed = {
        color: 0xF04747,
        title: '❌ Une erreur est survenue !',
        description: 'Une erreur inattendue s\'est produite lors de l\'exécution de cette commande.',
        fields: [
            {
                name: '🔧 Que faire ?',
                value: '• Réessayez dans quelques instants\n• Vérifiez que la commande est correcte\n• Contactez le support si le problème persiste',
                inline: false
            },
            {
                name: '📊 Informations techniques',
                value: `**Commande:** \`${interaction.commandName}\`\n**Erreur:** \`${error.name}\`\n**ID:** \`${errorReport.id}\``,
                inline: false
            }
        ],
        footer: {
            text: '✨ Made with ❤️ by Kofu | TASHKY Bot',
            icon_url: 'https://cdn.discordapp.com/embed/avatars/0.png'
        },
        timestamp: new Date().toISOString()
    };
    
    try {
        // Répondre à l'interaction avec l'erreur
        const method = interaction.replied || interaction.deferred ? 'followUp' : 'reply';
        await interaction[method]({ embeds: [errorEmbed], ephemeral: true });
    } catch (replyError) {
        console.error('❌ [Kofu] Impossible de répondre à l\'erreur:', replyError);
    }
}

/**
 * Gérer une erreur d'événement
 * @param {Error} error - L'erreur
 * @param {string} eventName - Nom de l'événement
 * @param {Client} client - Le client Discord
 * @author Kofu
 */
function handleEventError(error, eventName, client) {
    console.error(`❌ [Kofu] Erreur événement ${eventName}:`, error);
    
    // Logger l'erreur
    client.logger.logCriticalError(
        `Event Error: ${eventName}`,
        error
    );
}

/**
 * Gérer les erreurs de base de données
 * @param {Error} error - L'erreur
 * @param {string} operation - L'opération qui a échoué
 * @param {Client} client - Le client Discord
 * @author Kofu
 */
function handleDatabaseError(error, operation, client) {
    console.error(`❌ [Kofu] Erreur base de données (${operation}):`, error);
    
    // Logger l'erreur
    client.logger.logCriticalError(
        `Database Error: ${operation}`,
        error
    );
}

/**
 * Gérer les erreurs de permissions
 * @param {string} permission - Permission manquante
 * @param {Interaction} interaction - L'interaction
 * @param {Client} client - Le client Discord
 * @author Kofu
 */
async function handlePermissionError(permission, interaction, client) {
    console.warn(`⚠️ [Kofu] Permission manquante: ${permission} pour ${interaction.user.tag}`);
    
    // Logger l'avertissement
    client.logger.warn('Permission Error', {
        permission,
        user: {
            id: interaction.user.id,
            tag: interaction.user.tag
        },
        guild: interaction.guild ? {
            id: interaction.guild.id,
            name: interaction.guild.name
        } : null
    });
    
    // Créer un embed d'erreur de permission
    const permissionEmbed = {
        color: 0xFAA61A,
        title: '⚠️ Permission manquante !',
        description: `Je n'ai pas la permission **${permission}** nécessaire pour effectuer cette action.`,
        fields: [
            {
                name: '🔧 Comment résoudre ?',
                value: '• Vérifiez que j\'ai les bonnes permissions sur ce serveur\n• Contactez un administrateur\n• Assurez-vous que mon rôle est au-dessus des rôles que je dois gérer',
                inline: false
            }
        ],
        footer: {
            text: '✨ Made with ❤️ by Kofu | TASHKY Bot',
            icon_url: 'https://cdn.discordapp.com/embed/avatars/0.png'
        },
        timestamp: new Date().toISOString()
    };
    
    try {
        const method = interaction.replied || interaction.deferred ? 'followUp' : 'reply';
        await interaction[method]({ embeds: [permissionEmbed], ephemeral: true });
    } catch (replyError) {
        console.error('❌ [Kofu] Impossible de répondre à l\'erreur de permission:', replyError);
    }
}

/**
 * Gérer les erreurs de cooldown
 * @param {number} timeLeft - Temps restant en secondes
 * @param {Interaction} interaction - L'interaction
 * @author Kofu
 */
async function handleCooldownError(timeLeft, interaction) {
    const cooldownEmbed = {
        color: 0xFAA61A,
        title: '⏳ Cooldown actif !',
        description: `Attends encore **${timeLeft.toFixed(1)}** secondes avant de réutiliser cette commande.`,
        footer: {
            text: '✨ Made with ❤️ by Kofu | TASHKY Bot',
            icon_url: 'https://cdn.discordapp.com/embed/avatars/0.png'
        },
        timestamp: new Date().toISOString()
    };
    
    try {
        await interaction.reply({ embeds: [cooldownEmbed], ephemeral: true });
    } catch (replyError) {
        console.error('❌ [Kofu] Impossible de répondre à l\'erreur de cooldown:', replyError);
    }
}

/**
 * Créer un rapport d'erreur détaillé
 * @param {Error} error - L'erreur
 * @param {Interaction} interaction - L'interaction Discord
 * @returns {object} Rapport d'erreur
 * @author Kofu
 */
function createErrorReport(error, interaction) {
    return {
        id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        error: {
            name: error.name,
            message: error.message,
            stack: error.stack
        },
        command: {
            name: interaction.commandName,
            type: interaction.type,
            options: interaction.options ? interaction.options.data : null
        },
        user: {
            id: interaction.user.id,
            tag: interaction.user.tag,
            bot: interaction.user.bot
        },
        guild: interaction.guild ? {
            id: interaction.guild.id,
            name: interaction.guild.name,
            memberCount: interaction.guild.memberCount
        } : null,
        channel: {
            id: interaction.channel.id,
            type: interaction.channel.type,
            name: interaction.channel.name || 'DM'
        },
        environment: {
            nodeVersion: process.version,
            platform: process.platform,
            memory: process.memoryUsage()
        }
    };
}

/**
 * Envoyer un rapport d'erreur via webhook (si configuré)
 * @param {object} errorReport - Le rapport d'erreur
 * @param {Client} client - Le client Discord
 * @author Kofu
 */
async function sendErrorWebhook(errorReport, client) {
    const webhookUrl = process.env.ERROR_WEBHOOK;
    if (!webhookUrl) return;
    
    try {
        // Ici, vous pourriez implémenter l'envoi via webhook
        // Pour l'instant, on log juste
        console.log('📤 [Kofu] Rapport d\'erreur prêt pour webhook:', errorReport);
    } catch (error) {
        console.error('❌ [Kofu] Erreur envoi webhook:', error);
    }
}

// Exporter les fonctions
module.exports = initializeErrorHandler;
module.exports.handleCommandError = handleCommandError;
module.exports.handleEventError = handleEventError;
module.exports.handleDatabaseError = handleDatabaseError;
module.exports.handlePermissionError = handlePermissionError;
module.exports.handleCooldownError = handleCooldownError;
module.exports.createErrorReport = createErrorReport;
module.exports.sendErrorWebhook = sendErrorWebhook;

/**
 * ====================================
 * ✨ Made with ❤️ by Kofu
 * github.com/kofudev
 * ====================================
 */