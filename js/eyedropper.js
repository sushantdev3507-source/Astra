
let eyeDropperMode = false;



const eyedropperTool =
    document.getElementById(
        "eyedropperTool"
    );


const pickedColor =
    document.getElementById(
        "pickedColor"
    );


const applyPickedColor =
    document.getElementById(
        "applyPickedColor"
    );


const fillColor =
    document.getElementById(
        "fillColor"
    );




function isEyedropperCanvasReady() {

    return (
        typeof canvas !== "undefined" &&
        canvas &&
        typeof canvas.getPointer ===
            "function"
    );

}




if (eyedropperTool) {

    eyedropperTool.addEventListener(
        "click",
        function () {

            if (
                !isEyedropperCanvasReady()
            ) {

                return;

            }


            eyeDropperMode =
                true;


            

            canvas.discardActiveObject();

            canvas.requestRenderAll();


            

            if (
                canvas.upperCanvasEl
            ) {

                canvas.upperCanvasEl.style.cursor =
                    "crosshair";

            }

        }
    );

}




function getCanvasPixelColor(
    pointer
) {

    if (
        !canvas ||
        !canvas.lowerCanvasEl
    ) {

        return null;

    }


    const element =
        canvas.lowerCanvasEl;


    const ctx =
        element.getContext(
            "2d"
        );


    if (!ctx) {
        return null;
    }


    

    const zoom =
        typeof canvas.getZoom ===
            "function"
            ? canvas.getZoom()
            : 1;


    const retinaScaling =
        typeof canvas.getRetinaScaling ===
            "function"
            ? canvas.getRetinaScaling()
            : 1;


    const x =
        Math.round(
            pointer.x *
            zoom *
            retinaScaling
        );


    const y =
        Math.round(
            pointer.y *
            zoom *
            retinaScaling
        );


    

    if (
        x < 0 ||
        y < 0 ||
        x >= element.width ||
        y >= element.height
    ) {

        return null;

    }


    const pixel =
        ctx.getImageData(
            x,
            y,
            1,
            1
        ).data;


    const red =
        pixel[0];


    const green =
        pixel[1];


    const blue =
        pixel[2];


    return (

        "#" +

        [red, green, blue]

            .map(
                function (value) {

                    return value
                        .toString(16)
                        .padStart(
                            2,
                            "0"
                        );

                }
            )

            .join("")

    );

}




if (
    isEyedropperCanvasReady()
) {

    canvas.on(
        "mouse:down",
        function (options) {

            if (
                !eyeDropperMode
            ) {

                return;

            }


            const pointer =
                canvas.getPointer(
                    options.e
                );


            const color =
                getCanvasPixelColor(
                    pointer
                );


            

            eyeDropperMode =
                false;


            if (
                canvas.upperCanvasEl
            ) {

                canvas.upperCanvasEl.style.cursor =
                    "default";

            }


            if (!color) {

                return;

            }


            

            if (pickedColor) {

                pickedColor.value =
                    color;

            }


            

            if (fillColor) {

                fillColor.value =
                    color;

            }

        }
    );

}




document.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key !==
            "Escape"
        ) {

            return;

        }


        if (
            !eyeDropperMode
        ) {

            return;

        }


        eyeDropperMode =
            false;


        if (
            canvas &&
            canvas.upperCanvasEl
        ) {

            canvas.upperCanvasEl.style.cursor =
                "default";

        }

    }
);




if (applyPickedColor) {

    applyPickedColor.addEventListener(
        "click",
        function () {

            if (
                !isEyedropperCanvasReady()
            ) {

                return;

            }


            const active =
                canvas.getActiveObject();


            if (!active) {

                alert(
                    "Please select an object first."
                );

                return;

            }


            if (!pickedColor) {
                return;
            }


            const color =
                pickedColor.value;


            if (!color) {
                return;
            }


            active.set({
                fill: color
            });


            canvas.requestRenderAll();


            

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



if (pickedColor) {

    pickedColor.addEventListener(
        "input",
        function () {

            if (!fillColor) {
                return;
            }


            fillColor.value =
                pickedColor.value;

        }
    );

}




if (fillColor) {

    fillColor.addEventListener(
        "input",
        function () {

            if (!pickedColor) {
                return;
            }


            pickedColor.value =
                fillColor.value;

        }
    );

}




if (
    isEyedropperCanvasReady()
) {

    canvas.on(
        "object:modified",
        function () {

            if (
                typeof autoSaveProject ===
                "function"
            ) {

                autoSaveProject();

            }

        }
    );

}




if (pickedColor) {

    if (!pickedColor.value) {

        pickedColor.value =
            "#000000";

    }

}


console.log(
    "ASTRA: Eyedropper Loaded Successfully."
);