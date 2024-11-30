// Get DOM Elements
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
const pages = [null]; // Store canvas state as images, starting with the first page
let currentPage = 0;

// Event Listeners for Tools
colorPicker.addEventListener('input', (e) => {
  strokeColor = e.target.value;
  activateTool('pen');
});

widthSlider.addEventListener('input', (e) => {
  strokeWidth = parseInt(e.target.value, 10);
  widthDisplay.textContent = `${strokeWidth}px`;
});

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

// Handle Mouse and Touch Events
canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseout', stopDrawing);

canvas.addEventListener('touchstart', startDrawing);
canvas.addEventListener('touchmove', draw);
canvas.addEventListener('touchend', stopDrawing);

function startDrawing(e) {
  isDrawing = true;
  saveToUndoStack();
  const { offsetX, offsetY } = getCoordinates(e);
  [lastX, lastY] = [offsetX, offsetY];
}

function draw(e) {
  if (!isDrawing) return;

  const { offsetX, offsetY } = getCoordinates(e);
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.strokeStyle = eraserMode ? '#ffffff' : strokeColor;
  ctx.globalCompositeOperation = eraserMode ? 'destination-out' : 'source-over';

  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(offsetX, offsetY);
  ctx.stroke();

  [lastX, lastY] = [offsetX, offsetY];
}

function stopDrawing() {
  isDrawing = false;
}

// Get Coordinates for Mouse and Touch Events
function getCoordinates(e) {
  const rect = canvas.getBoundingClientRect();
  const offsetX = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
  const offsetY = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
  return { offsetX, offsetY };
}

// Canvas Controls
clearButton.addEventListener('click', () => {
  saveToUndoStack();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});

newPageButton.addEventListener('click', () => {
  savePageState();
  currentPage++;
  pages[currentPage] = pages[currentPage] || null;
  updateCanvas();
  updatePageIndicator();
});

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

// Undo and Redo
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
// savePdfButton.addEventListener('click', async () => {
//   const { jsPDF } = window.jspdf;
//   const pdf = new jsPDF();

//   // Adjust canvas scaling for high-resolution export
//   const scaleFactor = 2; // To improve PDF quality, use a higher scaling factor
//   const tempCanvas = document.createElement('canvas');
//   const tempCtx = tempCanvas.getContext('2d');

//   pages.forEach((page, index) => {
//     if (!page) return;

//     // Create a temporary canvas for exporting high-resolution images
//     tempCanvas.width = canvas.width * scaleFactor;
//     tempCanvas.height = canvas.height * scaleFactor;

//     tempCtx.scale(scaleFactor, scaleFactor);
//     const img = new Image();
//     img.src = page;

//     img.onload = () => {
//       tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
//       tempCtx.drawImage(img, 0, 0, canvas.width, canvas.height);

//       const imgData = tempCanvas.toDataURL('image/png');
//       if (index > 0) pdf.addPage();
//       pdf.addImage(imgData, 'PNG', 0, 0, 210, 297); // Adjust to fit A4 size
//     };
//   });

//   // Save PDF after images are loaded
//   setTimeout(() => {
//     pdf.save('handwriting.pdf');
//   }, 1000); // Allow some delay for image loading
// });


// Save Page State
function savePageState() {
  pages[currentPage] = canvas.toDataURL('image/png');
}

// Update Canvas
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

// Save to Undo Stack
function saveToUndoStack() {
  undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
}

// Responsive Canvas
function resizeCanvas() {
  const devicePixelRatio = window.devicePixelRatio || 1;
  canvas.width = container.clientWidth * devicePixelRatio;
  canvas.height = container.clientHeight * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();
