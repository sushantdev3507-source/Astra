
const MAX_HISTORY_STEPS = 50;

const history = {
    undoStack: [],
    redoStack: []
};

let isRestoringHistory = false;
let isSavingHistory = false;

function isHistoryCanvasReady() {

    return (
        typeof canvas !== "undefined" &&
        canvas &&
        typeof canvas.toJSON === "function" &&
        typeof canvas.loadFromJSON === "function"
    );

}

function getCanvasState() {

    if (!isHistoryCanvasReady()) {
        return null;
    }

    try {

        return JSON.stringify(
            canvas.toJSON()
        );

    } catch (error) {

        console.error(
            "ASTRA: Unable to save canvas state.",
            error
        );

        return null;

    }

}

function saveHistory() {

    if (isRestoringHistory) {
        return;
    }

    if (isSavingHistory) {
        return;
    }

    if (!isHistoryCanvasReady()) {
        return;
    }

    isSavingHistory = true;

    try {

        const currentState =
            getCanvasState();

        if (!currentState) {
            return;
        }

        const lastState =
            history.undoStack[
                history.undoStack.length - 1
            ];

        if (lastState === currentState) {
            return;
        }

        history.undoStack.push(
            currentState
        );

        if (
            history.undoStack.length >
            MAX_HISTORY_STEPS
        ) {

            history.undoStack.shift();

        }

        history.redoStack = [];

        updateHistoryButtons();

    } finally {

        isSavingHistory = false;

    }

}

function restoreCanvasState(
    state,
    callback
) {

    if (
        !state ||
        !isHistoryCanvasReady()
    ) {

        return;

    }

    isRestoringHistory = true;

    try {

        canvas.loadFromJSON(
            state,
            () => {

                canvas.requestRenderAll();

                isRestoringHistory = false;

                updateHistoryButtons();

                if (
                    typeof callback ===
                    "function"
                ) {

                    callback();

                }

            }
        );

    } catch (error) {

        isRestoringHistory = false;

        console.error(
            "ASTRA: Unable to restore history state.",
            error
        );

    }

}

function undo() {

    if (
        history.undoStack.length <= 1
    ) {

        return;

    }

    if (isRestoringHistory) {
        return;
    }

    const currentState =
        history.undoStack.pop();

    history.redoStack.push(
        currentState
    );

    const previousState =
        history.undoStack[
            history.undoStack.length - 1
        ];

    restoreCanvasState(
        previousState
    );

    console.log(
        "ASTRA: Undo"
    );

}

function redo() {

    if (
        history.redoStack.length === 0
    ) {

        return;

    }

    if (isRestoringHistory) {
        return;
    }

    const nextState =
        history.redoStack.pop();

    history.undoStack.push(
        nextState
    );

    restoreCanvasState(
        nextState
    );

    console.log(
        "ASTRA: Redo"
    );

}

const undoBtn =
document.getElementById("undoBtn");

if (undoBtn) {

    undoBtn.addEventListener(
        "click",
        undo
    );

}

const redoBtn =
document.getElementById("redoBtn");

if (redoBtn) {

    redoBtn.addEventListener(
        "click",
        redo
    );

}

document.addEventListener(
    "keydown",
    event => {

        const target =
            event.target;

        const isTyping =
            target &&
            (
                target.tagName === "INPUT" ||
                target.tagName === "TEXTAREA" ||
                target.tagName === "SELECT" ||
                target.isContentEditable
            );

        if (
            event.ctrlKey &&
            !event.shiftKey &&
            event.key.toLowerCase() === "z"
        ) {

            if (isTyping) {
                return;
            }

            event.preventDefault();

            undo();

            return;

        }

        if (
            event.ctrlKey &&
            event.shiftKey &&
            event.key.toLowerCase() === "z"
        ) {

            if (isTyping) {
                return;
            }

            event.preventDefault();

            redo();

            return;

        }

        if (
            event.ctrlKey &&
            !event.shiftKey &&
            event.key.toLowerCase() === "y"
        ) {

            if (isTyping) {
                return;
            }

            event.preventDefault();

            redo();

        }

    }
);

function clearHistory() {

    history.undoStack = [];
    history.redoStack = [];

    const currentState =
        getCanvasState();

    if (currentState) {

        history.undoStack.push(
            currentState
        );

    }

    updateHistoryButtons();

    console.log(
        "ASTRA: History cleared."
    );

}

function updateHistoryButtons() {

    if (undoBtn) {

        undoBtn.disabled =
            history.undoStack.length <= 1;

    }

    if (redoBtn) {

        redoBtn.disabled =
            history.redoStack.length === 0;

    }

}

function initializeHistory() {

    if (!isHistoryCanvasReady()) {
        return;
    }

    history.undoStack = [];
    history.redoStack = [];

    const initialState =
        getCanvasState();

    if (initialState) {

        history.undoStack.push(
            initialState
        );

    }

    updateHistoryButtons();

    console.log(
        "ASTRA: History initialized."
    );

}

if (isHistoryCanvasReady()) {

    canvas.on(
        "object:added",
        () => {

            saveHistory();

        }
    );

    canvas.on(
        "object:modified",
        () => {

            saveHistory();

        }
    );

    canvas.on(
        "object:removed",
        () => {

            saveHistory();

        }
    );

}

initializeHistory();

console.log(
    "ASTRA: History System Loaded Successfully."
);