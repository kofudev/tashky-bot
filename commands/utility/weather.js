/**
 * ====================================
 * COMMANDE: /weather
 * ====================================
 * 
 * Afficher la météo d'une ville
 * Informations météorologiques complètes
 * 
 * @author Kofu (github.com/kofudev)
 * @category Utility
 * ====================================
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const KofuSignature = require('../../utils/kofu-signature');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('weather')
        .setDescription('🌤️ Afficher la météo d\'une ville')
        .addStringOption(option =>
            option.setName('ville')
                .setDescription('Nom de la ville')
                .setRequired(true)
        ),
    
    category: 'utility',
    cooldown: 10,
    
    /**
     * Exécution de la commande weather
     * @param {ChatInputCommandInteraction} interaction - L'interaction Discord
     * @author Kofu
     */
    async execute(interaction) {
        const city = interaction.options.getString('ville');
        
        // Embed de chargement
        const loadingEmbed = new EmbedBuilder()
            .setTitle('🌤️ Recherche météo...')
            .setDescription(`Recherche des informations météo pour **${city}**...`)
            .setColor('#87CEEB')
            .setFooter(KofuSignature.getKofuFooter())
            .setTimestamp();
        
        await interaction.reply({ embeds: [loadingEmbed] });
        
        try {
            // Simulation de données météo (remplacer par une vraie API)
            const weatherData = generateMockWeatherData(city);
            
            const weatherEmbed = new EmbedBuilder()
                .setTitle(`🌤️ Météo - ${weatherData.city}`)
                .setDescription(`**${weatherData.description}**`)
                .setColor(getWeatherColor(weatherData.condition))
                .setThumbnail(getWeatherIcon(weatherData.condition))
                .addFields(
                    { name: '🌡️ Température', value: `${weatherData.temperature}°C`, inline: true },
                    { name: '🌡️ Ressenti', value: `${weatherData.feelsLike}°C`, inline: true },
                    { name: '💧 Humidité', value: `${weatherData.humidity}%`, inline: true },
                    { name: '💨 Vent', value: `${weatherData.windSpeed} km/h`, inline: true },
                    { name: '👁️ Visibilité', value: `${weatherData.visibility} km`, inline: true },
                    { name: '📊 Pression', value: `${weatherData.pressure} hPa`, inline: true },
                    { name: '🌅 Lever du soleil', value: weatherData.sunrise, inline: true },
                    { name: '🌇 Coucher du soleil', value: weatherData.sunset, inline: true },
                    { name: '🕐 Dernière MAJ', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
                )
                .setFooter({ text: 'Données simulées | ' + KofuSignature.getKofuFooter().text, iconURL: KofuSignature.getKofuFooter().iconURL })
                .setTimestamp();
            
            await interaction.editReply({ embeds: [weatherEmbed] });
            
            console.log(`🌤️ [Kofu] ${interaction.user.tag} a consulté la météo de ${city}`);
            
        } catch (error) {
            console.error('❌ [Kofu] Erreur météo:', error);
            
            const errorEmbed = KofuSignature.createErrorEmbed(
                'Erreur météo !',
                `Impossible de récupérer les données météo pour **${city}**.\n\nVérifie l'orthographe de la ville.`
            );
            
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};

/**
 * Générer des données météo simulées
 * @param {string} city - Nom de la ville
 * @returns {object} Données météo
 * @author Kofu
 */
function generateMockWeatherData(city) {
    const conditions = ['sunny', 'cloudy', 'rainy', 'snowy', 'stormy'];
    const descriptions = {
        sunny: 'Ensoleillé',
        cloudy: 'Nuageux',
        rainy: 'Pluvieux',
        snowy: 'Neigeux',
        stormy: 'Orageux'
    };
    
    const condition = conditions[Math.floor(Math.random() * conditions.length)];
    const baseTemp = Math.floor(Math.random() * 35) - 5; // -5 à 30°C
    
    return {
        city: city,
        condition: condition,
        description: descriptions[condition],
        temperature: baseTemp,
        feelsLike: baseTemp + Math.floor(Math.random() * 6) - 3,
        humidity: Math.floor(Math.random() * 60) + 30, // 30-90%
        windSpeed: Math.floor(Math.random() * 30) + 5, // 5-35 km/h
        visibility: Math.floor(Math.random() * 15) + 5, // 5-20 km
        pressure: Math.floor(Math.random() * 100) + 980, // 980-1080 hPa
        sunrise: '07:30',
        sunset: '19:45'
    };
}

/**
 * Obtenir la couleur selon la condition météo
 * @param {string} condition - Condition météo
 * @returns {string} Code couleur hex
 * @author Kofu
 */
function getWeatherColor(condition) {
    const colors = {
        sunny: '#FFD700',
        cloudy: '#87CEEB',
        rainy: '#4682B4',
        snowy: '#F0F8FF',
        stormy: '#696969'
    };
    
    return colors[condition] || '#87CEEB';
}

/**
 * Obtenir l'icône selon la condition météo
 * @param {string} condition - Condition météo
 * @returns {string} URL de l'icône
 * @author Kofu
 */
function getWeatherIcon(condition) {
    // URLs d'icônes météo (remplacer par de vraies icônes)
    const icons = {
        sunny: 'https://cdn.discordapp.com/emojis/weather_sunny.png',
        cloudy: 'https://cdn.discordapp.com/emojis/weather_cloudy.png',
        rainy: 'https://cdn.discordapp.com/emojis/weather_rainy.png',
        snowy: 'https://cdn.discordapp.com/emojis/weather_snowy.png',
        stormy: 'https://cdn.discordapp.com/emojis/weather_stormy.png'
    };
    
    return icons[condition] || null;
}

/**
 * ====================================
 * ✨ Made with ❤️ by Kofu
 * github.com/kofudev
 * ====================================
 */