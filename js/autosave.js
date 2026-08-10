const AUTO_SAVE_KEY =
"ASTRA_AUTOSAVE";

const AUTO_SAVE_INTERVAL =
10000; 



let autoSaveTimer = null;

let isRestoringAutoSave = false;

let autoSavePending = false;



function isAutoSaveCanvasReady() {

    return (
        typeof canvas !== "undefined" &&
        canvas &&
        typeof canvas.toJSON ===
            "function"
    );

}



function autoSaveProject() {

    

    if (
        isRestoringAutoSave
    ) {

        return;

    }

    if (
        !isAutoSaveCanvasReady()
    ) {

        return;

    }

    try {

        const projectData = {

            version: "1.0",

            application:
                "ASTRA Photo Editor",

            savedAt:
                new Date().toISOString(),

            canvas:
                canvas.toJSON()

        };

        const data =
            JSON.stringify(
                projectData
            );

        localStorage.setItem(
            AUTO_SAVE_KEY,
            data
        );

        autoSavePending =
            false;

    }
    catch (error) {

        console.error(
            "ASTRA AutoSave Error:",
            error
        );

        

        if (
            error.name ===
            "QuotaExceededError"
        ) {

            console.warn(
                "ASTRA: Auto-save storage limit reached."
            );

        }

    }

}


function scheduleAutoSave() {

    

    autoSavePending =
        true;

    if (autoSaveTimer) {

        clearTimeout(
            autoSaveTimer
        );

    }

    autoSaveTimer =
        setTimeout(
            function () {

                autoSaveProject();

            },
            500
        );

}



setInterval(
    function () {

        if (
            autoSavePending
        ) {

            autoSaveProject();

        }

    },
    AUTO_SAVE_INTERVAL
);


if (
    typeof canvas !== "undefined" &&
    canvas
) {

    canvas.on(
        "object:added",
        function () {

            scheduleAutoSave();

        }
    );

    canvas.on(
        "object:modified",
        function () {

            scheduleAutoSave();

        }
    );

    canvas.on(
        "object:removed",
        function () {

            scheduleAutoSave();

        }
    );

    

    canvas.on(
        "path:created",
        function () {

            scheduleAutoSave();

        }
    );

}


function restoreAutoSavedProject() {

    if (
        !isAutoSaveCanvasReady()
    ) {

        return;

    }

    const savedProject =
        localStorage.getItem(
            AUTO_SAVE_KEY
        );

    if (!savedProject) {

        return;

    }

    let project;

    try {

        project =
            JSON.parse(
                savedProject
            );

    }
    catch (error) {

        console.error(
            "ASTRA Recovery Parse Error:",
            error
        );

        clearAutoSave();

        return;

    }

    const restore =
        confirm(
            "Recovered project found.\n\nDo you want to restore it?"
        );

    if (!restore) {

        return;

    }

    isRestoringAutoSave =
        true;

    

    const canvasJSON =
        project.canvas ||
        project;

    canvas.loadFromJSON(
        canvasJSON,
        function () {

            canvas.renderAll();

            

            if (
                typeof refreshLayers ===
                "function"
            ) {

                refreshLayers();

            }

            

            if (
                typeof refreshPages ===
                "function"
            ) {

                refreshPages();

            }

            

            if (
                typeof clearHistory ===
                "function"
            ) {

                clearHistory();

            }
            else if (
                typeof saveHistory ===
                "function"
            ) {

                saveHistory();

            }

            isRestoringAutoSave =
                false;

            autoSavePending =
                false;

            console.log(
                "ASTRA: Recovery restored successfully."
            );

        }
    );

}


function initializeAutoSave() {

    if (
        !isAutoSaveCanvasReady()
    ) {

        /*
         * Canvas may be initialized
         * slightly after DOM load.
         */

        setTimeout(
            initializeAutoSave,
            300
        );

        return;

    }

    restoreAutoSavedProject();

}



if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeAutoSave
    );

}
else {

    initializeAutoSave();

}


function clearAutoSave() {

    try {

        localStorage.removeItem(
            AUTO_SAVE_KEY
        );

        autoSavePending =
            false;

        console.log(
            "ASTRA: Auto-save cleared."
        );

    }
    catch (error) {

        console.error(
            "ASTRA Clear AutoSave Error:",
            error
        );

    }

}


const clearRecoveryBtn =
    document.getElementById(
        "clearRecovery"
    );

if (clearRecoveryBtn) {

    clearRecoveryBtn.addEventListener(
        "click",
        function () {

            const confirmed =
                confirm(
                    "Delete saved recovery project?"
                );

            if (!confirmed) {

                return;

            }

            clearAutoSave();

            alert(
                "Recovery deleted successfully."
            );

        }
    );

}


document.addEventListener(
    "visibilitychange",
    function () {

        if (
            document.visibilityState ===
            "hidden"
        ) {

            if (
                autoSavePending
            ) {

                autoSaveProject();

            }

        }

    }
);



console.log(
    "ASTRA: AutoSave System Loaded Successfully."
);