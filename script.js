const passages = [
  "Small steps still move you forward. Take a breath, find a steady rhythm, and let each word arrive one keystroke at a time.",
  "A clear mind is like a quiet room. Make space for a new idea, give it your attention, and see where a little curiosity can lead.",
  "There is no perfect pace to begin. Start where you are, keep your hands light, and enjoy the simple feeling of getting into a flow.",
  "Some days call for big plans, and some days call for one small win. Either way, showing up is a good place to start."
];

const passageBox = document.querySelector("#passage");
const typingBox = document.querySelector("#typing");
const typingArea = document.querySelector("#typing-area");
const hint = document.querySelector("#hint");
const timerBox = document.querySelector("#timer");
const wpmBox = document.querySelector("#wpm");
const accuracyBox = document.querySelector("#accuracy");
const bestBox = document.querySelector("#best");
const statusBox = document.querySelector("#status");
const resultBox = document.querySelector("#result");
const restartButton = document.querySelector("#restart");
const timeButtons = document.querySelectorAll(".button");
const themeChoice = document.querySelector("#theme-choice");

let timeLimit = 30;
let timeLeft = timeLimit;
let timer = null;
let running = false;
let finished = false;
let targetText = "";
let typedBefore = 0;
let correctBefore = 0;
let passageNumber = -1;

let lastStart = -1;
try {
  const savedStart = sessionStorage.getItem("keyflow-last-passage");
  if (savedStart !== null) lastStart = Number(savedStart);
  if (!Number.isInteger(lastStart) || lastStart < 0 || lastStart >= passages.length) {
    lastStart = -1;
  }
} catch {
  lastStart = -1;
}

function readBest() {
  try {
    return Number(localStorage.getItem("keyflow-personal-best")) || 0;
  } catch {
    return 0;
  }
}

function showBest() {
  const best = readBest();
  bestBox.textContent = best ? best + " wpm" : "-";
}

function newPassage(avoidNumber = passageNumber) {
  let nextNumber = Math.floor(Math.random() * passages.length);

  if (passages.length > 1 && nextNumber === avoidNumber) {
    nextNumber = (nextNumber + 1) % passages.length;
  }

  passageNumber = nextNumber;
  targetText = passages[passageNumber];
  drawPassage("");
}

function drawPassage(typedText) {
  passageBox.replaceChildren();

  for (let i = 0; i < targetText.length; i++) {
    const letter = document.createElement("span");
    letter.textContent = targetText[i];

    if (i < typedText.length) {
      letter.className = typedText[i] === targetText[i] ? "correct" : "wrong";
    } else if (i === typedText.length && !finished) {
      letter.className = "current";
    }

    passageBox.append(letter);
  }

  requestAnimationFrame(() => {
    const letters = [...passageBox.children];
    const cursor = passageBox.querySelector(".current");
    if (!letters.length || !cursor) return;

    const rows = [...new Set(letters.map(letter => letter.offsetTop))].sort((a, b) => a - b);
    const currentRow = rows.indexOf(cursor.offsetTop);

    for (const letter of letters) {
      letter.classList.remove("preview", "faded");
      const row = rows.indexOf(letter.offsetTop);
      if (row === currentRow + 1) letter.classList.add("preview");
      if (row > currentRow + 1) letter.classList.add("faded");
    }
  });
}

function updateScore() {
  const typedText = typingBox.value;
  let rightNow = 0;

  for (let i = 0; i < typedText.length; i++) {
    if (typedText[i] === targetText[i]) rightNow++;
  }

  const allTyped = typedBefore + typedText.length;
  const allRight = correctBefore + rightNow;
  const minutes = (timeLimit - timeLeft) / 60;
  const wpm = minutes > 0 ? Math.round((allRight / 5) / minutes) : 0;
  const accuracy = allTyped > 0 ? Math.round((allRight / allTyped) * 100) : 100;

  wpmBox.textContent = wpm;
  accuracyBox.textContent = accuracy + "%";
  drawPassage(typedText);
  hint.classList.toggle("hidden", typedText.length > 0 || finished || typedBefore > 0);

  return { wpm, accuracy, rightNow };
}

function finishTest() {
  if (finished) return;

  finished = true;
  running = false;
  clearInterval(timer);
  timeLeft = 0;
  timerBox.textContent = "0 sec";

  const score = updateScore();
  const oldBest = readBest();
  let message = "Good job! You typed " + score.wpm + " WPM with " + score.accuracy + "% accuracy.";

  if (score.wpm > oldBest) {
    try {
      localStorage.setItem("keyflow-personal-best", String(score.wpm));
    } catch {
      // The test still works if browser storage is turned off.
    }
    showBest();
    if (score.wpm > 0) message = "New personal best! " + score.wpm + " WPM.";
  }

  statusBox.textContent = "Test complete";
  resultBox.textContent = message;
  resultBox.hidden = false;
  typingBox.blur();
}

function startTimer() {
  if (running || finished) return;

  running = true;
  statusBox.textContent = "Keep going!";
  timer = setInterval(() => {
    timeLeft--;
    timerBox.textContent = timeLeft + " sec";
    updateScore();
    if (timeLeft <= 0) finishTest();
  }, 1000);
}

function resetTest(focusInput = false) {
  clearInterval(timer);
  running = false;
  finished = false;
  timeLeft = timeLimit;
  typingBox.value = "";
  typedBefore = 0;
  correctBefore = 0;
  timerBox.textContent = timeLimit + " sec";
  wpmBox.textContent = "0";
  accuracyBox.textContent = "100%";
  statusBox.textContent = "Ready when you are";
  resultBox.hidden = true;
  resultBox.textContent = "";
  hint.classList.remove("hidden");

  newPassage(lastStart);
  lastStart = passageNumber;
  try {
    sessionStorage.setItem("keyflow-last-passage", String(lastStart));
  } catch {
    // A random passage still works if session storage is unavailable.
  }

  if (focusInput) typingBox.focus();
}

typingBox.addEventListener("input", () => {
  if (finished) return;
  if (typingBox.value.length > targetText.length) {
    typingBox.value = typingBox.value.slice(0, targetText.length);
  }

  if (typingBox.value.length > 0) startTimer();
  const score = updateScore();

  if (typingBox.value.length === targetText.length) {
    typedBefore += typingBox.value.length;
    correctBefore += score.rightNow;

    if (timeLeft > 0) {
      newPassage();
      typingBox.value = "";
      hint.classList.add("hidden");
      typingBox.focus();
      updateScore();
      statusBox.textContent = "Great, keep going!";
    } else {
      finishTest();
    }
  }
});

typingArea.addEventListener("click", () => typingBox.focus());
restartButton.addEventListener("click", () => resetTest(true));

timeButtons.forEach(button => {
  button.addEventListener("click", () => {
    timeLimit = Number(button.dataset.duration);

    timeButtons.forEach(otherButton => {
      const selected = otherButton === button;
      otherButton.classList.toggle("active", selected);
      otherButton.setAttribute("aria-pressed", selected);
    });

    resetTest();
  });
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") resetTest();
});

function setTheme(theme) {
  if (theme !== "light" && theme !== "dark") theme = "light";
  document.body.dataset.theme = theme;
  themeChoice.value = theme;

  try {
    localStorage.setItem("keyflow-theme", theme);
  } catch {
    // The theme still changes for this visit if storage is unavailable.
  }
}

themeChoice.addEventListener("change", () => setTheme(themeChoice.value));

let savedTheme = "light";
try {
  const theme = localStorage.getItem("keyflow-theme");
  if (theme === "light" || theme === "dark") savedTheme = theme;
} catch {
  // Light theme is the default if browser storage is unavailable.
}

showBest();
setTheme(savedTheme);
resetTest();
