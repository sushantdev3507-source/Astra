// =========================================================
// ASTRA PHOTO EDITOR
// SHAPES TOOLS
// Fabric.js 5.x
// =========================================================

"use strict";

const astraShapesState = {
    initialized: false
};

function isShapeCanvasReady() {
    return (
        typeof canvas !== "undefined" &&
        canvas &&
        typeof canvas.add === "function"
    );
}

function waitForShapeCanvas(callback) {
    if (isShapeCanvasReady()) {
        callback();
        return;
    }

    let attempts = 0;
    const maxAttempts = 50;

    const timer = setInterval(function () {
        attempts++;

        if (isShapeCanvasReady()) {
            clearInterval(timer);
            callback();
            return;
        }

        if (attempts >= maxAttempts) {
            clearInterval(timer);

            console.error(
                "ASTRA: Shapes could not initialize because Fabric canvas was not found."
            );
        }
    }, 100);
}

function saveShapeHistory() {
    if (typeof saveHistory === "function") {
        try {
            saveHistory();
        } catch (error) {
            console.warn(
                "ASTRA: Could not save shape history.",
                error
            );
        }
    }
}

function isShapeObject(obj) {
    if (!obj) {
        return false;
    }

    return (
        obj.type === "rect" ||
        obj.type === "circle" ||
        obj.type === "triangle" ||
        obj.type === "line" ||
        obj.type === "polygon" ||
        obj.type === "group"
    );
}

function getActiveShape() {
    if (!isShapeCanvasReady()) {
        return null;
    }

    const obj = canvas.getActiveObject();

    if (!isShapeObject(obj)) {
        return null;
    }

    return obj;
}

function addShape(shape) {
    if (!isShapeCanvasReady()) {
        console.error(
            "ASTRA: Canvas is not available."
        );
        return;
    }

    if (!shape) {
        return;
    }

    shape.set({
        selectable: true,
        evented: true,
        hasControls: true,
        hasBorders: true
    });

    canvas.add(shape);
    canvas.setActiveObject(shape);

    shape.setCoords();

    canvas.requestRenderAll();

    saveShapeHistory();
}

function createRectangle() {
    if (
        typeof fabric === "undefined" ||
        !fabric.Rect
    ) {
        console.error(
            "ASTRA: Fabric.Rect is unavailable."
        );
        return;
    }

    const rectangle = new fabric.Rect({
        left: 200,
        top: 150,
        width: 220,
        height: 130,
        fill: "#4f46e5",
        stroke: "#111111",
        strokeWidth: 2,
        rx: 0,
        ry: 0
    });

    addShape(rectangle);
}

function createCircle() {
    if (
        typeof fabric === "undefined" ||
        !fabric.Circle
    ) {
        console.error(
            "ASTRA: Fabric.Circle is unavailable."
        );
        return;
    }

    const circle = new fabric.Circle({
        left: 250,
        top: 200,
        radius: 70,
        fill: "#06b6d4",
        stroke: "#111111",
        strokeWidth: 2
    });

    addShape(circle);
}

function createTriangle() {
    if (
        typeof fabric === "undefined" ||
        !fabric.Triangle
    ) {
        console.error(
            "ASTRA: Fabric.Triangle is unavailable."
        );
        return;
    }

    const triangle = new fabric.Triangle({
        left: 300,
        top: 170,
        width: 120,
        height: 120,
        fill: "#f97316",
        stroke: "#111111",
        strokeWidth: 2
    });

    addShape(triangle);
}

function createLine() {
    if (
        typeof fabric === "undefined" ||
        !fabric.Line
    ) {
        console.error(
            "ASTRA: Fabric.Line is unavailable."
        );
        return;
    }

    const line = new fabric.Line(
        [50, 50, 250, 50],
        {
            stroke: "#111111",
            strokeWidth: 4,
            selectable: true,
            evented: true
        }
    );

    addShape(line);
}

function createRoundedRectangle() {
    if (
        typeof fabric === "undefined" ||
        !fabric.Rect
    ) {
        console.error(
            "ASTRA: Fabric.Rect is unavailable."
        );
        return;
    }

    const roundedRect = new fabric.Rect({
        left: 220,
        top: 180,
        width: 240,
        height: 120,
        rx: 20,
        ry: 20,
        fill: "#10b981",
        stroke: "#111111",
        strokeWidth: 2
    });

    addShape(roundedRect);
}

function createStar() {
    if (
        typeof fabric === "undefined" ||
        !fabric.Polygon
    ) {
        console.error(
            "ASTRA: Fabric.Polygon is unavailable."
        );
        return;
    }

    const points = [
        { x: 50, y: 0 },
        { x: 61, y: 35 },
        { x: 98, y: 35 },
        { x: 68, y: 57 },
        { x: 79, y: 91 },
        { x: 50, y: 70 },
        { x: 21, y: 91 },
        { x: 32, y: 57 },
        { x: 2, y: 35 },
        { x: 39, y: 35 }
    ];

    const star = new fabric.Polygon(
        points,
        {
            left: 250,
            top: 150,
            fill: "#facc15",
            stroke: "#111111",
            strokeWidth: 2,
            scaleX: 2,
            scaleY: 2
        }
    );

    addShape(star);
}

function createArrow() {
    if (
        typeof fabric === "undefined" ||
        !fabric.Group ||
        !fabric.Line ||
        !fabric.Triangle
    ) {
        console.error(
            "ASTRA: Fabric arrow components are unavailable."
        );
        return;
    }

    const arrowLine = new fabric.Line(
        [0, 10, 120, 10],
        {
            stroke: "#111111",
            strokeWidth: 4
        }
    );

    const arrowHead = new fabric.Triangle({
        left: 120,
        top: 10,
        originX: "center",
        originY: "center",
        angle: 90,
        width: 20,
        height: 20,
        fill: "#111111",
        stroke: "#111111",
        strokeWidth: 0
    });

    const arrow = new fabric.Group(
        [
            arrowLine,
            arrowHead
        ],
        {
            left: 200,
            top: 200,
            selectable: true,
            evented: true
        }
    );

    addShape(arrow);
}

let shapeFill = null;
let shapeStroke = null;
let shapeStrokeWidth = null;

function setShapeFill(obj, color) {
    if (!obj || !color) {
        return;
    }

    if (obj.type !== "group") {
        obj.set({
            fill: color
        });
        return;
    }

    if (typeof obj.getObjects === "function") {
        obj.getObjects().forEach(function (child) {
            if (child.type === "line") {
                child.set({
                    stroke: color
                });
            } else {
                child.set({
                    fill: color
                });
            }
        });
    }
}

function setShapeStroke(obj, color) {
    if (!obj || !color) {
        return;
    }

    if (obj.type !== "group") {
        obj.set({
            stroke: color
        });
        return;
    }

    if (typeof obj.getObjects === "function") {
        obj.getObjects().forEach(function (child) {
            child.set({
                stroke: color
            });
        });
    }
}

function setShapeStrokeWidth(obj, width) {
    if (!obj) {
        return;
    }

    const value = Number(width);

    if (
        !Number.isFinite(value) ||
        value < 0
    ) {
        return;
    }

    if (obj.type !== "group") {
        obj.set({
            strokeWidth: value
        });
        return;
    }

    if (typeof obj.getObjects === "function") {
        obj.getObjects().forEach(function (child) {
            child.set({
                strokeWidth: value
            });
        });
    }
}

function syncShapePanel() {
    const obj = getActiveShape();

    if (!obj) {
        return;
    }

    if (
        shapeFill &&
        typeof obj.fill === "string" &&
        obj.fill.startsWith("#")
    ) {
        shapeFill.value = obj.fill;
    }

    if (
        shapeStroke &&
        typeof obj.stroke === "string" &&
        obj.stroke.startsWith("#")
    ) {
        shapeStroke.value = obj.stroke;
    }

    if (
        shapeStrokeWidth &&
        Number.isFinite(
            Number(obj.strokeWidth)
        )
    ) {
        shapeStrokeWidth.value =
            Number(obj.strokeWidth);
    }
}

function connectShapeButton(id, handler) {
    const button =
        document.getElementById(id);

    if (!button) {
        console.warn(
            "ASTRA: Shape button not found:",
            id
        );
        return;
    }

    button.addEventListener(
        "click",
        function (event) {
            event.preventDefault();
            event.stopPropagation();
            handler();
        }
    );
}

function initializeShapeButtons() {
    connectShapeButton(
        "addRectangle",
        createRectangle
    );

    connectShapeButton(
        "addCircle",
        createCircle
    );

    connectShapeButton(
        "addTriangle",
        createTriangle
    );

    connectShapeButton(
        "addLine",
        createLine
    );

    connectShapeButton(
        "addRoundedRect",
        createRoundedRectangle
    );

    connectShapeButton(
        "addStar",
        createStar
    );

    connectShapeButton(
        "addArrow",
        createArrow
    );
}

function initializeShapeProperties() {
    shapeFill =
        document.getElementById("shapeFill");

    shapeStroke =
        document.getElementById("shapeStroke");

    shapeStrokeWidth =
        document.getElementById(
            "shapeStrokeWidth"
        );

    if (shapeFill) {
        shapeFill.value = "#4f46e5";

        shapeFill.addEventListener(
            "input",
            function () {
                const obj =
                    getActiveShape();

                if (!obj) {
                    return;
                }

                setShapeFill(
                    obj,
                    shapeFill.value
                );

                obj.setCoords();
                canvas.requestRenderAll();
            }
        );

        shapeFill.addEventListener(
            "change",
            function () {
                if (getActiveShape()) {
                    saveShapeHistory();
                }
            }
        );
    }

    if (shapeStroke) {
        shapeStroke.value = "#111111";

        shapeStroke.addEventListener(
            "input",
            function () {
                const obj =
                    getActiveShape();

                if (!obj) {
                    return;
                }

                setShapeStroke(
                    obj,
                    shapeStroke.value
                );

                obj.setCoords();
                canvas.requestRenderAll();
            }
        );

        shapeStroke.addEventListener(
            "change",
            function () {
                if (getActiveShape()) {
                    saveShapeHistory();
                }
            }
        );
    }

    if (shapeStrokeWidth) {
        shapeStrokeWidth.value = 2;

        shapeStrokeWidth.addEventListener(
            "input",
            function () {
                const obj =
                    getActiveShape();

                if (!obj) {
                    return;
                }

                setShapeStrokeWidth(
                    obj,
                    shapeStrokeWidth.value
                );

                obj.setCoords();
                canvas.requestRenderAll();
            }
        );

        shapeStrokeWidth.addEventListener(
            "change",
            function () {
                if (getActiveShape()) {
                    saveShapeHistory();
                }
            }
        );
    }
}

function initializeShapeCanvasEvents() {
    if (!isShapeCanvasReady()) {
        return;
    }

    canvas.on(
        "selection:created",
        syncShapePanel
    );

    canvas.on(
        "selection:updated",
        syncShapePanel
    );

    canvas.on(
        "object:modified",
        syncShapePanel
    );
}

function initializeAstraShapes() {
    if (astraShapesState.initialized) {
        return;
    }

    if (!isShapeCanvasReady()) {
        console.error(
            "ASTRA: Cannot initialize Shapes because canvas is unavailable."
        );
        return;
    }

    if (typeof fabric === "undefined") {
        console.error(
            "ASTRA: Fabric.js is unavailable."
        );
        return;
    }

    initializeShapeButtons();
    initializeShapeProperties();
    initializeShapeCanvasEvents();

    astraShapesState.initialized = true;

    console.log(
        "ASTRA: Shape Tools initialized successfully."
    );
}

document.addEventListener(
    "DOMContentLoaded",
    function () {
        waitForShapeCanvas(
            initializeAstraShapes
        );
    }
);

window.addShape = addShape;
window.createRectangle = createRectangle;
window.createCircle = createCircle;
window.createTriangle = createTriangle;
window.createLine = createLine;
window.createRoundedRectangle = createRoundedRectangle;
window.createStar = createStar;
window.createArrow = createArrow;
window.getActiveShape = getActiveShape;
window.syncShapePanel = syncShapePanel;

console.log(
    "ASTRA: Shape Tools file loaded."
);