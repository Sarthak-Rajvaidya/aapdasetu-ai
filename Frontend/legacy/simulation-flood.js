// Mission tracking
let currentMission = 1;
let totalMissions = 6;

// Mission 1
let floodTypesSelected = new Set();

// Mission 2
let waterCriticalReached = false;

// Mission 3
let completedTasks = new Set();

// Mission 4
let routeSelected = false;

// Mission 5
let selectedItems = new Set();

// Mission 6
let postActionsCompleted = new Set();

function updateProgress() {
    let progress = (currentMission - 1) / totalMissions * 100;
    document.getElementById('missionProgress').style.width = progress + '%';
    document.getElementById('progressText').textContent = currentMission - 1;
}

function nextMission(missionNumber) {
    document.querySelectorAll('.mission-screen').forEach(screen => {
        screen.classList.add('hidden');
        screen.classList.remove('active');
    });

    const nextScreen = document.getElementById(`mission${missionNumber}`);
    if (nextScreen) {
        nextScreen.classList.remove('hidden');
        nextScreen.classList.add('active');
    }

    currentMission = missionNumber;
    updateProgress();

    if (navigator.vibrate) navigator.vibrate(100);
}

// ==================== MISSION 1: FLOOD TYPES ====================
function selectFloodType(type) {
    floodTypesSelected.add(type);
    const card = document.querySelector(`[data-flood="${type}"]`);
    card.style.border = '2px solid #0096ff';

    if (floodTypesSelected.size === 3) {
        const popup = document.getElementById('m1Popup');
        popup.classList.remove('hidden');
        document.getElementById('floodTypeResult').innerHTML = '<div class="alert alert-success">🎉 All flood types identified!</div>';
        if (navigator.vibrate) navigator.vibrate(200);
    }
}

// ==================== MISSION 2: WATER LEVEL ====================
function initMission2() {
    const rainSlider = document.getElementById('rainSlider');
    const waterLevelFill = document.getElementById('waterLevelFill');
    const waterOverlay = document.getElementById('waterOverlay');
    const rainAmount = document.getElementById('rainAmount');
    const rainFill = document.getElementById('rainFill');
    const waterWarning = document.getElementById('waterWarning');

    if (rainSlider) {
        rainSlider.addEventListener('input', function () {
            const value = parseInt(this.value);
            const waterPercent = Math.min(value, 100);

            waterLevelFill.style.width = waterPercent + '%';
            waterOverlay.style.height = waterPercent + '%';
            rainAmount.textContent = Math.floor(value * 2);
            rainFill.style.height = waterPercent + '%';

            // Update warning message based on water level
            if (value < 25) {
                waterWarning.innerHTML = '✅ Current water level: SAFE - Normal conditions';
                waterWarning.className = 'alert alert-success mt-3';
            } else if (value < 50) {
                waterWarning.innerHTML = '⚠️ Current water level: CAUTION - Monitor conditions';
                waterWarning.className = 'alert alert-warning mt-3';
            } else if (value < 75) {
                waterWarning.innerHTML = '⚠️ Current water level: DANGER - Prepare to evacuate!';
                waterWarning.className = 'alert alert-danger mt-3';
            } else {
                waterWarning.innerHTML = '🔴 CRITICAL! Water level exceeds safe limits! EVACUATE NOW!';
                waterWarning.className = 'alert alert-dark bg-danger text-white mt-3';

                if (!waterCriticalReached && value >= 80) {
                    waterCriticalReached = true;
                    const popup = document.getElementById('m2Popup');
                    popup.classList.remove('hidden');
                    if (navigator.vibrate) navigator.vibrate(500);
                }
            }

            // Animate houses flooding
            const houses = document.querySelectorAll('.house');
            if (value > 50) {
                houses.forEach(house => house.classList.add('flooded'));
            } else {
                houses.forEach(house => house.classList.remove('flooded'));
            }
        });
    }
}

// ==================== MISSION 3: HOME PREPARATION ====================
function completeTask(element) {
    const step = element.getAttribute('data-step');
    if (!completedTasks.has(step)) {
        completedTasks.add(step);
        element.classList.add('completed');
        updatePrepProgress();
    }
}

function updatePrepProgress() {
    const count = completedTasks.size;
    document.getElementById('prepProgress').innerHTML = `Tasks completed: ${count}/5`;

    if (count === 5) {
        const popup = document.getElementById('m3Popup');
        popup.classList.remove('hidden');
        if (navigator.vibrate) navigator.vibrate(200);
    }
}

// ==================== MISSION 4: EVACUATION ROUTES ====================
function selectRoute(route) {
    const routeCards = document.querySelectorAll('.route-card');
    routeCards.forEach(card => card.classList.remove('selected'));

    const selectedCard = document.querySelector(`[data-route="${route}"]`);
    selectedCard.classList.add('selected');

    const feedback = document.getElementById('routeFeedback');

    if (route === 'high') {
        feedback.innerHTML = '<div class="alert alert-success">✅ Correct! The high road avoids flood waters!</div>';
        if (!routeSelected) {
            routeSelected = true;
            const popup = document.getElementById('m4Popup');
            popup.classList.remove('hidden');
            if (navigator.vibrate) navigator.vibrate(200);
        }
    } else if (route === 'low') {
        feedback.innerHTML = '<div class="alert alert-danger">❌ Wrong! Low roads near rivers flood first!</div>';
    } else if (route === 'bridge') {
        feedback.innerHTML = '<div class="alert alert-warning">⚠️ Dangerous! Bridges can be washed away during floods!</div>';
    }
}

// ==================== MISSION 5: EMERGENCY KIT ====================
function toggleKitItem(element) {
    const item = element.getAttribute('data-item');
    if (selectedItems.has(item)) {
        selectedItems.delete(item);
        element.classList.remove('border', 'border-primary');
    } else {
        selectedItems.add(item);
        element.classList.add('border', 'border-primary');
    }

    document.getElementById('kitProgress').innerHTML = `Items selected: ${selectedItems.size}/8`;
}

function checkKitComplete() {
    if (selectedItems.size === 8) {
        const popup = document.getElementById('m5Popup');
        popup.classList.remove('hidden');
        if (navigator.vibrate) navigator.vibrate(200);
    } else {
        alert(`You need ${8 - selectedItems.size} more items for a complete kit!`);
    }
}

// ==================== MISSION 6: POST-FLOOD SAFETY ====================
function selectPostAction(action) {
    if (!postActionsCompleted.has(action)) {
        postActionsCompleted.add(action);
        document.getElementById('postFeedback').innerHTML = `<div class="alert alert-success">✅ ${getActionMessage(action)}</div>`;

        if (postActionsCompleted.size === 4) {
            const popup = document.getElementById('m6Popup');
            popup.classList.remove('hidden');
            if (navigator.vibrate) navigator.vibrate(300);
        }
    }
}

function getActionMessage(action) {
    const messages = {
        'wait': 'Wait for official "All Clear" before returning home',
        'check': 'Check for structural damage before entering',
        'water': 'Boil water or use bottled water until safe',
        'mold': 'Dry out home within 48 hours to prevent mold'
    };
    return messages[action];
}

// ==================== FINAL REWARD ====================
function showFinalReward() {
    const rewardScreen = document.getElementById('rewardScreen');
    const mission6 = document.getElementById('mission6');

    mission6.classList.add('hidden');
    rewardScreen.classList.remove('hidden');
    rewardScreen.classList.add('active');

    document.getElementById('missionProgress').style.width = '100%';
    document.getElementById('progressText').textContent = '6';

    // Sync with backend
    submitDrillResult('flood', 100);

    createConfetti();
}

/**
 * Syncs simulation results to the backend database
 */
async function submitDrillResult(type, score) {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (token && user) {
        try {
            const response = await fetch("http://127.0.0.1:8000/drill/submit", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    user_id: user.user_id,
                    disaster_type: type,
                    performance: score
                })
            });
            if (response.ok) {
                console.log(`${type} drill synced to cloud!`);
            }
        } catch (error) {
            console.error("Cloud sync failed:", error);
        }
    }
}

function createConfetti() {
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.style.position = 'fixed';
        particle.style.width = '10px';
        particle.style.height = '10px';
        particle.style.background = `hsl(${Math.random() * 360}, 100%, 50%)`;
        particle.style.borderRadius = '50%';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = '-20px';
        particle.style.zIndex = '1000';
        particle.style.animation = `fall ${Math.random() * 2 + 1}s linear forwards`;
        document.body.appendChild(particle);
        setTimeout(() => particle.remove(), 3000);
    }
}

// Create rain particles
function createRain() {
    const waterBg = document.getElementById('waterBg');
    if (waterBg) {
        for (let i = 0; i < 50; i++) {
            const particle = document.createElement('div');
            particle.className = 'water-particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDuration = Math.random() * 3 + 1 + 's';
            particle.style.animationDelay = Math.random() * 5 + 's';
            waterBg.appendChild(particle);
        }
    }
}

// Initialize all missions
document.addEventListener('DOMContentLoaded', () => {
    initMission2();
    updateProgress();
    createRain();
    console.log('Operation Rising Tide Initialized!');
});
