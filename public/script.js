const answers = {};

const progressBar = document.getElementById("progress");
const loadText = document.getElementById("load");
const totalQuestions = questions.length;

function displayQuestion() {
  const questionnaireDiv = document.getElementById("questionnaire");
  questionnaireDiv.innerHTML = "";

  if (currentQuestion < questions.length) {
    const currentQuestionData = questions[currentQuestion];
    const questionDiv = document.createElement("div");

    questionDiv.innerHTML = `${currentQuestionData.question}`;

    currentQuestionData.choices.forEach((choice, index) => {
      const choiceButton = document.createElement("input");
      choiceButton.type = "submit";
      choiceButton.value = choice;
      choiceButton.name = "choice";
      choiceButton.id = "bt";
      choiceButton.onclick = () => selectChoice(choice, currentQuestionData); // 질문 까지 전달
      questionDiv.appendChild(choiceButton);
      questionDiv.appendChild(document.createElement("br"));
    });

    questionnaireDiv.appendChild(questionDiv);

    // 진행 상태 바 업데이트
    updateProgressBar();
  }
}

// 질문이 표시될 때 진행 상태를 업데이트하는 함수
function updateProgressBar() {
  const progressBar = document.getElementById("progress");
  const loadText = document.getElementById("load");
  const totalQuestions = questions.length;
  const percentage = ((currentQuestion + 1) / totalQuestions) * 100;
  progressBar.style.width = percentage + "%";
  loadText.innerText = (currentQuestion + 1) + "/" + totalQuestions;
}

// 질문이 진행될 때마다 호출할 함수
function selectChoice(choice, currentQuestionData) {
  answers[`q${currentQuestion + 1}`] = choice;

  //서버로 데이터 전송
  const url = '/process/questions';

  axios.post(url, {
    question: currentQuestionData.question,
    answer: choice
  })
  .then((response) => {
    console.log('Success:', response.data);
  })
  .catch((error) => {
    console.error('Error:', error);
  });


  // 아직 답변하지 않은 질문이 있는 경우
  if (currentQuestion < questions.length - 1) {
    // 다음 질문으로 넘어감
    currentQuestion++;
    displayQuestion();
  }

  else{
    window.location.href = '/process/result';
    
  }

}

document.getElementById("questionnaire").onsubmit = function(event) {
  event.preventDefault();
};

// 시작 시 첫 번째 질문 표시
let currentQuestion = 0;
displayQuestion();