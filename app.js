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
// savePdfButton.addEventListener('click', async () => {
//   const { jsPDF } = window.jspdf;
//   const pdf = new jsPDF();

//   pages.forEach((page, index) => {
//     if (page) {
//       if (index > 0) pdf.addPage();

//       // Create an image and get its dimensions for accurate scaling
//       const img = new Image();
//       img.src = page;
//       img.onload = () => {
//         const imgWidth = pdf.internal.pageSize.getWidth(); // PDF page width
//         const imgHeight = (img.height / img.width) * imgWidth; // Maintain aspect ratio

//         // Add the image to the PDF
//         pdf.addImage(img, 'PNG', 0, 0, imgWidth, imgHeight);

//         // Save the PDF after all images are loaded
//         if (index === pages.length - 1) pdf.save('handwriting.pdf');
//       };
//     }
//   });
// });
savePdfButton.addEventListener('click', async () => {
  const { jsPDF } = window.jspdf;

  // PDF dimensions (A4 size in points)
  // const pdfWidth = 595.28;
  // const pdfHeight = 841.89;
  const pdfWidth = 300;
  const pdfHeight = 300;
  const pdfAspectRatio = pdfWidth / pdfHeight;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: [pdfWidth, pdfHeight],
  });

  // Save the current page state before generating the PDF
  savePageState();

  // Function to add a page to the PDF
  const addImageToPdf = (pageData, isFirstPage = false) => {
    return new Promise((resolve) => {
      if (pageData) {
        const img = new Image();
        img.src = pageData;
        img.onload = () => {
          const canvasAspectRatio = img.width / img.height;

          let adjustedWidth, adjustedHeight;

          if (canvasAspectRatio > pdfAspectRatio) {
            adjustedWidth = pdfWidth;
            adjustedHeight = pdfWidth / canvasAspectRatio;
          } else {
            adjustedHeight = pdfHeight;
            adjustedWidth = pdfHeight * canvasAspectRatio;
          }

          const xOffset = (pdfWidth - adjustedWidth) / 2;
          const yOffset = (pdfHeight - adjustedHeight) / 2;

          if (!isFirstPage) pdf.addPage();

          pdf.addImage(
            img,
            'PNG',
            xOffset,
            yOffset,
            adjustedWidth,
            adjustedHeight
          );

          resolve();
        };

        img.onerror = () => {
          console.error("Failed to load image for PDF generation.");
          resolve();
        };
      } else {
        console.warn("No page data found for this page.");
        resolve();
      }
    });
  };

  // Loop through all pages and add them to the PDF
  for (let i = 0; i < pages.length; i++) {
    await addImageToPdf(pages[i], i === 0);
  }

  // Save the PDF
  pdf.save('handwriting.pdf');
});

// Save Current Page State
function savePageState() {
  pages[currentPage] = canvas.toDataURL('image/png');
  console.log(`Saved page ${currentPage + 1}`); // Debugging log
}



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
