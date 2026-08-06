const canvas = document.getElementById('drawingCanvas');
const context = canvas.getContext('2d');
const brushButton = document.getElementById('brushButton');
const eraserButton = document.getElementById('eraserButton');
const clearButton = document.getElementById('clearButton');
const colorPicker = document.getElementById('colorPicker');
const sizePicker = document.getElementById('sizePicker');

const state = {
  drawing: false,
  tool: 'brush',
  color: colorPicker.value,
  size: Number(sizePicker.value),
  lastX: 0,
  lastY: 0,
};

function fitCanvas() {
  const { width, height } = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const snapshot = document.createElement('canvas');
  const snapshotContext = snapshot.getContext('2d');

  snapshot.width = canvas.width;
  snapshot.height = canvas.height;

  if (canvas.width && canvas.height) {
    snapshotContext.drawImage(canvas, 0, 0);
  }

  canvas.width = Math.max(1, Math.floor(width * ratio));
  canvas.height = Math.max(1, Math.floor(height * ratio));

  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.imageSmoothingEnabled = true;
  context.clearRect(0, 0, width, height);
  context.fillStyle = '#fffefb';
  context.fillRect(0, 0, width, height);

  if (snapshot.width && snapshot.height) {
    context.drawImage(snapshot, 0, 0, snapshot.width, snapshot.height, 0, 0, width, height);
  }
}

function setTool(tool) {
  state.tool = tool;
  brushButton.classList.toggle('active', tool === 'brush');
  eraserButton.classList.toggle('active', tool === 'eraser');
  canvas.style.cursor = tool === 'eraser' ? 'cell' : 'crosshair';
}

function updateStrokeSettings() {
  state.color = colorPicker.value;
  state.size = Number(sizePicker.value);
}

function getPointerPosition(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function startDrawing(event) {
  state.drawing = true;
  const { x, y } = getPointerPosition(event);
  state.lastX = x;
  state.lastY = y;
}

function draw(event) {
  if (!state.drawing) {
    return;
  }

  const { x, y } = getPointerPosition(event);

  context.save();
  context.globalCompositeOperation = state.tool === 'eraser' ? 'destination-out' : 'source-over';
  context.strokeStyle = state.color;
  context.lineWidth = state.size;
  context.beginPath();
  context.moveTo(state.lastX, state.lastY);
  context.lineTo(x, y);
  context.stroke();
  context.restore();

  state.lastX = x;
  state.lastY = y;
}

function stopDrawing() {
  state.drawing = false;
}

function clearBoard() {
  const { width, height } = canvas.getBoundingClientRect();
  context.save();
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.restore();
  context.fillStyle = '#fffefb';
  context.fillRect(0, 0, width, height);
}

brushButton.addEventListener('click', () => setTool('brush'));
eraserButton.addEventListener('click', () => setTool('eraser'));
clearButton.addEventListener('click', clearBoard);
colorPicker.addEventListener('input', updateStrokeSettings);
sizePicker.addEventListener('input', updateStrokeSettings);
canvas.addEventListener('pointerdown', startDrawing);
canvas.addEventListener('pointermove', draw);
canvas.addEventListener('pointerup', stopDrawing);
canvas.addEventListener('pointerleave', stopDrawing);
window.addEventListener('resize', fitCanvas);

fitCanvas();
setTool('brush');
updateStrokeSettings();
