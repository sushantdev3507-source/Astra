

"use strict";

(function () {

    
    let framePanel = null;
    let frameTool = null;
    let closeFramePanel = null;
    let frameButtons = [];
    let initialized = false;


    

    function getFrameCanvas() {

        if (
            window.canvas &&
            typeof window.canvas.add === "function"
        ) {

            return window.canvas;

        }

        return null;

    }


    
    function isFrameCanvasReady() {

        return !!getFrameCanvas();

    }


    

    function saveFrameHistory() {

        if (
            typeof window.saveHistory === "function"
        ) {

            try {

                window.saveHistory();

            } catch (error) {

                console.warn(
                    "ASTRA: Frame history save failed.",
                    error
                );

            }

        }

    }


    

    function refreshFrameLayers() {

        if (
            typeof window.refreshLayers === "function"
        ) {

            try {

                window.refreshLayers();

            } catch (error) {

                console.warn(
                    "ASTRA: Layer refresh failed.",
                    error
                );

            }

        }

    }


    
    function openFramePanel() {

        if (!framePanel) {
            return;
        }

        framePanel.classList.add("active");

    }


    

    function closeFramePanelFunction() {

        if (!framePanel) {
            return;
        }

        framePanel.classList.remove("active");

    }


    
    function createRectangleFrame() {

        return new fabric.Rect({

            left: 200,
            top: 150,

            width: 250,
            height: 180,

            fill: "rgba(0,0,0,0)",

            stroke: "#2563eb",

            strokeWidth: 2,

            strokeDashArray: [
                8,
                8
            ],

            selectable: true,
            evented: true,

            hasControls: true,
            hasBorders: true

        });

    }


    

    function createCircleFrame() {

        return new fabric.Circle({

            left: 250,
            top: 150,

            radius: 100,

            fill: "rgba(0,0,0,0)",

            stroke: "#2563eb",

            strokeWidth: 2,

            strokeDashArray: [
                8,
                8
            ],

            selectable: true,
            evented: true,

            hasControls: true,
            hasBorders: true

        });

    }


    

    function createRoundedFrame() {

        return new fabric.Rect({

            left: 200,
            top: 150,

            width: 250,
            height: 180,

            rx: 20,
            ry: 20,

            fill: "rgba(0,0,0,0)",

            stroke: "#2563eb",

            strokeWidth: 2,

            strokeDashArray: [
                8,
                8
            ],

            selectable: true,
            evented: true,

            hasControls: true,
            hasBorders: true

        });

    }


    

    function createFrame(type) {

        const canvas = getFrameCanvas();

        if (!canvas) {

            console.error(
                "ASTRA: Cannot create frame. Canvas is not ready."
            );

            return null;

        }


        if (
            typeof fabric === "undefined"
        ) {

            console.error(
                "ASTRA: Fabric.js is not loaded."
            );

            return null;

        }


        let frame = null;


        switch (type) {

            case "rectangle":

                frame = createRectangleFrame();

                break;


            case "circle":

                frame = createCircleFrame();

                break;


            case "rounded":

                frame = createRoundedFrame();

                break;


            default:

                console.warn(
                    "ASTRA: Unknown frame type:",
                    type
                );

                return null;

        }


        if (!frame) {
            return null;
        }


        frame.set({

            isFrame: true,

            frameType: type,

            objectCaching: false,

            selectable: true,

            evented: true

        });


        frame.layerName = "Frame";


        canvas.add(frame);

        canvas.setActiveObject(frame);

        frame.setCoords();

        canvas.requestRenderAll();


        saveFrameHistory();

        refreshFrameLayers();

        closeFramePanelFunction();


        console.log(
            "ASTRA: " +
            type +
            " frame created."
        );


        return frame;

    }


    

    function getActiveFrame() {

        const canvas = getFrameCanvas();

        if (!canvas) {
            return null;
        }


        const activeObject =
            canvas.getActiveObject();


        if (
            !activeObject ||
            activeObject.isFrame !== true
        ) {

            return null;

        }


        return activeObject;

    }


    

    function isFrameObject(object) {

        return !!(
            object &&
            object.isFrame === true
        );

    }


    

    function hasActiveFrame() {

        return !!getActiveFrame();

    }


    
    function initializeFrameCanvasEvents() {

        const canvas = getFrameCanvas();

        if (!canvas) {

            console.warn(
                "ASTRA: Frame events waiting for canvas."
            );

            return;

        }


        canvas.on(
            "selection:created",
            function (event) {

                const object = event.target;

                if (isFrameObject(object)) {

                    console.log(
                        "ASTRA: Frame selected."
                    );

                }

            }
        );


        canvas.on(
            "selection:updated",
            function (event) {

                const object = event.target;

                if (isFrameObject(object)) {

                    console.log(
                        "ASTRA: Frame selected."
                    );

                }

            }
        );


        canvas.on(
            "object:modified",
            function (event) {

                const object = event.target;

                if (isFrameObject(object)) {

                    saveFrameHistory();

                    refreshFrameLayers();

                }

            }
        );


        canvas.on(
            "object:removed",
            function (event) {

                const object = event.target;

                if (isFrameObject(object)) {

                    refreshFrameLayers();

                }

            }
        );

    }


    

    function initializeFrameDOM() {

        framePanel =
            document.getElementById("framePanel");

        frameTool =
            document.getElementById("frameTool");

        closeFramePanel =
            document.getElementById("closeFramePanel");

        frameButtons =
            Array.from(
                document.querySelectorAll(".frame-btn")
            );

    }


    

    function initializeFrameToolButton() {

        if (!frameTool) {
            return;
        }


        frameTool.addEventListener(
            "click",
            function () {

                openFramePanel();

            }
        );

    }


    

    function initializeCloseButton() {

        if (!closeFramePanel) {
            return;
        }


        closeFramePanel.addEventListener(
            "click",
            function () {

                closeFramePanelFunction();

            }
        );

    }


    

    function initializeFrameButtons() {

        if (
            !frameButtons ||
            frameButtons.length === 0
        ) {

            console.warn(
                "ASTRA: No .frame-btn elements found."
            );

            return;

        }


        frameButtons.forEach(
            function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        const type =
                            button.dataset.frame;


                        if (!type) {

                            console.warn(
                                "ASTRA: Frame type missing."
                            );

                            return;

                        }


                        if (!isFrameCanvasReady()) {

                            console.error(
                                "ASTRA: Canvas is not ready."
                            );

                            return;

                        }


                        createFrame(type);

                    }
                );

            }
        );

    }


    

    function closeFramePanelAfterCreate() {

        closeFramePanelFunction();

    }


    

    function initializeFrames() {

        if (initialized) {
            return;
        }


        if (!isFrameCanvasReady()) {

            console.warn(
                "ASTRA: Frames waiting for canvas..."
            );

            return;

        }


        initializeFrameDOM();

        initializeFrameToolButton();

        initializeCloseButton();

        initializeFrameButtons();

        initializeFrameCanvasEvents();


        initialized = true;


        console.log(
            "ASTRA: Frame Tools initialized successfully."
        );

    }


    

    window.addEventListener(
        "ASTRA_CANVAS_READY",
        function () {

            initializeFrames();

        }
    );


    

    document.addEventListener(
        "DOMContentLoaded",
        function () {

            setTimeout(
                function () {

                    initializeFrames();

                },
                100
            );

        }
    );


    
    window.createFrame =
        createFrame;

    window.getActiveFrame =
        getActiveFrame;

    window.isFrameObject =
        isFrameObject;

    window.hasActiveFrame =
        hasActiveFrame;

    window.closeFramePanelAfterCreate =
        closeFramePanelAfterCreate;


    

    console.log(
        "ASTRA: frames.js loaded."
    );

})();
