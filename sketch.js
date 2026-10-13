// 設定總題庫必須包含的題目數量。
const TOTAL_BANK_SIZE = 15;
// 設定每次測驗固定抽出的題目數量。
const QUIZ_SIZE = 5;
// 設定答錯時正確選項使用的指定背景色。
const CORRECT_HINT_COLOR = "#c7f9cc";

// 儲存 preload() 載入的外部 CSV 表格。
let questionTable = null;
// 儲存從 CSV 解析完成的 15 題完整題庫。
let questionBank = [];
// 儲存本次從題庫隨機抽出的 5 題。
let quizQuestions = [];
// 儲存 p5.js createCanvas() 回傳的畫布物件。
let canvasElement = null;
// 儲存目前答到本次測驗的第幾題。
let currentQuestionIndex = 0;
// 儲存本次測驗目前答對的題數。
let score = 0;
// 記錄目前題目是否已經作答。
let hasAnswered = false;
// 儲存目前使用者選取的選項索引。
let selectedIndex = -1;
// 記錄目前題目是否答錯。
let answerIsWrong = false;
// 記錄目前顯示測驗畫面、成績畫面或載入錯誤畫面。
let screenState = "loading";
// 儲存四個選項的點擊範圍。
let optionRects = [];
// 儲存下一題、查看成績或重新測驗按鈕的點擊範圍。
let actionRect = null;
// 記錄最近一次有效輸入事件的時間，避免觸控和滑鼠重複觸發。
let lastPointerTime = -1000;
// 儲存目前畫面的響應式版面資料。
let layout = {};

// 在畫面建立前載入外部 CSV 題庫。
function preload() {
  // 使用指定的 header 模式讀取 questions.csv 第一列欄位名稱。
  questionTable = loadTable("questions.csv", "csv", "header");
}

// 建立全螢幕畫布並解析題庫後開始測驗。
function setup() {
  // 建立符合瀏覽器視窗尺寸的畫布並保存畫布物件。
  canvasElement = createCanvas(windowWidth, windowHeight);
  // 確認畫布元素存在後再設定 DOM 樣式。
  if (canvasElement && canvasElement.elt) {
    // 將畫布設定為區塊元素，避免底部產生空白。
    canvasElement.elt.style.display = "block";
    // 限制畫布不超過父層寬度。
    canvasElement.elt.style.maxWidth = "100%";
    // 限制畫布不超過父層高度。
    canvasElement.elt.style.maxHeight = "100%";
    // 禁止觸控時捲動頁面或縮放畫布。
    canvasElement.elt.style.touchAction = "none";
  }
  // 設定預設中文與英文文字環境。
  setChineseFont();
  // 開啟圖形平滑效果。
  smooth();
  // 設定初始文字對齊方式。
  textAlign(LEFT, CENTER);
  // 將 CSV 每一列解析成程式使用的題目物件。
  parseQuestionBank();
  // 若題庫完整，立即隨機抽取 5 題開始測驗。
  if (questionBank.length === TOTAL_BANK_SIZE) {
    // 建立本次測驗並重設作答狀態。
    startQuiz();
  } else {
    // 題庫數量不符合需求時顯示錯誤提示。
    screenState = "error";
  }
  // 計算初始響應式版面。
  updateLayout();
}

// 將外部 CSV 表格解析成 15 題題庫。
function parseQuestionBank() {
  // 先清除可能存在的舊題庫資料。
  questionBank = [];
  // 若 CSV 沒有成功載入，直接保留空題庫供錯誤畫面使用。
  if (!questionTable) {
    // 結束題庫解析流程。
    return;
  }
  // 逐列讀取 CSV，確保每列都使用指定欄位。
  for (let rowIndex = 0; rowIndex < questionTable.getRowCount(); rowIndex += 1) {
    // 取得目前 CSV 列資料。
    const row = questionTable.getRow(rowIndex);
    // 讀取題目文字並移除欄位前後多餘空白。
    const question = String(row.getString("question")).trim();
    // 依序讀取四個選項欄位。
    const options = [
      String(row.getString("opt1")).trim(),
      String(row.getString("opt2")).trim(),
      String(row.getString("opt3")).trim(),
      String(row.getString("opt4")).trim()
    ];
    // 將正確答案欄位轉為 0 到 3 的整數索引。
    const answerIndex = Number.parseInt(String(row.getString("answerIndex")).trim(), 10);
    // 只把格式完整且答案索引合法的資料加入題庫。
    if (question && options.every((option) => option.length > 0) && answerIndex >= 0 && answerIndex <= 3) {
      // 儲存符合格式的單題物件。
      questionBank.push({ question, options, answerIndex });
    }
  }
}

// 每一幀繪製目前的載入、測驗、成績或錯誤畫面。
function draw() {
  // 以淡藍灰色清除整個畫布。
  background("#f4f7fb");
  // 持續更新版面，讓視窗尺寸改變時立即重新排版。
  updateLayout();
  // 依照目前狀態選擇要顯示的畫面。
  if (screenState === "quiz") {
    // 繪製題目與選項。
    drawQuizScreen();
  } else if (screenState === "result") {
    // 繪製測驗成績。
    drawResultScreen();
  } else if (screenState === "error") {
    // 繪製題庫格式錯誤提示。
    drawErrorScreen();
  } else {
    // 題庫尚未準備完成時繪製載入提示。
    drawLoadingScreen();
  }
}

// 依照目前畫布尺寸重新計算所有版面與點擊範圍。
function updateLayout() {
  // 取得畫布較短的一邊，作為響應式字級參考。
  const shortSide = min(width, height);
  // 判斷是否需要壓縮橫向手機的垂直間距。
  const compactLandscape = width > height && height < 520;
  // 在大螢幕或橫向平板使用兩欄選項。
  const useGrid = width >= 720 || (width >= 540 && width / max(height, 1) >= 1.25);
  // 計算不超出畫布的左右邊距。
  const margin = constrain(min(width * 0.055, height * 0.045), 10, 48);
  // 計算內容最大寬度，避免桌面畫面過度拉寬。
  const contentWidth = max(100, min(width - margin * 2, 1080));
  // 將內容水平置中。
  const contentX = max(0, (width - contentWidth) / 2);
  // 依畫布短邊計算標題大小。
  const titleSize = constrain(shortSide * 0.055, 18, 34);
  // 依畫布短邊計算題目大小。
  const questionSize = constrain(shortSide * 0.039, 14, 26);
  // 依畫布短邊計算選項大小。
  const optionSize = constrain(shortSide * 0.029, 12, 20);
  // 設定題目換行後的行高。
  const questionLineHeight = compactLandscape ? constrain(questionSize * 1.3, 18, 30) : constrain(questionSize * 1.48, 22, 39);
  // 設定選項換行後的行高。
  const optionLineHeight = compactLandscape ? constrain(optionSize * 1.2, 15, 22) : constrain(optionSize * 1.3, 16, 27);
  // 設定標題垂直位置。
  const headerY = compactLandscape ? 16 : constrain(height * 0.055, 18, 42);
  // 設定題目卡片垂直位置。
  const questionY = headerY + titleSize + (compactLandscape ? 10 : 26);
  // 設定題目文字可用寬度。
  const questionTextWidth = max(80, contentWidth - 30);
  // 使用中文型測量題目換行結果。
  setChineseFont();
  // 使用目前題目大小測量文字。
  textSize(questionSize);
  // 取得目前題目，沒有題目時使用空白文字避免未定義錯誤。
  const currentQuestion = quizQuestions.length > 0 ? quizQuestions[min(currentQuestionIndex, quizQuestions.length - 1)] : { question: "" };
  // 將題目文字依寬度拆成多行。
  const questionLines = wrapText(currentQuestion.question, questionTextWidth);
  // 設定題目卡片內距。
  const questionPadding = compactLandscape ? 10 : 16;
  // 依題目行數計算卡片高度。
  const questionHeight = max(compactLandscape ? 52 : 70, questionPadding * 2 + questionLines.length * questionLineHeight);
  // 設定題目卡片與選項之間的間距。
  const optionsStartY = questionY + questionHeight + (compactLandscape ? 7 : constrain(height * 0.022, 8, 20));
  // 設定底部按鈕高度。
  const actionHeight = compactLandscape ? 34 : constrain(shortSide * 0.085, 44, 60);
  // 設定畫布底部安全邊距。
  const bottomMargin = compactLandscape ? 7 : constrain(height * 0.032, 10, 26);
  // 設定按鈕上方的回饋文字空間。
  const feedbackSpace = compactLandscape ? 16 : constrain(shortSide * 0.055, 22, 36);
  // 將操作按鈕固定在畫布底部安全區域內。
  const actionY = max(optionsStartY + 35, height - bottomMargin - actionHeight);
  // 計算四個選項可使用的總高度。
  const optionAreaHeight = max(60, actionY - feedbackSpace - optionsStartY - 5);
  // 設定選項之間的間距。
  const optionGap = compactLandscape ? 5 : constrain(shortSide * 0.017, 6, 15);
  // 建立四個選項的矩形範圍。
  const rectangles = [];
  // 依照畫面寬度決定單欄或兩欄排版。
  if (useGrid) {
    // 計算兩欄選項的寬度。
    const optionWidth = (contentWidth - optionGap) / 2;
    // 計算兩列選項的高度。
    const optionHeight = max(compactLandscape ? 30 : 40, (optionAreaHeight - optionGap) / 2);
    // 依序建立四個選項矩形。
    for (let index = 0; index < 4; index += 1) {
      // 計算目前選項所在的欄位。
      const column = index % 2;
      // 計算目前選項所在的列位。
      const row = floor(index / 2);
      // 儲存目前選項的位置與尺寸。
      rectangles.push({ x: contentX + column * (optionWidth + optionGap), y: optionsStartY + row * (optionHeight + optionGap), w: optionWidth, h: optionHeight });
    }
  } else {
    // 計算單欄選項的高度。
    const optionHeight = max(compactLandscape ? 30 : 36, (optionAreaHeight - optionGap * 3) / 4);
    // 依序建立四個單欄選項矩形。
    for (let index = 0; index < 4; index += 1) {
      // 儲存目前選項的位置與尺寸。
      rectangles.push({ x: contentX, y: optionsStartY + index * (optionHeight + optionGap), w: contentWidth, h: optionHeight });
    }
  }
  // 計算操作按鈕寬度。
  const actionWidth = min(contentWidth, constrain(shortSide * 0.58, 180, 300));
  // 將版面資訊集中保存，供所有繪圖函式使用。
  layout = { margin, contentX, contentWidth, titleSize, questionSize, optionSize, questionLineHeight, optionLineHeight, headerY, questionY, questionHeight, questionLines, questionPadding, optionsStartY, optionGap, actionHeight, actionY, feedbackSpace, actionWidth };
  // 更新選項點擊範圍。
  optionRects = rectangles;
  // 更新操作按鈕點擊範圍。
  actionRect = { x: (width - actionWidth) / 2, y: actionY, w: actionWidth, h: actionHeight };
}

// 繪製測驗題目、四個選項與操作按鈕。
function drawQuizScreen() {
  // 取得目前題目資料。
  const question = quizQuestions[currentQuestionIndex];
  // 繪製標題與第 x 題／共 5 題進度。
  drawHeader();
  // 繪製題目卡片。
  drawQuestionCard(question);
  // 逐一繪製四個選項。
  for (let index = 0; index < question.options.length; index += 1) {
    // 繪製目前選項。
    drawOption(question, index, optionRects[index]);
  }
  // 依是否為最後一題決定按鈕文字。
  const actionLabel = currentQuestionIndex === QUIZ_SIZE - 1 ? "查看成績" : "下一題";
  // 作答前按鈕呈現停用狀態，作答後才可以使用。
  drawActionButton(actionRect, actionLabel, hasAnswered);
  // 繪製作答說明或答題回饋。
  drawFeedback();
}

// 繪製標題與測驗進度。
function drawHeader() {
  // 設定標題靠左並垂直置中。
  textAlign(LEFT, CENTER);
  // 使用中文型繪製中文標題。
  setChineseFont();
  // 設定標題字體大小。
  textSize(layout.titleSize);
  // 設定標題顏色。
  fill("#17324d");
  // 設定標題水平起點。
  const titleX = layout.contentX;
  // 先測量中文標題寬度，避免切換字型後測量錯誤。
  const chineseTitleWidth = textWidth("簡易指令測驗");
  // 繪製中文標題。
  text("簡易指令測驗", titleX, layout.headerY);
  // 切換 Anton 繪製英文與數字。
  setLatinFont();
  // 繪製 p5.js 標誌。
  text("p5.js", titleX + chineseTitleWidth + 9, layout.headerY);
  // 繪製置中的進度文字。
  drawCenteredSegments([
    { text: "第 ", font: "chinese" },
    { text: String(currentQuestionIndex + 1), font: "latin" },
    { text: " / ", font: "latin" },
    { text: String(QUIZ_SIZE), font: "latin" },
    { text: " 題　答對：", font: "chinese" },
    { text: String(score), font: "latin" },
    { text: " 題", font: "chinese" }
  ], layout.headerY + layout.titleSize * 0.95, constrain(layout.optionSize * 0.88, 12, 18));
}

// 繪製可自動換行的題目卡片。
function drawQuestionCard(question) {
  // 設定題目卡片填色。
  fill("#ffffff");
  // 設定題目卡片外框色。
  stroke("#dce6ef");
  // 設定題目卡片外框寬度。
  strokeWeight(1.5);
  // 繪製圓角題目卡片。
  rect(layout.contentX, layout.questionY, layout.contentWidth, layout.questionHeight, 16);
  // 關閉外框避免影響後續繪圖。
  noStroke();
  // 使用中文型繪製題目。
  setChineseFont();
  // 設定題目文字大小。
  textSize(layout.questionSize);
  // 設定題目文字為粗體。
  textStyle(BOLD);
  // 設定題目文字靠左且頂端對齊。
  textAlign(LEFT, TOP);
  // 逐行繪製題目文字。
  for (let index = 0; index < layout.questionLines.length; index += 1) {
    // 繪製目前的題目文字行。
    text(layout.questionLines[index], layout.contentX + 15, layout.questionY + layout.questionPadding + index * layout.questionLineHeight);
  }
  // 恢復一般文字樣式。
  textStyle(NORMAL);
  // 恢復一般文字對齊方式。
  textAlign(LEFT, CENTER);
}

// 繪製單一選項，答錯時讓正確選項以指定顏色上下跳動。
function drawOption(question, index, rectangle) {
  // 判斷目前選項是否為正確答案。
  const isCorrect = index === question.answerIndex;
  // 判斷目前選項是否為使用者所選。
  const isSelected = index === selectedIndex;
  // 設定選項預設背景色。
  let optionFill = color("#ffffff");
  // 設定選項預設外框色。
  let optionStroke = color("#c9d7e3");
  // 設定選項預設外框寬度。
  let optionStrokeWeight = 1.5;
  // 設定選項上下跳動位移。
  let bounce = 0;
  // 答錯時將正確選項設為指定綠色並啟用動畫。
  if (hasAnswered && answerIsWrong && isCorrect) {
    // 套用使用者指定的 #c7f9cc 背景色。
    optionFill = color(CORRECT_HINT_COLOR);
    // 設定正確選項外框色。
    optionStroke = color("#52a866");
    // 加粗正確選項外框。
    optionStrokeWeight = 2.5;
    // 以正弦函式產生平滑的上下跳動。
    bounce = sin(frameCount * 0.14) * min(8, height * 0.018);
  }
  // 答錯時將使用者選錯的選項標為淡紅色。
  if (hasAnswered && answerIsWrong && isSelected && !isCorrect) {
    // 設定選錯選項背景色。
    optionFill = color("#ffdede");
    // 設定選錯選項外框色。
    optionStroke = color("#e07a7a");
    // 加粗選錯選項外框。
    optionStrokeWeight = 2.5;
  }
  // 答對時將使用者選取的選項標為淡藍色。
  if (hasAnswered && !answerIsWrong && isSelected) {
    // 設定答對選項背景色。
    optionFill = color("#dceeff");
    // 設定答對選項外框色。
    optionStroke = color("#4c8bc4");
    // 加粗答對選項外框。
    optionStrokeWeight = 2.5;
  }
  // 設定選項卡片填色。
  fill(optionFill);
  // 設定選項卡片外框色。
  stroke(optionStroke);
  // 設定選項卡片外框寬度。
  strokeWeight(optionStrokeWeight);
  // 繪製帶有跳動位移的選項卡片。
  rect(rectangle.x, rectangle.y + bounce, rectangle.w, rectangle.h, 13);
  // 關閉圖形外框。
  noStroke();
  // 使用 Anton 繪製程式碼與英文字母。
  setLatinFont();
  // 設定選項文字大小。
  textSize(layout.optionSize);
  // 設定選項文字顏色。
  fill("#263b4d");
  // 建立 A 到 D 的選項標籤。
  const label = String.fromCharCode(65 + index) + ". ";
  // 設定選項文字靠左並垂直置中。
  textAlign(LEFT, CENTER);
  // 計算選項文字可用寬度。
  const textWidthLimit = max(60, rectangle.w - 30);
  // 將程式碼選項依寬度拆成多行。
  const optionLines = wrapText(label + question.options[index], textWidthLimit);
  // 計算多行文字區塊的總高度。
  const textBlockHeight = (optionLines.length - 1) * layout.optionLineHeight;
  // 計算多行文字垂直置中位置。
  const textStartY = rectangle.y + bounce + rectangle.h / 2 - textBlockHeight / 2;
  // 逐行繪製選項文字。
  for (let lineIndex = 0; lineIndex < optionLines.length; lineIndex += 1) {
    // 繪製目前的選項文字行。
    text(optionLines[lineIndex], rectangle.x + 15, textStartY + lineIndex * layout.optionLineHeight);
  }
  // 答錯時在正確選項上顯示文字提示。
  if (hasAnswered && answerIsWrong && isCorrect) {
    // 切換中文型繪製提示。
    setChineseFont();
    // 設定提示文字大小。
    textSize(constrain(layout.optionSize * 0.7, 10, 15));
    // 設定提示文字顏色。
    fill("#287a3d");
    // 將提示放在卡片右下角。
    textAlign(RIGHT, CENTER);
    // 繪製正確答案提示。
    text("✓ 正確答案", rectangle.x + rectangle.w - 10, rectangle.y + bounce + rectangle.h - 10);
  }
  // 恢復一般文字對齊方式。
  textAlign(LEFT, CENTER);
}

// 繪製下一題、查看成績或重新測驗按鈕。
function drawActionButton(rectangle, label, enabled) {
  // 依按鈕是否啟用設定背景色。
  fill(enabled ? "#1769aa" : "#b8c6d1");
  // 關閉按鈕外框。
  noStroke();
  // 繪製圓角按鈕。
  rect(rectangle.x, rectangle.y, rectangle.w, rectangle.h, 13);
  // 使用中文型繪製按鈕文字。
  setChineseFont();
  // 設定按鈕文字大小。
  textSize(constrain(layout.optionSize * 1.05, 14, 20));
  // 設定按鈕文字顏色。
  fill("#ffffff");
  // 設定按鈕文字置中。
  textAlign(CENTER, CENTER);
  // 繪製按鈕文字。
  text(label, rectangle.x + rectangle.w / 2, rectangle.y + rectangle.h / 2);
  // 恢復一般文字對齊方式。
  textAlign(LEFT, CENTER);
}

// 繪製作答前提示或作答後回饋。
function drawFeedback() {
  // 使用中文型繪製提示。
  setChineseFont();
  // 設定提示文字大小。
  textSize(constrain(layout.optionSize * 0.82, 11, 16));
  // 依答題狀態設定提示顏色。
  fill(hasAnswered ? (answerIsWrong ? "#b14f4f" : "#287a3d") : "#5e7184");
  // 設定提示文字置中。
  textAlign(CENTER, CENTER);
  // 依答題狀態決定提示內容。
  const message = hasAnswered ? (answerIsWrong ? "答錯了！綠色跳動的選項是正確答案。" : "答對了！請按下方按鈕繼續。") : "請點選一個選項作答";
  // 將回饋文字畫在按鈕上方。
  text(message, width / 2, actionRect.y - layout.feedbackSpace / 2);
  // 恢復一般文字對齊方式。
  textAlign(LEFT, CENTER);
}

// 繪製答題完成後的成績畫面。
function drawResultScreen() {
  // 計算成績卡片寬度。
  const cardWidth = min(620, width - 26);
  // 計算成績卡片高度並避免超出畫布。
  const cardHeight = min(430, height - 26);
  // 計算成績卡片左側位置。
  const cardX = (width - cardWidth) / 2;
  // 計算成績卡片上方位置。
  const cardY = (height - cardHeight) / 2;
  // 設定成績卡片填色。
  fill("#ffffff");
  // 設定成績卡片外框。
  stroke("#dce6ef");
  // 設定成績卡片外框寬度。
  strokeWeight(1.5);
  // 繪製成績卡片。
  rect(cardX, cardY, cardWidth, cardHeight, 20);
  // 關閉外框。
  noStroke();
  // 使用中文型繪製完成標題。
  setChineseFont();
  // 設定標題大小。
  textSize(constrain(min(width, height) * 0.075, 24, 40));
  // 設定標題顏色。
  fill("#17324d");
  // 設定標題置中。
  textAlign(CENTER, CENTER);
  // 繪製完成標題。
  text("測驗完成！", width / 2, cardY + cardHeight * 0.23);
  // 繪製答對題數與固定總題數 5。
  drawCenteredSegments([
    { text: "你答對了 ", font: "chinese" },
    { text: String(score), font: "latin" },
    { text: " / ", font: "latin" },
    { text: String(QUIZ_SIZE), font: "latin" },
    { text: " 題", font: "chinese" }
  ], cardY + cardHeight * 0.46, constrain(min(width, height) * 0.065, 22, 34));
  // 設定鼓勵文字大小。
  textSize(constrain(min(width, height) * 0.035, 13, 19));
  // 設定鼓勵文字顏色。
  fill("#5e7184");
  // 依成績顯示鼓勵訊息。
  const resultMessage = score === QUIZ_SIZE ? "太棒了，全部答對！" : (score >= 3 ? "表現很好，再接再厲！" : "再練習一次，會越來越熟悉 p5.js！");
  // 繪製鼓勵訊息。
  text(resultMessage, width / 2, cardY + cardHeight * 0.62);
  // 計算重新測驗按鈕寬度。
  const resultButtonWidth = min(cardWidth - 28, 290);
  // 計算重新測驗按鈕高度。
  const resultButtonHeight = constrain(min(width, height) * 0.085, 42, 58);
  // 建立重新測驗按鈕範圍。
  const resultButton = { x: (width - resultButtonWidth) / 2, y: cardY + cardHeight - resultButtonHeight - max(16, cardHeight * 0.12), w: resultButtonWidth, h: resultButtonHeight };
  // 更新目前可操作的按鈕範圍。
  actionRect = resultButton;
  // 繪製重新測驗按鈕。
  drawActionButton(resultButton, "重新測驗", true);
}

// 顯示題庫格式錯誤，方便在 p5.js Web Editor 排查檔案問題。
function drawErrorScreen() {
  // 設定錯誤畫面文字顏色。
  fill("#17324d");
  // 使用中文型繪製錯誤標題。
  setChineseFont();
  // 設定錯誤標題大小。
  textSize(constrain(min(width, height) * 0.06, 20, 34));
  // 設定文字置中。
  textAlign(CENTER, CENTER);
  // 顯示題庫讀取錯誤。
  text("題庫載入失敗", width / 2, height * 0.38);
  // 設定錯誤說明大小。
  textSize(constrain(min(width, height) * 0.035, 13, 18));
  // 顯示需要檢查的資訊。
  text("請確認 questions.csv 與 index.html、sketch.js 位於同一個資料夾。", width / 2, height * 0.52);
  // 恢復一般對齊方式。
  textAlign(LEFT, CENTER);
}

// 顯示題庫尚未準備完成的提示。
function drawLoadingScreen() {
  // 使用中文型設定載入文字。
  setChineseFont();
  // 設定載入文字大小。
  textSize(constrain(min(width, height) * 0.06, 20, 34));
  // 設定載入文字顏色。
  fill("#17324d");
  // 設定文字置中。
  textAlign(CENTER, CENTER);
  // 顯示載入提示。
  text("正在載入題庫…", width / 2, height / 2);
  // 恢復一般對齊方式。
  textAlign(LEFT, CENTER);
}

// 將文字依目前字型與最大寬度逐字拆成多行。
function wrapText(message, maxWidth) {
  // 建立儲存換行結果的陣列。
  const lines = [];
  // 將文字依手動換行符號拆成段落。
  const paragraphs = String(message).split("\n");
  // 逐段處理內容。
  for (const paragraph of paragraphs) {
    // 儲存目前組合中的文字行。
    let line = "";
    // 使用 Array.from 正確處理中文字元。
    for (const character of Array.from(paragraph)) {
      // 試算加入目前字元後的寬度。
      const candidate = line + character;
      // 超過寬度且目前不是空行時換行。
      if (line.length > 0 && textWidth(candidate) > maxWidth) {
        // 保存已完成的文字行。
        lines.push(line);
        // 讓目前字元成為新行的第一個字元。
        line = character;
      } else {
        // 將目前字元加入正在組合的文字行。
        line = candidate;
      }
    }
    // 保存段落最後一行。
    lines.push(line);
  }
  // 確保空字串也至少回傳一行。
  return lines.length > 0 ? lines : [""];
}

// 置中繪製可混用中文型與 Anton 的文字片段。
function drawCenteredSegments(segments, centerY, size) {
  // 設定所有片段的共同文字大小。
  textSize(size);
  // 累計所有片段總寬度。
  let totalWidth = 0;
  // 逐一測量片段寬度。
  for (const segment of segments) {
    // 依片段種類切換字型。
    if (segment.font === "latin") {
      // 使用 Anton 測量英文與數字。
      setLatinFont();
    } else {
      // 使用 Noto Serif TC 測量中文。
      setChineseFont();
    }
    // 確認目前片段使用指定大小。
    textSize(size);
    // 累加目前片段寬度。
    totalWidth += textWidth(segment.text);
  }
  // 計算第一個片段的水平起點。
  let cursorX = width / 2 - totalWidth / 2;
  // 設定片段左對齊並垂直置中。
  textAlign(LEFT, CENTER);
  // 逐一繪製文字片段。
  for (const segment of segments) {
    // 依片段種類切換字型。
    if (segment.font === "latin") {
      // 使用 Anton 繪製英文與數字。
      setLatinFont();
    } else {
      // 使用 Noto Serif TC 繪製中文。
      setChineseFont();
    }
    // 設定目前片段文字大小。
    textSize(size);
    // 繪製目前片段。
    text(segment.text, cursorX, centerY);
    // 將游標移到下一個片段。
    cursorX += textWidth(segment.text);
  }
  // 恢復一般文字對齊方式。
  textAlign(LEFT, CENTER);
}

// 設定 p5.js 使用中文 Noto Serif TC 字型。
function setChineseFont() {
  // 指定 Google Fonts 的中文 family 名稱。
  textFont("Noto Serif TC");
}

// 設定 p5.js 使用英文與數字 Anton 字型。
function setLatinFont() {
  // 指定 Google Fonts 的英文與數字 family 名稱。
  textFont("Anton");
}

// 將題庫洗牌並從 15 題中取出不重複的 5 題。
function selectRandomQuestions() {
  // 複製題庫後洗牌，避免改變原本的 15 題順序。
  const shuffledQuestions = shuffleArray(questionBank);
  // 只取洗牌後前五題，確保本次不會作答全部 15 題。
  return shuffledQuestions.slice(0, QUIZ_SIZE);
}

// 使用 Fisher-Yates 演算法建立隨機排列。
function shuffleArray(items) {
  // 複製輸入陣列，保留原始題庫。
  const shuffled = items.slice();
  // 從陣列尾端逐一向前交換。
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    // 產生目前範圍內的隨機索引。
    const randomIndex = floor(random(index + 1));
    // 暫存目前元素。
    const temporary = shuffled[index];
    // 交換目前元素與隨機元素。
    shuffled[index] = shuffled[randomIndex];
    // 完成交換。
    shuffled[randomIndex] = temporary;
  }
  // 回傳洗牌後的新陣列。
  return shuffled;
}

// 建立一場新的五題測驗。
function startQuiz() {
  // 從完整 15 題題庫重新洗牌抽出 5 題。
  quizQuestions = selectRandomQuestions();
  // 從第一題開始作答。
  currentQuestionIndex = 0;
  // 將分數歸零。
  score = 0;
  // 清除作答狀態。
  hasAnswered = false;
  // 清除選項選取狀態。
  selectedIndex = -1;
  // 清除答錯狀態。
  answerIsWrong = false;
  // 切換到測驗畫面。
  screenState = "quiz";
}

// 判斷座標是否落在指定矩形內。
function containsPoint(pointX, pointY, rectangle) {
  // 回傳水平與垂直座標都在矩形內的結果。
  return pointX >= rectangle.x && pointX <= rectangle.x + rectangle.w && pointY >= rectangle.y && pointY <= rectangle.y + rectangle.h;
}

// 統一處理滑鼠、觸控與觸控筆輸入。
function handlePointer(pointerX, pointerY) {
  // 取得目前時間，用於阻止觸控後的重複滑鼠事件。
  const now = millis();
  // 300 毫秒內的後續事件視為同一次操作。
  if (now - lastPointerTime < 300) {
    // 忽略重複事件。
    return;
  }
  // 記錄本次有效輸入時間。
  lastPointerTime = now;
  // 成績畫面只接受重新測驗按鈕。
  if (screenState === "result") {
    // 點擊按鈕時重新抽取 5 題。
    if (actionRect && containsPoint(pointerX, pointerY, actionRect)) {
      // 啟動全新的測驗。
      startQuiz();
    }
    // 結束成績畫面輸入處理。
    return;
  }
  // 題庫錯誤或載入中畫面不處理點擊。
  if (screenState !== "quiz") {
    // 結束非測驗畫面輸入處理。
    return;
  }
  // 尚未作答時才允許選取選項。
  if (!hasAnswered) {
    // 逐一檢查四個選項的點擊範圍。
    for (let index = 0; index < optionRects.length; index += 1) {
      // 取得目前選項矩形。
      const rectangle = optionRects[index];
      // 點擊到選項時記錄答案。
      if (containsPoint(pointerX, pointerY, rectangle)) {
        // 執行單題作答。
        answerQuestion(index);
        // 停止檢查其他選項。
        return;
      }
    }
    // 點擊其他區域不做任何動作。
    return;
  }
  // 已作答時，點擊按鈕才可前往下一步。
  if (actionRect && containsPoint(pointerX, pointerY, actionRect)) {
    // 前往下一題或成績畫面。
    nextStep();
  }
}

// 記錄答案並確保同一題不可重複作答。
function answerQuestion(index) {
  // 已作答時直接結束，避免重複計分。
  if (hasAnswered) {
    // 結束重複作答流程。
    return;
  }
  // 記錄使用者選取的選項索引。
  selectedIndex = index;
  // 鎖定本題作答狀態。
  hasAnswered = true;
  // 判斷使用者答案是否錯誤。
  answerIsWrong = index !== quizQuestions[currentQuestionIndex].answerIndex;
  // 答對時增加一分。
  if (!answerIsWrong) {
    // 將目前分數增加一題。
    score += 1;
  }
}

// 前往下一題或切換至成績畫面。
function nextStep() {
  // 最後一題答完後顯示成績。
  if (currentQuestionIndex === QUIZ_SIZE - 1) {
    // 切換到成績畫面。
    screenState = "result";
    // 結束下一步流程。
    return;
  }
  // 前往下一題。
  currentQuestionIndex += 1;
  // 清除新題目的作答狀態。
  hasAnswered = false;
  // 清除上一題選取的選項。
  selectedIndex = -1;
  // 清除上一題錯誤狀態。
  answerIsWrong = false;
}

// 處理滑鼠按下事件。
function mousePressed() {
  // 將滑鼠或觸控筆座標交給統一輸入函式。
  handlePointer(mouseX, mouseY);
  // 阻止瀏覽器預設行為。
  return false;
}

// 處理觸控裝置的觸控開始事件。
function touchStarted() {
  // 確認目前至少存在一個觸控點。
  if (touches.length > 0) {
    // 使用第一個觸控點進行操作。
    handlePointer(touches[0].x, touches[0].y);
  }
  // 阻止手機頁面滑動。
  return false;
}

// 支援 Enter 鍵進入下一題或重新測驗。
function keyPressed() {
  // 只處理 Enter 鍵。
  if (keyCode === ENTER) {
    // 成績畫面按 Enter 時重新抽題。
    if (screenState === "result") {
      // 開始新的五題測驗。
      startQuiz();
    } else if (screenState === "quiz" && hasAnswered) {
      // 作答後按 Enter 前往下一步。
      nextStep();
    }
  }
}

// 當視窗尺寸或裝置方向改變時重新設定畫布與版面。
function windowResized() {
  // 將畫布調整為最新視窗大小。
  resizeCanvas(windowWidth, windowHeight);
  // 立即重新計算響應式版面。
  updateLayout();
}
