let wordDict = {};
let weights = {};
let correct = new Set();
let performance = [0, 0, 0];
let randomMode = false;
let english = false;
let running = false;
let fileRead = false;
const lsgi = localStorage.getItem.bind(localStorage);

function readFile(file) {
  const reader = new FileReader();

  reader.onload = (e) => {
    let fileContent = e.target.result;
    fileContent = fileContent.split('\n');
    for (const line of fileContent) {
      const [word, meaning] = line.split('/', 2).map(part => part.trim());
      wordDict[word] = meaning;
      weights[word] = 1;
    }
    localStorage.setItem('wordDict', JSON.stringify(wordDict));
    localStorage.setItem('weights', JSON.stringify(weights));
    setWordList();
    fileRead = true;
  }
  reader.readAsText(file);
}

function reset() {
  wordDict = {};
  weights = {};
  correct = new Set();
  performance = [0, 0, 0];
  randomMode = false;
  fileRead = false;
}

async function chooseQuestion() {
  const category = parseInt(document.querySelector('input[name="choose"]:checked').value);
  if (category === 1) {
    english = true;
  } else if (category === 2) {
    english = false;
  } else if (category === 3) {
    randomMode = true;
  }
  running = true;
  while (running) {
    await separateQuestion();
  }
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function extract(words, type, exclude, count) {
  let iter;
  if (type === 'k') {
    iter = Object.values(words);
  } else if (type === 'e') {
    iter = Object.keys(words);
  }
  
  shuffle(iter);
  let result = [];
  let i = 0;
  for (const word of iter) {
    if (word !== exclude) {
      result.push(word);
      i += 1;
    }
    if (i >= count) break;
  }
  return result;
}

function cleanInput(inputStr = '') {
    return inputStr.replace(/\(.*?\)|~/g, '').replace(/ /g, '').replace(/'/g, '’').trim().toLowerCase();
}

function isCorrect(userInput, correctAnswer) {
  const possibleAnswers = correctAnswer.replace(/ /g, '').split(',');
  return possibleAnswers.some(answer => cleanInput(userInput) === cleanInput(answer));
}

function randomChoice(arr) {
  const randomIndex = Math.floor(Math.random() * arr.length);
  return arr[randomIndex];
}

async function separateQuestion() {
  let remainingWords = [];
  for (let word of Object.keys(wordDict)) {
    if (!correct.has(word)) {
      remainingWords.push(word);
    }
  }
  let weightedChoices = [];
  for (let word of remainingWords) {
    for (let i = 0; i < weights[word]; i++) {
      weightedChoices.push(word);
    }
  }

  if (weightedChoices.length === 0) {
    alert('모든 단어를 학습하셨습니다.');
    running = false;
    testStart.style.display = 'block';
    return;
  }

  const questionWord = randomChoice(weightedChoices);
  const answer = wordDict[questionWord];

  let isEnglishQuestion = false;
  if (randomMode) {
    isEnglishQuestion = randomChoice([true, false]);
  } else {
    isEnglishQuestion = english;
  }

  let question = '', correctAnswer = '';
  if (isEnglishQuestion) {
    question = answer + `[${questionWord[0]}]`;
    correctAnswer = questionWord;
  } else {
    question = questionWord;
    correctAnswer = answer;
  }

  await askQuestion(question, correctAnswer, remainingWords, questionWord);
}

async function askQuestion(question, correctAnswer, rws, qw) {
  const displayQuestion = document.getElementById('question');
  displayQuestion.innerText = `'${question}': `;
  const userInput = document.getElementById('userInput');
  userInput.removeAttribute('readonly');
  let userAnswer;
  let checkUserAnswer = false;
  const senseEnter = (e) => {
    if (e.key === 'Enter') {
      userAnswer = userInput.value;
      userInput.value = "";
      userInput.setAttribute('readonly', true);
      checkUserAnswer = true;
      userInput.removeEventListener('keydown', senseEnter);
    }
  };
  userInput.addEventListener('keydown', senseEnter);
  
  const waitForAnswer = () => {
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      if (checkUserAnswer) {
        clearInterval(interval);
        resolve();
      }
    }, 100);
  });
  }
  await waitForAnswer();
  performance[1]++;

  printResult(userAnswer, correctAnswer, rws, qw);
}

function printResult(userAnswer, correctAnswer, rws, qw) {
  const printResult = document.getElementById('printResult');
  if (isCorrect(userAnswer, correctAnswer)) {
    correct.add(qw);
    performance[0]++;
    performance[2]++;
    weights[qw] = Math.max(1, weights[qw] - 1);
    printResult.innerText = `정답입니다!: '${correctAnswer}'`;
  } else {
    performance[0] = 0;
    weights[qw]++;
    printResult.innerText = `틀렸습니다. 정답은 '${qw}'입니다.`;
  }
  const accuracy = ((performance[2] / performance[1]) * 100).toFixed(2);
  printResult.innerHTML += `<br>정답률: ${accuracy}%`;
  printResult.innerHTML += `<br>연속 정답 수: ${performance[0]}`;
  printResult.innerHTML += `<br>남은 문제 수: ${rws.length-1}`;
}

function changeAnswerInput() {
  const answerCategory = parseInt(document.getElementById('answerInput').value);
  const userInput = document.getElementById('userInput');
  const userSelect = document.getElementById('userSelect');
  if (answerCategory === 1) {
    userInput.setAttribute('style', 'display: block');
    userSelect.setAttribute('style', 'display: none');
  } else if (answerCategory === 2) {
    userInput.setAttribute('style', 'display: none');
    userSelect.setAttribute('style', 'display: block');
  }
}

const fileInput = document.getElementById('fileInput');
fileInput.addEventListener('change', (e) => {
  reset();
  readFile(e.target.files[0]);
});

const sideMenu = document.getElementById('sideMenu');

function toggleMenu() {
  sideMenu.classList.toggle('open');
  document.getElementById('menuBackground').classList.toggle('open');
  if (sideMenu.classList.contains('open')) {
    setWordList();
    document.getElementById('delete').addEventListener('click', () => {
      localStorage.clear()
      const wordList = document.getElementById('wordList');
      while (wordList.firstChild) {
        wordList.removeChild(wordList.firstChild);
      }
    });
  }
}

const testStart = document.getElementById('testStart');
testStart.addEventListener('click', () => {
  if (lsgi('wordDict') && lsgi('weights')) {
    wordDict = JSON.parse(lsgi('wordDict'));
    weights = JSON.parse(lsgi('weights'));
    fileRead = true;
  }
  if (fileRead === true) {
    testStart.style.display = 'none';
    chooseQuestion();
  } else {
    alert('읽힌 파일이 없습니다!');
  }
});

function setWordList() {
  if (lsgi('wordDict')) {
    const words = JSON.parse(lsgi('wordDict'));
    const wordList = document.getElementById('wordList');
    while (wordList.firstChild) {
      wordList.removeChild(wordList.firstChild);
    }
    for (const [word, meaning] of Object.entries(words)) {
      const add = document.createElement('li');
      add.innerText = `${word}: ${meaning}`;
      wordList.appendChild(add);
    }
  }
}

changeAnswerInput();

// responsiveVoice.speak('hi');
