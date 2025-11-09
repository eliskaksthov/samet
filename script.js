// Sametová revoluce - Herní logika

// Iniciace časomíry při startu hry
function startGame() {
    const startTime = Date.now();
    localStorage.setItem('gameStartTime', startTime);
    localStorage.setItem('gameStarted', 'true');
    
    // Inicializace splněných úkolů
    if (!localStorage.getItem('completedTasks')) {
        localStorage.setItem('completedTasks', JSON.stringify([]));
    }
    if (!localStorage.getItem('collectedChars')) {
        localStorage.setItem('collectedChars', JSON.stringify({}));
    }
    
    alert('⏱️ Časomíra spuštěna! Naskenuj první QR kód a začni plnit úkoly. Hodně štěstí! 🍀');
}

// Získání času od startu
function getElapsedTime() {
    const startTime = parseInt(localStorage.getItem('gameStartTime'));
    if (!startTime) return '00:00:00';
    
    const elapsed = Date.now() - startTime;
    const seconds = Math.floor(elapsed / 1000) % 60;
    const minutes = Math.floor(elapsed / 60000) % 60;
    const hours = Math.floor(elapsed / 3600000);
    
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function pad(num) {
    return num.toString().padStart(2, '0');
}

// Aktualizace časomíry (volat na stránkách úkolů)
function updateTimer() {
    const timerElement = document.getElementById('timer');
    if (timerElement) {
        setInterval(() => {
            timerElement.textContent = getElapsedTime();
        }, 1000);
    }
}

// Získání počtu splněných úkolů
function getCompletedTasksCount() {
    const completed = JSON.parse(localStorage.getItem('completedTasks') || '[]');
    return completed.length;
}

// Aktualizace progress trackeru
function updateProgress() {
    const progressElement = document.getElementById('progress');
    if (progressElement) {
        const count = getCompletedTasksCount();
        progressElement.textContent = `${count}/12`;
    }
}

// Kontrola odpovědi na úkol
function checkAnswer(taskNumber, correctAnswer, chars, nextHint) {
    const userAnswer = document.getElementById('answer').value.trim().toLowerCase();
    const feedbackElement = document.getElementById('feedback');
    
    if (userAnswer === correctAnswer.toLowerCase()) {
        // Správná odpověď
        feedbackElement.innerHTML = `
            <div class="success">
                ✅ <strong>Správně!</strong><br>
                Získané znaky: <span class="chars">${chars}</span><br><br>
                📍 <strong>Nápověda na další QR kód:</strong><br>
                ${nextHint}
            </div>
        `;
        feedbackElement.className = 'feedback success';
        
        // Uložit splněný úkol
        const completed = JSON.parse(localStorage.getItem('completedTasks') || '[]');
        if (!completed.includes(taskNumber)) {
            completed.push(taskNumber);
            localStorage.setItem('completedTasks', JSON.stringify(completed));
        }
        
        // Uložit získané znaky
        const collectedChars = JSON.parse(localStorage.getItem('collectedChars') || '{}');
        collectedChars[taskNumber] = chars;
        localStorage.setItem('collectedChars', JSON.stringify(collectedChars));
        
        // Aktualizovat progress
        updateProgress();
        
        // Zkontrolovat, zda jsou splněny všechny úkoly
        if (completed.length === 12) {
            setTimeout(() => {
                alert('🎉 Gratulujeme! Splnil jsi všech 12 úkolů! Teď slož finální heslo a řekni ho organizátorovi.');
            }, 2000);
        }
        
    } else {
        // Špatná odpověď
        feedbackElement.innerHTML = `
            <div class="error">
                ❌ <strong>Nesprávně.</strong> Zkus to znovu!
            </div>
        `;
        feedbackElement.className = 'feedback error';
    }
}

// Zobrazení všech sebraných znaků (pro finále)
function displayCollectedChars() {
    const collectedChars = JSON.parse(localStorage.getItem('collectedChars') || '{}');
    const charsDisplay = document.getElementById('collectedChars');
    
    if (charsDisplay) {
        let html = '<div class="chars-grid">';
        for (let i = 1; i <= 12; i++) {
            const chars = collectedChars[i] || '__';
            html += `<div class="char-box">
                <div class="task-num">Úkol ${i}</div>
                <div class="chars-display">${chars}</div>
            </div>`;
        }
        html += '</div>';
        charsDisplay.innerHTML = html;
    }
}

// Reset hry (pro testování nebo restart)
function resetGame() {
    if (confirm('Opravdu chceš resetovat hru? Všechen progress bude smazán!')) {
        localStorage.removeItem('gameStartTime');
        localStorage.removeItem('gameStarted');
        localStorage.removeItem('completedTasks');
        localStorage.removeItem('collectedChars');
        alert('Hra byla resetována!');
        location.reload();
    }
}

// Inicializace při načtení stránky
document.addEventListener('DOMContentLoaded', () => {
    updateTimer();
    updateProgress();
});
