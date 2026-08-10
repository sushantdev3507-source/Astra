

const imageInput = document.getElementById("imageInput");
const uploadBtn = document.getElementById("uploadImage");
const replaceBtn = document.getElementById("replaceImage");
const duplicateBtn = document.getElementById("duplicateImage");
const deleteBtn = document.getElementById("deleteImage");
const fitCanvasBtn = document.getElementById("fitCanvas");
const backgroundBtn = document.getElementById("setBackground");



if (typeof canvas === "undefined" || !canvas) {
    console.error("ASTRA: Fabric canvas is not available.");
}



if (!imageInput) {
    console.error("ASTRA: #imageInput not found.");
}



function saveImageHistory() {

    if (typeof saveHistory === "function") {
        saveHistory();
    }

}



if (uploadBtn && imageInput) {

    uploadBtn.addEventListener("click", () => {

        imageInput.value = "";
        imageInput.click();

    });

}



function loadImageFromFile(file, callback) {

    if (!file) {
        return;
    }

    if (!file.type || !file.type.startsWith("image/")) {

        alert("Please select a valid image file.");
        return;

    }

    const reader = new FileReader();

    reader.onload = function (event) {

        if (
            typeof fabric === "undefined" ||
            !fabric.Image
        ) {

            console.error(
                "ASTRA: Fabric.js Image module is not available."
            );

            return;

        }

        fabric.Image.fromURL(
            event.target.result,
            function (img) {

                if (!img) {

                    alert("Unable to load the image.");
                    return;

                }

                callback(img);

            },
            {
                crossOrigin: "anonymous"
            }
        );

    };

    reader.onerror = function () {

        alert("Unable to read the selected image.");

    };

    reader.readAsDataURL(file);

}



function addImageToCanvas(img) {

    if (
        typeof canvas === "undefined" ||
        !canvas ||
        !img
    ) {

        console.error("ASTRA: Canvas or image is unavailable.");
        return;

    }

    img.set({

        left: 0,
        top: 0,

        originX: "left",
        originY: "top",

        selectable: true,
        evented: true,

        hasControls: true,
        hasBorders: true

    });

    const canvasWidth = canvas.getWidth();
    const canvasHeight = canvas.getHeight();

    const maxWidth = Math.max(
        100,
        Math.min(500, canvasWidth - 80)
    );

    const maxHeight = Math.max(
        100,
        Math.min(500, canvasHeight - 80)
    );

    if (
        img.width > maxWidth ||
        img.height > maxHeight
    ) {

        const widthScale = maxWidth / img.width;
        const heightScale = maxHeight / img.height;

        const scale = Math.min(
            widthScale,
            heightScale
        );

        img.scale(scale);

    }

    canvas.add(img);

    canvas.centerObject(img);

    canvas.setActiveObject(img);

    img.setCoords();

    canvas.requestRenderAll();

    saveImageHistory();

}



if (replaceBtn && imageInput) {

    replaceBtn.addEventListener("click", () => {

        if (
            typeof canvas === "undefined" ||
            !canvas
        ) {

            return;

        }

        const active = canvas.getActiveObject();

        if (
            !active ||
            active.type !== "image"
        ) {

            alert("Please select an image first.");
            return;

        }

        imageInput.value = "";

        imageInput.dataset.replaceImage = "true";

        imageInput.click();

    });

}



if (imageInput) {

    imageInput.addEventListener("change", function (event) {

        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        const isReplaceMode =
            imageInput.dataset.replaceImage === "true";

        imageInput.dataset.replaceImage = "false";

        if (!isReplaceMode) {

            loadImageFromFile(file, function (img) {

                addImageToCanvas(img);

            });

            return;

        }

        const active = canvas.getActiveObject();

        if (
            !active ||
            active.type !== "image"
        ) {

            alert("Please select an image first.");
            return;

        }

        loadImageFromFile(file, function (newImg) {

            newImg.set({

                left: active.left,
                top: active.top,

                scaleX: active.scaleX,
                scaleY: active.scaleY,

                angle: active.angle,

                flipX: active.flipX,
                flipY: active.flipY,

                opacity: active.opacity,

                originX: active.originX,
                originY: active.originY,

                skewX: active.skewX || 0,
                skewY: active.skewY || 0,

                selectable: true,
                evented: true,

                hasControls: active.hasControls,
                hasBorders: active.hasBorders

            });

            newImg.setCoords();

            canvas.remove(active);

            canvas.add(newImg);

            canvas.setActiveObject(newImg);

            canvas.requestRenderAll();

            saveImageHistory();

        });

    });

}


function duplicateActiveObject() {

    if (
        typeof canvas === "undefined" ||
        !canvas
    ) {

        return;

    }

    const activeObject = canvas.getActiveObject();

    if (!activeObject) {

        alert("Please select an object first.");
        return;

    }

    activeObject.clone(function (clone) {

        clone.set({

            left: (activeObject.left || 0) + 25,
            top: (activeObject.top || 0) + 25,

            evented: true,
            selectable: true

        });

        canvas.add(clone);

        canvas.setActiveObject(clone);

        clone.setCoords();

        canvas.requestRenderAll();

        saveImageHistory();

    });

}



if (duplicateBtn) {

    duplicateBtn.addEventListener(
        "click",
        duplicateActiveObject
    );

}


if (deleteBtn) {

    deleteBtn.addEventListener("click", () => {

        if (
            typeof canvas === "undefined" ||
            !canvas
        ) {

            return;

        }

        const activeObject = canvas.getActiveObject();

        if (!activeObject) {

            alert("Please select an object first.");
            return;

        }

        canvas.remove(activeObject);

        canvas.discardActiveObject();

        canvas.requestRenderAll();

        saveImageHistory();

    });

}



if (fitCanvasBtn) {

    fitCanvasBtn.addEventListener("click", () => {

        if (
            typeof canvas === "undefined" ||
            !canvas
        ) {

            return;

        }

        const activeObject = canvas.getActiveObject();

        if (
            !activeObject ||
            activeObject.type !== "image"
        ) {

            alert("Please select an image first.");
            return;

        }

        const canvasWidth = canvas.getWidth();
        const canvasHeight = canvas.getHeight();

        const padding = 40;

        const objectWidth =
            activeObject.getScaledWidth();

        const objectHeight =
            activeObject.getScaledHeight();

        if (
            objectWidth <= 0 ||
            objectHeight <= 0
        ) {

            return;

        }

        const availableWidth =
            Math.max(
                1,
                canvasWidth - padding * 2
            );

        const availableHeight =
            Math.max(
                1,
                canvasHeight - padding * 2
            );

        const scaleX =
            availableWidth / objectWidth;

        const scaleY =
            availableHeight / objectHeight;

        const scale =
            Math.min(scaleX, scaleY);

        if (
            !Number.isFinite(scale) ||
            scale <= 0
        ) {

            return;

        }

        activeObject.scaleX *= scale;
        activeObject.scaleY *= scale;

        activeObject.setCoords();

        canvas.centerObject(activeObject);

        activeObject.setCoords();

        canvas.requestRenderAll();

        saveImageHistory();

    });

}



if (backgroundBtn) {

    backgroundBtn.addEventListener("click", () => {

        if (
            typeof canvas === "undefined" ||
            !canvas
        ) {

            return;

        }

        const activeObject =
            canvas.getActiveObject();

        if (
            !activeObject ||
            activeObject.type !== "image"
        ) {

            alert("Please select an image first.");
            return;

        }

        activeObject.sendToBack();

        activeObject.set({

            selectable: false,
            evented: false,

            hasControls: false,
            hasBorders: false

        });

        activeObject.setCoords();

        canvas.discardActiveObject();

        canvas.requestRenderAll();

        saveImageHistory();

    });

}



if (
    typeof canvas !== "undefined" &&
    canvas
) {

    canvas.on("mouse:dblclick", function (options) {

        const target = options.target;

        if (!target) {
            return;
        }

        if (
            target.type === "image" &&
            target.selectable === false
        ) {

            target.set({

                selectable: true,
                evented: true,

                hasControls: true,
                hasBorders: true

            });

            canvas.setActiveObject(target);

            target.setCoords();

            canvas.requestRenderAll();

            saveImageHistory();

        }

    });

}


console.log(
    "ASTRA: Image Tools Loaded Successfully."
);

