let wordDict = {};
let weights = {};
let correct = new Set();
let performance = [0, 0, 0];
let randomMode = false;
let english = false;
let running = false;

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
    chooseQuestion();
  }
  reader.readAsText(file);
}

function reset() {
  wordDict = {};
  weights = {};
  correct = new Set();
  performance = [0, 0, 0];
  randomMode = false;
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
    await askQuestion();
  }
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

async function askQuestion() {
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
    if (prompt('다시 학습하시겠습니까(y/*)? ') === 'y') {
      main();
      return;
    } else {
      return; 
    }
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
  const check = await waitForAnswer();
  performance[1]++;


  const printResult = document.getElementById('printResult');
  if (isCorrect(userAnswer, correctAnswer)) {
    correct.add(questionWord);
    performance[0]++;
    performance[2]++;
    weights[questionWord] = Math.max(1, weights[questionWord] - 1);
    printResult.innerText = `정답입니다!: '${correctAnswer}'`;
  } else {
    performance[0] = 0;
    weights[questionWord]++;
    printResult.innerText = `틀렸습니다. 정답은 '${correctAnswer}'입니다.`;
  }
  const accuracy = ((performance[2] / performance[1]) * 100).toFixed(2);
  printResult.innerHTML += `<br>정답률: ${accuracy}%`;
  printResult.innerHTML += `<br>연속 정답 수: ${performance[0]}`;
  printResult.innerHTML += `<br>남은 문제 수: ${remainingWords.length-1}`;
}

function main(file) {
  reset();
  readFile(file);
}

const fileInput = document.getElementById('fileInput');
fileInput.addEventListener('change', (e) => {main(e.target.files[0])});

function toggleMenu() {
  document.getElementById('sideMenu').classList.toggle('open');
  document.getElementById('menuBackground').classList.toggle('open');
}

// responsiveVoice.speak('hi');
