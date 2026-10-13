// 設定每次測驗要抽出的題目數量
const QUIZ_SIZE = 5;

// 設定題庫總題數
const TOTAL_BANK_SIZE = 15;

// 儲存 CSV 題庫資料
let questionTable;

// 儲存完整題庫
let questionBank = [];

// 儲存本次隨機抽出的題目
let quizQuestions = [];

// 儲存目前題目索引
let currentQuestion = 0;

// 儲存答對題數
let correctCount = 0;

// 記錄是否已經作答
let hasAnswered = false;

// 記錄使用者選取的選項
let selectedOption = -1;

// 記錄是否答錯
let isWrong = false;

// 儲存 p5.js 畫布物件
let canvasElement;

// 儲存內容區域左側位置
let contentX = 0;

// 儲存內容區域寬度
let contentWidth = 0;

// 儲存選項高度
let optionHeight = 0;

// 儲存選項間距
let optionGap = 0;

// 儲存按鈕位置
let buttonX = 0;

// 儲存按鈕位置
let buttonY = 0;

// 儲存按鈕寬度
let buttonWidth = 0;

// 儲存按鈕高度
let buttonHeight = 0;

// 儲存最後一次觸控時間
let lastTouchTime = 0;

// 在畫面建立前載入 CSV 題庫
function preload() {
  // 載入與 sketch.js 同一資料夾內的 questions.csv
  questionTable = loadTable(
    "questions.csv",
    "csv",
    "header"
  );
}

// 建立畫布與初始化程式
function setup() {
  // 建立符合瀏覽器視窗大小的畫布
  canvasElement = createCanvas(windowWidth, windowHeight);

  // 設定文字水平置中
  textAlign(CENTER, CENTER);

  // 設定預設中文字型
  textFont("Noto Serif TC");

  // 設定畫布不使用外框
  noStroke();

  // 設定畫布樣式
  if (canvasElement && canvasElement.elt) {
    // 讓畫布以區塊方式顯示
    canvasElement.elt.style.display = "block";

    // 限制畫布最大寬度
    canvasElement.elt.style.maxWidth = "100%";

    // 限制畫布最大高度
    canvasElement.elt.style.maxHeight = "100%";

    // 防止觸控時瀏覽器捲動或縮放
    canvasElement.elt.style.touchAction = "none";
  }

  // 將 CSV 內容轉成 JavaScript 題目陣列
  parseQuestionBank();

  // 開始第一次測驗
  startQuiz();

  // 計算響應式版面
  updateLayout();
}

// 將 CSV 題庫轉成 JavaScript 資料
function parseQuestionBank() {
  // 清空原本的題庫陣列
  questionBank = [];

  // 確認 CSV 題庫是否成功載入
  if (!questionTable) {
    // 顯示錯誤訊息
    console.error("無法載入 questions.csv");

    // 結束函式
    return;
  }

  // 取得 CSV 的資料列數
  const rowCount = questionTable.getRowCount();

  // 逐列讀取 CSV 題目
  for (let i = 0; i < rowCount; i++) {
    // 讀取題目文字
    const question = questionTable.getString(i, "question");

    // 讀取第一個選項
    const option1 = questionTable.getString(i, "opt1");

    // 讀取第二個選項
    const option2 = questionTable.getString(i, "opt2");

    // 讀取第三個選項
    const option3 = questionTable.getString(i, "opt3");

    // 讀取第四個選項
    const option4 = questionTable.getString(i, "opt4");

    // 讀取正確答案索引
    const answerIndex = Number(
      questionTable.getString(i, "answerIndex")
    );

    // 確認題目與四個選項都存在
    if (
      question &&
      option1 &&
      option2 &&
      option3 &&
      option4 &&
      answerIndex >= 0 &&
      answerIndex <= 3
    ) {
      // 將題目加入完整題庫
      questionBank.push({
        question: question,
        options: [
          option1,
          option2,
          option3,
          option4
        ],
        answer: answerIndex
      });
    }
  }

  // 顯示題庫載入數量
  console.log("成功載入題目數量：" + questionBank.length);
}

// 開始一次新的測驗
function startQuiz() {
  // 建立完整題庫的複本，避免改變原始題庫順序
  const shuffledQuestions = questionBank.slice();

  // 使用 Fisher-Yates 演算法洗牌
  shuffleArray(shuffledQuestions);

  // 從洗牌後的題庫取出前五題
  quizQuestions = shuffledQuestions.slice(0, QUIZ_SIZE);

  // 將目前題目重設為第一題
  currentQuestion = 0;

  // 將答對題數歸零
  correctCount = 0;

  // 清除作答狀態
  hasAnswered = false;

  // 清除選取選項
  selectedOption = -1;

  // 清除答錯狀態
  isWrong = false;
}

// Fisher-Yates 隨機洗牌函式
function shuffleArray(array) {
  // 從陣列最後一個元素開始往前處理
  for (let i = array.length - 1; i > 0; i--) {
    // 隨機取得一個索引值
    const j = floor(random(i + 1));

    // 暫存目前元素
    const temporaryValue = array[i];

    // 將隨機元素放到目前位置
    array[i] = array[j];

    // 將暫存元素放到隨機位置
    array[j] = temporaryValue;
  }
}

// 每一幀重新繪製畫面
function draw() {
  // 設定背景顏色
  background("#f7f9fc");

  // 更新響應式版面
  updateLayout();

  // 判斷是否完成五題
  if (currentQuestion >= quizQuestions.length) {
    // 顯示結果頁面
    drawResultScreen();
  } else {
    // 顯示測驗頁面
    drawQuizScreen();
  }
}

// 計算響應式版面
function updateLayout() {
  // 計算頁面左右邊距
  const pagePadding = constrain(width * 0.06, 16, 48);

  // 設定內容最大寬度
  const maxContentWidth = 820;

  // 計算內容區域寬度
  contentWidth = min(
    width - pagePadding * 2,
    maxContentWidth
  );

  // 確保內容區域不會過窄
  contentWidth = max(contentWidth, 220);

  // 計算內容區域左側位置
  contentX = (width - contentWidth) / 2;

  // 計算選項高度
  optionHeight = constrain(width * 0.075, 48, 68);

  // 計算選項間距
  optionGap = constrain(width * 0.018, 8, 16);

  // 設定按鈕寬度
  buttonWidth = min(contentWidth, 280);

  // 設定按鈕高度
  buttonHeight = constrain(width * 0.075, 48, 62);

  // 計算按鈕水平位置
  buttonX = width / 2 - buttonWidth / 2;

  // 計算按鈕垂直位置
  buttonY = height - buttonHeight - 24;
}

// 繪製測驗畫面
function drawQuizScreen() {
  // 取得目前題目
  const quiz = quizQuestions[currentQuestion];

  // 設定標題文字大小
  textSize(getResponsiveTextSize(32, 22));

  // 使用中文字型
  textFont("Noto Serif TC");

  // 設定標題顏色
  fill("#23395d");

  // 顯示測驗標題
  text("p5.js 指令小測驗", width / 2, 42);

  // 設定進度文字大小
  textSize(getResponsiveTextSize(17, 13));

  // 設定進度文字顏色
  fill("#64748b");

  // 顯示目前題數
  text(
    "第 " +
      (currentQuestion + 1) +
      " 題／共 " +
      QUIZ_SIZE +
      " 題",
    width / 2,
    78
  );

  // 設定題目文字大小
  textSize(getResponsiveTextSize(25, 17));

  // 使用中文字型
  textFont("Noto Serif TC");

  // 設定題目文字顏色
  fill("#172033");

  // 將題目文字換行
  const questionLines = wrapText(
    quiz.question,
    contentWidth
  );

  // 設定題目開始位置
  const questionY = 120;

  // 設定題目行高
  const questionLineHeight =
    getResponsiveTextSize(32, 23);

  // 逐行顯示題目
  for (let i = 0; i < questionLines.length; i++) {
    // 繪製題目文字
    text(
      questionLines[i],
      width / 2,
      questionY + i * questionLineHeight
    );
  }

  // 計算選項起始位置
  const optionsY =
    questionY +
    questionLines.length * questionLineHeight +
    24;

  // 繪製四個選項
  for (let i = 0; i < quiz.options.length; i++) {
    // 計算目前選項位置
    let optionY =
      optionsY +
      i * (optionHeight + optionGap);

    // 答錯時讓正確選項上下跳動
    if (isWrong && i === quiz.answer) {
      // 使用正弦函式製作跳動動畫
      optionY += sin(frameCount * 0.15) * 8;
    }

    // 繪製選項
    drawOption(quiz.options[i], i, optionY);
  }

  // 判斷是否已經作答
  if (hasAnswered) {
    // 判斷按鈕文字
    const buttonLabel =
      currentQuestion === quizQuestions.length - 1
        ? "查看成績"
        : "下一題";

    // 繪製按鈕
    drawButton(
      buttonLabel,
      buttonX,
      buttonY,
      buttonWidth,
      buttonHeight
    );

    // 設定提示文字大小
    textSize(getResponsiveTextSize(16, 12));

    // 使用中文字型
    textFont("Noto Serif TC");

    // 設定提示文字顏色
    fill("#64748b");

    // 判斷答題結果
    if (isWrong) {
      // 顯示答錯提示
      text(
        "答錯了，綠色跳動的選項是正確答案",
        width / 2,
        max(20, buttonY - 18)
      );
    } else {
      // 顯示答對提示
      text(
        "答對了！請按下一步繼續",
        width / 2,
        max(20, buttonY - 18)
      );
    }
  } else {
    // 設定提示文字大小
    textSize(getResponsiveTextSize(16, 12));

    // 使用中文字型
    textFont("Noto Serif TC");

    // 設定提示文字顏色
    fill("#64748b");

    // 顯示作答提示
    text(
      "請點選一個選項作答",
      width / 2,
      height - 28
    );
  }
}

// 繪製單一選項
function drawOption(optionText, optionIndex, y) {
  // 取得目前題目
  const quiz = quizQuestions[currentQuestion];

  // 設定預設選項顏色
  let optionColor = "#ffffff";

  // 答錯時將正確答案設為淡綠色
  if (isWrong && optionIndex === quiz.answer) {
    // 套用指定顏色
    optionColor = "#c7f9cc";
  }

  // 答對時將使用者選項設為淡藍色
  if (
    hasAnswered &&
    !isWrong &&
    optionIndex === selectedOption
  ) {
    // 設定答對選項顏色
    optionColor = "#bde0fe";
  }

  // 答錯時將使用者選錯選項設為淡紅色
  if (
    hasAnswered &&
    isWrong &&
    optionIndex === selectedOption
  ) {
    // 設定錯誤選項顏色
    optionColor = "#ffd6d6";
  }

  // 設定選項填色
  fill(optionColor);

  // 繪製選項背景
  rect(
    contentX,
    y,
    contentWidth,
    optionHeight,
    12
  );

  // 設定選項外框顏色
  stroke("#d6deeb");

  // 設定外框寬度
  strokeWeight(2);

  // 設定外框不填色
  noFill();

  // 繪製選項外框
  rect(
    contentX,
    y,
    contentWidth,
    optionHeight,
    12
  );

  // 關閉外框
  noStroke();

  // 設定選項文字大小
  textSize(getResponsiveTextSize(20, 14));

  // 設定選項文字顏色
  fill("#172033");

  // 組合選項文字
  const fullText =
    String.fromCharCode(65 + optionIndex) +
    ". " +
    optionText;

  // 將選項文字換行
  const optionLines = wrapText(
    fullText,
    contentWidth * 0.88
  );

  // 設定文字行高
  const lineHeight = getResponsiveTextSize(24, 18);

  // 計算文字起始位置
  const textStartY =
    y +
    optionHeight / 2 -
    ((optionLines.length - 1) * lineHeight) / 2;

  // 逐行繪製選項文字
  for (let i = 0; i < optionLines.length; i++) {
    // 判斷是否含有英文或數字
    if (containsLatinOrNumber(optionLines[i])) {
      // 使用 Anton 字型
      textFont("Anton");
    } else {
      // 使用 Noto Serif TC 字型
      textFont("Noto Serif TC");
    }

    // 繪製選項文字
    text(
      optionLines[i],
      width / 2,
      textStartY + i * lineHeight
    );
  }
}

// 繪製按鈕
function drawButton(label, x, y, w, h) {
  // 設定按鈕背景色
  fill("#4361ee");

  // 繪製按鈕背景
  rect(x, y, w, h, 14);

  // 設定按鈕文字大小
  textSize(getResponsiveTextSize(20, 15));

  // 判斷按鈕是否包含英文或數字
  if (containsLatinOrNumber(label)) {
    // 使用 Anton 字型
    textFont("Anton");
  } else {
    // 使用 Noto Serif TC 字型
    textFont("Noto Serif TC");
  }

  // 設定按鈕文字顏色
  fill("#ffffff");

  // 顯示按鈕文字
  text(label, x + w / 2, y + h / 2);
}

// 繪製結果畫面
function drawResultScreen() {
  // 設定結果標題文字大小
  textSize(getResponsiveTextSize(36, 24));

  // 使用中文字型
  textFont("Noto Serif TC");

  // 設定標題顏色
  fill("#23395d");

  // 顯示完成文字
  text("測驗完成！", width / 2, height * 0.26);

  // 設定成績文字大小
  textSize(getResponsiveTextSize(30, 21));

  // 使用 Anton 顯示英文與數字
  textFont("Anton");

  // 設定成績文字顏色
  fill("#172033");

  // 顯示成績
  text(
    "Score " +
      correctCount +
      " / " +
      QUIZ_SIZE,
    width / 2,
    height * 0.4
  );

  // 設定鼓勵文字大小
  textSize(getResponsiveTextSize(18, 14));

  // 使用中文字型
  textFont("Noto Serif TC");

  // 設定鼓勵文字顏色
  fill("#64748b");

  // 設定預設鼓勵訊息
  let resultMessage =
    "多練習幾次就會更熟悉！";

  // 判斷是否全部答對
  if (correctCount === QUIZ_SIZE) {
    // 設定全對訊息
    resultMessage = "太厲害了，全部答對！";
  }

  // 判斷是否答對三題以上
  if (
    correctCount >= 3 &&
    correctCount < QUIZ_SIZE
  ) {
    // 設定高分訊息
    resultMessage = "表現很好，再接再厲！";
  }

  // 顯示鼓勵訊息
  text(
    resultMessage,
    width / 2,
    height * 0.49
  );

  // 設定結果按鈕垂直位置
  const resultButtonY = height * 0.62;

  // 繪製重新測驗按鈕
  drawButton(
    "重新測驗",
    buttonX,
    resultButtonY,
    buttonWidth,
    buttonHeight
  );
}

// 將文字依照寬度換行
function wrapText(content, maxWidth) {
  // 建立換行後的文字陣列
  const lines = [];

  // 儲存目前文字行
  let currentLine = "";

  // 逐字處理文字
  for (let i = 0; i < content.length; i++) {
    // 取得目前字元
    const character = content[i];

    // 測試加入字元後的文字
    const testLine = currentLine + character;

    // 判斷文字是否超過最大寬度
    if (
      textWidth(testLine) > maxWidth &&
      currentLine.length > 0
    ) {
      // 儲存目前文字行
      lines.push(currentLine);

      // 建立下一行文字
      currentLine = character;
    } else {
      // 更新目前文字行
      currentLine = testLine;
    }
  }

  // 確認最後仍有文字
  if (currentLine.length > 0) {
    // 儲存最後一行文字
    lines.push(currentLine);
  }

  // 回傳換行後文字
  return lines;
}

// 判斷文字是否含有英文字母或數字
function containsLatinOrNumber(value) {
  // 使用正規表示式檢查英文與數字
  return /[A-Za-z0-9]/.test(value);
}

// 取得響應式文字大小
function getResponsiveTextSize(desktopSize, mobileSize) {
  // 根據畫布寬度計算文字大小
  const calculatedSize = width * 0.045;

  // 限制文字大小在指定範圍內
  return constrain(
    calculatedSize,
    mobileSize,
    desktopSize
  );
}

// 處理滑鼠點擊
function mousePressed() {
  // 避免觸控後產生重複滑鼠事件
  if (millis() - lastTouchTime < 500) {
    // 停止預設行為
    return false;
  }

  // 處理滑鼠座標
  handlePointer(mouseX, mouseY);

  // 停止瀏覽器預設行為
  return false;
}

// 處理觸控操作
function touchStarted() {
  // 記錄觸控時間
  lastTouchTime = millis();

  // 確認有觸控點
  if (touches.length > 0) {
    // 處理第一個觸控點
    handlePointer(touches[0].x, touches[0].y);
  }

  // 阻止瀏覽器預設行為
  return false;
}

// 處理滑鼠或觸控座標
function handlePointer(pointerX, pointerY) {
  // 判斷是否位於結果頁面
  if (currentQuestion >= quizQuestions.length) {
    // 設定結果按鈕位置
    const resultButtonY = height * 0.62;

    // 判斷是否點擊重新測驗
    if (
      pointerX >= buttonX &&
      pointerX <= buttonX + buttonWidth &&
      pointerY >= resultButtonY &&
      pointerY <= resultButtonY + buttonHeight
    ) {
      // 重新開始測驗
      startQuiz();
    }

    // 結束目前處理
    return;
  }

  // 尚未作答時才可選擇選項
  if (!hasAnswered) {
    // 取得目前題目
    const quiz = quizQuestions[currentQuestion];

    // 設定題目文字大小
    textSize(getResponsiveTextSize(25, 17));

    // 使用中文字型計算題目寬度
    textFont("Noto Serif TC");

    // 取得題目換行結果
    const questionLines = wrapText(
      quiz.question,
      contentWidth
    );

    // 設定題目行高
    const questionLineHeight =
      getResponsiveTextSize(32, 23);

    // 計算選項起始位置
    const optionsY =
      120 +
      questionLines.length * questionLineHeight +
      24;

    // 逐一檢查選項
    for (let i = 0; i < quiz.options.length; i++) {
      // 計算選項位置
      const optionY =
        optionsY +
        i * (optionHeight + optionGap);

      // 判斷點擊是否在選項範圍內
      if (
        pointerX >= contentX &&
        pointerX <= contentX + contentWidth &&
        pointerY >= optionY &&
        pointerY <= optionY + optionHeight
      ) {
        // 記錄使用者選項
        selectedOption = i;

        // 設定已作答
        hasAnswered = true;

        // 判斷答案是否正確
        if (selectedOption === quiz.answer) {
          // 答對題數加一
          correctCount++;

          // 設定答題結果為正確
          isWrong = false;
        } else {
          // 設定答題結果為錯誤
          isWrong = true;
        }

        // 結束選項檢查
        break;
      }
    }

    // 結束點擊處理
    return;
  }

  // 判斷是否點擊下一題按鈕
  if (
    pointerX >= buttonX &&
    pointerX <= buttonX + buttonWidth &&
    pointerY >= buttonY &&
    pointerY <= buttonY + buttonHeight
  ) {
    // 進入下一題
    currentQuestion++;

    // 清除作答狀態
    hasAnswered = false;

    // 清除選取選項
    selectedOption = -1;

    // 清除答錯狀態
    isWrong = false;
  }
}

// 重新調整畫布大小
function windowResized() {
  // 重新設定畫布寬度與高度
  resizeCanvas(windowWidth, windowHeight);

  // 重新計算響應式版面
  updateLayout();
}