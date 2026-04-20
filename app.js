// Format seconds to MM:SS
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Screen Wake Lock to prevent screen from sleeping
let wakeLock = null;

async function requestWakeLock() {
  if ('wakeLock' in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      console.log('Wake Lock acquired');
    } catch (err) {
      console.log('Wake Lock failed:', err.message);
    }
  }
}

async function releaseWakeLock() {
  if (wakeLock) {
    await wakeLock.release();
    wakeLock = null;
    console.log('Wake Lock released');
  }
}

// Re-acquire wake lock when page becomes visible again
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible' && isStarted && !isPaused) {
    await requestWakeLock();
  }
});

// Create audio context for bell sound
let audioContext = null;
function bell(duration = 0.5, frequency = 880) {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  const now = audioContext.currentTime;

  // Main tone
  const osc1 = audioContext.createOscillator();
  const gain1 = audioContext.createGain();
  osc1.type = 'sine';
  osc1.frequency.value = frequency;
  gain1.gain.setValueAtTime(0.4, now);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc1.connect(gain1);
  gain1.connect(audioContext.destination);

  // Harmonic overtone for bell character
  const osc2 = audioContext.createOscillator();
  const gain2 = audioContext.createGain();
  osc2.type = 'sine';
  osc2.frequency.value = frequency * 2.4; // Inharmonic overtone
  gain2.gain.setValueAtTime(0.15, now);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.6);
  osc2.connect(gain2);
  gain2.connect(audioContext.destination);

  // Higher overtone
  const osc3 = audioContext.createOscillator();
  const gain3 = audioContext.createGain();
  osc3.type = 'sine';
  osc3.frequency.value = frequency * 5.2;
  gain3.gain.setValueAtTime(0.08, now);
  gain3.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.3);
  osc3.connect(gain3);
  gain3.connect(audioContext.destination);

  osc1.start(now);
  osc2.start(now);
  osc3.start(now);
  osc1.stop(now + duration);
  osc2.stop(now + duration);
  osc3.stop(now + duration);
}

function shortBell() {
  bell(0.3, 1200);
}

function longBell() {
  bell(0.8, 880);
}

// Speech synthesis
let femaleVoice = null;

function loadVoices() {
  const voices = speechSynthesis.getVoices();
  // Try to find a female voice (common female voice names)
  femaleVoice =
    voices.find((v) =>
      /female|samantha|victoria|karen|fiona|moira|tessa|allison|susan|zira|hazel/i.test(
        v.name,
      ),
    ) ||
    voices.find((v) => v.lang.startsWith('en') && /female/i.test(v.name)) ||
    voices.find((v) => v.lang.startsWith('en')) ||
    voices[0];
}

if ('speechSynthesis' in window) {
  speechSynthesis.onvoiceschanged = loadVoices;
  loadVoices();
}

function speak(text) {
  if ('speechSynthesis' in window) {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    speechSynthesis.speak(utterance);
  }
}

// Cookie helpers
function saveProgress(index, elapsed) {
  document.cookie = `exerciseIndex=${index};max-age=86400;path=/`;
  document.cookie = `totalElapsed=${elapsed};max-age=86400;path=/`;
}

function loadProgress() {
  const indexMatch = document.cookie.match(/exerciseIndex=(\d+)/);
  const elapsedMatch = document.cookie.match(/totalElapsed=(\d+)/);
  return {
    index: indexMatch ? parseInt(indexMatch[1]) : 0,
    elapsed: elapsedMatch ? parseInt(elapsedMatch[1]) : 0,
  };
}

function clearProgress() {
  document.cookie = 'exerciseIndex=0;max-age=0;path=/';
  document.cookie = 'totalElapsed=0;max-age=0;path=/';
}

function saveActiveProgram(programId) {
  document.cookie = `activeProgram=${programId};max-age=31536000;path=/`;
}

function loadActiveProgram() {
  const match = document.cookie.match(/activeProgram=([^;]+)/);
  return match ? match[1] : null;
}

// Active exercises (loaded from selected program)
let exercises = [];

// State
let currentExerciseIndex = 0;
let exerciseTimeRemaining = 0;
let totalTimeElapsed = 0;
let isPaused = true;
let isStarted = false;
let intervalId = null;

// DOM elements
const exerciseNameEl = document.getElementById('exerciseName');
const exerciseTimerEl = document.getElementById('exerciseTimer');
const totalTimeEl = document.getElementById('totalTime');
const totalRemainingEl = document.getElementById('totalRemaining');
const progressFillEl = document.getElementById('progressFill');
const exerciseInfoEl = document.getElementById('exerciseInfo');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const upcomingSection = document.getElementById('upcomingSection');
const upcomingList = document.getElementById('upcomingList');
const exerciseListEl = document.getElementById('exerciseList');
const programPicker = document.getElementById('programPicker');
const workoutContainer = document.getElementById('workoutContainer');
const programTitleEl = document.getElementById('programTitle');
const changeProgramBtn = document.getElementById('changeProgramBtn');

function updateDisplay() {
  const exercise = exercises[currentExerciseIndex];
  exerciseNameEl.textContent = exercise.exercise;
  exerciseTimerEl.textContent = formatTime(exerciseTimeRemaining);
  totalTimeEl.textContent = formatTime(totalTimeElapsed);

  // Calculate total remaining time
  let totalRemaining = exerciseTimeRemaining;
  for (let i = currentExerciseIndex + 1; i < exercises.length; i++) {
    totalRemaining += exercises[i].duration;
  }
  totalRemainingEl.textContent = formatTime(totalRemaining);

  const totalDuration = exercise.duration;
  const progress =
    ((totalDuration - exerciseTimeRemaining) / totalDuration) * 100;
  progressFillEl.style.width = `${progress}%`;

  exerciseInfoEl.textContent = `Exercise ${currentExerciseIndex + 1} of ${exercises.length}`;

  updateUpcoming();
}

function updateUpcoming() {
  const upcoming = exercises.slice(
    currentExerciseIndex + 1,
    currentExerciseIndex + 4,
  );
  upcomingList.innerHTML = upcoming
    .map(
      (ex, i) =>
        `<div class="upcoming-item${i === 0 ? ' next' : ''}">${ex.exercise} - ${formatTime(ex.duration)}</div>`,
    )
    .join('');
}

function startExercise() {
  const exercise = exercises[currentExerciseIndex];
  exerciseTimeRemaining = exercise.duration;
  longBell();
  speak(exercise.exercise);
  updateDisplay();
}

function nextExercise() {
  currentExerciseIndex++;
  saveProgress(currentExerciseIndex, totalTimeElapsed);
  if (currentExerciseIndex >= exercises.length) {
    // Program complete
    exerciseNameEl.textContent = '🎉 Workout Complete!';
    exerciseTimerEl.textContent = formatTime(totalTimeElapsed);
    progressFillEl.style.width = '100%';
    exerciseInfoEl.textContent = 'Great job!';
    clearInterval(intervalId);
    pauseBtn.style.display = 'none';
    clearProgress();
    releaseWakeLock();
    longBell();
    setTimeout(longBell, 600);
    setTimeout(longBell, 1200);
    return;
  }
  startExercise();
}

function tick() {
  if (isPaused) return;

  totalTimeElapsed++;
  exerciseTimeRemaining--;

  if (exerciseTimeRemaining <= 0) {
    nextExercise();
  } else {
    if (exerciseTimeRemaining === 10) {
      // Announce next exercise
      const nextIndex = currentExerciseIndex + 1;
      if (nextIndex < exercises.length) {
        speak(`Next: ${exercises[nextIndex].exercise}`);
      }
    }
    if (exerciseTimeRemaining === 2 || exerciseTimeRemaining === 1) {
      shortBell();
    }
    updateDisplay();
  }
}

function start() {
  if (!isStarted) {
    isStarted = true;
    startExercise();
    upcomingSection.style.display = 'block';
  }

  isPaused = false;
  requestWakeLock();
  startBtn.style.display = 'none';
  pauseBtn.style.display = 'inline-block';
  resetBtn.style.display = 'inline-block';
  changeProgramBtn.style.display = 'none';
  exerciseListEl.style.display = 'none';
  pauseBtn.textContent = 'Pause';
  pauseBtn.classList.remove('paused');

  if (!intervalId) {
    intervalId = setInterval(tick, 1000);
  }
}

function togglePause() {
  isPaused = !isPaused;
  if (isPaused) {
    pauseBtn.textContent = 'Resume';
    pauseBtn.classList.add('paused');
    releaseWakeLock();
  } else {
    pauseBtn.textContent = 'Pause';
    pauseBtn.classList.remove('paused');
    requestWakeLock();
  }
}

function reset() {
  clearInterval(intervalId);
  intervalId = null;
  currentExerciseIndex = 0;
  totalTimeElapsed = 0;
  exerciseTimeRemaining = 0;
  isPaused = true;
  isStarted = false;
  clearProgress();
  releaseWakeLock();

  exerciseNameEl.textContent = 'Press Start to Begin';
  exerciseTimerEl.textContent = '--:--';
  totalTimeEl.textContent = '00:00';
  totalRemainingEl.textContent = formatTime(getTotalWorkoutTime());
  progressFillEl.style.width = '0%';
  exerciseInfoEl.textContent = '';

  startBtn.style.display = 'inline-block';
  pauseBtn.style.display = 'none';
  resetBtn.style.display = 'none';
  changeProgramBtn.style.display = 'inline-block';
  upcomingSection.style.display = 'none';
  exerciseListEl.style.display = 'block';
}

startBtn.addEventListener('click', start);
pauseBtn.addEventListener('click', togglePause);
resetBtn.addEventListener('click', reset);
changeProgramBtn.addEventListener('click', () => {
  if (isStarted) {
    reset();
  }
  showProgramPicker();
});

// Program picker
function showProgramPicker() {
  workoutContainer.style.display = 'none';
  programPicker.style.display = 'block';

  const cardsContainer = document.getElementById('programCards');
  cardsContainer.innerHTML = programs
    .map((p) => {
      const totalSecs = p.exercises.reduce((sum, ex) => sum + ex.duration, 0);
      return `<div class="program-card" onclick="selectProgram('${p.id}')">
        <h2>${p.title}</h2>
        <div class="card-duration">${formatTime(totalSecs)}</div>
        <div class="card-count">${p.exercises.length} exercises</div>
      </div>`;
    })
    .join('');
}

// eslint-disable-next-line no-unused-vars
function selectProgram(programId) {
  const program = programs.find((p) => p.id === programId);
  if (!program) return;

  exercises = program.exercises;
  saveActiveProgram(programId);
  clearProgress();

  // Reset workout state cleanly
  clearInterval(intervalId);
  intervalId = null;
  currentExerciseIndex = 0;
  totalTimeElapsed = 0;
  exerciseTimeRemaining = 0;
  isPaused = true;
  isStarted = false;
  releaseWakeLock();

  programTitleEl.textContent = program.title;
  exerciseNameEl.textContent = 'Press Start to Begin';
  exerciseTimerEl.textContent = '--:--';
  totalTimeEl.textContent = '00:00';
  totalRemainingEl.textContent = formatTime(getTotalWorkoutTime());
  progressFillEl.style.width = '0%';
  exerciseInfoEl.textContent = '';
  startBtn.style.display = 'inline-block';
  pauseBtn.style.display = 'none';
  resetBtn.style.display = 'none';
  changeProgramBtn.style.display = 'inline-block';
  upcomingSection.style.display = 'none';

  programPicker.style.display = 'none';
  workoutContainer.style.display = 'block';

  renderExerciseList();
}

function renderExerciseList() {
  exerciseListEl.innerHTML = exercises
    .map(
      (ex) =>
        `<div class="exercise-list-item"><span>${ex.exercise}</span><span class="exercise-list-duration">${formatTime(ex.duration)}</span></div>`,
    )
    .join('');
  exerciseListEl.style.display = 'block';
}

// Calculate total workout time
function getTotalWorkoutTime() {
  return exercises.reduce((sum, ex) => sum + ex.duration, 0);
}

// Initialise: restore saved program or show program picker
(function init() {
  const savedProgramId = loadActiveProgram();
  const program = savedProgramId && programs.find((p) => p.id === savedProgramId);

  if (program) {
    exercises = program.exercises;
    programTitleEl.textContent = program.title;
    workoutContainer.style.display = 'block';

    totalRemainingEl.textContent = formatTime(getTotalWorkoutTime());
    renderExerciseList();

    // Restore in-progress workout if saved
    const savedProgress = loadProgress();
    if (savedProgress.index > 0 && savedProgress.index < exercises.length) {
      currentExerciseIndex = savedProgress.index;
      totalTimeElapsed = savedProgress.elapsed;
      exerciseNameEl.textContent = `Resume: ${exercises[savedProgress.index].exercise}`;
      exerciseInfoEl.textContent = `Exercise ${savedProgress.index + 1} of ${exercises.length}`;
      totalTimeEl.textContent = formatTime(totalTimeElapsed);
      let remaining = 0;
      for (let i = savedProgress.index; i < exercises.length; i++) {
        remaining += exercises[i].duration;
      }
      totalRemainingEl.textContent = formatTime(remaining);
    }
  } else {
    showProgramPicker();
  }
})();
