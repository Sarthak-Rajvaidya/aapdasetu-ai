// Mission tracking
let currentMission = 1;
let totalMissions = 5;
let missionProgress = 0;

// Mission 1 variables
let stressLevel = 0;
let forceSlider = null;
let earthquakeTriggered = false;

// Mission 2 variables
let tectonicStress = 0;
let energyInjected = 0;
let ruptureTriggered = false;

// Mission 3
let indiaAnalyzed = false;

// Mission 5
let richterSlider = null;

// DOM Elements
function getElements() {
    return {
        depthProgress: document.getElementById('depthProgress'),
        missionProgressText: document.getElementById('missionProgressText')
    };
}

// Update mission progress bar
function updateMissionProgress() {
    const { depthProgress, missionProgressText } = getElements();
    missionProgress = (currentMission - 1) / totalMissions * 100;
    if (depthProgress) depthProgress.style.width = missionProgress + '%';
    if (missionProgressText) missionProgressText.textContent = currentMission - 1;
}

// Next Mission function
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
    updateMissionProgress();

    console.log(`Moving to Mission ${missionNumber}`);
}

// ==================== MISSION 1: STRESS TEST ====================
function initMission1() {
    forceSlider = document.getElementById('forceSlider');
    const stressBar = document.getElementById('stressBar');
    const stressPercent = document.getElementById('stressPercent');
    const tectonicStick = document.getElementById('tectonicStick');
    const stressGlow = document.getElementById('stressGlow');

    if (forceSlider) {
        forceSlider.addEventListener('input', function () {
            stressLevel = parseInt(this.value);
            stressBar.style.width = stressLevel + '%';
            stressPercent.textContent = stressLevel;

            // Show stress visual
            if (stressLevel > 30) {
                stressGlow.classList.add('active');
            } else {
                stressGlow.classList.remove('active');
            }

            // Show tectonic stick at higher stress
            if (stressLevel > 50) {
                tectonicStick.classList.add('visible');
            } else {
                tectonicStick.classList.remove('visible');
            }

            // Trigger earthquake at 100%
            if (stressLevel >= 100 && !earthquakeTriggered) {
                triggerEarthquake();
            }
        });
    }
}

function triggerEarthquake() {
    earthquakeTriggered = true;
    const crust = document.getElementById('crustLayer');
    const popup = document.getElementById('m1Popup');

    // Shake animation
    crust.style.animation = 'shake 0.5s ease';
    setTimeout(() => {
        crust.style.animation = '';
    }, 500);

    // Show popup
    popup.classList.remove('hidden');

    // Vibrate if supported
    if (navigator.vibrate) navigator.vibrate(500);
}

// ==================== MISSION 2: TECTONIC RUPTURE ====================
function initMission2() {
    const injectBtn = document.getElementById('injectEnergyBtn');
    const tectonicStressBar = document.getElementById('tectonicStressBar');
    const tectonicStressSpan = document.getElementById('tectonicStress');
    const plateLeft = document.getElementById('plateLeft');
    const plateRight = document.getElementById('plateRight');

    if (injectBtn) {
        injectBtn.addEventListener('click', function () {
            if (ruptureTriggered) return;

            energyInjected += 25;
            tectonicStress = Math.min(energyInjected, 100);

            tectonicStressBar.style.width = tectonicStress + '%';
            tectonicStressSpan.textContent = tectonicStress;

            // Animate plates
            plateLeft.classList.add('moving');
            plateRight.classList.add('moving');
            setTimeout(() => {
                plateLeft.classList.remove('moving');
                plateRight.classList.remove('moving');
            }, 500);

            // Trigger rupture at 100%
            if (tectonicStress >= 100 && !ruptureTriggered) {
                triggerRupture();
            }
        });
    }
}

function triggerRupture() {
    ruptureTriggered = true;
    const focusPoint = document.getElementById('focusPoint');
    const popup = document.getElementById('m2Popup');

    focusPoint.classList.remove('hidden');

    // Shake effect
    document.querySelector('.plates-stage').style.animation = 'shake 0.3s ease';
    setTimeout(() => {
        document.querySelector('.plates-stage').style.animation = '';
    }, 500);

    popup.classList.remove('hidden');

    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
}

// ==================== MISSION 3: GLOBAL ZONES ====================
function showIndiaZone() {
    const popup = document.getElementById('m3Popup');
    popup.classList.remove('hidden');

    // Animate globe
    const globe = document.getElementById('hologlobe');
    globe.style.animation = 'none';
    setTimeout(() => {
        globe.style.animation = 'globeRotate 10s linear infinite';
    }, 100);
}

// ==================== MISSION 4: IMPACT SIMULATION ====================
function runSimulation(type) {
    const cityStage = document.getElementById('cityStage');
    const impactMsg = document.getElementById('impactMessage');

    cityStage.classList.add('shaking');

    let message = '';
    let duration = 2000;

    switch (type) {
        case 'shake':
            message = '⚠️ GROUND SHAKING: Buildings sway! Drop, Cover, and Hold On!';
            break;
        case 'liquefaction':
            message = '💧 LIQUEFACTION: Soil turns to liquid! Buildings sink and tilt!';
            break;
        case 'tsunami':
            message = '🌊 TSUNAMI WARNING! Move to higher ground immediately!';
            break;
    }

    impactMsg.textContent = message;

    // Vibrate
    if (navigator.vibrate) navigator.vibrate(300);

    // Stop shaking after duration
    setTimeout(() => {
        cityStage.classList.remove('shaking');
        setTimeout(() => {
            impactMsg.textContent = '';
        }, 2000);
    }, duration);
}

// ==================== MISSION 5: MAGNITUDE vs INTENSITY ====================
function initMission5() {
    richterSlider = document.getElementById('richterSlider');
    const magnitudeValue = document.getElementById('magnitudeValue');
    const mercalliText = document.getElementById('mercalliText');

    if (richterSlider) {
        richterSlider.addEventListener('input', function () {
            const mag = parseFloat(this.value);
            magnitudeValue.textContent = mag.toFixed(1);

            // Mercalli intensity based on magnitude
            let intensity = '';
            if (mag < 2) intensity = 'Intensity I - Not felt';
            else if (mag < 3) intensity = 'Intensity II-III - Felt indoors';
            else if (mag < 4) intensity = 'Intensity IV - Felt by many, dishes rattle';
            else if (mag < 5) intensity = 'Intensity V-VI - Felt by all, some damage';
            else if (mag < 6) intensity = 'Intensity VII - Difficult to stand, moderate damage';
            else if (mag < 7) intensity = 'Intensity VIII-IX - Significant damage, landslides';
            else if (mag < 8) intensity = 'Intensity X-XI - Severe damage, ground cracking';
            else intensity = 'Intensity XII - Total destruction';

            mercalliText.textContent = intensity;
        });
    }
}

// ==================== FINAL REWARD ====================
function showFinalReward() {
    const rewardScreen = document.getElementById('rewardScreen');
    const mission5 = document.getElementById('mission5');
    const { depthProgress, missionProgressText } = getElements();

    mission5.classList.add('hidden');
    rewardScreen.classList.remove('hidden');
    rewardScreen.classList.add('active');

    // Update final progress to 100%
    if (depthProgress) depthProgress.style.width = '100%';
    if (missionProgressText) missionProgressText.textContent = '5';


    // Sync with backend
    submitDrillResult('earthquake', 100);

    console.log('🎉 Mission Complete! 🎉');
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

// Initialize all missions
document.addEventListener('DOMContentLoaded', () => {
    initMission1();
    initMission2();
    initMission5();
    updateMissionProgress();

    console.log('Operation Deep Tremor Initialized!');
});
