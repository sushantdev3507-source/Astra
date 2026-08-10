
let penMode = false;

let penPoints = [];

let tempLines = [];



const penToolBtn =
document.getElementById("penTool");

const finishPenBtn =
document.getElementById("finishPen");


function isPenCanvasReady() {

    return (
        typeof canvas !== "undefined" &&
        canvas &&
        typeof canvas.getPointer ===
            "function"
    );

}



function clearPenPreview() {

    if (
        !isPenCanvasReady()
    ) {

        tempLines = [];

        return;

    }


    tempLines.forEach(
        line => {

            if (
                canvas.contains(
                    line
                )
            ) {

                canvas.remove(line);

            }

        }
    );


    tempLines = [];


    canvas.requestRenderAll();

}



function resetPenMode() {

    penMode = false;

    penPoints = [];

    clearPenPreview();

}


function startPen() {

    if (
        !isPenCanvasReady()
    ) {

        console.error(
            "ASTRA: Canvas is not ready."
        );

        return;

    }


    clearPenPreview();

    penPoints = [];

    penMode = true;


    canvas.discardActiveObject();

    canvas.requestRenderAll();


    console.log(
        "ASTRA: Pen mode started."
    );

}



if (penToolBtn) {

    penToolBtn.addEventListener(
        "click",
        startPen
    );

}


function addPenPoint(
    pointer
) {

    if (
        !pointer
    ) {

        return;

    }


    penPoints.push({

        x: pointer.x,

        y: pointer.y

    });


    if (
        penPoints.length < 2
    ) {

        return;

    }


    const previousPoint =
        penPoints[
            penPoints.length - 2
        ];

    const currentPoint =
        penPoints[
            penPoints.length - 1
        ];


    const line =
        new fabric.Line(

            [

                previousPoint.x,

                previousPoint.y,

                currentPoint.x,

                currentPoint.y

            ],

            {

                stroke:
                    "#4f8cff",

                strokeWidth: 2,

                selectable: false,

                evented: false,

                excludeFromExport: true

            }

        );


    tempLines.push(line);

    canvas.add(line);

    canvas.requestRenderAll();

}


if (
    isPenCanvasReady()
) {

    canvas.on(
        "mouse:down",
        function (event) {

            if (!penMode) {

                return;

            }


            const pointer =
                canvas.getPointer(
                    event.e
                );


            addPenPoint(
                pointer
            );

        }
    );

}



function finishPenPath() {

    if (!penMode) {

        return;

    }


    if (
        penPoints.length < 2
    ) {

        resetPenMode();

        console.log(
            "ASTRA: Pen path cancelled - not enough points."
        );

        return;

    }


    const polyline =
        new fabric.Polyline(

            penPoints,

            {

                fill: "",

                stroke: "#000000",

                strokeWidth: 2,

                selectable: true,

                evented: true,

                objectCaching: true

            }

        );


    clearPenPreview();


    canvas.add(
        polyline
    );


    canvas.setActiveObject(
        polyline
    );


    canvas.requestRenderAll();


    penPoints = [];

    penMode = false;


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


    console.log(
        "ASTRA: Pen path created successfully."
    );

}



if (finishPenBtn) {

    finishPenBtn.addEventListener(
        "click",
        finishPenPath
    );

}



if (
    typeof canvas !== "undefined" &&
    canvas &&
    canvas.upperCanvasEl
) {

    canvas.upperCanvasEl.addEventListener(
        "dblclick",
        function () {

            if (!penMode) {

                return;

            }


            finishPenPath();

        }
    );

}



function cancelPenPath() {

    if (!penMode) {

        return;

    }


    resetPenMode();


    console.log(
        "ASTRA: Pen path cancelled."
    );

}



document.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key === "Escape" &&
            penMode
        ) {

            cancelPenPath();

        }

    }
);



console.log(
    "ASTRA: Pen Tools Loaded Successfully."
);