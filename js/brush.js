
const brushTool =
document.getElementById("brushTool");

const brushColor =
document.getElementById("brushColor");

const brushSize =
document.getElementById("brushSize");

const disableBrush =
document.getElementById("disableBrush");

const eraserTool =
document.getElementById("eraserTool");



let brushMode = false;
let eraserMode = false;


function isBrushCanvasReady() {

    return (
        typeof canvas !== "undefined" &&
        canvas &&
        canvas.freeDrawingBrush
    );

}


function getBrushSize() {

    if (!brushSize) {

        return 5;

    }

    const value =
        Number(
            brushSize.value
        );

    if (
        !Number.isFinite(value) ||
        value <= 0
    ) {

        return 5;

    }

    return value;

}



function getBrushColor() {

    if (
        !brushColor ||
        !brushColor.value
    ) {

        return "#000000";

    }

    return brushColor.value;

}



function enableBrush() {

    if (
        !isBrushCanvasReady()
    ) {

        return;

    }

    brushMode = true;
    eraserMode = false;

    canvas.isDrawingMode =
        true;

    canvas.freeDrawingBrush.color =
        getBrushColor();

    canvas.freeDrawingBrush.width =
        getBrushSize();

    

    if (
        canvas.upperCanvasEl
    ) {

        canvas.upperCanvasEl.style.cursor =
            "crosshair";

    }

}



function disableBrushMode() {

    if (
        !isBrushCanvasReady()
    ) {

        return;

    }

    brushMode = false;
    eraserMode = false;

    canvas.isDrawingMode =
        false;

    if (
        canvas.upperCanvasEl
    ) {

        canvas.upperCanvasEl.style.cursor =
            "default";

    }

}



if (brushTool) {

    brushTool.addEventListener(
        "click",
        function () {

            enableBrush();

        }
    );

}



if (brushColor) {

    brushColor.addEventListener(
        "input",
        function () {

            

            if (
                !isBrushCanvasReady() ||
                eraserMode
            ) {

                return;

            }

            canvas.freeDrawingBrush.color =
                brushColor.value;

        }
    );

}


if (brushSize) {

    brushSize.addEventListener(
        "input",
        function () {

            if (
                !isBrushCanvasReady()
            ) {

                return;

            }

            const size =
                getBrushSize();

            canvas.freeDrawingBrush.width =
                size;

        }
    );

}



if (disableBrush) {

    disableBrush.addEventListener(
        "click",
        function () {

            disableBrushMode();

        }
    );

}



if (eraserTool) {

    eraserTool.addEventListener(
        "click",
        function () {

            if (
                !isBrushCanvasReady()
            ) {

                return;

            }

            brushMode = true;
            eraserMode = true;

            canvas.isDrawingMode =
                true;

            

            canvas.freeDrawingBrush.color =
                "#ffffff";

            canvas.freeDrawingBrush.width =
                25;

            if (
                canvas.upperCanvasEl
            ) {

                canvas.upperCanvasEl.style.cursor =
                    "crosshair";

            }

        }
    );

}


if (
    typeof canvas !== "undefined" &&
    canvas
) {

    canvas.on(
        "selection:created",
        function () {

            

            if (
                typeof autoSaveProject ===
                "function"
            ) {

                autoSaveProject();

            }

        }
    );

    

    canvas.on(
        "path:created",
        function () {

            if (
                typeof saveHistory ===
                "function"
            ) {

                saveHistory();

            }

            if (
                typeof autoSaveProject ===
                "function"
            ) {

                autoSaveProject();

            }

        }
    );

}


document.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key !== "Escape"
        ) {

            return;

        }

        if (
            brushMode ||
            eraserMode
        ) {

            disableBrushMode();

        }

    }
);



if (
    isBrushCanvasReady()
) {

    canvas.isDrawingMode =
        false;

}

console.log(
    "ASTRA: Brush Tools Loaded Successfully."
);