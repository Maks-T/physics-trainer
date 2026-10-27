// Читаем ID параграфа из ссылки (например, trainer.html?p=1)
const urlParams = new URLSearchParams(window.location.search);
const paragraphId = urlParams.get('p') || '1';

let data = null;
let currentCard = 0;
let currentQ = 0;
let score = 0;
let activeSection = 'all'; // 'all' или индекс 0, 1, 2...

// Загрузка JSON данных
fetch(`data/p${paragraphId}.json`)
    .then(res => {
        if (!res.ok) throw new Error("Файл данных не найден");
        return res.json();
    })
    .then(json => {
        data = json;
        initApp();
    })
    .catch(err => {
        document.getElementById('page-title').innerText = "Ошибка загрузки";
        document.getElementById('page-subtitle').innerText = "Запустите проект через локальный сервер (например, Live Server в VS Code). " + err.message;
    });

function initApp() {
    document.title = data.title;
    document.getElementById('page-title').innerText = data.title;
    document.getElementById('page-subtitle').innerText = data.subtitle;

    renderSpeaker();
    renderTimeline();
    updateCardUI();
    renderQuestion();
}

// 1. СУФЛЁР (С вкладками по разделам)
function renderSpeaker() {
    const fullContainer = document.getElementById('speaker-full-container');
    const keyContainer = document.getElementById('speaker-keywords-container');

    fullContainer.innerHTML = '';
    keyContainer.innerHTML = '';

    // Создаем панель вкладок по разделам
    const navBar = document.createElement('div');
    navBar.className = 'section-tabs';
    
    let tabsHTML = `<button class="sec-tab-btn ${activeSection === 'all' ? 'active' : ''}" onclick="selectSection('all')">📄 Все разделы</button>`;
    data.sections.forEach((sec, idx) => {
        // Короткое имя для вкладки (первые 25 символов названия)
        const shortName = sec.title.length > 28 ? sec.title.slice(0, 25) + '…' : sec.title;
        tabsHTML += `<button class="sec-tab-btn ${activeSection === idx ? 'active' : ''}" onclick="selectSection(${idx})">${shortName}</button>`;
    });
    navBar.innerHTML = tabsHTML;
    fullContainer.appendChild(navBar);

    // Контейнер под текст разделов
    const contentBox = document.createElement('div');
    contentBox.id = 'sec-content-box';

    data.sections.forEach((sec, idx) => {
        const isVisible = (activeSection === 'all' || activeSection === idx);
        
        // Текст
        const parsedText = sec.text.replace(/\{([^}]+)\}/g, '<span class="secret-word">$1</span>');
        const box = document.createElement('div');
        box.className = 'section-box';
        box.id = `section-box-${idx}`;
        box.style.display = isVisible ? 'block' : 'none';

        // Кнопки перехода между разделами внизу (если учим по одному)
        let navArrows = '';
        if (activeSection !== 'all') {
            const prevBtn = idx > 0 ? `<button class="btn btn-outline" style="padding:4px 12px; font-size:0.8rem;" onclick="selectSection(${idx - 1})">⬅ Назад</button>` : '<div></div>';
            const nextBtn = idx < data.sections.length - 1 ? `<button class="btn" style="padding:4px 12px; font-size:0.8rem;" onclick="selectSection(${idx + 1})">Следующий раздел ➡</button>` : `<button class="btn" style="padding:4px 12px; font-size:0.8rem; background:var(--success);" onclick="selectSection('all')">✔ Повторить всё целиком</button>`;
            navArrows = `<div style="display:flex; justify-content:space-between; margin-top:14px; padding-top:10px; border-top:1px dashed var(--border);">${prevBtn}${nextBtn}</div>`;
        }

        box.innerHTML = `<div class="section-title">${sec.title}</div><p>${parsedText}</p>${navArrows}`;
        contentBox.appendChild(box);

        // Опорная цепочка
        if (sec.chain && sec.chain.length > 0) {
            const chainRow = document.createElement('div');
            chainRow.className = 'chain-row';
            chainRow.id = `chain-row-${idx}`;
            chainRow.style.display = isVisible ? 'block' : 'none';
            const tags = sec.chain.map(t => `<span class="chain-tag">${t}</span>`).join('<span class="chain-arrow">→</span>');
            chainRow.innerHTML = `<div class="chain-title">${sec.title}:</div><div class="chain-items">${tags}</div>`;
            keyContainer.appendChild(chainRow);
        }
    });

    fullContainer.appendChild(contentBox);

    document.querySelectorAll('.secret-word').forEach(el => {
        el.addEventListener('click', () => el.classList.toggle('hidden'));
    });
}

function selectSection(idx) {
    activeSection = idx;
    renderSpeaker();
}

function setSpeakerMode(mode) {
    document.querySelectorAll('#tab-speaker .mode-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');

    const words = document.querySelectorAll('.secret-word');
    const fullCont = document.getElementById('speaker-full-container');
    const keyCont = document.getElementById('speaker-keywords-container');

    if (mode === 'full') {
        fullCont.style.display = 'block';
        keyCont.style.display = 'none';
        words.forEach(w => w.classList.remove('hidden'));
    } else if (mode === 'hints') {
        fullCont.style.display = 'block';
        keyCont.style.display = 'none';
        words.forEach(w => w.classList.add('hidden'));
    } else if (mode === 'keywords') {
        fullCont.style.display = 'none';
        keyCont.style.display = 'block';
    }
}

// 2. ФЛЕШ-КАРТОЧКИ
function updateCardUI() {
    if (!data.flashcards || data.flashcards.length === 0) return;
    const fc = data.flashcards[currentCard];
    document.getElementById('fc-category').innerText = fc.cat || "Термин";
    document.getElementById('fc-front-text').innerText = fc.q;
    document.getElementById('fc-back-text').innerText = fc.a;
    document.getElementById('fc-index').innerText = currentCard + 1;
    document.getElementById('fc-total').innerText = data.flashcards.length;
    document.querySelector('.flashcard').classList.remove('flipped');
}
function flipCard(el) { el.classList.toggle('flipped'); }
function nextCard() { currentCard = (currentCard + 1) % data.flashcards.length; updateCardUI(); }
function prevCard() { currentCard = (currentCard - 1 + data.flashcards.length) % data.flashcards.length; updateCardUI(); }

// 3. ХРОНОГРАФ
function renderTimeline() {
    const container = document.getElementById('timeline-container');
    container.innerHTML = '';

    data.timeline.forEach(item => {
        const row = document.createElement('div');
        row.className = 'timeline-item';
        row.innerHTML = `
            <div class="timeline-dot"></div>
            <div class="timeline-date" onclick="revealItem(this)">${item.date}</div>
            <div class="timeline-text" onclick="revealItem(this)"><strong>${item.title}:</strong> ${item.text}</div>
        `;
        container.appendChild(row);
    });
}

function setTimelineMode(mode) {
    document.querySelectorAll('#tab-timeline .mode-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');

    const dates = document.querySelectorAll('.timeline-date');
    const texts = document.querySelectorAll('.timeline-text');

    dates.forEach(d => d.classList.remove('tl-hidden'));
    texts.forEach(t => t.classList.remove('tl-hidden'));

    if (mode === 'hide-dates') dates.forEach(d => d.classList.add('tl-hidden'));
    else if (mode === 'hide-events') texts.forEach(t => t.classList.add('tl-hidden'));
    else if (mode === 'hide-both') {
        dates.forEach(d => d.classList.add('tl-hidden'));
        texts.forEach(t => t.classList.add('tl-hidden'));
    }
}
function revealItem(el) {
    if (el.classList.contains('tl-hidden')) el.classList.remove('tl-hidden');
}

// 4. ТЕСТ
function renderQuestion() {
    if (!data.quiz || data.quiz.length === 0) return;
    const q = data.quiz[currentQ];
    document.getElementById('q-text').innerText = `${currentQ + 1}. ${q.q}`;
    const optsContainer = document.getElementById('q-options');
    optsContainer.innerHTML = '';
    document.getElementById('q-feedback').innerText = '';
    document.getElementById('q-next-btn').style.display = 'none';

    q.opts.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = 'quiz-opt';
        btn.innerText = opt;
        btn.onclick = () => checkAnswer(idx);
        optsContainer.appendChild(btn);
    });
}

function checkAnswer(chosenIdx) {
    const q = data.quiz[currentQ];
    const buttons = document.querySelectorAll('.quiz-opt');
    buttons.forEach(b => b.style.pointerEvents = 'none');

    if (chosenIdx === q.correct) {
        buttons[chosenIdx].classList.add('correct');
        document.getElementById('q-feedback').innerHTML = '<span style="color:var(--success);">Верно! 👏</span>';
        score++;
    } else {
        buttons[chosenIdx].classList.add('wrong');
        buttons[q.correct].classList.add('correct');
        document.getElementById('q-feedback').innerHTML = '<span style="color:var(--danger);">Неверно! Ответ выделен зелёным.</span>';
    }
    document.getElementById('q-next-btn').style.display = 'inline-block';
}

function nextQuestion() {
    currentQ++;
    if (currentQ < data.quiz.length) {
        renderQuestion();
    } else {
        document.getElementById('quiz-box').style.display = 'none';
        document.getElementById('quiz-result').style.display = 'block';
        document.getElementById('quiz-score').innerText = `Ваш результат: ${score} из ${data.quiz.length}`;
    }
}

function restartQuiz() {
    currentQ = 0;
    score = 0;
    document.getElementById('quiz-box').style.display = 'block';
    document.getElementById('quiz-result').style.display = 'none';
    renderQuestion();
}

// НАВИГАЦИЯ ОСНОВНЫХ ВКЛАДОК
function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById('tab-' + tabId).classList.add('active');
}