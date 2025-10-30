const lettersInput = document.getElementById('lettersInput');
const findWordsBtn = document.getElementById('findWordsBtn');
const resultsDiv = document.getElementById('results');
const loadingDiv = document.getElementById('loading');
const loadingMessageSpan = document.getElementById('loading-message');
const errorBox = document.getElementById('errorBox');
const errorMessage = document.getElementById('errorMessage');
const scrabbleBoardDiv = document.getElementById('scrabble-board');
const clearBoardBtn = document.getElementById('clearBoardBtn');
const saveBoardBtn = document.getElementById('saveBoardBtn');
const loadBoardBtn = document.getElementById('loadBoardBtn');
const loadBoardInput = document.getElementById('loadBoardInput');

const saveModal = document.getElementById('saveModal');
const saveFilenameInput = document.getElementById('saveFilenameInput');
const cancelSaveBtn = document.getElementById('cancelSaveBtn');
const confirmSaveBtn = document.getElementById('confirmSaveBtn');

let frenchDictionary = [];

const letterValues = {
    'a': 1, 'e': 1, 'i': 1, 'l': 1, 'n': 1, 'o': 1, 'r': 1, 's': 1, 't': 1, 'u': 1,
    'd': 2, 'g': 2, 'm': 2,
    'b': 3, 'c': 3, 'p': 3,
    'f': 4, 'h': 4, 'v': 4,
    'j': 8, 'q': 8,
    'k': 10, 'w': 10, 'x': 10, 'y': 10, 'z': 10
};

const BOARD_SIZE = 15;
const specialSquares = {
    '0,0': 'tw', '0,7': 'tw', '0,14': 'tw',
    '7,0': 'tw', '7,14': 'tw',
    '14,0': 'tw', '14,7': 'tw', '14,14': 'tw',
    '1,1': 'dw', '2,2': 'dw', '3,3': 'dw', '4,4': 'dw',
    '1,13': 'dw', '2,12': 'dw', '3,11': 'dw', '4,10': 'dw',
    '10,4': 'dw', '11,3': 'dw', '12,2': 'dw', '13,1': 'dw',
    '10,10': 'dw', '11,11': 'dw', '12,12': 'dw', '13,13': 'dw',
    '1,5': 'tl', '1,9': 'tl',
    '5,1': 'tl', '5,5': 'tl', '5,9': 'tl',
    '5,13': 'tl',
    '9,1': 'tl', '9,5': 'tl', '9,9': 'tl', '9,13': 'tl',
    '13,5': 'tl', '13,9': 'tl',
    '0,3': 'dl', '0,11': 'dl',
    '2,6': 'dl', '2,8': 'dl',
    '3,0': 'dl', '3,7': 'dl', '3,14': 'dl',
    '6,2': 'dl', '6,6': 'dl', '6,8': 'dl',
    '6,12': 'dl',
    '7,3': 'dl', '7,11': 'dl',
    '8,2': 'dl', '8,6': 'dl', '8,8': 'dl',
    '8,12': 'dl',
    '11,0': 'dl', '11,7': 'dl', '11,14': 'dl',
    '12,6': 'dl', '12,8': 'dl',
    '14,3': 'dl', '14,11': 'dl',
    '7,7': 'star'
};

let boardState = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(''));

const columnLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('');

async function loadDictionary() {
    findWordsBtn.disabled = true;
    findWordsBtn.textContent = 'Chargement du dictionnaire...';
    
    const DICO_URL = 'https://raw.githubusercontent.com/words/an-array-of-french-words/master/index.json';

    function normalizeWord(word) {
        return word
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z]/g, '');
    }

    try {
        const response = await fetch(DICO_URL);
        const wordsArray = await response.json(); 

        const cleanedWords = wordsArray.map(normalizeWord)
                                       .filter(word => word.length > 0); 
        
        frenchDictionary = [...new Set(cleanedWords)];

        findWordsBtn.disabled = false;
        findWordsBtn.innerHTML = `<svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg> Trouver les meilleurs placements`;
    
    } catch (err) {
        showError('Impossible de charger le dictionnaire. Veuillez réessayer de rafraîchir la page.');
        console.error('Erreur de chargement du dictionnaire:', err);
    }
}

function showError(message) {
    if (errorMessage) {
        errorMessage.textContent = message;
        errorBox.classList.remove('hidden');
    }
}

function hideError() {
    if (errorBox) {
        errorBox.classList.add('hidden');
    }
}

function canFormWord(word, availableLettersString) {
    let tempLetters = availableLettersString.split('');

    for (let i = 0; i < word.length; i++) {
        const char = word[i];
        const index = tempLetters.indexOf(char);

        if (index !== -1) {
            tempLetters.splice(index, 1);
        } else {
            const jokerIndex = tempLetters.indexOf('*');
            if (jokerIndex !== -1) {
                tempLetters.splice(jokerIndex, 1);
            } else {
                return false;
            }
        }
    }
    return true;
}

function findWordExtent(board, r, c, direction) {
    let startR = r, startC = c;
    let endR = r, endC = c;

    if (direction === 'horizontal') {
        while (startC > 0 && board[r][startC - 1] !== '') {
            startC--;
        }
        while (endC < BOARD_SIZE - 1 && board[r][endC + 1] !== '') {
            endC++;
        }
    } else {
        while (startR > 0 && board[startR - 1][c] !== '') {
            startR--;
        }
        while (endR < BOARD_SIZE - 1 && board[endR + 1][c] !== '') {
            endR++;
        }
    }
    return { startR, startC, endR, endC };
}

function scoreBoardWord(board, startR, startC, endR, endC, direction, lettersPlacedByPlayerThisTurn) {
    let currentWordScore = 0;
    let currentWordMultiplier = 1;
    let wordChars = [];

    for (let i = 0; ; i++) {
        const r = startR + (direction === 'vertical' ? i : 0);
        const c = startC + (direction === 'horizontal' ? i : 0);

        if ( (direction === 'horizontal' && c > endC) || (direction === 'vertical' && r > endR) ) break;

        const charOnBoard = board[r][c].toLowerCase();
        wordChars.push(charOnBoard);

        let letterVal = letterValues[charOnBoard] || 0;

        const isLetterNewlyPlaced = lettersPlacedByPlayerThisTurn.some(lp => lp.r === r && lp.c === c);
        const squareType = specialSquares[`${r},${c}`];

        if (isLetterNewlyPlaced) {
            if (squareType === 'dl') letterVal *= 2;
            if (squareType === 'tl') letterVal *= 3;
            if (squareType === 'dw' || squareType === 'star') currentWordMultiplier *= 2;
            if (squareType === 'tw') currentWordMultiplier *= 3;
        }
        currentWordScore += letterVal;
    }
    return { score: currentWordScore, word: wordChars.join(''), wordMultiplier: currentWordMultiplier };
}


function calculateFullMoveScore(word, startRow, startCol, direction, currentBoardState, playerHand) {
    let tempBoard = currentBoardState.map(row => [...row]);
    let workingHand = playerHand.split('');

    let lettersPlacedByPlayer = [];
    let mainWordUsesExistingLetter = false;
    let centerStarUsedByNewTile = false;

    for (let i = 0; i < word.length; i++) {
        const r = startRow + (direction === 'vertical' ? i : 0);
        const c = startCol + (direction === 'horizontal' ? i : 0);

        if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) return null;

        const boardChar = tempBoard[r][c].toLowerCase();
        const wordChar = word[i];

        if (boardChar !== '') {
            if (boardChar !== wordChar) return null;
            mainWordUsesExistingLetter = true;
        } else {
            const handIndex = workingHand.indexOf(wordChar);
            if (handIndex !== -1) {
                workingHand.splice(handIndex, 1);
            } else {
                const jokerIndex = workingHand.indexOf('*');
                if (jokerIndex !== -1) {
                    workingHand.splice(jokerIndex, 1);
                } else {
                    return null;
                }
            }
            tempBoard[r][c] = wordChar.toUpperCase();
            lettersPlacedByPlayer.push({ r: r, c: c, char: wordChar });

            if (r === 7 && c === 7) {
                centerStarUsedByNewTile = true;
            }
        }
    }

    if (lettersPlacedByPlayer.length === 0) return null;

    let boardIsCurrentlyEmpty = currentBoardState.every(row => row.every(cell => cell === ''));

    if (boardIsCurrentlyEmpty) {
        if (!centerStarUsedByNewTile) return null;
    } else {
        let connected = mainWordUsesExistingLetter;
        if (!connected) {
            for (const { r, c } of lettersPlacedByPlayer) {
                const neighbors = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
                for (const [nr, nc] of neighbors) {
                    if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && currentBoardState[nr][nc] !== '') {
                        connected = true;
                        break;
                    }
                }
                if (connected) break;
            }
        }
        if (!connected) return null;
    }

    let totalScore = 0;

    const { startR: mainStartR, startC: mainStartC, endR: mainEndR, endC: mainEndC } = findWordExtent(tempBoard, startRow, startCol, direction);
    const mainWordScored = scoreBoardWord(tempBoard, mainStartR, mainStartC, mainEndR, mainEndC, direction, lettersPlacedByPlayer);

    if (!frenchDictionary.includes(mainWordScored.word)) {
        return null;
    }
    totalScore += mainWordScored.score;

    for (const { r, c } of lettersPlacedByPlayer) {
        const perpDirection = direction === 'horizontal' ? 'vertical' : 'horizontal';

        const { startR: perpStartR, startC: perpStartC, endR: perpEndR, endC: perpEndC } = findWordExtent(tempBoard, r, c, perpDirection);

        const perpLength = (perpDirection === 'horizontal' ? (perpEndC - perpStartC + 1) : (perpEndR - perpStartR + 1));

        if (perpLength > 1) {
            const perpWordScored = scoreBoardWord(tempBoard, perpStartR, perpStartC, perpEndR, perpEndC, perpDirection, lettersPlacedByPlayer);

            if (!frenchDictionary.includes(perpWordScored.word)) {
                return null;
            }
            totalScore += perpWordScored.score;
        }
    }

    totalScore *= mainWordScored.wordMultiplier;

    if (lettersPlacedByPlayer.length === 7) {
        totalScore += 50;
    }

    return totalScore;
}


function initializeBoard() {
    scrabbleBoardDiv.innerHTML = '';

    const topLeftCell = document.createElement('div');
    topLeftCell.className = 'header-cell';
    scrabbleBoardDiv.appendChild(topLeftCell);

    for (let j = 0; j < BOARD_SIZE; j++) {
        const headerCell = document.createElement('div');
        headerCell.className = 'header-cell';
        headerCell.textContent = columnLetters[j];
        scrabbleBoardDiv.appendChild(headerCell);
    }

    for (let i = 0; i < BOARD_SIZE; i++) {
        const rowHeaderCell = document.createElement('div');
        rowHeaderCell.className = 'header-cell';
        rowHeaderCell.textContent = i + 1;
        scrabbleBoardDiv.appendChild(rowHeaderCell);

        for (let j = 0; j < BOARD_SIZE; j++) {
            const cell = document.createElement('div');
            cell.dataset.row = i;
            cell.dataset.col = j;
            const squareType = specialSquares[`${i},${j}`] || 'normal';
            cell.className = `board-cell ${squareType}`;

            const input = document.createElement('input');
            input.type = 'text';
            input.maxLength = 1;
            input.value = boardState[i][j];
            input.oninput = (e) => {
                e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '');
                boardState[i][j] = e.target.value;
                if (e.target.value) {
                    cell.classList.add('has-letter');
                } else {
                    cell.classList.remove('has-letter');
                }
                clearHighlights();
            };
            if (boardState[i][j]) {
                cell.classList.add('has-letter');
            }
            cell.appendChild(input);
            scrabbleBoardDiv.appendChild(cell);
        }
    }
}

function clearBoard() {
    boardState = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(''));
    initializeBoard();
    clearHighlights();
}

function applyHighlightToBoard(placement) {
    clearHighlights();
    if (!scrabbleBoardDiv) return;

    const { word, startRow, startCol, direction } = placement;

    for (let i = 0; i < word.length; i++) {
        const r = startRow + (direction === 'vertical' ? i : 0);
        const c = startCol + (direction === 'horizontal' ? i : 0);

        const cellElement = scrabbleBoardDiv.children[(r + 1) * (BOARD_SIZE + 1) + (c + 1)];
        if (cellElement) {
            cellElement.classList.add('highlight-best-word');
        }
    }
}

function clearHighlights() {
    if (scrabbleBoardDiv) {
        document.querySelectorAll('.highlight-best-word').forEach(cell => {
            cell.classList.remove('highlight-best-word');
        });
    }
}

function performSave() {
    let filename = saveFilenameInput.value.trim();
    if (filename === "") {
        filename = "scrabble_board";
    }
    filename = filename.replace(/[^a-zA-Z0-9-_]/g, '') + '.json';

    const dataStr = JSON.stringify(boardState);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    hideSaveModal();
}

function showSaveModal() {
    saveFilenameInput.value = "scrabble_board";
    saveModal.classList.remove('hidden');
    saveFilenameInput.focus();
}

function hideSaveModal() {
    saveModal.classList.add('hidden');
}

function loadBoard(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const loadedData = JSON.parse(e.target.result);
            if (Array.isArray(loadedData) && loadedData.length === BOARD_SIZE && loadedData.every(row => Array.isArray(row) && row.length === BOARD_SIZE)) {
                boardState = loadedData.map(row => row.map(cell => typeof cell === 'string' ? cell.toUpperCase() : ''));
                initializeBoard();
                hideError();
            } else {
                showError("Fichier JSON invalide. Le format du plateau est incorrect.");
            }
        } catch (err) {
            showError("Erreur lors de la lecture du fichier. Assurez-vous que c'est un fichier JSON valide.");
        }
    };
    reader.readAsText(file);
}

// =================================================================
// NOUVELLE FONCTION DE CALCUL (le "Moteur")
// =================================================================

async function findBestMoves(currentBoardState, playerHand) {
    const allPossibleWordsFromHand = [];

    await new Promise(resolve => setTimeout(() => {
        for (let word of frenchDictionary) {
            if (word.length >= 2 && word.length <= 7 && canFormWord(word, playerHand)) {
                allPossibleWordsFromHand.push(word);
            }
        }
        resolve();
    }, 10));

    const bestPlacements = [];

    await new Promise(resolve => setTimeout(() => {
        const directions = ['horizontal', 'vertical'];

        for (const word of allPossibleWordsFromHand) {
            for (let r = 0; r < BOARD_SIZE; r++) {
                for (let c = 0; c < BOARD_SIZE; c++) {
                    for (const direction of directions) {
                        const totalMoveScore = calculateFullMoveScore(word, r, c, direction, currentBoardState, playerHand);
                        if (totalMoveScore !== null) {
                            bestPlacements.push({
                                word: word,
                                score: totalMoveScore,
                                startRow: r,
                                startCol: c,
                                direction: direction
                            });
                        }
                    }
                }
            }
        }
        resolve();
    }, 10));

    bestPlacements.sort((a, b) => b.score - a.score);
    return bestPlacements;
}

// =================================================================
// INITIALISATION DE LA PAGE (pour ton site index.html)
// =================================================================

// On vérifie si on est dans l'iFrame ou sur le site principal
const isNotInIframe = (window.self === window.top);

if (isNotInIframe) {
    document.addEventListener('DOMContentLoaded', () => {
        initializeBoard();
        loadDictionary();

        findWordsBtn.addEventListener('click', async () => {
            hideError();
            clearHighlights();
            const inputLetters = lettersInput.value.trim();

            if (inputLetters.length === 0) {
                showError("Veuillez entrer au moins une lettre ou un joker dans votre main.");
                resultsDiv.innerHTML = '<p class="text-center text-gray-400">Les suggestions de placement et de score apparaîtront ici.</p>';
                return;
            }

            if (frenchDictionary.length === 0) {
                showError("Le dictionnaire n'est pas encore chargé. Veuillez patienter un instant ou rafraîchir la page.");
                return;
            }

            loadingDiv.classList.remove('hidden');
            loadingMessageSpan.textContent = "Recherche des mots possibles à partir de votre main...";
            resultsDiv.innerHTML = '';
            findWordsBtn.disabled = true;
            lettersInput.disabled = true;

            // Appel de la nouvelle fonction "Moteur"
            const bestPlacements = await findBestMoves(boardState, inputLetters);

            loadingMessageSpan.textContent = `Simulation terminée...`;
            loadingDiv.classList.add('hidden');
            findWordsBtn.disabled = false;
            lettersInput.disabled = false;

            if (bestPlacements.length > 0) {
                const ul = document.createElement('ul');
                ul.className = 'list-disc list-inside text-left space-y-1';
                const displayLimit = Math.min(bestPlacements.length, 50);
                for (let i = 0; i < displayLimit; i++) {
                    const item = bestPlacements[i];
                    const li = document.createElement('li');
                    const directionText = item.direction === 'horizontal' ? 'HORIZ' : 'VERT';
                    const displayRow = item.startRow + 1;
                    const displayColLetter = columnLetters[item.startCol];
                    li.innerHTML = `<span class="font-bold text-purple-400">${item.word.toUpperCase()}</span> - <span class="font-extrabold text-green-400">${item.score}</span> points <br> (<span class="text-gray-400">Position: ${displayColLetter}${displayRow} | Direction: ${directionText}</span>)`;
                    ul.appendChild(li);
                }
                resultsDiv.appendChild(ul);

                if (bestPlacements.length > displayLimit) {
                    const moreText = document.createElement('p');
                    moreText.className = 'text-center text-gray-500 mt-2 text-sm';
                    moreText.textContent = `... et ${bestPlacements.length - displayLimit} autres placements.`;
                    resultsDiv.appendChild(moreText);
                }

                applyHighlightToBoard(bestPlacements[0]);
            } else {
                resultsDiv.innerHTML = '<p class="text-center text-gray-400">Aucun placement valide trouvé avec vos lettres sur le plateau actuel.</p>';
            }
        });

        lettersInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                findWordsBtn.click();
            }
        });

        clearBoardBtn.addEventListener('click', clearBoard);
        saveBoardBtn.addEventListener('click', showSaveModal);
        loadBoardBtn.addEventListener('click', () => loadBoardInput.click());
        loadBoardInput.addEventListener('change', loadBoard);

        cancelSaveBtn.addEventListener('click', hideSaveModal);
        confirmSaveBtn.addEventListener('click', performSave);
        saveFilenameInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                performSave();
            }
        });
    });
} else {
    // =================================================================
    // MODE IFRAME (pour Tampermonkey)
    // =================================================================
    
    // Charger le dictionnaire dès que possible
    document.addEventListener('DOMContentLoaded', () => {
        loadDictionary();
    });

    // Écouter les messages venant du script Tampermonkey
    window.addEventListener('message', async (event) => {
        // La sécurité est gérée par le script Tampermonkey qui vérifie l'origine
        // de la *réponse*. L'iFrame répond simplement à toute demande.
        
        if (event.data && event.data.type === 'CALCULATE_MOVE') {
            const { board, letters } = event.data.data;

            if (frenchDictionary.length === 0) {
                 event.source.postMessage({ type: 'CALCULATION_ERROR', error: 'Dictionnaire pas encore chargé.' }, event.origin);
                 return;
            }
            
            // Appel de la nouvelle fonction "Moteur"
            const bestPlacements = await findBestMoves(board, letters);

            // Renvoyer la réponse au script Tampermonkey
            event.source.postMessage({ type: 'CALCULATION_COMPLETE', results: bestPlacements }, event.origin);
        }
    });