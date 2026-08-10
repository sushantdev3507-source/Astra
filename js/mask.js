

const maskType =
document.getElementById("maskType");

const applyMaskBtn =
document.getElementById("applyMask");

const removeMaskBtn =
document.getElementById("removeMask");



function isMaskCanvasReady() {

    return (
        typeof canvas !== "undefined" &&
        canvas &&
        typeof canvas.getActiveObject ===
            "function"
    );

}



function isMaskFabricReady() {

    return (
        typeof fabric !== "undefined" &&
        fabric.Circle &&
        fabric.Rect
    );

}



function getActiveMaskImage() {

    if (!isMaskCanvasReady()) {

        return null;

    }

    const object =
        canvas.getActiveObject();

    if (!object) {

        return null;

    }

    if (object.type !== "image") {

        return null;

    }

    return object;

}



function saveMaskHistory() {

    if (
        typeof saveHistory ===
        "function"
    ) {

        saveHistory();

    }

}



function autoSaveMaskProject() {

    if (
        typeof autoSaveProject ===
        "function"
    ) {

        autoSaveProject();

    }

}



function getImageDimensions(image) {

    const width =
        Math.max(
            1,
            image.width || 1
        );

    const height =
        Math.max(
            1,
            image.height || 1
        );

    return {

        width,
        height

    };

}



function createCircleMask(image) {

    const dimensions =
        getImageDimensions(image);

    const size =
        Math.min(
            dimensions.width,
            dimensions.height
        );

    return new fabric.Circle({

        radius: size / 2,

        originX: "center",
        originY: "center",

        left: 0,
        top: 0

    });

}


function createRectangleMask(image) {

    const dimensions =
        getImageDimensions(image);

    return new fabric.Rect({

        width:
            dimensions.width,

        height:
            dimensions.height,

        originX: "center",
        originY: "center",

        left: 0,
        top: 0

    });

}



function createRoundedMask(image) {

    const dimensions =
        getImageDimensions(image);

    const radius =
        Math.min(
            dimensions.width,
            dimensions.height
        ) * 0.10;

    return new fabric.Rect({

        width:
            dimensions.width,

        height:
            dimensions.height,

        rx: radius,
        ry: radius,

        originX: "center",
        originY: "center",

        left: 0,
        top: 0

    });

}



function createMask(
    image,
    type
) {

    switch (type) {

        case "circle":

            return createCircleMask(
                image
            );

        case "rectangle":

            return createRectangleMask(
                image
            );

        case "rounded":

            return createRoundedMask(
                image
            );

        default:

            return null;

    }

}



function applyMask() {

    if (!isMaskCanvasReady()) {

        alert(
            "Canvas is not ready."
        );

        return;

    }

    if (!isMaskFabricReady()) {

        alert(
            "Fabric.js is not ready."
        );

        return;

    }

    const image =
        getActiveMaskImage();

    if (!image) {

        alert(
            "Please select an image first."
        );

        return;

    }

    if (!maskType) {

        console.error(
            "ASTRA: #maskType not found."
        );

        return;

    }

    const type =
        maskType.value;

    if (!type) {

        alert(
            "Please select a mask type."
        );

        return;

    }

    const mask =
        createMask(
            image,
            type
        );

    if (!mask) {

        alert(
            "Unsupported mask type."
        );

        return;

    }

    image.clipPath =
        mask;

    image.setCoords();

    canvas.requestRenderAll();

    saveMaskHistory();

    autoSaveMaskProject();

    console.log(
        `ASTRA: ${type} mask applied.`
    );

}



function removeMask() {

    if (!isMaskCanvasReady()) {

        alert(
            "Canvas is not ready."
        );

        return;

    }

    const image =
        getActiveMaskImage();

    if (!image) {

        alert(
            "Please select an image first."
        );

        return;

    }

    image.clipPath = null;

    image.setCoords();

    canvas.requestRenderAll();

    saveMaskHistory();

    autoSaveMaskProject();

    console.log(
        "ASTRA: Image mask removed."
    );

}


if (applyMaskBtn) {

    applyMaskBtn.addEventListener(
        "click",
        applyMask
    );

}



if (removeMaskBtn) {

    removeMaskBtn.addEventListener(
        "click",
        removeMask
    );

}



console.log(
    "ASTRA: Mask Tools Loaded Successfully."
);