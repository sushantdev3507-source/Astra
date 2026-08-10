

const glowBtn =
    document.getElementById("applyGlow");

const removeGlowBtn =
    document.getElementById("removeGlow");

const glowColor =
    document.getElementById("glowColor");

const glowBlur =
    document.getElementById("glowBlur");

const enableGlow =
    document.getElementById("enableGlow");




function isGlowCanvasReady() {

    return (
        typeof canvas !== "undefined" &&
        canvas &&
        typeof canvas.getActiveObject ===
            "function"
    );

}




function saveGlowHistory() {

    if (
        typeof saveHistory ===
        "function"
    ) {

        saveHistory();

        return;

    }

    if (
        typeof saveState ===
        "function"
    ) {

        saveState();

    }

}




function autoSaveGlowProject() {

    if (
        typeof autoSaveProject ===
        "function"
    ) {

        autoSaveProject();

    }

}




function getGlowSettings() {

    const color =
        glowColor?.value ||
        "#000000";

    let blur =
        Number(
            glowBlur?.value
        );

    if (
        !Number.isFinite(blur)
    ) {

        blur = 20;

    }

    blur =
        Math.max(
            0,
            blur
        );

    return {

        color,
        blur

    };

}




function createGlow() {

    if (!isGlowCanvasReady()) {

        console.error(
            "ASTRA: Canvas is not available."
        );

        return;

    }

    if (
        typeof fabric === "undefined" ||
        !fabric.Shadow
    ) {

        console.error(
            "ASTRA: Fabric.Shadow is not available."
        );

        return;

    }

    const object =
        canvas.getActiveObject();

    if (!object) {

        alert(
            "Please select an object first."
        );

        return;

    }

    const settings =
        getGlowSettings();

    const glow =
        new fabric.Shadow({

            color:
                settings.color,

            blur:
                settings.blur,

            offsetX: 0,

            offsetY: 0

        });

    object.set({
        shadow: glow
    });

    object.setCoords();

    canvas.requestRenderAll();

    saveGlowHistory();

    autoSaveGlowProject();

    console.log(
        "ASTRA: Glow applied successfully."
    );

}




function removeGlow() {

    if (!isGlowCanvasReady()) {

        return;

    }

    const object =
        canvas.getActiveObject();

    if (!object) {

        return;

    }

    object.set({
        shadow: null
    });

    object.setCoords();

    canvas.requestRenderAll();

    saveGlowHistory();

    autoSaveGlowProject();

    console.log(
        "ASTRA: Glow removed successfully."
    );

}


if (glowBtn) {

    glowBtn.addEventListener(
        "click",
        createGlow
    );

}



if (removeGlowBtn) {

    removeGlowBtn.addEventListener(
        "click",
        removeGlow
    );

}




if (glowColor) {

    glowColor.addEventListener(
        "input",
        () => {

            if (
                enableGlow &&
                enableGlow.checked
            ) {

                createGlow();

            }

        }
    );

}




if (glowBlur) {

    glowBlur.addEventListener(
        "input",
        () => {

            if (
                enableGlow &&
                enableGlow.checked
            ) {

                createGlow();

            }

        }
    );

}



if (enableGlow) {

    enableGlow.addEventListener(
        "change",
        function () {

            if (this.checked) {

                createGlow();

            } else {

                removeGlow();

            }

        }
    );

}




console.log(
    "ASTRA: Glow Tools Loaded Successfully."
);

