// CONFIGURATION FIREBASE
const firebaseConfig = {
    apiKey: "VOTRE_API_KEY",
    authDomain: "VOTRE_PROJECT_ID.firebaseapp.com",
    databaseURL: "https://VOTRE_PROJECT_ID-default-rtdb.firebaseio.com",
    projectId: "VOTRE_PROJECT_ID",
    storageBucket: "VOTRE_PROJECT_ID.appspot.com",
    messagingSenderId: "VOTRE_SENDER_ID",
    appId: "VOTRE_APP_ID"
};

if (typeof firebase !== 'undefined' && firebase.apps.length === 0) {
    firebase.initializeApp(firebaseConfig);
}

const database = (typeof firebase !== 'undefined') ? firebase.database() : null;
const rostersRef = database ? database.ref('lspd_rosters') : null;
const rdvRef = database ? database.ref('lspd_rdv') : null;
const rdvLogsRef = database ? database.ref('lspd_rdv_logs') : null;

const TRAINER_PASSWORD = "LSPD";

let rostersData = [];
let rdvData = [];
let rdvLogsData = [];
let currentUser = null;
let pendingDeleteIndex = null;
let activeRdvToCompleteId = null; 
let activeModuleContext = null; 

// FONCTION DE POP-UP UNIVERSEL POUR REMPLACER LES ALERTS NATIVES
function showAppAlert(message, title = "Notification", icon = "💬") {
    document.getElementById('app-alert-title').innerText = title;
    document.getElementById('app-alert-message').innerHTML = message;
    document.getElementById('app-alert-icon').innerText = icon;
    document.getElementById('app-alert-modal').classList.remove('hidden');
}

const closeAppAlertBtn = document.getElementById('btn-close-app-alert');
if (closeAppAlertBtn) {
    closeAppAlertBtn.onclick = () => {
        document.getElementById('app-alert-modal').classList.add('hidden');
    };
}

if (rostersRef) {
    rostersRef.on('value', (snapshot) => {
        rostersData = snapshot.val() || [];
        refreshActiveViews();
    });
}
if (rdvRef) {
    rdvRef.on('value', (snapshot) => {
        rdvData = snapshot.val() || [];
        updateRdvBadge();
        refreshActiveViews();
    });
}
if (rdvLogsRef) {
    rdvLogsRef.on('value', (snapshot) => {
        rdvLogsData = snapshot.val() || [];
        refreshActiveViews();
    });
}

function saveRosters(data) {
    if (rostersRef) rostersRef.set(data);
    else localStorage.setItem('lspd_rosters', JSON.stringify(data));
}

function saveRdv(data) {
    if (rdvRef) rdvRef.set(data);
    else localStorage.setItem('lspd_rdv', JSON.stringify(data));
    updateRdvBadge();
}

function saveRdvLogs(data) {
    if (rdvLogsRef) rdvLogsRef.set(data);
    else localStorage.setItem('lspd_rdv_logs', JSON.stringify(data));
}

function refreshActiveViews() {
    updateRdvBadge();
    checkRdvAuthStatus();
    checkQcmAuthStatus();
    if (currentUser) {
        if (currentUser.role === 'trainer') {
            renderTrainerTable();
            renderTrainerRdvList();
            renderTrainerRdvLogs();
        }
        if (currentUser.role === 'rookie') {
            renderRookieView();
            renderRookieRdvList();
        }
    }
}

function updateRdvBadge() {
    const badge = document.getElementById('rdv-badge');
    if (!badge) return;
    const currentRdv = rdvData.length ? rdvData : (JSON.parse(localStorage.getItem('lspd_rdv')) || []);
    const unseenCount = currentRdv.filter(r => !r.seen).length;

    if (unseenCount === 0) {
        badge.classList.add('hidden');
    } else {
        badge.classList.remove('hidden');
        badge.innerText = unseenCount > 9 ? "+9" : unseenCount.toString();
    }
}

function checkRdvAuthStatus() {
    const wrapper = document.getElementById('rdv-content-wrapper');
    const overlay = document.getElementById('rdv-lock-overlay');
    if (!wrapper || !overlay) return;

    if (currentUser && currentUser.matricule) {
        wrapper.classList.remove('locked');
        overlay.classList.add('hidden');
    } else {
        wrapper.classList.add('locked');
        overlay.classList.remove('hidden');
    }
}

function checkQcmAuthStatus() {
    const banner = document.getElementById('qcm-auth-banner');
    if (!banner) return;
    if (currentUser && currentUser.matricule) {
        banner.classList.add('hidden');
    } else {
        banner.classList.remove('hidden');
    }
}

// NAVIGATION
const views = {
    home: document.getElementById('home-view'),
    detail: document.getElementById('detail-view'),
    rdv: document.getElementById('rdv-view'),
    lockedRoster: document.getElementById('roster-locked-view'),
    lockedFiche: document.getElementById('fiche-locked-view'),
    rookie: document.getElementById('rookie-dashboard'),
    trainer: document.getElementById('trainer-dashboard')
};

function hideAllViews() {
    Object.values(views).forEach(v => { if (v) v.classList.add('hidden'); });
    document.querySelectorAll('.btn-nav').forEach(b => b.classList.remove('active'));
}

document.getElementById('nav-btn-home').onclick = (e) => { hideAllViews(); views.home.classList.remove('hidden'); e.target.classList.add('active'); };

document.getElementById('nav-btn-my-fiche').onclick = (e) => {
    hideAllViews();
    e.target.classList.add('active');
    if (currentUser && currentUser.role === 'rookie') {
        views.rookie.classList.remove('hidden');
        renderRookieView();
    } else {
        views.lockedFiche.classList.remove('hidden');
    }
};

document.getElementById('btn-open-rookie-login').onclick = () => {
    document.getElementById('role-select').value = 'rookie';
    document.getElementById('password-label').innerText = "Code Secret Recrue :";
    document.getElementById('login-modal').classList.remove('hidden');
};

document.getElementById('nav-btn-roster').onclick = (e) => {
    hideAllViews();
    e.target.classList.add('active');
    if (currentUser && currentUser.role === 'trainer') {
        views.trainer.classList.remove('hidden');
        renderTrainerTable();
    } else {
        views.lockedRoster.classList.remove('hidden');
    }
};

document.getElementById('btn-open-trainer-login').onclick = () => {
    document.getElementById('role-select').value = 'trainer';
    document.getElementById('password-label').innerText = "Mot de passe Instructeur :";
    document.getElementById('login-modal').classList.remove('hidden');
};

document.getElementById('btn-open-rdv-login').onclick = () => {
    document.getElementById('role-select').value = 'rookie';
    document.getElementById('password-label').innerText = "Code Secret Recrue :";
    document.getElementById('login-modal').classList.remove('hidden');
};

document.getElementById('btn-qcm-inline-login').onclick = () => {
    document.getElementById('role-select').value = 'rookie';
    document.getElementById('password-label').innerText = "Code Secret Recrue :";
    document.getElementById('login-modal').classList.remove('hidden');
};

document.getElementById('nav-btn-rdv').onclick = (e) => {
    hideAllViews();
    views.rdv.classList.remove('hidden');
    e.target.classList.add('active');
    checkRdvAuthStatus();

    if (currentUser && currentUser.role === 'trainer') {
        let currentRdv = rdvData.length ? [...rdvData] : (JSON.parse(localStorage.getItem('lspd_rdv')) || []);
        currentRdv.forEach(r => r.seen = true);
        saveRdv(currentRdv);
        renderTrainerRdvList();
        renderTrainerRdvLogs();
    }
    renderRookieRdvList();
};

// FLASHCARDS 10-XX
const flashcardsList = [
    { code: "10-0", meaning: "Mauvaise réception radio / Radio défectueuse (Problème de tête)", category: "Système" },
    { code: "10-3", meaning: "Retour radio / Arrivée sur Fréquence", category: "Communication" },
    { code: "10-4", meaning: "Bien reçu", category: "Communication" },
    { code: "10-5", meaning: "Négatif", category: "Communication" },
    { code: "10-6", meaning: "Occupé", category: "Statut" },
    { code: "10-7", meaning: "Pause de Service", category: "Statut" },
    { code: "10-8", meaning: "Début de service / disponible pour appels", category: "Statut" },
    { code: "10-9", meaning: "Répéter le dernier message", category: "Communication" },
    { code: "10-10", meaning: "Fin de service", category: "Statut" },
    { code: "10-12", meaning: "Attente de dispatch", category: "Dispatch" },
    { code: "10-15", meaning: "Escorte ou convoi Suspect détenu / transport du prisonnier", category: "Procédure" },
    { code: "10-19", meaning: "En route vers… (préciser la localisation)", category: "Déplacement" },
    { code: "10-20", meaning: "Votre localisation", category: "Navigation" },
    { code: "10-22", meaning: "Annuler dernier call radio", category: "Radio" },
    { code: "10-25", meaning: "Rapport de Situation", category: "Opération" },
    { code: "10-31", meaning: "Tirs d'armes à feu", category: "Urgence" },
    { code: "10-35", meaning: "Demande de renfort sur position (préciser rue, etc...)", category: "Appel d'Urgence" },
    { code: "10-38", meaning: "Contrôle routier", category: "Patrouille" },
    { code: "10-40", meaning: "Braquage de banque, commerces ou d'ATM, cambriolage", category: "Alerte Majeure" },
    { code: "10-41", meaning: "Début de patrouille", category: "Patrouille" },
    { code: "10-42", meaning: "Fin de patrouille", category: "Patrouille" },
    { code: "10-50", meaning: "Accident", category: "Incidents" },
    { code: "10-56", meaning: "Refus d’obtempérer", category: "Poursuite" },
    { code: "10-99", meaning: "Agents en Danger / Urgence absolue", category: "Urgence Absolue" },
    { code: "CODE 3", meaning: "Intervention d’urgence avec sirène et gyrophare", category: "Priorité" }
];

let currentCardIndex = 0;
const cardElement = document.getElementById('flashcard-element');

function updateFlashcard() {
    if (!cardElement) return;
    cardElement.classList.remove('flipped');
    setTimeout(() => {
        const item = flashcardsList[currentCardIndex];
        document.getElementById('card-code').innerText = item.code;
        document.getElementById('card-meaning').innerText = item.meaning;
        document.getElementById('card-category').innerText = item.category;
        document.getElementById('fc-counter').innerText = `${currentCardIndex + 1} / ${flashcardsList.length}`;
    }, 200);
}

if (cardElement) cardElement.addEventListener('click', () => cardElement.classList.toggle('flipped'));
document.getElementById('fc-next').onclick = () => { currentCardIndex = (currentCardIndex + 1) % flashcardsList.length; updateFlashcard(); };
document.getElementById('fc-prev').onclick = () => { currentCardIndex = (currentCardIndex - 1 + flashcardsList.length) % flashcardsList.length; updateFlashcard(); };
document.getElementById('fc-random').onclick = () => { currentCardIndex = Math.floor(Math.random() * flashcardsList.length); updateFlashcard(); };

// QCM CHRONOMÉTRÉ EN 5 SECONDES PAR QUESTION
const quizQuestions = [
    { q: "1. Que signifie un appel radio 10-56 ?", options: ["Contrôle routier", "Refus d'obtempérer", "Agent en danger", "Pause de service"], answer: 1 },
    { q: "2. Quelle unité gère les enquêtes criminelles et filatures ?", options: ["S.W.A.T", "MCD (Detective Bureau) / Eagle", "Air Support Unit", "Traffic Division"], answer: 1 },
    { q: "3. Que se passe-t-il en cas d'oubli de la lecture des Droits Miranda ?", options: ["Amende de 500$", "Avertissement verbal", "Vice de procédure et annulation des charges", "Rien"], answer: 2 },
    { q: "4. Quel est le terme exact à utiliser dans le rapport pour sécuriser immédiatement l'individu ?", options: ["Fouille approfondie", "Palpation de sécurité", "Inspection corporelle", "Contrôle visuel"], answer: 1 },
    { q: "5. Quelle patrouille correspond à un agent effectuant son service en solo ?", options: ["Adam", "Lincoln", "Tango", "Xray"], answer: 1 },
    { q: "6. Quel code d'urgence autorise l'usage combiné des gyrophares et des sirènes ?", options: ["CODE 1", "CODE 2", "CODE 3", "CODE 4"], answer: 2 },
    { q: "7. Que doit-on obligatoirement vérifier et inclure dans les saisies concernant les armes ?", options: ["Uniquement les armes à feu longues", "Uniquement les armes de poing", "Les armes collées directement sur l'individu", "Aucune arme"], answer: 2 },
    { q: "8. Quelle patrouille désigne une intervention à moto (Mary) ?", options: ["Mary", "Henry", "Metro", "Traffic"], answer: 0 },
    { q: "9. Quelle manœuvre est utilisée pour neutraliser un véhicule en poursuite sous validation ?", options: ["Manœuvre PIT", "Code 4", "Récitation Miranda", "Barrage PPA"], answer: 0 },
    { q: "10. Quel est le principe essentiel d'un rapport d'arrestation selon le manuel ?", options: ["Être le plus long possible", "Être factuel, clair et dans l'ordre chronologique", "Inventer des détails narratifs", "Ne pas mettre d'heures"], answer: 1 }
];

let currentQuizIndex = 0;
let quizScore = 0;
let quizTimerInterval = null;
let quizTimeLeft = 5;
let lastQuizScore = null;

const startBtn = document.getElementById('btn-start-quiz');
const restartBtn = document.getElementById('btn-restart-quiz');
const startScreen = document.getElementById('quiz-start-screen');
const activeScreen = document.getElementById('quiz-active-screen');
const resultBox = document.getElementById('quiz-result-box');

if (startBtn) startBtn.onclick = startQuiz;
if (restartBtn) restartBtn.onclick = startQuiz;

function startQuiz() {
    currentQuizIndex = 0;
    quizScore = 0;
    startScreen.classList.add('hidden');
    resultBox.classList.add('hidden');
    activeScreen.classList.remove('hidden');
    showQuestion();
}

function showQuestion() {
    clearInterval(quizTimerInterval);

    if (currentQuizIndex >= quizQuestions.length) {
        endQuiz();
        return;
    }

    const q = quizQuestions[currentQuizIndex];
    document.getElementById('quiz-q-counter').innerText = `Question ${currentQuizIndex + 1} / ${quizQuestions.length}`;
    
    const container = document.getElementById('quiz-single-question');
    let optsHtml = q.options.map((opt, idx) => `
        <button class="quiz-option-btn btn-secondary" onclick="selectAnswer(${idx})">
            ${opt}
        </button>
    `).join('');

    container.innerHTML = `
        <div class="quiz-q-title">${q.q}</div>
        <div class="quiz-options-grid">${optsHtml}</div>
    `;

    quizTimeLeft = 5;
    updateTimerUI();

    quizTimerInterval = setInterval(() => {
        quizTimeLeft--;
        updateTimerUI();
        if (quizTimeLeft <= 0) {
            clearInterval(quizTimerInterval);
            currentQuizIndex++;
            showQuestion();
        }
    }, 1000);
}

function updateTimerUI() {
    const timerText = document.getElementById('quiz-timer-text');
    const timerFill = document.getElementById('quiz-timer-bar-fill');
    if (timerText) timerText.innerText = `⏳ ${quizTimeLeft}s`;
    if (timerFill) {
        const pct = (quizTimeLeft / 5) * 100;
        timerFill.style.width = `${pct}%`;
    }
}

window.selectAnswer = function(optIndex) {
    clearInterval(quizTimerInterval);
    const q = quizQuestions[currentQuizIndex];
    if (optIndex === q.answer) {
        quizScore++;
    }
    currentQuizIndex++;
    showQuestion();
};

function endQuiz() {
    clearInterval(quizTimerInterval);
    activeScreen.classList.add('hidden');
    resultBox.classList.remove('hidden');
    
    lastQuizScore = quizScore;
    document.getElementById('quiz-score-text').innerText = `${quizScore} / ${quizQuestions.length}`;
    document.getElementById('quiz-feedback-text').innerText = quizScore >= 7 
        ? "✅ Félicitations ! Vos réflexes et connaissances sont validés." 
        : "⚠️ Dommage ! Réviser les modules pour gagner en rapidité.";
}

// TRANSMISSION QCM AVEC POPUP DE SUCCÈS
document.getElementById('btn-send-quiz-result').onclick = () => {
    if (!currentUser || !currentUser.matricule) {
        showAppAlert("Vous devez être connecté avec votre matricule pour enregistrer votre score dans le Roster.", "Connexion Requise", "🔒");
        document.getElementById('login-modal').classList.remove('hidden');
        return;
    }

    const rosters = rostersData.length ? [...rostersData] : (JSON.parse(localStorage.getItem('lspd_rosters')) || []);
    let rookie = rosters.find(r => r.matricule === currentUser.matricule);
    
    if (!rookie) { 
        showAppAlert("Aucun dossier recrue trouvé pour ce matricule dans la Training Division.", "Erreur", "❌"); 
        return; 
    }

    rookie.quizScore = `${lastQuizScore}/10`;
    saveRosters(rosters);

    document.getElementById('qcm-success-modal').classList.remove('hidden');
};

document.getElementById('btn-close-qcm-success').onclick = () => {
    document.getElementById('qcm-success-modal').classList.add('hidden');
};

// CONTENU MODULES
const modulesData = {
    ls1: `<h1>Formation Initiale LSPD</h1><h2>1. Équipements</h2><p>Glock 17, Taser X26, Flashball, Radio, Jumelles.</p><h2>2. Unités</h2><p><strong>MCD (Detective Bureau) :</strong> Enquêtes & Investigations.<br><strong>S.W.A.T :</strong> Interventions à haut risque.</p>`,
    ls2: `
        <h1>⚖️ Guide de Rédaction des Rapports d’Arrestation</h1>
        <p style="color: var(--text-secondary); margin-bottom: 25px;">Manuel interne de la Training Division — Objectif : des rapports factuels, complets et conformes à la procédure.</p>
        
        <div style="background: rgba(56, 189, 248, 0.05); border-left: 4px solid var(--brand-cyan); padding: 18px; border-radius: 10px; margin-bottom: 25px;">
            <h3 style="color: var(--brand-cyan); margin-bottom: 8px;">📌 1. Le Principe Essentiel</h3>
            <p>Un rapport d’arrestation doit retranscrire les faits et la procédure dans l’ordre exact où ils se sont déroulés. Il doit être clair, factuel et suffisamment précis pour permettre à une personne absente de comprendre l’intégralité de l’intervention. Ne cherchez pas à embellir le rapport : une procédure correctement racontée vaut mieux qu’un récit inutilement long.</p>
        </div>

        <h2>⏱️ 2. La Chronologie & Les Heures à Ne Pas Oublier</h2>
        <p style="color: var(--text-secondary); margin-bottom: 15px;">Les heures de l’en-tête doivent correspondre exactement à celles racontées dans le corps du rapport.</p>
        <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 30px;">
            <div style="background: var(--bg-subcard); padding: 12px 16px; border-radius: 8px; border: 1px solid var(--border-card);">1️⃣ <strong>Production des faits :</strong> Contexte et intervention des agents (Heure : XXhXX)</div>
            <div style="background: var(--bg-subcard); padding: 12px 16px; border-radius: 8px; border: 1px solid var(--border-card);">2️⃣ <strong>Arrestation / Interpellation :</strong> Maîtrise de l'individu (Heure : XXhXX)</div>
            <div style="background: var(--bg-subcard); padding: 12px 16px; border-radius: 8px; border: 1px solid var(--border-card);">3️⃣ <strong>Transport & Droits Miranda :</strong> Notification des droits et vérification de la compréhension (Heure : XXhXX)</div>
            <div style="background: var(--bg-subcard); padding: 12px 16px; border-radius: 8px; border: 1px solid var(--border-card);">4️⃣ <strong>Biens personnels & Saisies :</strong> Inventaire et prise en compte des objets (Heure : XXhXX)</div>
            <div style="background: var(--bg-subcard); padding: 12px 16px; border-radius: 8px; border: 1px solid var(--border-card);">5️⃣ <strong>Placement en Garde à Vue :</strong> Clôture de la procédure au PDP (Heure : XXhXX)</div>
        </div>

        <h2>🔍 3. Palpation de Sécurité & Fouille Approfondie</h2>
        <div style="background: var(--bg-subcard); padding: 16px; border-radius: 10px; border: 1px solid var(--border-card); margin-bottom: 25px;">
            <p style="margin-bottom: 10px;">⚠️ <strong>Important :</strong> Dans le corps du rapport, utilisez bien le terme <em>« palpation de sécurité »</em> lorsqu’il s’agit de sécuriser immédiatement l’individu.</p>
            <p style="color: var(--text-secondary); margin-bottom: 8px;"><strong>Formulation recommandée :</strong></p>
            <blockquote style="background: var(--bg-main); padding: 10px 14px; border-radius: 6px; border-left: 3px solid var(--brand-cyan); font-style: italic; color: var(--text-primary);">
                « Une palpation de sécurité a immédiatement été effectuée afin de vérifier que l’individu ne détenait aucun objet susceptible de représenter un danger pour les agents, les civils ou lui-même. Les armes et moyens de communication ont été retirés oralement conformément à la procédure. »
            </blockquote>
        </div>

        <h2>⚖️ 4. Les Droits Miranda & Demandes de l’Individu</h2>
        <p style="color: var(--text-secondary); margin-bottom: 15px;">La procédure doit préciser l’heure de lecture, la compréhension des droits et les demandes formulées.</p>
        <div style="background: var(--bg-subcard); padding: 16px; border-radius: 10px; border: 1px solid var(--border-card); margin-bottom: 25px;">
            <p><strong>Exemple de rédaction :</strong> <em>« À 22h08, les droits Miranda ont été notifiés à M. X. Celui-ci a déclaré les avoir compris dès la première lecture. »</em></p>
            <ul style="margin-top: 10px; padding-left: 20px; color: var(--text-secondary);">
                <li>Nourriture ou boisson demandée</li>
                <li>Demande d’avocat</li>
                <li>Absence de demande particulière</li>
            </ul>
            <p style="margin-top: 12px; color: var(--gold); font-size: 0.9rem;">🚫 <strong>Règle :</strong> Ne mentionnez jamais une demande qui n’a pas réellement été formulée par l’individu.</p>
        </div>

        <h2>🎒 5. Les Saisies : Vérification Obligatoire</h2>
        <p style="color: var(--text-secondary); margin-bottom: 15px;">La rubrique des saisies doit contenir l’ensemble des éléments concernés, sans oublier les objets essentiels :</p>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 25px;">
            <div style="background: var(--bg-subcard); padding: 14px; border-radius: 8px; border: 1px solid var(--border-card);">
                <strong style="color: var(--brand-cyan);">📡 Communication</strong>
                <ul style="margin-top: 8px; padding-left: 18px; font-size: 0.88rem; color: var(--text-secondary);">
                    <li>Téléphone</li>
                    <li>Radio</li>
                    <li>Autres moyens</li>
                </ul>
            </div>
            <div style="background: var(--bg-subcard); padding: 14px; border-radius: 8px; border: 1px solid var(--border-card);">
                <strong style="color: var(--brand-cyan);">🔫 Armement</strong>
                <ul style="margin-top: 8px; padding-left: 18px; font-size: 0.88rem; color: var(--text-secondary);">
                    <li>Armes de poing / longues</li>
                    <li>Armes blanches / Munitions</li>
                    <li>Gilet pare-balles & Armes collées</li>
                </ul>
            </div>
            <div style="background: var(--bg-subcard); padding: 14px; border-radius: 8px; border: 1px solid var(--border-card);">
                <strong style="color: var(--brand-cyan);">💼 Biens Personnels</strong>
                <ul style="margin-top: 8px; padding-left: 18px; font-size: 0.88rem; color: var(--text-secondary);">
                    <li>Sac & Argent</li>
                    <li>Vêtements & Documents</li>
                    <li>Objets personnels</li>
                </ul>
            </div>
        </div>

        <div style="background: rgba(239, 68, 68, 0.05); border-left: 4px solid var(--red); padding: 16px; border-radius: 10px; margin-bottom: 25px;">
            <h4 style="color: var(--red); margin-bottom: 6px;">⚠️ Point Critique : Les Armes Collées</h4>
            <p style="font-size: 0.9rem; margin-bottom: 8px;">Lors de la vérification finale, assurez-vous que les armes collées directement sur l’individu sont également prises en compte.</p>
            <p style="font-size: 0.85rem; color: var(--text-secondary);"><strong>Formulation obligatoire à utiliser :</strong> <br><em>« L’ensemble des biens personnels détenus par l’individu a été saisi conformément à la procédure. L’ensemble des armes collées présentes sur l’individu a également été saisi et pris en compte dans les saisies. »</em></p>
        </div>

        <h2>❌ 6. Ce qu’il ne faut JAMAIS faire</h2>
        <ul style="background: var(--bg-subcard); padding: 16px 25px; border-radius: 10px; border: 1px solid var(--border-card); color: var(--text-secondary); margin-bottom: 25px; display: flex; flex-direction: column; gap: 8px;">
            <li>🚫 Inventer une action ou une étape de procédure.</li>
            <li>🚫 Ajouter une déclaration que le suspect n’a jamais faite.</li>
            <li>🚫 Modifier l’ordre réel des événements.</li>
            <li>🚫 Confondre palpation de sécurité et fouille approfondie.</li>
            <li>🚫 Oublier les biens personnels, le téléphone, la radio ou les armes collées.</li>
        </ul>

        <h2>☑️ 7. Checklist Avant Publication</h2>
        <div style="background: var(--bg-subcard); padding: 16px; border-radius: 10px; border: 1px solid var(--border-card);">
            <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 12px;">Vérifiez chaque point avant de valider votre rapport :</p>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 8px; font-size: 0.88rem; color: var(--text-primary);">
                <div>☐ Nom et prénom correctement renseignés</div>
                <div>☐ Lieu de production des faits indiqué</div>
                <div>☐ Heures présentes et cohérentes</div>
                <div>☐ Arrestation expliquée dans le corps</div>
                <div>☐ Palpation de sécurité mentionnée</div>
                <div>☐ Droits Miranda et compréhension</div>
                <div>☐ Demandes réelles de l'individu</div>
                <div>☐ Fouille approfondie mentionnée</div>
                <div>☐ Biens personnels & Téléphone pris en compte</div>
                <div>☐ Radio & Armes / Armes collées vérifiées</div>
                <div>☐ Placement en garde à vue renseigné</div>
            </div>
            <p style="margin-top: 15px; color: var(--green); font-weight: 600; text-align: center;">🛡️ Un rapport propre protège la procédure. Un rapport précis limite les vices de forme.</p>
        </div>
    `,
    ls3: `<h1>Formation Patrouille</h1><p>Lincoln, Adam, Tango, Xray. Contrôle routier & Réponse obligatoire aux appels 911.</p>`,
    ls4: `
        <h1>📻 Procédure Radio & Codes Officiels</h1>
        <p style="color: var(--text-secondary); margin-bottom: 25px;">Guide complet et stylisé des communications radio de la police pour un apprentissage rapide et efficace sur le terrain.</p>
        
        <div style="background: rgba(56, 189, 248, 0.05); border-left: 4px solid var(--brand-cyan); padding: 18px; border-radius: 10px; margin-bottom: 25px;">
            <h3 style="color: var(--brand-cyan); margin-bottom: 8px;">🎯 Règle d'or de la radio</h3>
            <p>Soyez clairs, concis et professionnels. Utilisez toujours votre indicatif d'affiliation au début de chaque communication.</p>
        </div>

        <h2>📡 1. Codes Radios (10-XX)</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px; margin: 15px 0 30px 0;">
            <div style="background: var(--bg-subcard); padding: 12px 16px; border-radius: 8px; border: 1px solid var(--border-card);"><strong>10-0 :</strong> Mauvaise réception / Radio défectueuse (Problème de tête)</div>
            <div style="background: var(--bg-subcard); padding: 12px 16px; border-radius: 8px; border: 1px solid var(--border-card);"><strong>10-3 :</strong> Retour radio / Arrivée sur Fréquence</div>
            <div style="background: var(--bg-subcard); padding: 12px 16px; border-radius: 8px; border: 1px solid var(--border-card);"><strong>10-4 :</strong> Bien reçu</div>
            <div style="background: var(--bg-subcard); padding: 12px 16px; border-radius: 8px; border: 1px solid var(--border-card);"><strong>10-5 :</strong> Négatif</div>
            <div style="background: var(--bg-subcard); padding: 12px 16px; border-radius: 8px; border: 1px solid var(--border-card);"><strong>10-6 :</strong> Occupé</div>
            <div style="background: var(--bg-subcard); padding: 12px 16px; border-radius: 8px; border: 1px solid var(--border-card);"><strong>10-7 :</strong> Pause de Service</div>
            <div style="background: var(--bg-subcard); padding: 12px 16px; border-radius: 8px; border: 1px solid var(--border-card);"><strong>10-8 :</strong> Début de service / disponible pour appels</div>
            <div style="background: var(--bg-subcard); padding: 12px 16px; border-radius: 8px; border: 1px solid var(--border-card);"><strong>10-9 :</strong> Répéter le dernier message</div>
            <div style="background: var(--bg-subcard); padding: 12px 16px; border-radius: 8px; border: 1px solid var(--border-card);"><strong>10-10 :</strong> Fin de service</div>
            <div style="background: var(--bg-subcard); padding: 12px 16px; border-radius: 8px; border: 1px solid var(--border-card);"><strong>10-12 :</strong> Attente de dispatch</div>
            <div style="background: var(--bg-subcard); padding: 12px 16px; border-radius: 8px; border: 1px solid var(--border-card);"><strong>10-15 :</strong> Escorte / convoi suspect détenu / transport prisonnier</div>
            <div style="background: var(--bg-subcard); padding: 12px 16px; border-radius: 8px; border: 1px solid var(--border-card);"><strong>10-19 :</strong> En route vers... (préciser la localisation)</div>
            <div style="background: var(--bg-subcard); padding: 12px 16px; border-radius: 8px; border: 1px solid var(--border-card);"><strong>10-20 :</strong> Votre localisation</div>
            <div style="background: var(--bg-subcard); padding: 12px 16px; border-radius: 8px; border: 1px solid var(--border-card);"><strong>10-22 :</strong> Annuler dernier call radio</div>
            <div style="background: var(--bg-subcard); padding: 12px 16px; border-radius: 8px; border: 1px solid var(--border-card);"><strong>10-25 :</strong> Rapport de Situation</div>
            <div style="background: var(--bg-subcard); padding: 12px 16px; border-radius: 8px; border: 1px solid var(--border-card); border-left: 3px solid var(--red);"><strong>10-31 :</strong> Tirs d'armes à feu</div>
            <div style="background: var(--bg-subcard); padding: 12px 16px; border-radius: 8px; border: 1px solid var(--border-card); border-left: 3px solid var(--red);"><strong>10-35 :</strong> Demande de renfort sur position (préciser rue...)</div>
            <div style="background: var(--bg-subcard); padding: 12px 16px; border-radius: 8px; border: 1px solid var(--border-card);"><strong>10-38 :</strong> Contrôle routier</div>
            <div style="background: var(--bg-subcard); padding: 12px 16px; border-radius: 8px; border: 1px solid var(--border-card); border-left: 3px solid var(--gold);"><strong>10-40 :</strong> Braquage banque / commerces / ATM / Cambriolage</div>
            <div style="background: var(--bg-subcard); padding: 12px 16px; border-radius: 8px; border: 1px solid var(--border-card);"><strong>10-41 :</strong> Début de patrouille</div>
            <div style="background: var(--bg-subcard); padding: 12px 16px; border-radius: 8px; border: 1px solid var(--border-card);"><strong>10-42 :</strong> Fin de patrouille</div>
            <div style="background: var(--bg-subcard); padding: 12px 16px; border-radius: 8px; border: 1px solid var(--border-card);"><strong>10-50 :</strong> Accident</div>
            <div style="background: var(--bg-subcard); padding: 12px 16px; border-radius: 8px; border: 1px solid var(--border-card); border-left: 3px solid var(--gold);"><strong>10-56 :</strong> Refus d’obtempérer</div>
            <div style="background: var(--bg-subcard); padding: 12px 16px; border-radius: 8px; border: 1px solid var(--border-card); border-left: 4px solid var(--red);"><strong>10-99 :</strong> Agents en Danger (Urgence Absolue)</div>
        </div>

        <h2>👥 2. Codes d’Affiliation (Effectifs)</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin: 15px 0 30px 0;">
            <div style="background: var(--bg-subcard); padding: 14px; border-radius: 8px; border: 1px solid var(--border-card);">👤 <strong>Lincoln :</strong> Patrouille seul</div>
            <div style="background: var(--bg-subcard); padding: 14px; border-radius: 8px; border: 1px solid var(--border-card);">👥 <strong>Adam :</strong> Patrouille à deux</div>
            <div style="background: var(--bg-subcard); padding: 14px; border-radius: 8px; border: 1px solid var(--border-card);">⚞ <strong>Tango :</strong> Patrouille à trois</div>
            <div style="background: var(--bg-subcard); padding: 14px; border-radius: 8px; border: 1px solid var(--border-card);">⚟ <strong>Xray :</strong> Patrouille à quatre</div>
            <div style="background: var(--bg-subcard); padding: 14px; border-radius: 8px; border: 1px solid var(--border-card);">🏍️ <strong>Mary :</strong> Moto</div>
            <div style="background: var(--bg-subcard); padding: 14px; border-radius: 8px; border: 1px solid var(--border-card);">🚁 <strong>Henry :</strong> Hélicoptère</div>
            <div style="background: var(--bg-subcard); padding: 14px; border-radius: 8px; border: 1px solid var(--border-card);">🏢 <strong>Metro :</strong> Métropolitain Division</div>
            <div style="background: var(--bg-subcard); padding: 14px; border-radius: 8px; border: 1px solid var(--border-card);">🔍 <strong>Eagle :</strong> Detective Bureau</div>
            <div style="background: var(--bg-subcard); padding: 14px; border-radius: 8px; border: 1px solid var(--border-card);">🚗 <strong>Traffic :</strong> Traffic Division</div>
        </div>

        <h2>🚨 3. Codes Secondaires & Urgences</h2>
        <div style="display: flex; flex-direction: column; gap: 10px; margin: 15px 0 30px 0;">
            <div style="background: var(--bg-subcard); padding: 12px 18px; border-radius: 8px; border: 1px solid var(--border-card);">🟢 <strong>CODE 1 :</strong> Intervention discrète (Pas de sirène, pas de gyrophare)</div>
            <div style="background: var(--bg-subcard); padding: 12px 18px; border-radius: 8px; border: 1px solid var(--border-card);">🟡 <strong>CODE 2 :</strong> Intervention urgente sans sirène, gyrophare uniquement</div>
            <div style="background: var(--bg-subcard); padding: 12px 18px; border-radius: 8px; border: 1px solid var(--border-card); border-left: 3px solid var(--gold);">🔴 <strong>CODE 3 :</strong> Intervention d’urgence avec sirène et gyrophare</div>
            <div style="background: var(--bg-subcard); padding: 12px 18px; border-radius: 8px; border: 1px solid var(--border-card); border-left: 3px solid var(--green);">✅ <strong>CODE 4 :</strong> Situation sous contrôle - Fin d’intervention</div>
            <div style="background: var(--bg-subcard); padding: 12px 18px; border-radius: 8px; border: 1px solid var(--border-card); border-left: 4px solid var(--red);">🚨 <strong>CODE 99 :</strong> UN OFFICIER EN DANGER - URGENCE ABSOLUE</div>
        </div>

        <h2>💬 4. Exemples Pratiques & Cas d'Usage</h2>
        <div style="background: rgba(2, 6, 14, 0.7); padding: 20px; border-radius: 12px; border: 1px solid var(--border-glow); display: flex; flex-direction: column; gap: 15px;">
            <div>
                <p style="color: var(--text-secondary); margin-bottom: 5px;">👉 <em>Vous êtes en Adam et vous procédez à un refus d’obtempérer :</em></p>
                <code style="display: block; background: var(--bg-main); padding: 10px 14px; border-radius: 8px; color: var(--brand-cyan); font-family: monospace;">- Adam 93, 10-56 en CODE 3 d’une berline occupée 2 fois, pas besoin de 10-35.</code>
            </div>
            <div>
                <p style="color: var(--text-secondary); margin-bottom: 5px;">👉 <em>Vous êtes 3 et vous avez besoin de renfort :</em></p>
                <code style="display: block; background: var(--bg-main); padding: 10px 14px; border-radius: 8px; color: var(--brand-cyan); font-family: monospace;">- Tango 93 besoin d’un 10-35 sur le dernier 10-56.</code>
            </div>
            <div>
                <p style="color: var(--text-secondary); margin-bottom: 5px;">👉 <em>Vous êtes deux et vous arrivez sur la demande de renfort :</em></p>
                <code style="display: block; background: var(--bg-main); padding: 10px 14px; border-radius: 8px; color: var(--brand-cyan); font-family: monospace;">- Adam 93 10-97 nous arrivons sur le 10-35.</code>
            </div>
        </div>
    `,
    ls5: `<h1>Formation Opération</h1><p>Périmètres de sécurité (Zone Grise & Zone Rouge), règles d'engagement.</p>`,
    ls6: `<h1>Formation Conduite</h1><p>Conduite prioritaire sous Code 3 et manœuvres PIT de neutralisation.</p>`
};

document.querySelectorAll('.view-btn').forEach(button => {
    button.addEventListener('click', (e) => {
        const card = e.target.closest('.card');
        const moduleKey = card.getAttribute('data-module');
        if (modulesData[moduleKey]) {
            document.getElementById('detail-content').innerHTML = modulesData[moduleKey];
            hideAllViews();
            views.detail.classList.remove('hidden');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
});
document.getElementById('back-btn').onclick = () => { hideAllViews(); views.home.classList.remove('hidden'); };

// LOGIN
const loginModal = document.getElementById('login-modal');
const roleSelect = document.getElementById('role-select');
const passwordLabel = document.getElementById('password-label');
const passwordInput = document.getElementById('password-input');

roleSelect.addEventListener('change', () => {
    passwordLabel.innerText = (roleSelect.value === 'trainer') ? "Mot de passe Instructeur :" : "Code Secret Recrue :";
});

document.getElementById('btn-login-modal').onclick = () => loginModal.classList.remove('hidden');
document.querySelector('.close-modal').onclick = () => loginModal.classList.add('hidden');

document.getElementById('login-form').onsubmit = (e) => {
    e.preventDefault();
    const matricule = document.getElementById('matricule-input').value.trim();
    const role = roleSelect.value;
    const pass = passwordInput.value.trim();
    const rosters = rostersData.length ? rostersData : (JSON.parse(localStorage.getItem('lspd_rosters')) || []);

    if (role === 'trainer') {
        if (pass !== TRAINER_PASSWORD) { showAppAlert("Mot de passe instructeur incorrect !", "Erreur d'Authentification", "❌"); return; }
    } else {
        const rookie = rosters.find(r => r.matricule === matricule);
        if (!rookie) { showAppAlert("Aucun dossier recrue trouvé pour ce matricule.", "Erreur", "❌"); return; }
        if (rookie.password && rookie.password !== pass) { showAppAlert("Code secret incorrect !", "Erreur", "❌"); return; }
    }

    currentUser = { matricule, role };
    loginModal.classList.add('hidden');
    passwordInput.value = '';
    updateNavUser();
    renderUserView();
};

function updateNavUser() {
    const navUserZone = document.getElementById('nav-user-zone');
    if (currentUser) {
        navUserZone.innerHTML = `
            <span style="margin-right:12px; font-weight:700; color: var(--brand-cyan)">${currentUser.role === 'trainer' ? 'Instructeur' : 'Agent #' + currentUser.matricule}</span>
            <button id="btn-logout" class="btn btn-secondary btn-small">Déconnexion</button>
        `;
        document.getElementById('btn-logout').onclick = () => {
            currentUser = null;
            navUserZone.innerHTML = `<button id="btn-login-modal" class="btn btn-glow">🔒 Connexion Agent</button>`;
            document.getElementById('btn-login-modal').onclick = () => loginModal.classList.remove('hidden');
            checkRdvAuthStatus();
            checkQcmAuthStatus();
            hideAllViews(); views.home.classList.remove('hidden');
        };
    }
}

function renderUserView() {
    hideAllViews();
    checkRdvAuthStatus();
    checkQcmAuthStatus();
    if (currentUser.role === 'rookie') {
        views.rookie.classList.remove('hidden');
        document.getElementById('nav-btn-my-fiche').classList.add('active');
        renderRookieView();
    } else if (currentUser.role === 'trainer') {
        views.trainer.classList.remove('hidden');
        document.getElementById('nav-btn-roster').classList.add('active');
        renderTrainerTable();
        renderTrainerRdvList();
        renderTrainerRdvLogs();
    }
}

// MODAL AJOUT RECRUE
const addRookieModal = document.getElementById('add-rookie-modal');
document.getElementById('btn-open-add-rookie').onclick = () => addRookieModal.classList.remove('hidden');
document.getElementById('close-add-modal').onclick = () => addRookieModal.classList.add('hidden');

document.getElementById('add-rookie-form').onsubmit = (e) => {
    e.preventDefault();
    const mat = document.getElementById('new-mat-input').value.trim();
    const name = document.getElementById('new-name-input').value.trim();
    const pass = document.getElementById('new-pass-input').value.trim();

    const rosters = rostersData.length ? [...rostersData] : (JSON.parse(localStorage.getItem('lspd_rosters')) || []);
    if (rosters.some(r => r.matricule === mat)) {
        showAppAlert("Ce matricule existe déjà dans la base.", "Erreur", "❌");
        return;
    }

    rosters.push({
        matricule: mat,
        name: name,
        password: pass,
        modules: { 
            ls1: { validated: false, comment: "" }, 
            ls2: { validated: false, comment: "" }, 
            ls3: { validated: false, comment: "" }, 
            ls4: { validated: false, comment: "" }, 
            ls5: { validated: false, comment: "" }, 
            ls6: { validated: false, comment: "" } 
        }
    });

    saveRosters(rosters);
    addRookieModal.classList.add('hidden');
    document.getElementById('new-mat-input').value = '';
    document.getElementById('new-name-input').value = '';
    document.getElementById('new-pass-input').value = '1234';
    renderTrainerTable();
};

// GESTION SUPPRESSION AVEC POPUP "REVENIR / SUPPRIMER"
window.deleteRookie = function(rookieIndex) {
    const rosters = rostersData.length ? [...rostersData] : (JSON.parse(localStorage.getItem('lspd_rosters')) || []);
    const rookie = rosters[rookieIndex];
    pendingDeleteIndex = rookieIndex;

    document.getElementById('delete-confirm-text').innerText = `Voulez-vous vraiment supprimer la fiche de la recrue #${rookie.matricule} (${rookie.name}) ?`;
    document.getElementById('delete-confirm-modal').classList.remove('hidden');
};

document.getElementById('btn-cancel-delete').onclick = () => {
    pendingDeleteIndex = null;
    document.getElementById('delete-confirm-modal').classList.add('hidden');
};

document.getElementById('btn-confirm-delete').onclick = () => {
    if (pendingDeleteIndex !== null) {
        const rosters = rostersData.length ? [...rostersData] : (JSON.parse(localStorage.getItem('lspd_rosters')) || []);
        rosters.splice(pendingDeleteIndex, 1);
        saveRosters(rosters);
        renderTrainerTable();
    }
    pendingDeleteIndex = null;
    document.getElementById('delete-confirm-modal').classList.add('hidden');
};

// RENDEZ-VOUS AVEC POPUP DE SUCCÈS
document.getElementById('rdv-form').onsubmit = (e) => {
    e.preventDefault();
    if (!currentUser || !currentUser.matricule) {
        showAppAlert("Vous devez être connecté avec votre matricule.", "Connexion Requise", "🔒");
        loginModal.classList.remove('hidden');
        return;
    }

    const currentRdv = rdvData.length ? [...rdvData] : (JSON.parse(localStorage.getItem('lspd_rdv')) || []);
    currentRdv.push({
        id: Date.now(),
        matricule: currentUser.matricule,
        module: document.getElementById('rdv-module').value,
        date: document.getElementById('rdv-date').value.trim(),
        notes: document.getElementById('rdv-notes').value.trim(),
        seen: false,
        takenBy: null 
    });
    saveRdv(currentRdv);
    
    document.getElementById('rdv-date').value = '';
    document.getElementById('rdv-notes').value = '';
    
    document.getElementById('rdv-success-modal').classList.remove('hidden');
    renderRookieRdvList();
};

document.getElementById('btn-close-rdv-success').onclick = () => {
    document.getElementById('rdv-success-modal').classList.add('hidden');
};

function renderRookieRdvList() {
    const list = document.getElementById('rookie-rdv-list');
    if (!list) return;
    const currentRdv = rdvData.length ? rdvData : (JSON.parse(localStorage.getItem('lspd_rdv')) || []);
    const mat = currentUser ? currentUser.matricule : null;
    const myRdv = mat ? currentRdv.filter(r => r.matricule === mat) : [];

    list.innerHTML = myRdv.length ? '<h4 style="margin-top:20px;">Demandes Actives :</h4>' + myRdv.map(r => `
        <div class="rdv-item" style="margin-top:10px; padding:10px; background:var(--bg-subcard); border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
            <div>
                <strong>${r.module}</strong> - <span>${r.date}</span> (${r.notes || 'Aucune note'})
                ${r.takenBy ? `<br><small style="color:var(--green)">✅ Pris en charge par l'Instructeur #${r.takenBy}</small>` : '<br><small style="color:var(--gold)">⏳ En attente de prise en charge</small>'}
            </div>
            <button class="btn-danger" onclick="cancelRdv(${r.id})">Annuler</button>
        </div>
    `).join('') : '';
}

function renderTrainerRdvList() {
    const container = document.getElementById('trainer-rdv-list');
    if (!container) return;
    const currentRdv = rdvData.length ? rdvData : (JSON.parse(localStorage.getItem('lspd_rdv')) || []);
    if (!currentRdv.length) {
        container.innerHTML = '<p style="color:var(--text-secondary)">Aucune demande de rendez-vous en attente.</p>';
        return;
    }
    container.innerHTML = currentRdv.map(r => `
        <div class="rdv-card-trainer">
            <h4>Recrue #${r.matricule}</h4>
            <p><strong>Module :</strong> ${r.module}</p>
            <p><strong>Créneau :</strong> ${r.date}</p>
            <p><strong>Notes :</strong> ${r.notes || 'Aucune'}</p>
            <p style="margin-top:8px;"><strong>Statut :</strong> ${r.takenBy ? `<span style="color:var(--green)">Pris en charge par #${r.takenBy}</span>` : '<span style="color:var(--gold)">Non assigné</span>'}</p>
            <div style="display:flex; gap:10px; margin-top:12px;">
                ${!r.takenBy ? `<button class="btn btn-glow" style="padding:6px 12px; font-size:0.8rem;" onclick="takeRdv(${r.id})">🤝 Prendre en charge</button>` : ''}
                <button class="btn-danger" onclick="completeRdv(${r.id})">Clôturer / Traité</button>
            </div>
        </div>
    `).join('');
}

window.takeRdv = function(id) {
    if (!currentUser || currentUser.role !== 'trainer') {
        showAppAlert("Action réservée aux instructeurs connectés.", "Accès Refusé", "🔒");
        return;
    }

    let currentRdv = rdvData.length ? [...rdvData] : (JSON.parse(localStorage.getItem('lspd_rdv')) || []);
    let rdv = currentRdv.find(r => r.id === id);
    if (!rdv) return;

    rdv.takenBy = currentUser.matricule;
    saveRdv(currentRdv);

    showAppAlert(`Vous avez pris en charge le rendez-vous de la recrue #${rdv.matricule}.`, "Rendez-vous Pris en Charge", "🤝");
    renderTrainerRdvList();
    renderRookieRdvList();
};

window.completeRdv = function(id) {
    activeRdvToCompleteId = id;
    document.getElementById('rdv-feedback-input').value = "";
    document.getElementById('rdv-feedback-modal').classList.remove('hidden');
};

const closeRdvFeedbackBtn = document.getElementById('close-rdv-feedback');
if (closeRdvFeedbackBtn) {
    closeRdvFeedbackBtn.onclick = () => {
        document.getElementById('rdv-feedback-modal').classList.add('hidden');
        activeRdvToCompleteId = null;
    };
}

const rdvFeedbackForm = document.getElementById('rdv-feedback-form');
if (rdvFeedbackForm) {
    rdvFeedbackForm.onsubmit = (e) => {
        e.preventDefault();
        if (activeRdvToCompleteId === null) return;

        const feedbackText = document.getElementById('rdv-feedback-input').value.trim();
        let currentRdv = rdvData.length ? [...rdvData] : (JSON.parse(localStorage.getItem('lspd_rdv')) || []);
        let currentLogs = rdvLogsData.length ? [...rdvLogsData] : (JSON.parse(localStorage.getItem('lspd_rdv_logs')) || []);
        
        const index = currentRdv.findIndex(r => r.id === activeRdvToCompleteId);
        if (index === -1) return;

        const rdv = currentRdv[index];
        const trainerMatricule = rdv.takenBy || (currentUser ? currentUser.matricule : "Inconnu");

        currentLogs.unshift({
            id: Date.now(),
            text: `L'instructeur <strong>#${trainerMatricule}</strong> a traité le RDV (${rdv.module}) de la recrue <strong>#${rdv.matricule}</strong>.<br><small style="color:var(--brand-cyan)">💬 Note : "${feedbackText}"</small>`,
            date: new Date().toLocaleDateString('fr-FR') + ' à ' + new Date().toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})
        });

        saveRdvLogs(currentLogs);

        currentRdv.splice(index, 1);
        saveRdv(currentRdv);

        document.getElementById('rdv-feedback-modal').classList.add('hidden');
        activeRdvToCompleteId = null;

        renderTrainerRdvList();
        renderRookieRdvList();
        renderTrainerRdvLogs();
        showAppAlert("Rendez-vous clôturé et consigné dans les logs avec succès !", "Succès", "✅");
    };
}

function renderTrainerRdvLogs() {
    const container = document.getElementById('trainer-rdv-logs-list');
    if (!container) return;
    const currentLogs = rdvLogsData.length ? rdvLogsData : (JSON.parse(localStorage.getItem('lspd_rdv_logs')) || []);

    if (!currentLogs.length) {
        container.innerHTML = '<p style="color:var(--text-secondary)">Aucun log enregistré pour le moment.</p>';
        return;
    }

    container.innerHTML = currentLogs.map(log => `
        <div class="log-item">
            <div>${log.text}</div>
            <span style="font-size:0.78rem; color:var(--text-secondary); white-space:nowrap; margin-left:15px;">🕒 ${log.date}</span>
        </div>
    `).join('');
}

window.cancelRdv = function(id) {
    let currentRdv = rdvData.length ? [...rdvData] : (JSON.parse(localStorage.getItem('lspd_rdv')) || []);
    currentRdv = currentRdv.filter(r => r.id !== id);
    saveRdv(currentRdv);
    renderRookieRdvList();
    renderTrainerRdvList();
};

function renderRookieView() {
    const rosters = rostersData.length ? rostersData : (JSON.parse(localStorage.getItem('lspd_rosters')) || []);
    let rookie = rosters.find(r => r.matricule === currentUser.matricule);
    if (!rookie) return;

    document.getElementById('rookie-name-display').innerText = rookie.name || ("Agent #" + rookie.matricule);
    document.getElementById('rookie-matricule-display').innerText = `#${rookie.matricule}`;
    document.getElementById('rookie-qcm-display').innerText = rookie.quizScore || 'Non effectué';

    let validModulesCount = 0;
    for (let i = 1; i <= 6; i++) {
        const mod = rookie.modules[`ls${i}`];
        if (typeof mod === 'object' ? mod.validated : mod) validModulesCount++;
    }

    const percentage = Math.round((validModulesCount / 6) * 100);
    document.getElementById('progress-percent').innerText = `${percentage}%`;
    document.getElementById('progress-bar-fill').style.width = `${percentage}%`;

    const statusElem = document.getElementById('rookie-global-status');
    if (percentage === 100) {
        statusElem.innerText = "✅ Officier Assermenté (6/6)";
        statusElem.style.color = "var(--green)";
    } else {
        statusElem.innerText = `⏳ En formation (${validModulesCount}/6 Validés)`;
        statusElem.style.color = "var(--gold)";
    }

    const statusGrid = document.getElementById('rookie-status-grid');
    statusGrid.innerHTML = '';
    for (let i = 1; i <= 6; i++) {
        const modKey = `ls${i}`;
        const modData = rookie.modules[modKey] || { validated: false, comment: "" };
        const isValid = typeof modData === 'object' ? modData.validated : modData;
        const comment = (typeof modData === 'object' && modData.comment) ? modData.comment : "Aucun commentaire de l'instructeur pour le moment.";

        statusGrid.innerHTML += `
            <div class="status-card glass-card" style="padding:20px; margin-bottom:12px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px;">
                    <div><strong>Module LS ${i}</strong></div>
                    <span class="status-badge ${isValid ? 'valid' : 'pending'}">${isValid ? '✅ Validé' : '⏳ En attente'}</span>
                </div>
                <p style="font-size: 0.85rem; color: var(--text-secondary); background: var(--bg-subcard); padding: 8px 12px; border-radius: 8px; border-left: 3px solid var(--brand-cyan);">
                    💬 <em>Feedback instructeur :</em> ${comment}
                </p>
            </div>
        `;
    }
}

function renderTrainerTable() {
    const rosters = rostersData.length ? rostersData : (JSON.parse(localStorage.getItem('lspd_rosters')) || []);
    const tbody = document.getElementById('roster-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (rosters.length === 0) return;

    rosters.forEach((rookie, index) => {
        let validCount = 0;
        for (let i = 1; i <= 6; i++) {
            const m = rookie.modules[`ls${i}`];
            if (typeof m === 'object' ? m.validated : m) validCount++;
        }

        let row = `<tr>
            <td><strong>#${rookie.matricule}</strong></td>
            <td>${rookie.name}</td>
            <td><span class="pin-badge">${rookie.password || '1234'}</span></td>`;
        
        for (let i = 1; i <= 6; i++) {
            const modKey = `ls${i}`;
            const modData = rookie.modules[modKey];
            const isValid = typeof modData === 'object' ? modData.validated : modData;
            
            row += `<td class="module-check" onclick="toggleModule(${index}, '${modKey}')" title="Cliquez pour changer le statut / ajouter un commentaire">
                ${isValid ? '✅' : '❌'}
            </td>`;
        }
        
        row += `<td><strong>${rookie.quizScore || 'N/A'}</strong></td>
                <td><span class="status-badge ${validCount === 6 ? 'valid' : 'pending'}">${validCount}/6 Validés</span></td>
                <td><button class="btn-danger" onclick="deleteRookie(${index})">🗑️ Supprimer</button></td>
               </tr>`;
        tbody.innerHTML += row;
    });
}

window.toggleModule = function(rookieIndex, moduleKey) {
    const rosters = rostersData.length ? [...rostersData] : (JSON.parse(localStorage.getItem('lspd_rosters')) || []);
    let rookie = rosters[rookieIndex];
    
    if (typeof rookie.modules[moduleKey] !== 'object') {
        rookie.modules[moduleKey] = { validated: !!rookie.modules[moduleKey], comment: "" };
    }

    activeModuleContext = {
        rookieIndex: rookieIndex,
        moduleKey: moduleKey,
        currentStatus: rookie.modules[moduleKey].validated
    };

    document.getElementById('module-feedback-subtitle').innerText = `Agent #${rookie.matricule} - Module ${moduleKey.toUpperCase()}`;
    document.getElementById('module-feedback-input').value = rookie.modules[moduleKey].comment || "";
    document.getElementById('module-feedback-modal').classList.remove('hidden');
};

const closeModuleFeedbackBtn = document.getElementById('close-module-feedback');
const cancelModuleFeedbackBtn = document.getElementById('btn-cancel-module-feedback');
if (closeModuleFeedbackBtn) closeModuleFeedbackBtn.onclick = closeModuleFeedbackModal;
if (cancelModuleFeedbackBtn) cancelModuleFeedbackBtn.onclick = closeModuleFeedbackModal;

function closeModuleFeedbackModal() {
    document.getElementById('module-feedback-modal').classList.add('hidden');
    activeModuleContext = null;
}

const moduleFeedbackForm = document.getElementById('module-feedback-form');
if (moduleFeedbackForm) {
    moduleFeedbackForm.onsubmit = (e) => {
        e.preventDefault();
        if (!activeModuleContext) return;

        const { rookieIndex, moduleKey, currentStatus } = activeModuleContext;
        const commentText = document.getElementById('module-feedback-input').value.trim();

        const rosters = rostersData.length ? [...rostersData] : (JSON.parse(localStorage.getItem('lspd_rosters')) || []);
        let rookie = rosters[rookieIndex];

        rookie.modules[moduleKey].validated = !currentStatus;
        rookie.modules[moduleKey].comment = commentText;

        saveRosters(rosters);
        closeModuleFeedbackModal();
        renderTrainerTable();
    };
}

const searchInput = document.getElementById('search-rookie');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        document.querySelectorAll('#roster-tbody tr').forEach(row => {
            row.style.display = row.innerText.toLowerCase().includes(term) ? '' : 'none';
        });
    });
}

updateRdvBadge();
checkRdvAuthStatus();
checkQcmAuthStatus();
renderTrainerRdvLogs();