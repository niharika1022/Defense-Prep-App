/* ============================================================
   DEFENSE PREP APP — app.js
   ============================================================ */

// ─── STORAGE HELPERS ────────────────────────────────────────
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };

// ─── STATE ──────────────────────────────────────────────────
let state = {
  theme:     load('dp_theme', 'dark'),
  examDate:  load('dp_examDate', ''),
  studyLog:  load('dp_studyLog', []),
  goals:     load('dp_goals', []),
  testStats: load('dp_testStats', { count: 0, totalScore: 0 }),
  streak:    load('dp_streak', { count: 0, lastDate: '' }),
  subjects:  load('dp_subjects', {
    Mathematics: 40, 'General Knowledge': 55,
    English: 70, Physics: 30,
    History: 60, Geography: 45, 'Current Affairs': 50
  })
};

// ─── THEME ──────────────────────────────────────────────────
const html = document.documentElement;
const themeToggle = document.getElementById('themeToggle');

function applyTheme(t) {
  html.setAttribute('data-theme', t);
  themeToggle.checked = (t === 'dark');
  state.theme = t;
  save('dp_theme', t);
}
applyTheme(state.theme);
themeToggle.addEventListener('change', () => applyTheme(themeToggle.checked ? 'dark' : 'light'));

// ─── NAVIGATION ─────────────────────────────────────────────
const sidebar  = document.getElementById('sidebar');
const overlay  = document.getElementById('overlay');
const menuBtn  = document.getElementById('menuBtn');
const pageTitle = document.getElementById('pageTitle');

document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    link.classList.add('active');
    document.getElementById('page-' + link.dataset.page).classList.add('active');
    pageTitle.textContent = link.textContent.trim();
    closeSidebar();
  });
});

menuBtn.addEventListener('click', () => {
  sidebar.classList.toggle('open');
  overlay.classList.toggle('show');
});
overlay.addEventListener('click', closeSidebar);
function closeSidebar() {
  sidebar.classList.remove('open');
  overlay.classList.remove('show');
}

// ─── COUNTDOWN ──────────────────────────────────────────────
const examDateInput = document.getElementById('examDate');
const countdownEl   = document.getElementById('countdown');

if (state.examDate) examDateInput.value = state.examDate;

examDateInput.addEventListener('change', () => {
  state.examDate = examDateInput.value;
  save('dp_examDate', state.examDate);
});

function updateCountdown() {
  if (!state.examDate) { countdownEl.textContent = 'Set exam date →'; return; }
  const diff = new Date(state.examDate) - new Date();
  if (diff <= 0) { countdownEl.textContent = 'Exam day! 🎖️'; return; }
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  countdownEl.textContent = `${d}d ${h}h ${m}m`;
}
updateCountdown();
setInterval(updateCountdown, 60000);

// ─── DASHBOARD STATS ────────────────────────────────────────
function updateStats() {
  // streak
  const today = new Date().toDateString();
  if (state.streak.lastDate !== today) {
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    state.streak.count = (state.streak.lastDate === yesterday) ? state.streak.count + 1 : 1;
    state.streak.lastDate = today;
    save('dp_streak', state.streak);
  }
  document.getElementById('streakNum').textContent = state.streak.count;

  // total hours from study log
  const totalSec = state.studyLog.reduce((a, e) => a + e.seconds, 0);
  document.getElementById('hoursNum').textContent = (totalSec / 3600).toFixed(1) + 'h';

  // tests
  document.getElementById('testsNum').textContent = state.testStats.count;

  // avg score
  const avg = state.testStats.count
    ? Math.round(state.testStats.totalScore / state.testStats.count)
    : 0;
  document.getElementById('scoreNum').textContent = avg + '%';
}

// ─── SUBJECT PROGRESS ───────────────────────────────────────
const COLORS = ['#f78166','#58a6ff','#3fb950','#d29922','#bc8cff','#ff6b35','#39d353'];

function renderProgress() {
  const list = document.getElementById('progressList');
  list.innerHTML = '';
  Object.entries(state.subjects).forEach(([sub, pct], i) => {
    list.innerHTML += `
      <div class="prog-item">
        <div class="prog-header"><span>${sub}</span><span>${pct}%</span></div>
        <div class="prog-bar">
          <div class="prog-fill" style="width:${pct}%;background:${COLORS[i % COLORS.length]}"></div>
        </div>
      </div>`;
  });
}

// ─── TODAY'S SCHEDULE ───────────────────────────────────────
const SCHEDULE = [
  { time: '06:00 AM', subject: 'Mathematics', duration: '90 min' },
  { time: '08:00 AM', subject: 'General Knowledge', duration: '60 min' },
  { time: '10:00 AM', subject: 'English', duration: '60 min' },
  { time: '02:00 PM', subject: 'Physics', duration: '90 min' },
  { time: '04:30 PM', subject: 'Current Affairs', duration: '45 min' },
  { time: '07:00 PM', subject: 'Mock Test', duration: '60 min' },
];

function renderSchedule() {
  document.getElementById('scheduleGrid').innerHTML = SCHEDULE.map(s => `
    <div class="sch-card">
      <div class="sch-time">${s.time}</div>
      <div class="sch-sub">${s.subject}</div>
      <div class="sch-dur">⏱ ${s.duration}</div>
    </div>`).join('');
}

// ─── STUDY TRACKER ──────────────────────────────────────────
let timerInterval = null;
let timerSeconds  = 0;
let timerRunning  = false;

const timerDisplay = document.getElementById('timerDisplay');
const startBtn     = document.getElementById('startBtn');
const pauseBtn     = document.getElementById('pauseBtn');
const stopBtn      = document.getElementById('stopBtn');
const subjectSel   = document.getElementById('subjectSelect');

function formatTime(s) {
  const h = String(Math.floor(s / 3600)).padStart(2, '0');
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const sec = String(s % 60).padStart(2, '0');
  return `${h}:${m}:${sec}`;
}

startBtn.addEventListener('click', () => {
  timerRunning = true;
  timerInterval = setInterval(() => {
    timerSeconds++;
    timerDisplay.textContent = formatTime(timerSeconds);
  }, 1000);
  startBtn.disabled = true;
  pauseBtn.disabled = false;
  stopBtn.disabled  = false;
});

pauseBtn.addEventListener('click', () => {
  if (timerRunning) {
    clearInterval(timerInterval);
    timerRunning = false;
    pauseBtn.innerHTML = '<i class="fa fa-play"></i> Resume';
  } else {
    timerInterval = setInterval(() => {
      timerSeconds++;
      timerDisplay.textContent = formatTime(timerSeconds);
    }, 1000);
    timerRunning = true;
    pauseBtn.innerHTML = '<i class="fa fa-pause"></i> Pause';
  }
});

stopBtn.addEventListener('click', () => {
  if (timerSeconds < 1) return;
  clearInterval(timerInterval);
  const entry = {
    date: new Date().toLocaleDateString(),
    subject: subjectSel.value,
    seconds: timerSeconds,
    display: formatTime(timerSeconds)
  };
  state.studyLog.unshift(entry);
  save('dp_studyLog', state.studyLog);

  // update subject progress
  const inc = Math.min(Math.floor(timerSeconds / 60), 5);
  state.subjects[entry.subject] = Math.min(100, (state.subjects[entry.subject] || 0) + inc);
  save('dp_subjects', state.subjects);

  timerSeconds = 0;
  timerDisplay.textContent = '00:00:00';
  timerRunning = false;
  startBtn.disabled = false;
  pauseBtn.disabled = true;
  pauseBtn.innerHTML = '<i class="fa fa-pause"></i> Pause';
  stopBtn.disabled  = true;

  renderStudyLog();
  renderProgress();
  updateStats();
});

function renderStudyLog() {
  const tbody = document.getElementById('studyLog');
  if (!state.studyLog.length) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--text2);padding:1.5rem">No sessions yet. Start studying!</td></tr>';
    return;
  }
  tbody.innerHTML = state.studyLog.map(e => `
    <tr><td>${e.date}</td><td>${e.subject}</td><td>${e.display}</td></tr>`).join('');
}

// ─── MOCK TEST ──────────────────────────────────────────────
const QUESTIONS = {
  Mathematics: [
    { q: 'What is the value of √144?', opts: ['10','11','12','13'], ans: 2 },
    { q: 'If 3x + 7 = 22, what is x?', opts: ['3','4','5','6'], ans: 2 },
    { q: 'What is 15% of 200?', opts: ['25','30','35','40'], ans: 1 },
    { q: 'The LCM of 12 and 18 is:', opts: ['24','36','48','72'], ans: 1 },
    { q: 'A train travels 360 km in 4 hours. Speed?', opts: ['80','90','100','110'], ans: 1 },
    { q: 'What is 2⁸?', opts: ['128','256','512','64'], ans: 1 },
    { q: 'Simplify: (a²b³)/(ab²)', opts: ['ab','a²b','ab²','a²b²'], ans: 0 },
    { q: 'Area of a circle with radius 7 cm (π=22/7)?', opts: ['144','154','164','174'], ans: 1 },
    { q: 'What is the HCF of 36 and 48?', opts: ['6','8','12','18'], ans: 2 },
    { q: 'If a = 3, b = 4, find √(a²+b²)', opts: ['5','6','7','8'], ans: 0 },
    { q: 'Solve: 5(x-2) = 3(x+4)', opts: ['x=11','x=10','x=9','x=8'], ans: 0 },
    { q: 'What is 20% of 500?', opts: ['80','90','100','110'], ans: 2 },
    { q: 'The perimeter of a square with side 9 cm?', opts: ['27','36','45','54'], ans: 1 },
    { q: 'What is the cube root of 27?', opts: ['2','3','4','5'], ans: 1 },
    { q: 'If speed = 60 km/h, time = 2.5 h, distance?', opts: ['120','140','150','160'], ans: 2 },
    { q: 'What is 7² + 8²?', opts: ['100','110','113','115'], ans: 2 },
    { q: 'Ratio 3:5 — if total is 80, larger part?', opts: ['30','40','50','60'], ans: 2 },
    { q: 'What is the value of sin 90°?', opts: ['0','0.5','1','√2/2'], ans: 2 },
    { q: 'A number increased by 20% gives 120. Original?', opts: ['90','95','100','105'], ans: 2 },
    { q: 'What is 144 ÷ 12 × 3?', opts: ['36','48','54','72'], ans: 0 },
  ],
  'General Knowledge': [
    { q: 'The National Defence Academy (NDA) is located in:', opts: ['Dehradun','Pune','Khadakwasla','Chennai'], ans: 2 },
    { q: 'Which is the highest gallantry award in India?', opts: ['Vir Chakra','Param Vir Chakra','Ashoka Chakra','Mahavir Chakra'], ans: 1 },
    { q: 'CDS exam is conducted by:', opts: ['UPSC','SSB','MOD','NDA Board'], ans: 0 },
    { q: 'Indian Army Day is celebrated on:', opts: ['Jan 15','Jan 26','Aug 15','Dec 4'], ans: 0 },
    { q: 'The first Chief of Defence Staff (CDS) of India was:', opts: ['Bipin Rawat','V K Singh','Dalbir Singh','Anil Chauhan'], ans: 0 },
    { q: 'Operation Vijay (1999) was related to:', opts: ['Sri Lanka','Kargil','Bangladesh','Nepal'], ans: 1 },
    { q: 'INS Vikrant is a:', opts: ['Submarine','Destroyer','Aircraft Carrier','Frigate'], ans: 2 },
    { q: 'The motto of the Indian Army is:', opts: ['Service Before Self','Nabhah Sprisham Diptam','Seva aur Vishwas','Shatrujeet'], ans: 0 },
    { q: 'Which country borders India to the northwest?', opts: ['Nepal','China','Pakistan','Bangladesh'], ans: 2 },
    { q: 'The Indian Air Force was established in:', opts: ['1932','1947','1950','1962'], ans: 0 },
    { q: 'Tejas is a:', opts: ['Tank','Fighter Aircraft','Missile','Submarine'], ans: 1 },
    { q: 'Which river is known as the "Sorrow of Bihar"?', opts: ['Ganga','Kosi','Son','Gandak'], ans: 1 },
    { q: 'The capital of Arunachal Pradesh is:', opts: ['Itanagar','Shillong','Kohima','Agartala'], ans: 0 },
    { q: 'Who wrote "Discovery of India"?', opts: ['Gandhi','Nehru','Patel','Bose'], ans: 1 },
    { q: 'The Siachen Glacier is in which state/UT?', opts: ['Himachal Pradesh','Uttarakhand','Ladakh','J&K'], ans: 2 },
    { q: 'DRDO stands for:', opts: ['Defence Research & Development Organisation','Defence Recruitment & Development Office','Department of Research & Defence Operations','None'], ans: 0 },
    { q: 'Which is the longest river in India?', opts: ['Yamuna','Brahmaputra','Ganga','Godavari'], ans: 2 },
    { q: 'The Battle of Panipat (1526) was fought between:', opts: ['Akbar & Hemu','Babur & Ibrahim Lodi','Humayun & Sher Shah','Aurangzeb & Shivaji'], ans: 1 },
    { q: 'India\'s first nuclear test was conducted at:', opts: ['Pokhran','Chandipur','Sriharikota','Thumba'], ans: 0 },
    { q: 'The UN Security Council has how many permanent members?', opts: ['3','4','5','6'], ans: 2 },
  ],
  English: [
    { q: 'Choose the correct spelling:', opts: ['Accomodate','Accommodate','Acommodate','Acomodate'], ans: 1 },
    { q: '"She _____ to school every day." (correct verb)', opts: ['go','goes','going','gone'], ans: 1 },
    { q: 'Antonym of "Valiant":', opts: ['Brave','Cowardly','Bold','Fierce'], ans: 1 },
    { q: 'Synonym of "Diligent":', opts: ['Lazy','Hardworking','Careless','Slow'], ans: 1 },
    { q: 'Identify the noun: "The soldier fought bravely."', opts: ['fought','bravely','soldier','The'], ans: 2 },
    { q: '"Neither the boys nor the girl ___ present." (fill in)', opts: ['are','were','was','is'], ans: 2 },
    { q: 'The passive voice of "He wrote a letter":', opts: ['A letter was written by him','A letter is written by him','A letter has been written','He had written a letter'], ans: 0 },
    { q: 'Choose the correct sentence:', opts: ['He don\'t know','He doesn\'t knows','He doesn\'t know','He not know'], ans: 2 },
    { q: 'Meaning of "Ephemeral":', opts: ['Eternal','Short-lived','Powerful','Ancient'], ans: 1 },
    { q: '"The army _____ marching." (correct form)', opts: ['are','were','is','have'], ans: 2 },
    { q: 'Identify the adjective: "The brave soldier won."', opts: ['soldier','won','brave','The'], ans: 2 },
    { q: 'One word for "Fear of water":', opts: ['Claustrophobia','Hydrophobia','Acrophobia','Xenophobia'], ans: 1 },
    { q: 'Correct plural of "Syllabus":', opts: ['Syllabuses','Syllabi','Syllabus\'s','Syllabis'], ans: 1 },
    { q: '"I am tired ___ waiting." (preposition)', opts: ['for','of','from','with'], ans: 1 },
    { q: 'The figure of speech in "The world is a stage":', opts: ['Simile','Metaphor','Personification','Hyperbole'], ans: 1 },
    { q: 'Antonym of "Verbose":', opts: ['Talkative','Concise','Loud','Fluent'], ans: 1 },
    { q: '"He is the ___ student in class." (superlative)', opts: ['more intelligent','most intelligent','intelligent','intelligenter'], ans: 1 },
    { q: 'Correct sentence:', opts: ['Between you and I','Between you and me','Between I and you','Between me and I'], ans: 1 },
    { q: 'Synonym of "Tenacious":', opts: ['Weak','Persistent','Flexible','Timid'], ans: 1 },
    { q: '"She has been working here ___ 2010." (preposition)', opts: ['for','from','since','by'], ans: 2 },
  ]
};

let testQuestions = [], testAnswers = [], currentQ = 0, testTimerInterval = null, testSeconds = 0;

const testSetup  = document.getElementById('testSetup');
const testArea   = document.getElementById('testArea');
const testResult = document.getElementById('testResult');

document.getElementById('startTestBtn').addEventListener('click', startTest);
document.getElementById('prevBtn').addEventListener('click', () => navigateQ(-1));
document.getElementById('nextBtn').addEventListener('click', () => navigateQ(1));
document.getElementById('submitTestBtn').addEventListener('click', submitTest);
document.getElementById('retakeBtn').addEventListener('click', () => {
  testResult.style.display = 'none';
  testSetup.style.display  = 'block';
});

function startTest() {
  const subj = document.getElementById('testSubject').value;
  const num  = parseInt(document.getElementById('numQuestions').value);
  const pool = subj === 'Mixed (All Subjects)'
    ? [...QUESTIONS.Mathematics, ...QUESTIONS['General Knowledge'], ...QUESTIONS.English]
    : (QUESTIONS[subj] || QUESTIONS['General Knowledge']);

  testQuestions = shuffle([...pool]).slice(0, Math.min(num, pool.length));
  testAnswers   = new Array(testQuestions.length).fill(-1);
  currentQ      = 0;
  testSeconds   = 0;

  testSetup.style.display  = 'none';
  testArea.style.display   = 'block';
  testResult.style.display = 'none';

  document.getElementById('testInfo').textContent =
    document.getElementById('examType').value + ' | ' + subj;

  clearInterval(testTimerInterval);
  testTimerInterval = setInterval(() => {
    testSeconds++;
    const m = String(Math.floor(testSeconds / 60)).padStart(2, '0');
    const s = String(testSeconds % 60).padStart(2, '0');
    document.getElementById('testTimer').textContent = `⏱ ${m}:${s}`;
  }, 1000);

  renderQuestion();
}

function renderQuestion() {
  const q   = testQuestions[currentQ];
  const sel = testAnswers[currentQ];
  document.getElementById('qProgress').textContent = `${currentQ + 1} / ${testQuestions.length}`;
  document.getElementById('prevBtn').disabled = currentQ === 0;
  document.getElementById('nextBtn').disabled = currentQ === testQuestions.length - 1;
  document.getElementById('submitTestBtn').style.display =
    currentQ === testQuestions.length - 1 ? 'inline-flex' : 'none';

  document.getElementById('questionCard').innerHTML = `
    <div class="q-text">Q${currentQ + 1}. ${q.q}</div>
    <div class="options">
      ${q.opts.map((o, i) => `
        <button class="opt-btn ${sel === i ? 'selected' : ''}" data-i="${i}">${o}</button>
      `).join('')}
    </div>`;

  document.querySelectorAll('.opt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      testAnswers[currentQ] = parseInt(btn.dataset.i);
      renderQuestion();
    });
  });
}

function navigateQ(dir) {
  currentQ += dir;
  renderQuestion();
}

function submitTest() {
  clearInterval(testTimerInterval);
  let correct = 0;
  testQuestions.forEach((q, i) => { if (testAnswers[i] === q.ans) correct++; });
  const total   = testQuestions.length;
  const score   = Math.round((correct / total) * 100);
  const wrong   = total - correct - testAnswers.filter(a => a === -1).length;
  const skipped = testAnswers.filter(a => a === -1).length;

  state.testStats.count++;
  state.testStats.totalScore += score;
  save('dp_testStats', state.testStats);
  updateStats();

  testArea.style.display   = 'none';
  testResult.style.display = 'block';

  document.getElementById('resultEmoji').textContent =
    score >= 80 ? '🏆' : score >= 60 ? '🎖️' : score >= 40 ? '💪' : '📚';
  document.getElementById('resultTitle').textContent =
    score >= 80 ? 'Outstanding Performance!' : score >= 60 ? 'Good Job, Cadet!' : score >= 40 ? 'Keep Pushing!' : 'More Practice Needed';
  document.getElementById('resultScore').textContent = score + '%';
  document.getElementById('resultBreakdown').innerHTML =
    `✅ Correct: ${correct} &nbsp;|&nbsp; ❌ Wrong: ${wrong} &nbsp;|&nbsp; ⏭ Skipped: ${skipped}<br>
     ⏱ Time taken: ${Math.floor(testSeconds/60)}m ${testSeconds%60}s`;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ─── DAILY GOALS ────────────────────────────────────────────
const goalInput    = document.getElementById('goalInput');
const goalPriority = document.getElementById('goalPriority');
const addGoalBtn   = document.getElementById('addGoalBtn');
const goalsList    = document.getElementById('goalsList');

addGoalBtn.addEventListener('click', addGoal);
goalInput.addEventListener('keydown', e => { if (e.key === 'Enter') addGoal(); });

function addGoal() {
  const text = goalInput.value.trim();
  if (!text) return;
  state.goals.push({ id: Date.now(), text, priority: goalPriority.value, done: false });
  save('dp_goals', state.goals);
  goalInput.value = '';
  renderGoals();
}

function renderGoals() {
  if (!state.goals.length) {
    goalsList.innerHTML = '<div style="color:var(--text2);text-align:center;padding:2rem">No goals yet. Add your first goal!</div>';
    updateGoalsBar();
    return;
  }
  goalsList.innerHTML = state.goals.map(g => `
    <div class="goal-item ${g.done ? 'done' : ''}" data-id="${g.id}">
      <div class="goal-check ${g.done ? 'checked' : ''}" data-action="toggle">
        ${g.done ? '<i class="fa fa-check"></i>' : ''}
      </div>
      <span class="goal-text">${g.text}</span>
      <span class="goal-pri pri-${g.priority}">
        ${g.priority === 'high' ? '🔴 High' : g.priority === 'medium' ? '🟡 Medium' : '🟢 Low'}
      </span>
      <button class="goal-del" data-action="delete" title="Delete"><i class="fa fa-trash"></i></button>
    </div>`).join('');

  goalsList.querySelectorAll('[data-action="toggle"]').forEach(el => {
    el.addEventListener('click', () => {
      const id = parseInt(el.closest('.goal-item').dataset.id);
      const g  = state.goals.find(x => x.id === id);
      if (g) { g.done = !g.done; save('dp_goals', state.goals); renderGoals(); }
    });
  });
  goalsList.querySelectorAll('[data-action="delete"]').forEach(el => {
    el.addEventListener('click', () => {
      const id = parseInt(el.closest('.goal-item').dataset.id);
      state.goals = state.goals.filter(x => x.id !== id);
      save('dp_goals', state.goals);
      renderGoals();
    });
  });
  updateGoalsBar();
}

function updateGoalsBar() {
  const total = state.goals.length;
  const done  = state.goals.filter(g => g.done).length;
  const pct   = total ? Math.round((done / total) * 100) : 0;
  document.getElementById('goalsBarFill').style.width = pct + '%';
  document.getElementById('goalsBarText').textContent = `${done} / ${total} goals completed`;
}

// ─── INIT ────────────────────────────────────────────────────
updateStats();
renderProgress();
renderSchedule();
renderStudyLog();
renderGoals();
