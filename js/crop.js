// ===============================
// ASTRA CROP SYSTEM
// ===============================

let isCropMode = false;
let cropRect = null;


// ===============================
// GET BUTTONS
// ===============================

function getCropButtons() {
    return {
        cropTool: document.getElementById("cropTool"),
        applyCrop: document.getElementById("applyCrop"),
        cancelCrop: document.getElementById("cancelCrop")
    };
}


// ===============================
// START CROP
// ===============================

function startCrop() {

    if (isCropMode) return;

    const imageObject = canvas.getObjects().find(function(obj) {
        return obj.type === "image";
    });

    if (!imageObject) {
        console.log("Please insert an image first");
        return;
    }

    isCropMode = true;

    if (cropRect) {
        canvas.remove(cropRect);
        cropRect = null;
    }

    // Start crop box over the image
    const imageBox = imageObject.getBoundingRect();

    cropRect = new fabric.Rect({

        left: imageBox.left + imageBox.width * 0.15,
        top: imageBox.top + imageBox.height * 0.15,

        width: imageBox.width * 0.7,
        height: imageBox.height * 0.7,

        fill: "rgba(0,0,0,0.25)",

        stroke: "#ffffff",
        strokeWidth: 2,

        cornerColor: "#2563eb",
        cornerStrokeColor: "#ffffff",
        cornerSize: 12,

        transparentCorners: false,

        lockRotation: true,
        hasRotatingPoint: false,

        selectable: true,
        evented: true
    });

    canvas.add(cropRect);

    canvas.setActiveObject(cropRect);

    canvas.renderAll();

    console.log("CROP STARTED");
}


// ===============================
// KEEP CROP BOX INSIDE IMAGE
// ===============================

function keepCropInsideImage() {

    if (!cropRect) return;

    const imageObject = canvas.getObjects().find(function(obj) {
        return obj.type === "image";
    });

    if (!imageObject) return;

    cropRect.setCoords();

    const cropBox = cropRect.getBoundingRect();
    const imageBox = imageObject.getBoundingRect();

    let newLeft = cropRect.left;
    let newTop = cropRect.top;

    if (cropBox.left < imageBox.left) {
        newLeft += imageBox.left - cropBox.left;
    }

    if (cropBox.top < imageBox.top) {
        newTop += imageBox.top - cropBox.top;
    }

    if (
        cropBox.left + cropBox.width >
        imageBox.left + imageBox.width
    ) {
        newLeft -=
            (cropBox.left + cropBox.width) -
            (imageBox.left + imageBox.width);
    }

    if (
        cropBox.top + cropBox.height >
        imageBox.top + imageBox.height
    ) {
        newTop -=
            (cropBox.top + cropBox.height) -
            (imageBox.top + imageBox.height);
    }

    cropRect.set({
        left: newLeft,
        top: newTop
    });

    cropRect.setCoords();
}


// ===============================
// CROP BOX MOVING
// ===============================

canvas.on("object:moving", function(event) {

    if (!isCropMode) return;

    if (event.target !== cropRect) return;

    keepCropInsideImage();

});


// ===============================
// CROP BOX RESIZING
// ===============================

canvas.on("object:scaling", function(event) {

    if (!isCropMode) return;

    if (event.target !== cropRect) return;

    keepCropInsideImage();

});


// ===============================
// CANCEL CROP
// ===============================

function cancelCropOperation() {

    if (cropRect) {

        canvas.remove(cropRect);

        cropRect = null;
    }

    isCropMode = false;

    canvas.discardActiveObject();

    canvas.renderAll();

    console.log("CROP CANCELLED");
}


// ===============================
// APPLY CROP
// ===============================

function applyCropOperation() {

    if (!isCropMode || !cropRect) {

        console.log("Crop mode is not active");

        return;
    }

    const imageObject = canvas.getObjects().find(function(obj) {
        return obj.type === "image";
    });

    if (!imageObject) {

        console.log("No image found");

        return;
    }

    cropRect.setCoords();

    const cropBox = cropRect.getBoundingRect();
    const imageBox = imageObject.getBoundingRect();

    // Exact selected area relative to image
    const relativeLeft =
        cropBox.left - imageBox.left;

    const relativeTop =
        cropBox.top - imageBox.top;

    const scaleX =
        imageObject.width / imageBox.width;

    const scaleY =
        imageObject.height / imageBox.height;

    const sourceX =
        relativeLeft * scaleX;

    const sourceY =
        relativeTop * scaleY;

    const sourceWidth =
        cropBox.width * scaleX;

    const sourceHeight =
        cropBox.height * scaleY;

    // Temporary canvas
    const tempCanvas =
        document.createElement("canvas");

    tempCanvas.width =
        Math.round(sourceWidth);

    tempCanvas.height =
        Math.round(sourceHeight);

    const ctx =
        tempCanvas.getContext("2d");

    // Draw EXACT selected area
    ctx.drawImage(

        imageObject.getElement(),

        sourceX,
        sourceY,

        sourceWidth,
        sourceHeight,

        0,
        0,

        tempCanvas.width,
        tempCanvas.height
    );

    // Create cropped image
    fabric.Image.fromURL(

        tempCanvas.toDataURL("image/png"),

        function(newImage) {

            newImage.set({

                left:
                    cropBox.left +
                    cropBox.width / 2,

                top:
                    cropBox.top +
                    cropBox.height / 2,

                originX: "center",
                originY: "center"

            });

            // Keep same displayed crop size
            // Make cropped image easier to see
const targetWidth = 500;

const scale = targetWidth / newImage.width;

newImage.scaleX = scale;
newImage.scaleY = scale;

            // Remove original image
            canvas.remove(imageObject);

            // Remove crop box
            canvas.remove(cropRect);

            cropRect = null;

            isCropMode = false;

            // Add cropped image
            canvas.add(newImage);

            canvas.setActiveObject(newImage);

            canvas.renderAll();

            console.log(
                "IMAGE CROPPED SUCCESSFULLY"
            );
        }
    );
}


// ===============================
// BUTTON EVENTS
// ===============================

function setupCropButtons() {

    const buttons = getCropButtons();

    console.log("Crop buttons:", buttons);

    if (buttons.cropTool) {

        buttons.cropTool.addEventListener(
            "click",
            startCrop
        );

    }

    if (buttons.applyCrop) {

        buttons.applyCrop.addEventListener(
            "click",
            applyCropOperation
        );

    }

    if (buttons.cancelCrop) {

        buttons.cancelCrop.addEventListener(
            "click",
            cancelCropOperation
        );

    }
}


// ===============================
// WAIT FOR PAGE
// ===============================

if (document.readyState === "loading") {

    document.addEventListener(
        "DOMContentLoaded",
        setupCropButtons
    );

} else {

    setupCropButtons();

}