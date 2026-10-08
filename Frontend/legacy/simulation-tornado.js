// Mission tracking
let currentMission = 1;
let totalMissions = 6;

// Mission 2 tracking
let completedWarnings = new Set();
let totalWarnings = 5;

// Mission 3 tracking
let safeSheltersSelected = 0;
let totalSafeShelters = 3;

// Mission 4 tracking
let completedDrillSteps = new Set();

// Mission 5 tracking
let completedAfterSteps = new Set();
let totalAfterSteps = 5;

// Mission 6 tracking
let mythsCompleted = new Set();
let totalMyths = 2;

function updateProgress() {
    let progress = (currentMission - 1) / totalMissions * 100;
    const bar = document.getElementById('missionProgress');
    const text = document.getElementById('progressText');
    if (bar) bar.style.width = progress + '%';
    if (text) text.textContent = currentMission - 1;
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

    // Animate tornado visual when reaching mission 4
    if (missionNumber === 4) {
        animateTornado();
    }
}

// ==================== MISSION 1: FUJITA SCALE ====================
let fujitaSelected = new Set();

function selectFujita(ef) {
    fujitaSelected.add(ef);
    const card = document.querySelector(`[data-ef="${ef}"]`);
    if (card) card.classList.add('selected');

    if (fujitaSelected.size === 6) {
        const result = document.getElementById('fujitaResult');
        if (result) result.innerHTML = '<div class="alert alert-success">🎉 All EF scale levels identified!</div>';
        const popup = document.getElementById('m1Popup');
        if (popup) popup.classList.remove('hidden');
        if (navigator.vibrate) navigator.vibrate(200);
    }
}

// ==================== MISSION 2: WARNING SIGNS ====================
function completeWarning(element) {
    const warning = element.getAttribute('data-warning');
    if (!completedWarnings.has(warning)) {
        completedWarnings.add(warning);
        element.classList.add('completed');
        const check = element.querySelector('.hidden-check');
        if (check) check.style.display = 'inline-block';
        updateWarningProgress();
    }
}

function updateWarningProgress() {
    const count = completedWarnings.size;
    const progress = document.getElementById('warningProgress');
    if (progress) progress.innerHTML = `Signs identified: ${count}/${totalWarnings}`;

    if (count === totalWarnings) {
        const popup = document.getElementById('m2Popup');
        if (popup) popup.classList.remove('hidden');
        if (navigator.vibrate) navigator.vibrate(200);
    }
}

// ==================== MISSION 3: SAFE SHELTERS ====================
function selectShelter(element, shelter, isSafe) {
    // Remove selected class from all
    document.querySelectorAll('.shelter-card').forEach(c => c.classList.remove('selected'));
    element.classList.add('selected');

    const feedback = document.getElementById('shelterFeedback');

    if (isSafe) {
        if (feedback) feedback.innerHTML = `<div class="alert alert-success">✅ Correct! ${getShelterName(shelter)} is a safe shelter location!</div>`;
        if (!element.classList.contains('correct')) {
            element.classList.add('correct');
            safeSheltersSelected++;

            if (safeSheltersSelected === totalSafeShelters) {
                const popup = document.getElementById('m3Popup');
                if (popup) popup.classList.remove('hidden');
                if (navigator.vibrate) navigator.vibrate(200);
            }
        }
    } else {
        if (feedback) feedback.innerHTML = `<div class="alert alert-danger">❌ ${getShelterName(shelter)} is DANGEROUS! ${getDangerReason(shelter)}</div>`;
    }
}

function getShelterName(shelter) {
    const names = {
        'basement': 'Basement',
        'interior': 'Interior Room',
        'bathroom': 'Bathroom',
        'window': 'Near Windows',
        'car': 'Vehicle',
        'overpass': 'Under Overpass'
    };
    return names[shelter] || shelter;
}

function getDangerReason(shelter) {
    const reasons = {
        'window': 'Flying glass causes severe injuries!',
        'car': 'Vehicles are easily tossed by tornadoes!',
        'overpass': 'Wind tunnel effect makes it deadly!'
    };
    return reasons[shelter] || 'Avoid this location!';
}

// ==================== MISSION 4: DROP, COVER, HOLD ====================
function completeDrillStep(element) {
    const step = element.getAttribute('data-step');
    if (!completedDrillSteps.has(step)) {
        completedDrillSteps.add(step);
        element.classList.add('completed');
        updateDrillProgress();
    }
}

function updateDrillProgress() {
    const count = completedDrillSteps.size;
    const percent = (count / 3) * 100;
    const bar = document.getElementById('drillProgress');
    const status = document.getElementById('drillStatus');
    
    if (bar) bar.style.width = percent + '%';
    if (status) status.innerHTML = count === 3 ? '✅ Drill Complete! You are now protected!' : `Step ${count}/3 completed`;

    if (count === 3) {
        const popup = document.getElementById('m4Popup');
        if (popup) popup.classList.remove('hidden');
        if (navigator.vibrate) navigator.vibrate(300);
    }
}

function animateTornado() {
    const tornado = document.getElementById('tornadoFunnel');
    if (tornado) tornado.classList.add('active');

    // Add debris
    const visual = document.getElementById('tornadoVisual');
    if (visual) {
        for (let i = 0; i < 10; i++) {
            const debris = document.createElement('div');
            debris.className = 'tornado-debris';
            debris.innerHTML = ['🏠', '🚗', '🌲', '📦'][Math.floor(Math.random() * 4)];
            debris.style.left = Math.random() * 100 + '%';
            debris.style.top = Math.random() * 100 + '%';
            debris.style.animationDuration = Math.random() * 2 + 1 + 's';
            visual.appendChild(debris);
            setTimeout(() => debris.remove(), 2000);
        }
    }

    // Stop animation after drill
    setTimeout(() => {
        if (tornado) tornado.classList.remove('active');
    }, 10000);
}

// ==================== MISSION 5: AFTER THE TORNADO ====================
function completeAfter(element) {
    const step = element.getAttribute('data-after');
    if (!completedAfterSteps.has(step)) {
        completedAfterSteps.add(step);
        element.classList.add('completed');
        updateAfterProgress();
    }
}

function updateAfterProgress() {
    const count = completedAfterSteps.size;
    const progress = document.getElementById('afterProgress');
    if (progress) progress.innerHTML = `Safety steps: ${count}/${totalAfterSteps}`;

    if (count === totalAfterSteps) {
        const popup = document.getElementById('m5Popup');
        if (popup) popup.classList.remove('hidden');
        if (navigator.vibrate) navigator.vibrate(200);
    }
}

// ==================== MISSION 6: BUST MYTHS ====================
function selectMythAnswer(element, type) {
    const myth = element.getAttribute('data-myth');
    if (!mythsCompleted.has(myth)) {
        mythsCompleted.add(myth);

        const feedback = document.getElementById('mythFeedback');

        if (type === 'fact') {
            if (feedback) feedback.innerHTML += `<div class="alert alert-success mt-2">✅ Correct! You identified a tornado fact!</div>`;
            element.style.border = '2px solid #22c55e';
        } else {
            if (feedback) feedback.innerHTML += `<div class="alert alert-danger mt-2">⚠️ That's a myth! The correct answer teaches the truth.</div>`;
            element.style.border = '2px solid #ef4444';
        }

        if (mythsCompleted.size === totalMyths) {
            const popup = document.getElementById('m6Popup');
            if (popup) popup.classList.remove('hidden');
            if (navigator.vibrate) navigator.vibrate(300);
        }
    }
}

// ==================== FINAL REWARD ====================
function showFinalReward() {
    const rewardScreen = document.getElementById('rewardScreen');
    const mission6 = document.getElementById('mission6');

    if (mission6) mission6.classList.add('hidden');
    if (rewardScreen) {
        rewardScreen.classList.remove('hidden');
        rewardScreen.classList.add('active');
    }

    const bar = document.getElementById('missionProgress');
    const text = document.getElementById('progressText');
    if (bar) bar.style.width = '100%';
    if (text) text.textContent = '6';

    // Sync with backend
    submitDrillResult('tornado', 100);

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

// Background Cloud Particles
function createClouds() {
    const tornadoBg = document.getElementById('tornadoBg');
    if (tornadoBg) {
        for (let i = 0; i < 30; i++) {
            const particle = document.createElement('div');
            particle.className = 'cloud-particle';
            particle.style.width = Math.random() * 100 + 50 + 'px';
            particle.style.height = particle.style.width;
            particle.style.left = Math.random() * 100 + '%';
            particle.style.top = Math.random() * 100 + '%';
            particle.style.animationDuration = Math.random() * 30 + 20 + 's';
            particle.style.animationDelay = Math.random() * 10 + 's';
            tornadoBg.appendChild(particle);
        }
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateProgress();
    createClouds();
    console.log('Operation Vortex Initialized!');
});
