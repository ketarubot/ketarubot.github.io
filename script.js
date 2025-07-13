let wordDict = {};
let weights = {};
let correct = new Set();
let performance = [0, 0, 0];
let randomMode = false;
let english = false;
let running = false;
let fileRead = false;
const lsgi = localStorage.getItem.bind(localStorage);

function removeChilds(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

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
    setMemorizeList();
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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
    await sleep(500);
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
    running = false;
    document.getElementById('testArea').style.display = 'none';
    document.getElementById('testSetting').style.display = 'block';
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
  
  const answerInputCategory = parseInt(document.getElementById('answerInput').value);
  let question = '', correctAnswer = '';
  if (isEnglishQuestion) {
    question = answer + (answerInputCategory===1?`[${questionWord[0]}]`:'');
    correctAnswer = questionWord;
  } else {
    question = questionWord;
    correctAnswer = answer;
  }
  
  const displayQuestion = document.getElementById('question');
  displayQuestion.innerText = `'${question}': `;

  if (answerInputCategory === 1) {
    await askQuestion(correctAnswer, remainingWords, questionWord);
  } else if (answerInputCategory === 2) {
    await generateAnswer(isEnglishQuestion, correctAnswer, remainingWords, questionWord);
  }
}

async function askQuestion(correctAnswer, rws, qw) {
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
  };
  await waitForAnswer();
  performance[1]++;

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
    printResult.innerText = `틀렸습니다. 정답은 '${correctAnswer}'입니다.`;
  }
  const accuracy = ((performance[2] / performance[1]) * 100).toFixed(2);
  printResult.innerHTML += `<br>정답률: ${accuracy}%`;
  printResult.innerHTML += `<br>연속 정답 수: ${performance[0]}`;
  printResult.innerHTML += `<br>남은 문제 수: ${rws.length-1}`;
}

async function generateAnswer(isEnglishQuestion, correctAnswer, rws, qw) {
  const userSelect = document.getElementById('userSelect');
  removeChilds(userSelect);
  const answerCount = (Object.keys(wordDict).length / 10) + 1;
  const answerType = isEnglishQuestion?'e':'k';
  let answers = [...extract(wordDict, answerType, correctAnswer, answerCount), correctAnswer];
  shuffle(answers);
  let userSelected = false;
  let isCorrect = false;
  for (const answer of answers) {
    const add = document.createElement('li');
    add.textContent = answer;
    if (answer === correctAnswer) add.id = 'correct';
    add.addEventListener('click', () => {
      if (add.id === 'correct') isCorrect = true;
      userSelected = true;
    });
    userSelect.appendChild(add);
    console.log('added.')
  }

  const waitForSelect = () => {
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        if (userSelected) {
          clearInterval(interval);
          resolve();
        }
      }, 100);
    });
  };
  await waitForSelect();
  performance[1]++;

  const printResult = document.getElementById('printResult');
  if (isCorrect) {
    correct.add(qw);
    performance[0]++;
    performance[2]++;
    weights[qw] = Math.max(1, weights[qw] - 1);
    printResult.innerText = `정답입니다!: '${correctAnswer}'`;
  } else {
    performance[0] = 0;
    weights[qw]++;
    printResult.innerText = `틀렸습니다. 정답은 '${correctAnswer}'입니다.`;
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
      removeChilds(wordList);
      setMemorizeList();
    });
  }
}

function setWordList() {
  if (lsgi('wordDict')) {
    const words = JSON.parse(lsgi('wordDict'));
    const wordList = document.getElementById('wordList');
    removeChilds(wordList);
    for (const [word, meaning] of Object.entries(words)) {
      const add = document.createElement('li');
      add.innerText = `${word}: ${meaning}`;
      wordList.appendChild(add);
    }
    setMemorizeList();
  }
}

const currentPage = window.location.pathname.split('/').pop();

if (currentPage === 'test.html') {
  document.getElementById('testArea').style.display = 'none';
  const testStart = document.getElementById('testStart');
  testStart.addEventListener('click', () => {
    if (lsgi('wordDict') && lsgi('weights')) {
      wordDict = JSON.parse(lsgi('wordDict'));
      weights = JSON.parse(lsgi('weights'));
      fileRead = true;
    }
    if (fileRead === true) {
      document.getElementById('testSetting').style.display = 'none';
      document.getElementById('testArea').style.display = 'flex';
      chooseQuestion();
    } else {
      alert('읽힌 파일이 없습니다!');
    }
  });
  
  changeAnswerInput();
}

function toggle(type, id) {
  document.getElementById(type+id).classList.toggle('block');
}

function setMemorizeList() {
  if (currentPage === 'memorize.html') {
    const wordsList = document.getElementById('words');
    const meaningsList = document.getElementById('meanings');
    if (lsgi('wordDict')) {
      wordDict = JSON.parse(lsgi('wordDict'));
      const words = Object.keys(wordDict);
      const meanings = Object.values(wordDict);
      for (let i = 0; i < words.length; i++) {
        const wAdd = document.createElement('li');
        const mAdd = document.createElement('li');
        wAdd.innerHTML = `<span id="w${i}">${words[i]}</span>`;
        mAdd.innerHTML = `<span id="m${i}">${meanings[i]}</span>`;
        wordsList.appendChild(wAdd);
        meaningsList.appendChild(mAdd);
  
        const wToggle = document.createElement('button');
        const mToggle = document.createElement('button');
        wToggle.innerText = '가리기/표시하기';
        wToggle.addEventListener('click', () => {toggle('w', i)});
        mToggle.innerText = '가리기/표시하기';
        mToggle.addEventListener('click', () => {toggle('m', i)});
        wAdd.appendChild(wToggle);
        mAdd.appendChild(mToggle);
  
        const wRead = document.createElement('button');
        wRead.innerText = '발음 듣기';
        wRead.addEventListener('click', () => {responsiveVoice.speak(words[i], 'US English Female', {rate: 0.8, pitch: 1.2})});
        wAdd.appendChild(wRead);
      }
    } else {
      removeChilds(wordsList);
      removeChilds(meaningsList);
    }
  }
}

setMemorizeList();