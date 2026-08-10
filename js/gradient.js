

const gradientBtn =
document.getElementById("applyGradient");

const gradientType =
document.getElementById("gradientType");

const gradientColor1 =
document.getElementById("gradientColor1");

const gradientColor2 =
document.getElementById("gradientColor2");

const gradientAngle =
document.getElementById("gradientAngle");

function isGradientCanvasReady() {

    return (
        typeof canvas !== "undefined" &&
        canvas &&
        typeof canvas.getActiveObject === "function"
    );

}

function saveGradientHistory() {

    if (typeof saveHistory === "function") {
        saveHistory();
    }

}

function autoSaveGradientProject() {

    if (
        typeof autoSaveProject === "function"
    ) {

        autoSaveProject();

    }

}

function getGradientSettings() {

    const type =
        gradientType?.value || "linear";

    const color1 =
        gradientColor1?.value || "#000000";

    const color2 =
        gradientColor2?.value || "#ffffff";

    let angle =
        Number(
            gradientAngle?.value
        );

    if (!Number.isFinite(angle)) {
        angle = 0;
    }

    angle =
        ((angle % 360) + 360) % 360;

    return {
        type,
        color1,
        color2,
        angle
    };

}

function canApplyGradient(object) {

    if (!object) {
        return false;
    }

    return (
        "fill" in object ||
        object.type === "group"
    );

}

function getGradientDimensions(object) {

    const width =
        Math.max(
            1,
            object.getScaledWidth
                ? object.getScaledWidth()
                : object.width || 1
        );

    const height =
        Math.max(
            1,
            object.getScaledHeight
                ? object.getScaledHeight()
                : object.height || 1
        );

    return {
        width,
        height
    };

}

function createLinearGradient(
    object,
    color1,
    color2,
    angle
) {

    const dimensions =
        getGradientDimensions(object);

    const width =
        dimensions.width;

    const height =
        dimensions.height;

    const radians =
        angle * Math.PI / 180;

    const centerX =
        width / 2;

    const centerY =
        height / 2;

    const halfWidth =
        Math.abs(
            Math.cos(radians) *
            width / 2
        );

    const halfHeight =
        Math.abs(
            Math.sin(radians) *
            height / 2
        );

    const x1 =
        centerX -
        Math.cos(radians) *
        Math.max(
            halfWidth,
            halfHeight,
            1
        );

    const y1 =
        centerY -
        Math.sin(radians) *
        Math.max(
            halfWidth,
            halfHeight,
            1
        );

    const x2 =
        centerX +
        Math.cos(radians) *
        Math.max(
            halfWidth,
            halfHeight,
            1
        );

    const y2 =
        centerY +
        Math.sin(radians) *
        Math.max(
            halfWidth,
            halfHeight,
            1
        );

    return new fabric.Gradient({

        type: "linear",

        gradientUnits: "pixels",

        coords: {
            x1,
            y1,
            x2,
            y2
        },

        colorStops: [
            {
                offset: 0,
                color: color1
            },
            {
                offset: 1,
                color: color2
            }
        ]

    });

}

function createRadialGradient(
    object,
    color1,
    color2
) {

    const dimensions =
        getGradientDimensions(object);

    const width =
        dimensions.width;

    const height =
        dimensions.height;

    const centerX =
        width / 2;

    const centerY =
        height / 2;

    const radius =
        Math.sqrt(
            (
                width * width +
                height * height
            )
        ) / 2;

    return new fabric.Gradient({

        type: "radial",

        gradientUnits: "pixels",

        coords: {
            x1: centerX,
            y1: centerY,
            r1: 0,
            x2: centerX,
            y2: centerY,
            r2: radius
        },

        colorStops: [
            {
                offset: 0,
                color: color1
            },
            {
                offset: 1,
                color: color2
            }
        ]

    });

}

function applyGradient() {

    if (!isGradientCanvasReady()) {

        console.error(
            "ASTRA: Canvas is not available."
        );

        return;

    }

    if (
        typeof fabric === "undefined" ||
        !fabric.Gradient
    ) {

        console.error(
            "ASTRA: Fabric.Gradient is not available."
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

    if (!canApplyGradient(object)) {

        alert(
            "Gradient cannot be applied to this object."
        );

        return;

    }

    const settings =
        getGradientSettings();

    let gradient = null;

    if (
        settings.type === "radial"
    ) {

        gradient =
            createRadialGradient(
                object,
                settings.color1,
                settings.color2
            );

    } else {

        gradient =
            createLinearGradient(
                object,
                settings.color1,
                settings.color2,
                settings.angle
            );

    }

    if (!gradient) {

        console.error(
            "ASTRA: Unable to create gradient."
        );

        return;

    }

    if (
        object.type !== "group"
    ) {

        object.set({
            fill: gradient
        });

    } else if (
        typeof object.getObjects ===
        "function"
    ) {

        object.getObjects().forEach(
            child => {

                if (
                    "fill" in child
                ) {

                    child.set({
                        fill: gradient
                    });

                }

            }
        );

    }

    object.setCoords();

    canvas.requestRenderAll();

    saveGradientHistory();

    autoSaveGradientProject();

    console.log(
        "ASTRA: Gradient applied successfully."
    );

}

if (gradientBtn) {

    gradientBtn.addEventListener(
        "click",
        applyGradient
    );

}

console.log(
    "ASTRA: Gradient Tools Loaded Successfully."
);

