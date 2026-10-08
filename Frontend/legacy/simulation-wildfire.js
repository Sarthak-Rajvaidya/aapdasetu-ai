// Mission tracking
let currentMission = 1;
let totalMissions = 5;

// Mission 1: Fire Triangle
let heatOn = false;
let fuelOn = false;
let oxygenOn = false;

// Mission 2: Fire Spread
let windDirection = 0;
let fireActive = false;

// Mission 3: Defensible Space
let zonesCompleted = [];

// Mission 4: Evacuation
let correctDecisionMade = false;

// Mission 5: Tools
let currentScenario = 0;
let selectedTool = null;
const scenarios = [
    { text: "Small grease fire on a person's clothes", correctTool: "blanket" },
    { text: "Small brush fire near a wooden fence", correctTool: "extinguisher" },
    { text: "Large area of dry grass needs a firebreak", correctTool: "rake" },
    { text: "Hot embers on a porch from a nearby fire", correctTool: "water" }
];

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

// ==================== MISSION 1: FIRE TRIANGLE ====================
function toggleNode() {
    heatOn = document.getElementById('heatToggle').checked;
    fuelOn = document.getElementById('fuelToggle').checked;
    oxygenOn = document.getElementById('oxygenToggle').checked;

    const resultDiv = document.getElementById('fireTriangleResult');

    if (heatOn && fuelOn && oxygenOn) {
        resultDiv.innerHTML = '<div class="alert alert-danger">🔥 FIRE CREATED! Fire Triangle Complete!</div>';
        const popup = document.getElementById('m1Popup');
        popup.classList.remove('hidden');
        if (navigator.vibrate) navigator.vibrate(300);
    } else {
        resultDiv.innerHTML = '<div class="alert alert-secondary">⚡ Fire Triangle incomplete - Need ' +
            (!heatOn ? 'Heat ' : '') + (!fuelOn ? 'Fuel ' : '') + (!oxygenOn ? 'Oxygen ' : '') + '</div>';
    }
}

// ==================== MISSION 2: FIRE SPREAD ====================
function initMission2() {
    const windSlider = document.getElementById('windSlider');
    const igniteBtn = document.getElementById('igniteBtn');
    const windArrow = document.getElementById('windArrow');

    if (windSlider) {
        windSlider.addEventListener('input', function () {
            windDirection = parseInt(this.value);
            let rotation = windDirection;
            windArrow.style.transform = `rotate(${rotation}deg)`;
        });
    }

    if (igniteBtn) {
        igniteBtn.addEventListener('click', function () {
            if (!fireActive) {
                fireActive = true;
                startFireSpread();
            }
        });
    }
}

function startFireSpread() {
    const fireIntensityBar = document.getElementById('fireIntensityBar');
    const fireIntensitySpan = document.getElementById('fireIntensity');
    const fireSpread = document.getElementById('fireSpread');

    let intensity = 0;
    const interval = setInterval(() => {
        if (intensity < 100) {
            intensity += Math.min(5 + Math.floor(windDirection / 36), 15);
            fireIntensityBar.style.width = intensity + '%';
            fireIntensitySpan.textContent = intensity;
            fireSpread.style.opacity = intensity / 100;

            // Make trees "burn"
            const trees = document.querySelectorAll('.tree');
            const burningCount = Math.floor(trees.length * (intensity / 100));
            for (let i = 0; i < burningCount; i++) {
                if (trees[i]) trees[i].classList.add('burning');
            }
        } else {
            clearInterval(interval);
            const popup = document.getElementById('m2Popup');
            popup.classList.remove('hidden');
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        }
    }, 500);
}

// ==================== MISSION 3: DEFENSIBLE SPACE ====================
function selectZone(zone) {
    const zones = ['zone0', 'zone1', 'zone2'];
    const zoneIndex = zones.indexOf(zone);

    if (zoneIndex === zonesCompleted.length && !zonesCompleted.includes(zone)) {
        zonesCompleted.push(zone);
        const zoneCard = document.querySelector(`[data-zone="${zone}"]`);
        zoneCard.classList.add('selected');
        document.getElementById('defensibleStatus').innerHTML = `✅ ${zone.toUpperCase()} cleared! Progress: ${zonesCompleted.length}/3`;

        if (zonesCompleted.length === 3) {
            document.getElementById('defensibleStatus').innerHTML = '🎉 Complete defensible space created!';
            const popup = document.getElementById('m3Popup');
            popup.classList.remove('hidden');
            if (navigator.vibrate) navigator.vibrate(200);
        }
    } else if (!zonesCompleted.includes(zone)) {
        document.getElementById('defensibleStatus').innerHTML = '⚠️ Clear zones in order: Zone 0 → Zone 1 → Zone 2';
    }
}

// ==================== MISSION 4: EVACUATION ====================
function initMission4() {
    const distanceSlider = document.getElementById('distanceSlider');
    const windSpeedSlider = document.getElementById('windSpeedSlider');
    const fireDistanceSpan = document.getElementById('fireDistance');
    const windSpeedSpan = document.getElementById('windSpeed');

    if (distanceSlider) {
        distanceSlider.addEventListener('input', function () {
            fireDistanceSpan.textContent = this.value;
        });
    }

    if (windSpeedSlider) {
        windSpeedSlider.addEventListener('input', function () {
            windSpeedSpan.textContent = this.value;
        });
    }
}

function makeDecision(decision) {
    const distance = parseFloat(document.getElementById('distanceSlider').value);
    const windSpeed = parseFloat(document.getElementById('windSpeedSlider').value);
    const feedback = document.getElementById('decisionFeedback');

    let correct = false;
    let message = '';

    if (distance < 2 || windSpeed > 30) {
        correct = (decision === 'evacuate');
        message = correct ? '✅ Correct! Evacuate immediately when fire is close!' : '❌ Wrong! You should evacuate NOW!';
    } else if (distance > 5 && windSpeed < 15) {
        correct = (decision === 'wait');
        message = correct ? '✅ Correct! Monitor conditions and be ready.' : '❌ Wrong! You can wait and prepare for now.';
    } else {
        correct = (decision === 'shelter');
        message = correct ? '✅ Correct! Sheltering is safe when fire is not imminent.' : '❌ Wrong! Consider your options carefully.';
    }

    feedback.innerHTML = message;

    if (correct && !correctDecisionMade) {
        correctDecisionMade = true;
        setTimeout(() => {
            const popup = document.getElementById('m4Popup');
            popup.classList.remove('hidden');
        }, 1000);
    }
}

// ==================== MISSION 5: FIREFIGHTING TOOLS ====================
function selectTool(tool) {
    selectedTool = tool;
    document.querySelectorAll('.tool-card').forEach(card => {
        card.classList.remove('selected');
        if (card.getAttribute('data-tool') === tool) {
            card.classList.add('selected');
        }
    });
}

function checkToolChoice() {
    const feedback = document.getElementById('toolFeedback');
    const scenario = scenarios[currentScenario];

    if (!selectedTool) {
        feedback.innerHTML = '⚠️ Please select a tool first!';
        return;
    }

    if (selectedTool === scenario.correctTool) {
        feedback.innerHTML = '✅ Correct! ' + getToolFeedback(selectedTool);
        currentScenario++;
        if (currentScenario < scenarios.length) {
            document.getElementById('scenarioText').innerHTML = `🔥 Scenario: ${scenarios[currentScenario].text}`;
            setTimeout(() => { feedback.innerHTML = ''; }, 2000);
        } else {
            const popup = document.getElementById('m5Popup');
            popup.classList.remove('hidden');
            if (navigator.vibrate) navigator.vibrate(200);
        }
    } else {
        feedback.innerHTML = '❌ Wrong tool! ' + getCorrectToolMessage(scenario.correctTool);
    }

    selectedTool = null;
    document.querySelectorAll('.tool-card').forEach(card => card.classList.remove('selected'));
}

function getToolFeedback(tool) {
    const toolFeedback = {
        'extinguisher': 'Fire extinguisher suffocates the fire by removing oxygen!',
        'water': 'Water removes heat from the fire!',
        'blanket': 'Stop, Drop, and Roll! The blanket smothers the fire!',
        'rake': 'Removing fuel creates a firebreak!'
    };
    return toolFeedback[tool] || 'Good job!';
}

function getCorrectToolMessage(correctTool) {
    const messages = {
        'extinguisher': 'Use a fire extinguisher for Class A fires.',
        'water': 'Water is best for cooling down small fires.',
        'blanket': 'A fire blanket smothers flames on people.',
        'rake': 'Rakes help create firebreaks by removing fuel.'
    };
    return messages[correctTool];
}

// ==================== FINAL REWARD ====================
function showFinalReward() {
    const rewardScreen = document.getElementById('rewardScreen');
    const mission5 = document.getElementById('mission5');

    mission5.classList.add('hidden');
    rewardScreen.classList.remove('hidden');
    rewardScreen.classList.add('active');

    document.getElementById('missionProgress').style.width = '100%';
    document.getElementById('progressText').textContent = '5';

    // Sync with backend
    submitDrillResult('wildfire', 100);

    if (navigator.vibrate) navigator.vibrate([200, 100, 200, 300]);

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

// Create fire particles background
function createFireParticles() {
    const fireBg = document.getElementById('fireBg');
    if (fireBg) {
        for (let i = 0; i < 30; i++) {
            const particle = document.createElement('div');
            particle.className = 'fire-particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDuration = Math.random() * 3 + 2 + 's';
            particle.style.animationDelay = Math.random() * 5 + 's';
            fireBg.appendChild(particle);
        }
    }
}

// Initialize all missions
document.addEventListener('DOMContentLoaded', () => {
    initMission2();
    initMission4();
    updateProgress();
    createFireParticles();
    console.log('Operation Firestorm Initialized!');
});
