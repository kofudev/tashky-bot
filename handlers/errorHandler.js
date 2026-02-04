/**
 * ====================================
 * TASHKY BOT - ERROR HANDLER
 * ====================================
 * 
 * Gestionnaire global des erreurs du bot
 * Capture et log toutes les erreurs
 * 
 * @author Kofu (github.com/kofudev)
 * @version 1.0.0
 * @license MIT
 * 
 * ====================================
 */

const { Events } = require('discord.js');

/**
 * Initialiser la gestion d'erreurs globale
 * @param {Client} client - Le client Discord
 * @author Kofu
 */
function initializeErrorHandler(client) {
    console.log('🛡️ [Kofu] Initialisation du gestionnaire d\'erreurs...');
    
    // Erreurs du client Discord
    client.on(Events.Error, (error) => {
        console.error('💥 [Kofu] Erreur client Discord:', error);
        client.logger.logCriticalError('Discord Client Error', error);
    });
    
    // Warnings du client Discord
    client.on(Events.Warn, (warning) => {
        console.warn('⚠️ [Kofu] Warning client Discord:', warning);
        client.logger.warn('Discord Client Warning', { warning });
    });
    
    // Debug du client Discord (seulement en développement)
    if (process.env.NODE_ENV === 'development' && process.env.DEBUG_MODE === 'true') {
        client.on(Events.Debug, (info) => {
            console.log('🐛 [Kofu] Debug Discord:', info);
        });
    }
    
    // Erreurs de rate limit
    client.rest.on('rateLimited', (rateLimitData) => {
        console.warn('🚦 [Kofu] Rate limit atteint:', rateLimitData);
        client.logger.warn('Rate Limit Hit', rateLimitData);
    });
    
    console.log('✅ [Kofu] Gestionnaire d\'erreurs initialisé !');
}

/**
 * Gérer une erreur de commande
 * @param {Error} error - L'erreur
 * @param {Interaction} interaction - L'interaction qui a causé l'erreur
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
                name: interaction.channel.name
            }
        }
    );
    
    // Créer un embed d'erreur
    const errorEmbed = {
        color: 0xF04747,
        title: '❌ Erreur !',
        description: 'Une erreur est survenue lors de l\'exécution de cette commande.',
        fields: [
            {
                name: '🐛 Détails de l\'erreur',
                value: `\`\`\`${error.message}\`\`\``,
                inline: false
            },
            {
                name: '🔧 Que faire ?',
                value: '• Réessayez dans quelques secondes\n• Si le problème persiste, contactez le support\n• Vérifiez que vous utilisez la commande correctement',
                inline: false
            }
        ],
        footer: {
            text: '✨ Made with ❤️ by Kofu | TASHKY Bot',
            icon_url: 'https://i.imgur.com/kofu-avatar.png'
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
            icon_url: 'https://i.imgur.com/kofu-avatar.png'
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
            icon_url: 'https://i.imgur.com/kofu-avatar.png'
        },
        timestamp: new Date().toISOString()
    };
    
    try {
        await interaction.reply({ embeds: [cooldownEmbed], ephemeral: true });
    } catch (replyError) {
        console.error('❌ [Kofu] Impossible de répondre au cooldown:', replyError);
    }
}

/**
 * Créer un rapport d'erreur détaillé
 * @param {Error} error - L'erreur
 * @param {object} context - Contexte de l'erreur
 * @returns {object} Rapport d'erreur
 * @author Kofu
 */
function createErrorReport(error, context = {}) {
    return {
        timestamp: new Date().toISOString(),
        error: {
            name: error.name,
            message: error.message,
            stack: error.stack
        },
        context,
        botInfo: {
            version: process.env.BOT_VERSION || '1.0.0',
            nodeVersion: process.version,
            platform: process.platform
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