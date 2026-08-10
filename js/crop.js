

let isCropMode = false;
let cropRect = null;
let cropImage = null;




function isCropCanvasReady() {

    return (
        typeof canvas !== "undefined" &&
        canvas &&
        typeof canvas.getObjects === "function"
    );

}




function saveCropHistory() {

    if (typeof saveHistory === "function") {
        saveHistory();
    }

}




function getCropButtons() {

    return {

        cropTool:
            document.getElementById("cropTool"),

        applyCrop:
            document.getElementById("applyCrop"),

        cancelCrop:
            document.getElementById("cancelCrop")

    };

}




function getCropImage() {

    if (!isCropCanvasReady()) {
        return null;
    }


    

    const activeObject =
        canvas.getActiveObject();


    if (
        activeObject &&
        activeObject.type === "image"
    ) {

        return activeObject;

    }


    
    const objects =
        canvas.getObjects();


    return (
        objects.find(
            obj => obj.type === "image"
        ) || null
    );

}



   

function startCrop() {

    if (!isCropCanvasReady()) {

        console.error(
            "ASTRA: Canvas is not available."
        );

        return;

    }


    if (isCropMode) {
        return;
    }


    

    const imageObject =
        getCropImage();


    if (!imageObject) {

        alert(
            "Please insert or select an image first."
        );

        return;

    }


  

    if (cropRect) {

        canvas.remove(cropRect);

        cropRect = null;

    }


    

    cropImage = imageObject;

    isCropMode = true;


    
      

    imageObject.setCoords();


    const imageBox =
        imageObject.getBoundingRect();


    if (
        imageBox.width <= 0 ||
        imageBox.height <= 0
    ) {

        isCropMode = false;
        cropImage = null;

        return;

    }


    

    const cropWidth =
        imageBox.width * 0.70;

    const cropHeight =
        imageBox.height * 0.70;


    const cropLeft =
        imageBox.left +
        (imageBox.width - cropWidth) / 2;


    const cropTop =
        imageBox.top +
        (imageBox.height - cropHeight) / 2;


    
    if (
        typeof fabric === "undefined" ||
        !fabric.Rect
    ) {

        console.error(
            "ASTRA: Fabric.Rect is not available."
        );

        isCropMode = false;
        cropImage = null;

        return;

    }


    cropRect =
        new fabric.Rect({

            left: cropLeft,
            top: cropTop,

            width: cropWidth,
            height: cropHeight,

            fill: "rgba(0, 0, 0, 0.25)",

            stroke: "#ffffff",
            strokeWidth: 2,

            cornerColor: "#2563eb",
            cornerStrokeColor: "#ffffff",

            cornerSize: 12,

            transparentCorners: false,

            lockRotation: true,

            hasRotatingPoint: false,

            selectable: true,
            evented: true,

            objectCaching: false

        });


    

    canvas.add(cropRect);

    canvas.setActiveObject(cropRect);

    cropRect.setCoords();

    canvas.requestRenderAll();


    console.log(
        "ASTRA: Crop mode started."
    );

}




function keepCropInsideImage() {

    if (
        !isCropMode ||
        !cropRect ||
        !cropImage
    ) {

        return;

    }


    cropRect.setCoords();

    cropImage.setCoords();


    const cropBox =
        cropRect.getBoundingRect();


    const imageBox =
        cropImage.getBoundingRect();


    let newLeft =
        cropRect.left;

    let newTop =
        cropRect.top;


    

    if (
        cropBox.left <
        imageBox.left
    ) {

        newLeft +=
            imageBox.left -
            cropBox.left;

    }


   

    if (
        cropBox.top <
        imageBox.top
    ) {

        newTop +=
            imageBox.top -
            cropBox.top;

    }


   

    if (
        cropBox.left +
        cropBox.width >
        imageBox.left +
        imageBox.width
    ) {

        newLeft -=
            (
                cropBox.left +
                cropBox.width
            ) -
            (
                imageBox.left +
                imageBox.width
            );

    }


    

    if (
        cropBox.top +
        cropBox.height >
        imageBox.top +
        imageBox.height
    ) {

        newTop -=
            (
                cropBox.top +
                cropBox.height
            ) -
            (
                imageBox.top +
                imageBox.height
            );

    }


    cropRect.set({

        left: newLeft,
        top: newTop

    });


    cropRect.setCoords();

}



if (isCropCanvasReady()) {

    canvas.on(
        "object:moving",
        function (event) {

            if (!isCropMode) {
                return;
            }


            if (
                event.target !== cropRect
            ) {
                return;
            }


            keepCropInsideImage();

        }
    );


    

    canvas.on(
        "object:scaling",
        function (event) {

            if (!isCropMode) {
                return;
            }


            if (
                event.target !== cropRect
            ) {
                return;
            }


            keepCropInsideImage();

        }
    );

}




function removeCropBox() {

    if (
        cropRect &&
        isCropCanvasReady()
    ) {

        canvas.remove(cropRect);

    }


    cropRect = null;

}




function cancelCropOperation() {

    if (!isCropMode) {
        return;
    }


    
    removeCropBox();


    
    isCropMode = false;

    cropImage = null;


    
    if (isCropCanvasReady()) {

        canvas.discardActiveObject();

        canvas.requestRenderAll();

    }


    console.log(
        "ASTRA: Crop cancelled."
    );

}



function applyCropOperation() {

    if (
        !isCropMode ||
        !cropRect
    ) {

        console.log(
            "ASTRA: Crop mode is not active."
        );

        return;

    }


    if (!isCropCanvasReady()) {
        return;
    }


    const imageObject =
        cropImage || getCropImage();


    if (!imageObject) {

        alert(
            "No image is available for cropping."
        );

        return;

    }


    
    cropRect.setCoords();

    imageObject.setCoords();


    const cropBox =
        cropRect.getBoundingRect();


    const imageBox =
        imageObject.getBoundingRect();


    

    if (
        cropBox.width <= 0 ||
        cropBox.height <= 0
    ) {

        alert(
            "Invalid crop area."
        );

        return;

    }


    

    const scaleX =
        imageObject.width /
        imageBox.width;


    const scaleY =
        imageObject.height /
        imageBox.height;


    if (
        !Number.isFinite(scaleX) ||
        !Number.isFinite(scaleY) ||
        scaleX <= 0 ||
        scaleY <= 0
    ) {

        alert(
            "Unable to calculate crop area."
        );

        return;

    }


    
       

    const relativeLeft =
        Math.max(
            0,
            cropBox.left -
            imageBox.left
        );


    const relativeTop =
        Math.max(
            0,
            cropBox.top -
            imageBox.top
        );


    

    const sourceX =
        relativeLeft *
        scaleX;


    const sourceY =
        relativeTop *
        scaleY;


    const sourceWidth =
        cropBox.width *
        scaleX;


    const sourceHeight =
        cropBox.height *
        scaleY;


    
    const safeSourceX =
        Math.max(
            0,
            Math.min(
                sourceX,
                imageObject.width
            )
        );


    const safeSourceY =
        Math.max(
            0,
            Math.min(
                sourceY,
                imageObject.height
            )
        );


    const safeSourceWidth =
        Math.min(
            sourceWidth,
            imageObject.width -
            safeSourceX
        );


    const safeSourceHeight =
        Math.min(
            sourceHeight,
            imageObject.height -
            safeSourceY
        );


    if (
        safeSourceWidth <= 0 ||
        safeSourceHeight <= 0
    ) {

        alert(
            "Invalid crop selection."
        );

        return;

    }


    

    const tempCanvas =
        document.createElement("canvas");


    tempCanvas.width =
        Math.max(
            1,
            Math.round(safeSourceWidth)
        );


    tempCanvas.height =
        Math.max(
            1,
            Math.round(safeSourceHeight)
        );


    const ctx =
        tempCanvas.getContext("2d");


    if (!ctx) {

        alert(
            "Unable to create crop canvas."
        );

        return;

    }


    

    try {

        ctx.drawImage(

            imageObject.getElement(),

            safeSourceX,
            safeSourceY,

            safeSourceWidth,
            safeSourceHeight,

            0,
            0,

            tempCanvas.width,
            tempCanvas.height

        );

    } catch (error) {

        console.error(
            "ASTRA: Crop drawing failed.",
            error
        );

        alert(
            "Unable to crop the image."
        );

        return;

    }


    

    const croppedData =
        tempCanvas.toDataURL(
            "image/png"
        );


    fabric.Image.fromURL(
        croppedData,
        function (newImage) {

            if (!newImage) {

                alert(
                    "Unable to create cropped image."
                );

                return;

            }


            

            const cropCenterX =
                cropBox.left +
                cropBox.width / 2;


            const cropCenterY =
                cropBox.top +
                cropBox.height / 2;


            

            const newScaleX =
                cropBox.width /
                newImage.width;


            const newScaleY =
                cropBox.height /
                newImage.height;


            newImage.set({

                left: cropCenterX,
                top: cropCenterY,

                originX: "center",
                originY: "center",

                scaleX: newScaleX,
                scaleY: newScaleY,

                angle:
                    imageObject.angle || 0,

                flipX:
                    imageObject.flipX || false,

                flipY:
                    imageObject.flipY || false,

                opacity:
                    imageObject.opacity ?? 1,

                selectable: true,
                evented: true,

                hasControls: true,
                hasBorders: true

            });


           

            canvas.remove(imageObject);


            

            removeCropBox();


            

            isCropMode = false;

            cropImage = null;


            
            canvas.add(newImage);

            canvas.setActiveObject(newImage);

            newImage.setCoords();

            canvas.requestRenderAll();


            

            saveCropHistory();


            console.log(
                "ASTRA: Image cropped successfully."
            );

        }
    );

}




let cropButtonsInitialized = false;


function setupCropButtons() {

    if (cropButtonsInitialized) {
        return;
    }


    const buttons =
        getCropButtons();


    console.log(
        "ASTRA: Crop buttons initialized.",
        buttons
    );


    

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


    cropButtonsInitialized = true;

}




if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        setupCropButtons,
        { once: true }
    );

} else {

    setupCropButtons();

}



   
console.log(
    "ASTRA: Crop System Loaded Successfully."
);