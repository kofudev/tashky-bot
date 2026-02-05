/**
 * ====================================
 * TASHKY BOT - PANEL WEB PROFESSIONNEL
 * JavaScript avancé avec animations
 * Made with ❤️ by Kofu
 * ====================================
 */

// Variables globales
let botStats = {
    servers: 0,
    users: 0,
    commands: 0,
    uptime: 0
};

let isConnected = false;
let lastUpdate = Date.now();

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    startRealTimeUpdates();
    initializeAnimations();
});

/**
 * Initialisation de l'application
 */
function initializeApp() {
    console.log('🚀 [TASHKY] Initialisation du panel web...');
    
    // Vérifier la connexion
    checkBotStatus();
    
    // Charger les statistiques
    loadBotStats();
    
    // Initialiser les composants
    initializeComponents();
    
    // Ajouter les effets de scroll
    setupScrollEffects();
    
    console.log('✅ [TASHKY] Panel web initialisé avec succès !');
}

/**
 * Configuration des écouteurs d'événements
 */
function setupEventListeners() {
    // Boutons de navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', handleNavigation);
    });
    
    // Boutons d'action
    document.querySelectorAll('.btn-primary').forEach(btn => {
        btn.addEventListener('click', handleButtonClick);
    });
    
    // Formulaires
    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', handleFormSubmit);
    });
    
    // Scroll pour header
    window.addEventListener('scroll', handleScroll);
    
    // Resize pour responsive
    window.addEventListener('resize', handleResize);
    
    // Raccourcis clavier
    document.addEventListener('keydown', handleKeyboard);
}

/**
 * Démarrage des mises à jour en temps réel
 */
function startRealTimeUpdates() {
    // Mise à jour des stats toutes les 5 secondes
    setInterval(updateStats, 5000);
    
    // Vérification du statut toutes les 10 secondes
    setInterval(checkBotStatus, 10000);
    
    // Mise à jour de l'uptime toutes les secondes
    setInterval(updateUptime, 1000);
    
    // Animation des compteurs
    setInterval(animateCounters, 2000);
}

/**
 * Initialisation des animations
 */
function initializeAnimations() {
    // Observer pour les animations au scroll
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
            }
        });
    }, { threshold: 0.1 });
    
    // Observer tous les éléments animables
    document.querySelectorAll('.card, .stat-card, .hero-content').forEach(el => {
        observer.observe(el);
    });
    
    // Animations de particules
    createParticleEffect();
}

/**
 * Vérification du statut du bot
 */
async function checkBotStatus() {
    try {
        const response = await fetch('/api/status');
        const data = await response.json();
        
        isConnected = data.online;
        updateStatusIndicator(isConnected);
        
        if (isConnected) {
            botStats = { ...botStats, ...data.stats };
            updateStatsDisplay();
        }
        
    } catch (error) {
        console.error('❌ [TASHKY] Erreur vérification statut:', error);
        isConnected = false;
        updateStatusIndicator(false);
    }
}

/**
 * Chargement des statistiques du bot
 */
async function loadBotStats() {
    try {
        const response = await fetch('/api/stats');
        const data = await response.json();
        
        botStats = data;
        updateStatsDisplay();
        animateCounters();
        
    } catch (error) {
        console.error('❌ [TASHKY] Erreur chargement stats:', error);
        showNotification('Erreur de chargement des statistiques', 'error');
    }
}

/**
 * Mise à jour de l'affichage des statistiques
 */
function updateStatsDisplay() {
    const elements = {
        servers: document.querySelector('[data-stat="servers"]'),
        users: document.querySelector('[data-stat="users"]'),
        commands: document.querySelector('[data-stat="commands"]'),
        uptime: document.querySelector('[data-stat="uptime"]')
    };
    
    Object.keys(elements).forEach(key => {
        if (elements[key]) {
            const value = formatStatValue(botStats[key], key);
            animateNumber(elements[key], value);
        }
    });
    
    lastUpdate = Date.now();
}

/**
 * Formatage des valeurs statistiques
 */
function formatStatValue(value, type) {
    switch (type) {
        case 'servers':
        case 'users':
        case 'commands':
            return formatNumber(value);
        case 'uptime':
            return formatUptime(value);
        default:
            return value;
    }
}

/**
 * Formatage des nombres avec séparateurs
 */
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
}

/**
 * Formatage de l'uptime
 */
function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
        return `${days}j ${hours}h`;
    } else if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else {
        return `${minutes}m`;
    }
}

/**
 * Animation des nombres
 */
function animateNumber(element, targetValue) {
    if (!element) return;
    
    const currentValue = parseInt(element.textContent.replace(/[^\d]/g, '')) || 0;
    const target = parseInt(targetValue.toString().replace(/[^\d]/g, '')) || 0;
    
    if (currentValue === target) return;
    
    const duration = 1000;
    const startTime = Date.now();
    const difference = target - currentValue;
    
    function updateValue() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const current = Math.round(currentValue + (difference * easeOutQuart));
        
        element.textContent = formatNumber(current);
        
        if (progress < 1) {
            requestAnimationFrame(updateValue);
        } else {
            element.textContent = targetValue;
        }
    }
    
    requestAnimationFrame(updateValue);
}

/**
 * Mise à jour de l'indicateur de statut
 */
function updateStatusIndicator(online) {
    const indicators = document.querySelectorAll('.status');
    
    indicators.forEach(indicator => {
        indicator.className = 'status';
        indicator.classList.add(online ? 'status-online' : 'status-offline');
        
        const dot = indicator.querySelector('.status-dot');
        if (dot) {
            dot.style.backgroundColor = online ? 'var(--success-color)' : 'var(--error-color)';
        }
        
        const text = indicator.querySelector('.status-text');
        if (text) {
            text.textContent = online ? 'En ligne' : 'Hors ligne';
        }
    });
}

/**
 * Animation des compteurs
 */
function animateCounters() {
    document.querySelectorAll('.stat-number').forEach(counter => {
        counter.style.transform = 'scale(1.05)';
        counter.style.color = 'var(--primary-color)';
        
        setTimeout(() => {
            counter.style.transform = 'scale(1)';
        }, 200);
    });
}

/**
 * Mise à jour de l'uptime
 */
function updateUptime() {
    if (isConnected) {
        botStats.uptime += 1;
        const uptimeElement = document.querySelector('[data-stat="uptime"]');
        if (uptimeElement) {
            uptimeElement.textContent = formatUptime(botStats.uptime);
        }
    }
}

/**
 * Gestion de la navigation
 */
function handleNavigation(event) {
    event.preventDefault();
    
    const target = event.target.getAttribute('href');
    if (!target) return;
    
    // Mise à jour des liens actifs
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Animation de transition
    const main = document.querySelector('.main');
    main.style.opacity = '0.5';
    main.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
        // Ici on chargerait le contenu de la nouvelle page
        main.style.opacity = '1';
        main.style.transform = 'translateY(0)';
    }, 300);
    
    showNotification(`Navigation vers ${target}`, 'success');
}

/**
 * Gestion des clics de boutons
 */
function handleButtonClick(event) {
    const button = event.target;
    const action = button.getAttribute('data-action');
    
    // Animation du bouton
    button.style.transform = 'scale(0.95)';
    setTimeout(() => {
        button.style.transform = 'scale(1)';
    }, 150);
    
    // Actions spécifiques
    switch (action) {
        case 'invite':
            window.open('https://discord.com/oauth2/authorize?client_id=YOUR_BOT_ID&permissions=8&scope=bot%20applications.commands', '_blank');
            break;
        case 'support':
            window.open('https://discord.gg/YOUR_SUPPORT_SERVER', '_blank');
            break;
        case 'refresh':
            refreshData();
            break;
        default:
            console.log('Action:', action);
    }
}

/**
 * Gestion des formulaires
 */
function handleFormSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    
    // Animation de chargement
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    submitBtn.innerHTML = '<div class="loading"></div> Traitement...';
    submitBtn.disabled = true;
    
    // Simulation d'envoi
    setTimeout(() => {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        
        showNotification('Formulaire envoyé avec succès !', 'success');
    }, 2000);
}

/**
 * Gestion du scroll
 */
function handleScroll() {
    const header = document.querySelector('.header');
    const scrolled = window.scrollY > 50;
    
    header.classList.toggle('scrolled', scrolled);
    
    // Parallax effect
    const hero = document.querySelector('.hero');
    if (hero) {
        const scrolled = window.pageYOffset;
        const rate = scrolled * -0.5;
        hero.style.transform = `translateY(${rate}px)`;
    }
}

/**
 * Gestion du redimensionnement
 */
function handleResize() {
    // Réajustement des animations
    if (window.innerWidth < 768) {
        document.body.classList.add('mobile');
    } else {
        document.body.classList.remove('mobile');
    }
}

/**
 * Gestion des raccourcis clavier
 */
function handleKeyboard(event) {
    // Ctrl + R pour rafraîchir
    if (event.ctrlKey && event.key === 'r') {
        event.preventDefault();
        refreshData();
    }
    
    // Échap pour fermer les notifications
    if (event.key === 'Escape') {
        closeAllNotifications();
    }
}

/**
 * Rafraîchissement des données
 */
async function refreshData() {
    showNotification('Actualisation des données...', 'info');
    
    try {
        await Promise.all([
            checkBotStatus(),
            loadBotStats()
        ]);
        
        showNotification('Données actualisées !', 'success');
        
        // Animation de rafraîchissement
        document.querySelectorAll('.card').forEach((card, index) => {
            setTimeout(() => {
                card.style.animation = 'none';
                card.offsetHeight; // Trigger reflow
                card.style.animation = 'fadeIn 0.6s ease-out';
            }, index * 100);
        });
        
    } catch (error) {
        showNotification('Erreur lors de l\'actualisation', 'error');
    }
}

/**
 * Affichage des notifications
 */
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">${getNotificationIcon(type)}</span>
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="closeNotification(this)">×</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animation d'entrée
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Suppression automatique après 5 secondes
    setTimeout(() => {
        closeNotification(notification.querySelector('.notification-close'));
    }, 5000);
}

/**
 * Icônes des notifications
 */
function getNotificationIcon(type) {
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    return icons[type] || icons.info;
}

/**
 * Fermeture d'une notification
 */
function closeNotification(button) {
    const notification = button.closest('.notification');
    notification.classList.remove('show');
    
    setTimeout(() => {
        notification.remove();
    }, 300);
}

/**
 * Fermeture de toutes les notifications
 */
function closeAllNotifications() {
    document.querySelectorAll('.notification').forEach(notification => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    });
}

/**
 * Initialisation des composants
 */
function initializeComponents() {
    // Tooltips
    initializeTooltips();
    
    // Modals
    initializeModals();
    
    // Dropdowns
    initializeDropdowns();
    
    // Charts (si nécessaire)
    initializeCharts();
}

/**
 * Initialisation des tooltips
 */
function initializeTooltips() {
    document.querySelectorAll('[data-tooltip]').forEach(element => {
        element.addEventListener('mouseenter', showTooltip);
        element.addEventListener('mouseleave', hideTooltip);
    });
}

/**
 * Affichage des tooltips
 */
function showTooltip(event) {
    const element = event.target;
    const text = element.getAttribute('data-tooltip');
    
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = text;
    
    document.body.appendChild(tooltip);
    
    const rect = element.getBoundingClientRect();
    tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
    tooltip.style.top = rect.top - tooltip.offsetHeight - 10 + 'px';
    
    setTimeout(() => tooltip.classList.add('show'), 100);
}

/**
 * Masquage des tooltips
 */
function hideTooltip() {
    const tooltip = document.querySelector('.tooltip');
    if (tooltip) {
        tooltip.classList.remove('show');
        setTimeout(() => tooltip.remove(), 200);
    }
}

/**
 * Effet de particules
 */
function createParticleEffect() {
    const canvas = document.createElement('canvas');
    canvas.id = 'particles';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '-1';
    
    document.body.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    const particles = [];
    
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    
    function createParticle() {
        return {
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            size: Math.random() * 2 + 1,
            opacity: Math.random() * 0.5 + 0.1
        };
    }
    
    function animateParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach((particle, index) => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
            if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;
            
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(139, 92, 246, ${particle.opacity})`;
            ctx.fill();
        });
        
        requestAnimationFrame(animateParticles);
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Créer les particules
    for (let i = 0; i < 50; i++) {
        particles.push(createParticle());
    }
    
    animateParticles();
}

/**
 * Configuration des effets de scroll
 */
function setupScrollEffects() {
    const elements = document.querySelectorAll('.card, .stat-card');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, index * 100);
            }
        });
    }, { threshold: 0.1 });
    
    elements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(30px)';
        element.style.transition = 'all 0.6s ease-out';
        observer.observe(element);
    });
}

/**
 * Initialisation des modals (si nécessaire)
 */
function initializeModals() {
    // Code pour les modals
}

/**
 * Initialisation des dropdowns (si nécessaire)
 */
function initializeDropdowns() {
    // Code pour les dropdowns
}

/**
 * Initialisation des graphiques (si nécessaire)
 */
function initializeCharts() {
    // Code pour les graphiques
}

/**
 * Mise à jour des statistiques en temps réel
 */
function updateStats() {
    if (Date.now() - lastUpdate > 30000) { // 30 secondes sans mise à jour
        loadBotStats();
    }
}

// Export des fonctions pour utilisation globale
window.TASHKY = {
    refreshData,
    showNotification,
    closeNotification,
    closeAllNotifications,
    updateStats,
    checkBotStatus
};

console.log('🎉 [TASHKY] Panel web professionnel chargé avec succès !');

/**
 * ====================================
 * ✨ Made with ❤️ by Kofu
 * github.com/kofudev
 * ====================================
 */