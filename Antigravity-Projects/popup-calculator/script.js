/* ==========================================================================
   STATE VARIABLES & INITIALIZATION
   ========================================================================== */
let currentInput = '0';      // The active number or token being typed
let expression = '';        // The full equation string shown in the top display
let shouldResetDisplay = false; // Flag to clear display on next keypress (after an evaluation)
let history = JSON.parse(localStorage.getItem('antigravity_calc_history')) || [];
let audioEnabled = true;

// Web Audio API context placeholder
let audioCtx = null;

// DOM Elements
const widget = document.getElementById('calculator-widget');
const widgetHeader = document.getElementById('widget-header');
const displayMain = document.getElementById('display-main');
const displayExpr = document.getElementById('display-expr');
const themeSelector = document.getElementById('theme-selector');
const audioToggle = document.getElementById('audio-toggle');
const historyToggle = document.getElementById('history-toggle');
const historyPanel = document.getElementById('history-panel');
const historyList = document.getElementById('history-list');
const clearHistoryBtn = document.getElementById('clear-history');
const scienceToggle = document.getElementById('science-toggle');
const scientificPad = document.getElementById('scientific-pad');
const launchBtn = document.getElementById('floating-launch-btn');
const triggerCalcBtn = document.getElementById('trigger-calc-btn');
const minimizeBtn = document.getElementById('calc-minimize');
const closeBtn = document.getElementById('calc-close');
const copyBtn = document.getElementById('copy-result');
const copyTooltip = document.getElementById('copy-tooltip');
const backspaceBtn = document.getElementById('btn-backspace');

/* ==========================================================================
   DRAGGING FUNCTIONALITY
   ========================================================================== */
let isDragging = false;
let startX, startY;
let currentX, currentY;
let initialXOffset = 0;
let initialYOffset = 0;

// Initialize position and style coordinates
function initDraggable() {
  // Try to parse style top/left from HTML to set initial offset
  const topVal = parseInt(widget.style.top) || 0;
  const leftVal = parseInt(widget.style.left) || 0;
  
  // Convert percentage or pixel to screen coordinates
  const rect = widget.getBoundingClientRect();
  initialXOffset = rect.left;
  initialYOffset = rect.top;
  
  // Set initial absolute values
  widget.style.left = `${initialXOffset}px`;
  widget.style.top = `${initialYOffset}px`;

  widgetHeader.addEventListener('mousedown', dragStart);
  widgetHeader.addEventListener('touchstart', dragStart, { passive: true });

  document.addEventListener('mousemove', drag);
  document.addEventListener('touchmove', drag, { passive: false });

  document.addEventListener('mouseup', dragEnd);
  document.addEventListener('touchend', dragEnd);
}

function dragStart(e) {
  // Only drag with left click or touch
  if (e.type === 'mousedown' && e.button !== 0) return;
  
  if (widget.classList.contains('minimized')) return;

  isDragging = true;
  widgetHeader.style.cursor = 'grabbing';

  const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
  const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;

  startX = clientX - initialXOffset;
  startY = clientY - initialYOffset;
}

function drag(e) {
  if (!isDragging) return;

  // Prevent default to prevent scrolling on touch devices
  if (e.type === 'touchmove') {
    e.preventDefault();
  }

  const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
  const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

  currentX = clientX - startX;
  currentY = clientY - startY;

  // Screen constraint checks to avoid dragging completely off screen
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  const widgetRect = widget.getBoundingClientRect();

  // Keep at least 40px visible on all sides
  const minX = 40 - widgetRect.width;
  const maxX = screenWidth - 40;
  const minY = 0; // Header should stay visible below screen top
  const maxY = screenHeight - 40;

  initialXOffset = Math.max(minX, Math.min(currentX, maxX));
  initialYOffset = Math.max(minY, Math.min(currentY, maxY));

  widget.style.left = `${initialXOffset}px`;
  widget.style.top = `${initialYOffset}px`;
}

function dragEnd() {
  if (!isDragging) return;
  isDragging = false;
  widgetHeader.style.cursor = 'grab';
}


/* ==========================================================================
   WEB AUDIO SOUND SYNTHESIS
   ========================================================================== */
function playSound(type) {
  if (!audioEnabled) return;

  try {
    // Lazy initialize AudioContext on user interaction
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    // Audio types configuration
    switch(type) {
      case 'digit':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.06);
        break;

      case 'operator':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(698.46, audioCtx.currentTime); // F5
        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.06);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.07);
        break;

      case 'action':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(329.63, audioCtx.currentTime); // E4
        gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.09);
        break;

      case 'equals':
        // A nice pleasant chime (two notes ascending quickly)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
        
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.05); // E5
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        gain2.gain.setValueAtTime(0.08, audioCtx.currentTime + 0.05);
        gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);
        
        osc.start();
        osc.stop(audioCtx.currentTime + 0.08);
        osc2.start(audioCtx.currentTime + 0.05);
        osc2.stop(audioCtx.currentTime + 0.20);
        break;

      case 'error':
        // Descending buzzer tone
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(80, audioCtx.currentTime + 0.25);
        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.26);
        break;
    }
  } catch (err) {
    console.error('Audio synthesis failed:', err);
  }
}


/* ==========================================================================
   THEMES AND WIDGET CONTROLS
   ========================================================================== */
function toggleWidget() {
  const isHidden = widget.classList.contains('hidden');
  if (isHidden) {
    // Show and position appropriately if not visible yet
    widget.classList.remove('hidden');
    launchBtn.style.transform = 'scale(0) rotate(-45deg)';
    
    // Set position relative to current viewport if drag coordinate is offscreen
    const rect = widget.getBoundingClientRect();
    if (rect.top < 0 || rect.left < 0 || rect.left > window.innerWidth || rect.top > window.innerHeight) {
      initialXOffset = window.innerWidth * 0.6;
      initialYOffset = window.innerHeight * 0.15;
      widget.style.left = `${initialXOffset}px`;
      widget.style.top = `${initialYOffset}px`;
    }
  } else {
    widget.classList.add('hidden');
    widget.classList.remove('minimized');
    launchBtn.style.transform = 'scale(1) rotate(0)';
  }
}

function minimizeWidget() {
  widget.classList.toggle('minimized');
}

function updateTheme() {
  const selectedTheme = themeSelector.value;
  // Remove existing themes
  const themes = ['theme-dark', 'theme-glass', 'theme-cyberpunk', 'theme-aurora', 'theme-sakura', 'theme-light'];
  themes.forEach(t => widget.classList.remove(t));
  widget.classList.add(selectedTheme);
}


/* ==========================================================================
   CALCULATION LOGIC & PARSER
   ========================================================================== */
function updateDisplays() {
  // Format visual output for standard presentation
  displayMain.textContent = currentInput;
  displayExpr.textContent = expression;

  // Auto scroll to the end
  displayMain.scrollLeft = displayMain.scrollWidth;
}

function appendValue(val) {
  playSound('digit');

  if (shouldResetDisplay) {
    currentInput = '';
    shouldResetDisplay = false;
  }

  // Prevent multiple consecutive leading zeros
  if (currentInput === '0' && val === '0') return;

  // Handle decimal entry checks
  if (val === '.') {
    // Find the last segment of the current input (split by operators or functions)
    const segments = currentInput.split(/[\+\−\×\÷\s\(\)\^]+/);
    const lastSegment = segments[segments.length - 1];
    if (lastSegment.includes('.')) return;
  }

  // If display is default '0' and input is a digit, replace it
  if (currentInput === '0' && val !== '.') {
    currentInput = val;
  } else {
    currentInput += val;
  }

  updateDisplays();
}

function appendOperator(op) {
  playSound('operator');

  if (shouldResetDisplay) {
    shouldResetDisplay = false;
  }

  // Map operator visuals
  const visualOps = {
    'add': ' + ',
    'subtract': ' − ',
    'multiply': ' × ',
    'divide': ' ÷ ',
    'mod': ' mod '
  };

  const opStr = visualOps[op] || op;

  // If currentInput is empty and expression isn't, user is chaining off expression
  if (currentInput === '0' && expression !== '') {
    // If expression ends with an operator, replace it
    const trimmed = expression.trim();
    const endsWithOp = /[\+\−\×\÷]$/.test(trimmed);
    if (endsWithOp) {
      expression = trimmed.substring(0, trimmed.length - 1) + opStr.trim() + ' ';
      updateDisplays();
      return;
    }
  }

  expression += currentInput + opStr;
  currentInput = '0';
  updateDisplays();
}

function appendFunction(func) {
  playSound('operator');

  if (shouldResetDisplay) {
    currentInput = '';
    shouldResetDisplay = false;
  }

  const funcMap = {
    'sin': 'sin(',
    'cos': 'cos(',
    'tan': 'tan(',
    'log': 'log(',
    'ln': 'ln(',
    'sqrt': 'sqrt(',
    'bracket-open': '(',
    'bracket-close': ')',
    'pow': '^',
    'pi': 'π',
    'e': 'e'
  };

  const appendStr = funcMap[func] || '';

  if (currentInput === '0') {
    if (appendStr === '(' || appendStr.includes('(') || appendStr === 'π' || appendStr === 'e') {
      currentInput = appendStr;
    } else {
      currentInput += appendStr;
    }
  } else {
    currentInput += appendStr;
  }
  updateDisplays();
}

function clearScreen() {
  playSound('action');
  currentInput = '0';
  expression = '';
  shouldResetDisplay = false;
  updateDisplays();
}

function backspace() {
  playSound('action');
  if (shouldResetDisplay) {
    clearScreen();
    return;
  }

  if (currentInput.length > 1) {
    // Check if we are deleting functions with parentheses (e.g. sin(, cos(, log(, ln(, sqrt()
    const checkLength = [4, 3]; // sin(, ln(, etc.
    let deleted = false;
    for (let len of checkLength) {
      if (currentInput.length >= len) {
        const tail = currentInput.slice(-len);
        if (/^(sin\(|cos\(|tan\(|log\(|sqrt\()$/.test(tail) || (len === 3 && /^ln\($/.test(tail))) {
          currentInput = currentInput.slice(0, -len);
          deleted = true;
          break;
        }
      }
    }
    if (!deleted) {
      currentInput = currentInput.slice(0, -1);
    }
  } else {
    currentInput = '0';
  }
  updateDisplays();
}

// Safely execute mathematical equations using standard JS evaluation with strict input validation
function evaluateExpression() {
  // Join the full equation
  let equation = expression + currentInput;
  
  if (equation.trim() === '0' || equation.trim() === '') return;

  // Clean equation format for JS parser
  let parseTarget = equation;

  // Count braces compatibility
  const openBrackets = (parseTarget.match(/\(/g) || []).length;
  const closeBrackets = (parseTarget.match(/\)/g) || []).length;
  if (openBrackets > closeBrackets) {
    parseTarget += ')'.repeat(openBrackets - closeBrackets);
  }

  // 1. Perform visual mapping to mathematical replacements
  let jsExpr = parseTarget
    .replace(/÷/g, '/')
    .replace(/×/g, '*')
    .replace(/−/g, '-')
    .replace(/mod/g, '%')
    .replace(/π/g, 'Math.PI')
    .replace(/e/g, 'Math.E')
    .replace(/sin\(/g, 'Math.sin(')
    .replace(/cos\(/g, 'Math.cos(')
    .replace(/tan\(/g, 'Math.tan(')
    .replace(/log\(/g, 'Math.log10(')
    .replace(/ln\(/g, 'Math.log(')
    .replace(/sqrt\(/g, 'Math.sqrt(');

  // 2. Resolve power ^ operator using regex to support exponentiation correctly
  // JS supports standard exponentiation using `**`
  jsExpr = jsExpr.replace(/\^/g, '**');

  // 3. Strict character validation (Sanitisation sandbox)
  // Allowed keywords: Math.sin, Math.cos, Math.tan, Math.log10, Math.log, Math.sqrt, Math.PI, Math.E
  // Characters: digits, decimal, operators (+, -, *, /, %, **), brackets, spaces, comma
  const sanitisedCheck = jsExpr
    .replace(/Math\.(sin|cos|tan|log10|log|sqrt|PI|E)/g, '')
    .replace(/[\d\.\+\-\*\/\%\(\)\s]/g, '');

  if (sanitisedCheck.length > 0) {
    // Contains illegal commands or injections
    handleCalcError("Invalid Syntax");
    return;
  }

  try {
    // Run evaluation in a micro sandbox
    const result = new Function(`"use strict"; return (${jsExpr})`)();

    if (result === undefined || isNaN(result) || !isFinite(result)) {
      throw new Error("Invalid Output");
    }

    playSound('equals');

    // Float rounding precision helper to prevent display issues (e.g. 0.1 + 0.2 = 0.30000000000000004)
    let roundedResult = parseFloat(result.toFixed(10)).toString();

    // Log in history
    addToHistory(parseTarget, roundedResult);

    expression = parseTarget + ' =';
    currentInput = roundedResult;
    shouldResetDisplay = true;
    updateDisplays();

  } catch (error) {
    handleCalcError("Error");
  }
}

function handleCalcError(msg) {
  playSound('error');
  expression = expression + currentInput;
  currentInput = msg;
  shouldResetDisplay = true;
  updateDisplays();
}


/* ==========================================================================
   HISTORY LOGIC
   ========================================================================== */
function addToHistory(expr, res) {
  const item = { expr, res };
  history.unshift(item); // Add to beginning
  
  // Cap history at 30 items
  if (history.length > 30) history.pop();
  
  localStorage.setItem('antigravity_calc_history', JSON.stringify(history));
  renderHistory();
}

function renderHistory() {
  historyList.innerHTML = '';
  
  if (history.length === 0) {
    historyList.innerHTML = '<div class="empty-history">No calculations yet</div>';
    return;
  }

  history.forEach((item, index) => {
    const itemEl = document.createElement('div');
    itemEl.className = 'history-item';
    itemEl.innerHTML = `
      <div class="history-item-expr">${item.expr}</div>
      <div class="history-item-result">${item.res}</div>
    `;
    itemEl.addEventListener('click', () => {
      playSound('digit');
      currentInput = item.res;
      expression = '';
      shouldResetDisplay = false;
      historyPanel.classList.add('hidden');
      historyToggle.classList.remove('active');
      updateDisplays();
    });
    historyList.appendChild(itemEl);
  });
}

function clearAllHistory() {
  playSound('action');
  history = [];
  localStorage.removeItem('antigravity_calc_history');
  renderHistory();
}


/* ==========================================================================
   KEYBOARD INTEGRATION
   ========================================================================== */
function setupKeyboardListeners() {
  document.addEventListener('keydown', (e) => {
    // If calculator widget is hidden, ignore keystrokes
    if (widget.classList.contains('hidden') || widget.classList.contains('minimized')) return;
    
    // Ignore keystrokes inside options fields if focused (e.g. selectors)
    if (document.activeElement === themeSelector) return;

    const key = e.key;

    if (/\d/.test(key)) {
      e.preventDefault();
      appendValue(key);
    } else if (key === '.') {
      e.preventDefault();
      appendValue('.');
    } else if (key === '+') {
      e.preventDefault();
      appendOperator('add');
    } else if (key === '-') {
      e.preventDefault();
      appendOperator('subtract');
    } else if (key === '*') {
      e.preventDefault();
      appendOperator('multiply');
    } else if (key === '/') {
      e.preventDefault();
      appendOperator('divide');
    } else if (key === '%') {
      e.preventDefault();
      appendOperator('mod');
    } else if (key === '^') {
      e.preventDefault();
      appendFunction('pow');
    } else if (key === '(') {
      e.preventDefault();
      appendFunction('bracket-open');
    } else if (key === ')') {
      e.preventDefault();
      appendFunction('bracket-close');
    } else if (key === 'Enter' || key === '=') {
      e.preventDefault();
      evaluateExpression();
    } else if (key === 'Backspace') {
      e.preventDefault();
      backspace();
    } else if (key === 'Escape') {
      e.preventDefault();
      clearScreen();
    } else if (key === 'c' || key === 'C') {
      e.preventDefault();
      clearScreen();
    }
  });
}


/* ==========================================================================
   CLIPBOARD UTILITY
   ========================================================================== */
function copyToClipboard() {
  playSound('action');
  
  const copyVal = currentInput;
  if (copyVal === 'Error' || copyVal === 'Invalid Syntax' || copyVal === '0') return;

  navigator.clipboard.writeText(copyVal).then(() => {
    copyTooltip.classList.add('show');
    setTimeout(() => {
      copyTooltip.classList.remove('show');
    }, 1500);
  }).catch(err => {
    console.error('Failed to copy text:', err);
  });
}


/* ==========================================================================
   EVENT BINDINGS & MAIN INITIALIZATION
   ========================================================================== */
function init() {
  initDraggable();
  setupKeyboardListeners();
  renderHistory();

  // Widget Toggle buttons
  launchBtn.addEventListener('click', toggleWidget);
  triggerCalcBtn.addEventListener('click', toggleWidget);
  closeBtn.addEventListener('click', toggleWidget);
  minimizeBtn.addEventListener('click', minimizeWidget);

  // Keyboard Buttons Click bindings
  document.querySelectorAll('.key-num').forEach(btn => {
    btn.addEventListener('click', () => {
      appendValue(btn.getAttribute('data-val'));
    });
  });

  document.querySelectorAll('.key-operator').forEach(btn => {
    btn.addEventListener('click', () => {
      appendOperator(btn.getAttribute('data-action'));
    });
  });

  document.querySelectorAll('.key-sci').forEach(btn => {
    btn.addEventListener('click', () => {
      appendFunction(btn.getAttribute('data-action'));
    });
  });

  document.querySelectorAll('.key-action').forEach(btn => {
    if (btn.getAttribute('data-action') === 'clear') {
      btn.addEventListener('click', clearScreen);
    }
  });

  document.querySelector('.key-equals').addEventListener('click', evaluateExpression);
  backspaceBtn.addEventListener('click', backspace);
  copyBtn.addEventListener('click', copyToClipboard);

  // Options panel controls
  themeSelector.addEventListener('change', updateTheme);
  
  audioToggle.addEventListener('click', () => {
    audioEnabled = !audioEnabled;
    audioToggle.classList.toggle('active', audioEnabled);
    if (audioEnabled) {
      playSound('digit');
    }
  });

  scienceToggle.addEventListener('click', () => {
    playSound('action');
    scienceToggle.classList.toggle('active');
    scientificPad.classList.toggle('hidden');
  });

  historyToggle.addEventListener('click', () => {
    playSound('action');
    historyToggle.classList.toggle('active');
    historyPanel.classList.toggle('hidden');
  });

  clearHistoryBtn.addEventListener('click', clearAllHistory);
}

// Run initializers once DOM finishes loading
document.addEventListener('DOMContentLoaded', init);
