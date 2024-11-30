// DOM Elements
const canvas = document.getElementById('container');
const container = document.getElementById('canvas-container');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('color-picker');
const widthSlider = document.getElementById('width-slider');
const widthDisplay = document.getElementById('width-display');
const penIcon = document.getElementById('pen-icon');
const eraserIcon = document.getElementById('eraser-icon');
const newPageButton = document.getElementById('new-page-btn');
const prevPageButton = document.getElementById('prev-page-btn');
const savePdfButton = document.getElementById('save-pdf-btn');
const undoButton = document.getElementById('undo-btn');
const redoButton = document.getElementById('redo-btn');
const clearButton = document.getElementById('clear-btn');
const pageIndicator = document.getElementById('page-indicator');

// Default Pen Settings
let strokeColor = '#000000';
let strokeWidth = 3;
let isDrawing = false;
let eraserMode = false;
let lastX = 0;
let lastY = 0;
const undoStack = [];
const redoStack = [];
const pages = [null];
let currentPage = 0;

// Update stroke color dynamically
colorPicker.addEventListener('input', (e) => {
  strokeColor = e.target.value;
  eraserMode = false;
  activateTool('pen');
});

// Update stroke width dynamically
widthSlider.addEventListener('input', (e) => {
  strokeWidth = parseInt(e.target.value, 10);
  widthDisplay.textContent = `${strokeWidth}px`;
});

// Activate Pen or Eraser
penIcon.addEventListener('click', () => activateTool('pen'));
eraserIcon.addEventListener('click', () => activateTool('eraser'));

function activateTool(tool) {
  if (tool === 'pen') {
    eraserMode = false;
    penIcon.classList.add('active-tool');
    eraserIcon.classList.remove('active-tool');
  } else {
    eraserMode = true;
    eraserIcon.classList.add('active-tool');
    penIcon.classList.remove('active-tool');
  }
}

// Drawing logic for both mouse and touch
function startDrawing(x, y) {
  isDrawing = true;
  saveToUndoStack();
  [lastX, lastY] = [x, y];
}

function draw(x, y) {
  if (!isDrawing) return;

  ctx.lineWidth = strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (eraserMode) {
    ctx.strokeStyle = '#ffffff';
    ctx.globalCompositeOperation = 'destination-out';
  } else {
    ctx.strokeStyle = strokeColor;
    ctx.globalCompositeOperation = 'source-over';
  }

  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(x, y);
  ctx.stroke();

  [lastX, lastY] = [x, y];
}

function stopDrawing() {
  isDrawing = false;
}

// Mouse events
canvas.addEventListener('mousedown', (e) => startDrawing(e.offsetX, e.offsetY));
canvas.addEventListener('mousemove', (e) => draw(e.offsetX, e.offsetY));
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseout', stopDrawing);

// Touch events
canvas.addEventListener('touchstart', (e) => {
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  startDrawing(touch.clientX - rect.left, touch.clientY - rect.top);
  e.preventDefault();
});

canvas.addEventListener('touchmove', (e) => {
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  draw(touch.clientX - rect.left, touch.clientY - rect.top);
  e.preventDefault();
});

canvas.addEventListener('touchend', stopDrawing);
canvas.addEventListener('touchcancel', stopDrawing);

// Clear Canvas
clearButton.addEventListener('click', () => {
  saveToUndoStack();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});

// Add New Page
newPageButton.addEventListener('click', () => {
  savePageState();
  currentPage++;
  if (!pages[currentPage]) {
    pages[currentPage] = null;
  }
  updateCanvas();
  updatePageIndicator();
});

// Previous Page
prevPageButton.addEventListener('click', () => {
  if (currentPage > 0) {
    savePageState();
    currentPage--;
    updateCanvas();
    updatePageIndicator();
  } else {
    alert('You are on the first page!');
  }
});

// Save as PDF
savePdfButton.addEventListener('click', async () => {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();

  pages.forEach((page, index) => {
    if (index > 0) pdf.addPage();
    pdf.addImage(page, 'PNG', 10, 10, 190, 120);
  });

  pdf.save('handwriting.pdf');
});

// Undo/Redo
undoButton.addEventListener('click', () => {
  if (undoStack.length > 0) {
    redoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    const previousState = undoStack.pop();
    ctx.putImageData(previousState, 0, 0);
  }
});

redoButton.addEventListener('click', () => {
  if (redoStack.length > 0) {
    undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    const nextState = redoStack.pop();
    ctx.putImageData(nextState, 0, 0);
  }
});

// Save Current Canvas State to Undo Stack
function saveToUndoStack() {
  undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  if (undoStack.length > 20) undoStack.shift();
  redoStack.length = 0;
}

// Save Current Page State
function savePageState() {
  pages[currentPage] = canvas.toDataURL('image/png');
}

// Update Canvas with Current Page
function updateCanvas() {
  const pageData = pages[currentPage];
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (pageData) {
    const img = new Image();
    img.src = pageData;
    img.onload = () => ctx.drawImage(img, 0, 0);
  }
}

// Update Page Indicator
function updatePageIndicator() {
  pageIndicator.textContent = `Page ${currentPage + 1}`;
}

// Dynamic Canvas Resize
function resizeCanvas() {
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
}

// Initialize
window.addEventListener('load', resizeCanvas);
window.addEventListener('resize', resizeCanvas);
