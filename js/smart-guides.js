

const OBJECT_SNAP_DISTANCE = 8;

const SNAP_DISTANCE = 10;



let verticalGuide = null;

let horizontalGuide = null;

let objectVerticalGuide = null;

let objectHorizontalGuide = null;



function isSmartGuideCanvasReady() {

    return (
        typeof canvas !== "undefined" &&
        canvas &&
        typeof canvas.getObjects ===
            "function"
    );

}



function createVerticalGuide(
    x,
    stroke = "#ff3b30"
) {

    return new fabric.Line(

        [
            x,
            0,
            x,
            canvas.getHeight()
        ],

        {

            stroke,

            strokeWidth: 1,

            selectable: false,

            evented: false,

            excludeFromExport: true,

            isSmartGuide: true

        }

    );

}

function createHorizontalGuide(
    y,
    stroke = "#ff3b30"
) {

    return new fabric.Line(

        [
            0,
            y,
            canvas.getWidth(),
            y
        ],

        {

            stroke,

            strokeWidth: 1,

            selectable: false,

            evented: false,

            excludeFromExport: true,

            isSmartGuide: true

        }

    );

}



function removeGuide(
    guide
) {

    if (
        guide &&
        isSmartGuideCanvasReady()
    ) {

        canvas.remove(
            guide
        );

    }

}



function hideGuides() {

    removeGuide(
        verticalGuide
    );

    removeGuide(
        horizontalGuide
    );

    removeGuide(
        objectVerticalGuide
    );

    removeGuide(
        objectHorizontalGuide
    );

    verticalGuide = null;

    horizontalGuide = null;

    objectVerticalGuide = null;

    objectHorizontalGuide = null;

    if (
        isSmartGuideCanvasReady()
    ) {

        canvas.requestRenderAll();

    }

}



function showCanvasCenterGuides(
    showVertical,
    showHorizontal
) {

    if (
        !isSmartGuideCanvasReady()
    ) {

        return;

    }

    removeGuide(
        verticalGuide
    );

    removeGuide(
        horizontalGuide
    );

    verticalGuide = null;

    horizontalGuide = null;

    const center =
        canvas.getCenter();

    if (showVertical) {

        verticalGuide =
            createVerticalGuide(
                center.left,
                "#ff3b30"
            );

        canvas.add(
            verticalGuide
        );

    }

    if (showHorizontal) {

        horizontalGuide =
            createHorizontalGuide(
                center.top,
                "#ff3b30"
            );

        canvas.add(
            horizontalGuide
        );

    }

}



function showObjectVerticalGuide(
    x
) {

    removeGuide(
        objectVerticalGuide
    );

    objectVerticalGuide =
        createVerticalGuide(
            x,
            "#00b7ff"
        );

    canvas.add(
        objectVerticalGuide
    );

}

function showObjectHorizontalGuide(
    y
) {

    removeGuide(
        objectHorizontalGuide
    );

    objectHorizontalGuide =
        createHorizontalGuide(
            y,
            "#00b7ff"
        );

    canvas.add(
        objectHorizontalGuide
    );

}



function snapToObjects(
    activeObject
) {

    if (
        !activeObject ||
        !isSmartGuideCanvasReady()
    ) {

        return {

            vertical: false,

            horizontal: false

        };

    }

    let snappedVertical = false;

    let snappedHorizontal = false;

    const objects =
        canvas.getObjects();

    const activeCenter =
        activeObject.getCenterPoint();

    removeGuide(
        objectVerticalGuide
    );

    removeGuide(
        objectHorizontalGuide
    );

    objectVerticalGuide = null;

    objectHorizontalGuide = null;

    objects.forEach(
        targetObject => {

            if (
                targetObject ===
                activeObject
            ) {

                return;

            }

            if (
                targetObject.isSmartGuide ||
                targetObject.excludeFromExport
            ) {

                return;

            }

            const targetCenter =
                targetObject.getCenterPoint();

            const differenceX =
                targetCenter.x -
                activeCenter.x;

            if (
                Math.abs(
                    differenceX
                ) <
                OBJECT_SNAP_DISTANCE
            ) {

                activeObject.left +=
                    differenceX;

                activeObject.setCoords();

                snappedVertical = true;

                showObjectVerticalGuide(
                    targetCenter.x
                );

            }

            const differenceY =
                targetCenter.y -
                activeCenter.y;

            if (
                Math.abs(
                    differenceY
                ) <
                OBJECT_SNAP_DISTANCE
            ) {

                activeObject.top +=
                    differenceY;

                activeObject.setCoords();

                snappedHorizontal = true;

                showObjectHorizontalGuide(
                    targetCenter.y
                );

            }

        }
    );

    return {

        vertical:
            snappedVertical,

        horizontal:
            snappedHorizontal

    };

}



if (
    isSmartGuideCanvasReady()
) {

    canvas.on(
        "object:moving",
        function (event) {

            const object =
                event.target;

            if (!object) {

                return;

            }

            if (
                object.isSmartGuide
            ) {

                return;

            }

            const center =
                canvas.getCenter();

            const objectCenter =
                object.getCenterPoint();

            let showCenterVertical =
                false;

            let showCenterHorizontal =
                false;

            if (
                Math.abs(
                    objectCenter.x -
                    center.left
                ) <
                SNAP_DISTANCE
            ) {

                object.left =
                    center.left -
                    object.getScaledWidth() / 2;

                showCenterVertical = true;

                object.setCoords();

            }

            if (
                Math.abs(
                    objectCenter.y -
                    center.top
                ) <
                SNAP_DISTANCE
            ) {

                object.top =
                    center.top -
                    object.getScaledHeight() / 2;

                showCenterHorizontal = true;

                object.setCoords();

            }

            showCanvasCenterGuides(

                showCenterVertical,

                showCenterHorizontal

            );

            snapToObjects(
                object
            );

            canvas.requestRenderAll();

        }
    );

}



if (
    isSmartGuideCanvasReady()
) {

    canvas.on(
        "mouse:up",
        function () {

            hideGuides();

        }
    );

}



if (
    isSmartGuideCanvasReady()
) {

    canvas.on(
        "object:modified",
        function () {

            hideGuides();

        }
    );

}



function cleanupSmartGuides() {

    hideGuides();

}



console.log(
    "ASTRA: Smart Guides Loaded Successfully."
);