const applyShadowBtn =
    document.getElementById("applyShadow");

const removeShadowBtn =
    document.getElementById("removeShadow");

const shadowColor =
    document.getElementById("shadowColor");

const shadowBlur =
    document.getElementById("shadowBlur");

const shadowOffsetX =
    document.getElementById("shadowOffsetX");

const shadowOffsetY =
    document.getElementById("shadowOffsetY");

const enableShadow =
    document.getElementById("enableShadow");



function isShadowCanvasReady() {

    return (
        typeof canvas !== "undefined" &&
        canvas &&
        typeof canvas.getActiveObject ===
            "function"
    );

}



function saveShadowHistory() {

    

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



function autoSaveShadowProject() {

    if (
        typeof autoSaveProject ===
        "function"
    ) {

        autoSaveProject();

    }

}



function getShadowSettings() {

    const color =
        shadowColor?.value ||
        "#000000";


    let blur =
        Number(
            shadowBlur?.value
        );


    let offsetX =
        Number(
            shadowOffsetX?.value
        );


    let offsetY =
        Number(
            shadowOffsetY?.value
        );


    

    if (
        !Number.isFinite(blur)
    ) {

        blur = 10;

    }


    if (
        !Number.isFinite(offsetX)
    ) {

        offsetX = 5;

    }


    if (
        !Number.isFinite(offsetY)
    ) {

        offsetY = 5;

    }


    

    blur =
        Math.max(
            0,
            blur
        );


    return {

        color,

        blur,

        offsetX,

        offsetY

    };

}



function applyShadow() {

    

    if (
        !isShadowCanvasReady()
    ) {

        console.error(
            "ASTRA: Canvas is not ready."
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
        getShadowSettings();


    

    const shadow =
        new fabric.Shadow({

            color:
                settings.color,

            blur:
                settings.blur,

            offsetX:
                settings.offsetX,

            offsetY:
                settings.offsetY

        });


    

    object.set({

        shadow:
            shadow

    });


    object.setCoords();

    canvas.requestRenderAll();


    
    saveShadowHistory();

    autoSaveShadowProject();


    console.log(
        "ASTRA: Shadow applied successfully."
    );

}



function removeShadow() {

    if (
        !isShadowCanvasReady()
    ) {

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


    

    saveShadowHistory();

    autoSaveShadowProject();


    console.log(
        "ASTRA: Shadow removed successfully."
    );

}



if (applyShadowBtn) {

    applyShadowBtn.addEventListener(
        "click",
        applyShadow
    );

}



if (removeShadowBtn) {

    removeShadowBtn.addEventListener(
        "click",
        removeShadow
    );

}



if (shadowColor) {

    shadowColor.addEventListener(
        "input",
        () => {

            if (
                enableShadow &&
                enableShadow.checked
            ) {

                applyShadow();

            }

        }
    );

}



if (shadowBlur) {

    shadowBlur.addEventListener(
        "input",
        () => {

            if (
                enableShadow &&
                enableShadow.checked
            ) {

                applyShadow();

            }

        }
    );

}



if (shadowOffsetX) {

    shadowOffsetX.addEventListener(
        "input",
        () => {

            if (
                enableShadow &&
                enableShadow.checked
            ) {

                applyShadow();

            }

        }
    );

}



if (shadowOffsetY) {

    shadowOffsetY.addEventListener(
        "input",
        () => {

            if (
                enableShadow &&
                enableShadow.checked
            ) {

                applyShadow();

            }

        }
    );

}



if (enableShadow) {

    enableShadow.addEventListener(
        "change",
        function () {

            if (this.checked) {

                applyShadow();

            } else {

                removeShadow();

            }

        }
    );

}



console.log(
    "ASTRA: Shadow Tools Loaded Successfully."
);