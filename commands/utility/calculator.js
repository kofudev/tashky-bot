/**
 * ====================================
 * COMMANDE: /calculator
 * ====================================
 * 
 * Calculatrice avancée avec interface interactive
 * Supporte les opérations mathématiques complexes
 * 
 * @author Kofu (github.com/kofudev)
 * @category Utility
 * ====================================
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const KofuSignature = require('../../utils/kofu-signature');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('calculator')
        .setDescription('🧮 Calculatrice interactive')
        .addStringOption(option =>
            option.setName('expression')
                .setDescription('Expression mathématique à calculer (optionnel)')
                .setRequired(false)
        ),
    
    category: 'utility',
    cooldown: 5,
    
    /**
     * Exécution de la commande calculator
     * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
     * @author Kofu
     */
    async execute(interaction) {
        const expression = interaction.options.getString('expression');
        
        if (expression) {
            // Calcul direct
            await performCalculation(interaction, expression);
        } else {
            // Calculatrice interactive
            await showInteractiveCalculator(interaction);
        }
    }
};

/**
 * Effectuer un calcul direct
 * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
 * @param {string} expression - Expression à calculer
 * @author Kofu
 */
async function performCalculation(interaction, expression) {
    try {
        // Nettoyer et valider l'expression
        const cleanExpression = cleanMathExpression(expression);
        
        if (!isValidExpression(cleanExpression)) {
            const errorEmbed = KofuSignature.createErrorEmbed(
                'Expression invalide !',
                `L'expression \`${expression}\` n'est pas valide.\n\n` +
                '**Opérations supportées :**\n' +
                '• Addition: `+`\n' +
                '• Soustraction: `-`\n' +
                '• Multiplication: `*` ou `×`\n' +
                '• Division: `/` ou `÷`\n' +
                '• Puissance: `^` ou `**`\n' +
                '• Parenthèses: `(` `)`\n' +
                '• Racine carrée: `sqrt(x)`\n' +
                '• Fonctions: `sin`, `cos`, `tan`, `log`'
            );
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
        
        // Calculer le résultat
        const result = evaluateExpression(cleanExpression);
        
        // Créer l'embed de résultat
        const resultEmbed = new EmbedBuilder()
            .setTitle('🧮 Résultat du Calcul')
            .setColor('#00FF00')
            .addFields(
                { name: '📝 Expression', value: `\`${expression}\``, inline: false },
                { name: '✨ Résultat', value: `\`${result}\``, inline: false }
            )
            .setFooter(KofuSignature.getKofuFooter())
            .setTimestamp();
        
        // Ajouter des informations supplémentaires si le nombre est intéressant
        const additionalInfo = getNumberInfo(result);
        if (additionalInfo) {
            resultEmbed.addFields({
                name: '💡 Informations',
                value: additionalInfo,
                inline: false
            });
        }
        
        await interaction.reply({ embeds: [resultEmbed] });
        
        console.log(`🧮 [Kofu] ${interaction.user.tag} a calculé: ${expression} = ${result}`);
        
    } catch (error) {
        console.error('❌ [Kofu] Erreur calcul:', error);
        
        const errorEmbed = KofuSignature.createErrorEmbed(
            'Erreur de calcul !',
            `Impossible de calculer l'expression \`${expression}\`.\n\n**Erreur:** \`${error.message}\``
        );
        
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
}

/**
 * Afficher la calculatrice interactive
 * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
 * @author Kofu
 */
async function showInteractiveCalculator(interaction) {
    let currentExpression = '';
    let lastResult = 0;
    
    const calculatorEmbed = createCalculatorEmbed(currentExpression, null);
    const calculatorButtons = createCalculatorButtons();
    
    await interaction.reply({
        embeds: [calculatorEmbed],
        components: calculatorButtons
    });
    
    // Collector pour les boutons
    const collector = interaction.channel.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time: 300000 // 5 minutes
    });
    
    collector.on('collect', async i => {
        const buttonId = i.customId;
        
        try {
            if (buttonId === 'calc_clear') {
                currentExpression = '';
                lastResult = 0;
            } else if (buttonId === 'calc_delete') {
                currentExpression = currentExpression.slice(0, -1);
            } else if (buttonId === 'calc_equals') {
                if (currentExpression) {
                    const cleanExpr = cleanMathExpression(currentExpression);
                    if (isValidExpression(cleanExpr)) {
                        lastResult = evaluateExpression(cleanExpr);
                        currentExpression = lastResult.toString();
                    }
                }
            } else if (buttonId.startsWith('calc_')) {
                const value = buttonId.replace('calc_', '');
                
                // Remplacer les symboles spéciaux
                const symbolMap = {
                    'multiply': '*',
                    'divide': '/',
                    'plus': '+',
                    'minus': '-',
                    'dot': '.',
                    'leftparen': '(',
                    'rightparen': ')',
                    'power': '^'
                };
                
                const actualValue = symbolMap[value] || value;
                currentExpression += actualValue;
            }
            
            // Limiter la longueur de l'expression
            if (currentExpression.length > 50) {
                currentExpression = currentExpression.slice(0, 50);
            }
            
            const newEmbed = createCalculatorEmbed(currentExpression, lastResult);
            await i.update({ embeds: [newEmbed], components: calculatorButtons });
            
        } catch (error) {
            console.error('❌ [Kofu] Erreur calculatrice interactive:', error);
            
            const errorEmbed = KofuSignature.createErrorEmbed(
                'Erreur de calcul !',
                `Erreur: \`${error.message}\``
            );
            
            await i.update({ embeds: [errorEmbed], components: calculatorButtons });
        }
    });
    
    collector.on('end', () => {
        // Désactiver les boutons après expiration
        const disabledButtons = createCalculatorButtons(true);
        interaction.editReply({ components: disabledButtons }).catch(() => {});
    });
}

/**
 * Créer l'embed de la calculatrice
 * @param {string} expression - Expression actuelle
 * @param {number} lastResult - Dernier résultat
 * @returns {EmbedBuilder} Embed de la calculatrice
 * @author Kofu
 */
function createCalculatorEmbed(expression, lastResult) {
    const embed = new EmbedBuilder()
        .setTitle('🧮 Calculatrice Interactive')
        .setColor('#4ECDC4')
        .setFooter(KofuSignature.getKofuFooter())
        .setTimestamp();
    
    const displayExpression = expression || '0';
    embed.addFields({
        name: '📟 Écran',
        value: `\`\`\`${displayExpression}\`\`\``,
        inline: false
    });
    
    if (lastResult !== null && lastResult !== 0) {
        embed.addFields({
            name: '📊 Dernier résultat',
            value: `\`${lastResult}\``,
            inline: true
        });
    }
    
    embed.addFields({
        name: '💡 Instructions',
        value: 'Utilise les boutons ci-dessous pour effectuer tes calculs !',
        inline: false
    });
    
    return embed;
}

/**
 * Créer les boutons de la calculatrice
 * @param {boolean} disabled - Si les boutons sont désactivés
 * @returns {Array<ActionRowBuilder>} Lignes de boutons
 * @author Kofu
 */
function createCalculatorButtons(disabled = false) {
    const rows = [];
    
    // Première ligne: Clear, Delete, (, )
    rows.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('calc_clear').setLabel('C').setStyle(ButtonStyle.Danger).setDisabled(disabled),
        new ButtonBuilder().setCustomId('calc_delete').setLabel('⌫').setStyle(ButtonStyle.Secondary).setDisabled(disabled),
        new ButtonBuilder().setCustomId('calc_leftparen').setLabel('(').setStyle(ButtonStyle.Secondary).setDisabled(disabled),
        new ButtonBuilder().setCustomId('calc_rightparen').setLabel(')').setStyle(ButtonStyle.Secondary).setDisabled(disabled),
        new ButtonBuilder().setCustomId('calc_divide').setLabel('÷').setStyle(ButtonStyle.Primary).setDisabled(disabled)
    ));
    
    // Deuxième ligne: 7, 8, 9, *
    rows.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('calc_7').setLabel('7').setStyle(ButtonStyle.Secondary).setDisabled(disabled),
        new ButtonBuilder().setCustomId('calc_8').setLabel('8').setStyle(ButtonStyle.Secondary).setDisabled(disabled),
        new ButtonBuilder().setCustomId('calc_9').setLabel('9').setStyle(ButtonStyle.Secondary).setDisabled(disabled),
        new ButtonBuilder().setCustomId('calc_multiply').setLabel('×').setStyle(ButtonStyle.Primary).setDisabled(disabled),
        new ButtonBuilder().setCustomId('calc_power').setLabel('^').setStyle(ButtonStyle.Primary).setDisabled(disabled)
    ));
    
    // Troisième ligne: 4, 5, 6, -
    rows.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('calc_4').setLabel('4').setStyle(ButtonStyle.Secondary).setDisabled(disabled),
        new ButtonBuilder().setCustomId('calc_5').setLabel('5').setStyle(ButtonStyle.Secondary).setDisabled(disabled),
        new ButtonBuilder().setCustomId('calc_6').setLabel('6').setStyle(ButtonStyle.Secondary).setDisabled(disabled),
        new ButtonBuilder().setCustomId('calc_minus').setLabel('-').setStyle(ButtonStyle.Primary).setDisabled(disabled),
        new ButtonBuilder().setCustomId('calc_sqrt').setLabel('√').setStyle(ButtonStyle.Primary).setDisabled(disabled)
    ));
    
    // Quatrième ligne: 1, 2, 3, +
    rows.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('calc_1').setLabel('1').setStyle(ButtonStyle.Secondary).setDisabled(disabled),
        new ButtonBuilder().setCustomId('calc_2').setLabel('2').setStyle(ButtonStyle.Secondary).setDisabled(disabled),
        new ButtonBuilder().setCustomId('calc_3').setLabel('3').setStyle(ButtonStyle.Secondary).setDisabled(disabled),
        new ButtonBuilder().setCustomId('calc_plus').setLabel('+').setStyle(ButtonStyle.Primary).setDisabled(disabled),
        new ButtonBuilder().setCustomId('calc_equals').setLabel('=').setStyle(ButtonStyle.Success).setDisabled(disabled)
    ));
    
    // Cinquième ligne: 0, .
    rows.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('calc_0').setLabel('0').setStyle(ButtonStyle.Secondary).setDisabled(disabled),
        new ButtonBuilder().setCustomId('calc_dot').setLabel('.').setStyle(ButtonStyle.Secondary).setDisabled(disabled)
    ));
    
    return rows;
}

/**
 * Nettoyer une expression mathématique
 * @param {string} expression - Expression à nettoyer
 * @returns {string} Expression nettoyée
 * @author Kofu
 */
function cleanMathExpression(expression) {
    return expression
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/\^/g, '**')
        .replace(/[^0-9+\-*/.() ]/g, '')
        .trim();
}

/**
 * Vérifier si une expression est valide
 * @param {string} expression - Expression à vérifier
 * @returns {boolean} Si l'expression est valide
 * @author Kofu
 */
function isValidExpression(expression) {
    if (!expression) return false;
    
    // Vérifications de base
    const validChars = /^[0-9+\-*/.() ]+$/;
    if (!validChars.test(expression)) return false;
    
    // Vérifier les parenthèses équilibrées
    let parenthesesCount = 0;
    for (const char of expression) {
        if (char === '(') parenthesesCount++;
        if (char === ')') parenthesesCount--;
        if (parenthesesCount < 0) return false;
    }
    
    return parenthesesCount === 0;
}

/**
 * Évaluer une expression mathématique
 * @param {string} expression - Expression à évaluer
 * @returns {number} Résultat
 * @author Kofu
 */
function evaluateExpression(expression) {
    // Utiliser Function pour évaluer l'expression de manière sécurisée
    // Note: En production, utiliser une bibliothèque comme math.js
    try {
        const result = Function(`"use strict"; return (${expression})`)();
        
        if (typeof result !== 'number' || !isFinite(result)) {
            throw new Error('Résultat invalide');
        }
        
        // Arrondir à 10 décimales pour éviter les erreurs de précision
        return Math.round(result * 10000000000) / 10000000000;
        
    } catch (error) {
        throw new Error('Expression invalide');
    }
}

/**
 * Obtenir des informations sur un nombre
 * @param {number} number - Nombre à analyser
 * @returns {string|null} Informations sur le nombre
 * @author Kofu
 */
function getNumberInfo(number) {
    const info = [];
    
    if (Number.isInteger(number)) {
        if (number > 0) {
            if (isPrime(number)) info.push('🔢 Nombre premier');
            if (isPerfect(number)) info.push('✨ Nombre parfait');
            if (number % 2 === 0) info.push('⚡ Nombre pair');
            else info.push('🔥 Nombre impair');
        }
    } else {
        info.push('📊 Nombre décimal');
    }
    
    if (number === Math.PI) info.push('🥧 Pi (π)');
    if (number === Math.E) info.push('📈 Nombre d\'Euler (e)');
    if (number === 42) info.push('🌌 Réponse à la Grande Question');
    if (number === 69) info.push('😏 Nice');
    if (number === 420) info.push('🌿 Blaze it');
    
    return info.length > 0 ? info.join('\n') : null;
}

/**
 * Vérifier si un nombre est premier
 * @param {number} n - Nombre à vérifier
 * @returns {boolean} Si le nombre est premier
 * @author Kofu
 */
function isPrime(n) {
    if (n < 2) return false;
    if (n === 2) return true;
    if (n % 2 === 0) return false;
    
    for (let i = 3; i <= Math.sqrt(n); i += 2) {
        if (n % i === 0) return false;
    }
    
    return true;
}

/**
 * Vérifier si un nombre est parfait
 * @param {number} n - Nombre à vérifier
 * @returns {boolean} Si le nombre est parfait
 * @author Kofu
 */
function isPerfect(n) {
    if (n < 2) return false;
    
    let sum = 1;
    for (let i = 2; i <= Math.sqrt(n); i++) {
        if (n % i === 0) {
            sum += i;
            if (i !== n / i) sum += n / i;
        }
    }
    
    return sum === n;
}

/**
 * ====================================
 * ✨ Made with ❤️ by Kofu
 * github.com/kofudev
 * ====================================
 */