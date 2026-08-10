
"use strict";

(function () {

    

    const state = {
        initialized: false,
        zoom: 1,
        gridVisible: false,
        isPanning: false,
        isDragging: false,
        lastPosX: 0,
        lastPosY: 0
    };

    const MIN_ZOOM = 0.2;
    const MAX_ZOOM = 4;
    const ZOOM_STEP = 0.1;
    const GRID_SIZE = 50;

    let zoomValue = null;
    let zoomInBtn = null;
    let zoomOutBtn = null;
    let gridBtn = null;
    let fitBtn = null;

    let gridLines = [];
    let resizeTimer = null;


    
    function getCanvas() {

        if (
            window.canvas &&
            typeof window.canvas.add === "function"
        ) {
            return window.canvas;
        }

        return null;
    }


    

    function updateZoomDisplay() {

        const c = getCanvas();

        if (!c) return;

        const zoom = c.getZoom();

        state.zoom = zoom;

        if (zoomValue) {
            zoomValue.textContent =
                Math.round(zoom * 100) + "%";
        }
    }


    

    function setCanvasZoom(value, point = null) {

        const c = getCanvas();

        if (!c) {
            console.warn(
                "ASTRA: Cannot zoom - canvas unavailable."
            );
            return;
        }

        let zoom = Number(value);

        if (!Number.isFinite(zoom)) {
            return;
        }

        zoom = Math.max(
            MIN_ZOOM,
            Math.min(MAX_ZOOM, zoom)
        );

        if (point) {

            c.zoomToPoint(
                point,
                zoom
            );

        } else {

            

            const center =
                new fabric.Point(
                    c.getWidth() / 2,
                    c.getHeight() / 2
                );

            c.zoomToPoint(
                center,
                zoom
            );
        }

        state.zoom = zoom;

        updateZoomDisplay();

        c.requestRenderAll();
    }


    

    function initializeWheelZoom() {

        const c = getCanvas();

        if (!c) return;

        c.on(
            "mouse:wheel",
            function (opt) {

                const event = opt.e;

                let zoom =
                    c.getZoom();

                zoom *= Math.pow(
                    0.999,
                    event.deltaY
                );

                zoom = Math.max(
                    MIN_ZOOM,
                    Math.min(MAX_ZOOM, zoom)
                );

                const point =
                    new fabric.Point(
                        event.offsetX,
                        event.offsetY
                    );

                c.zoomToPoint(
                    point,
                    zoom
                );

                state.zoom = zoom;

                updateZoomDisplay();

                c.requestRenderAll();

                event.preventDefault();
                event.stopPropagation();
            }
        );
    }


    
    function fitCanvasToWorkspace() {

        const c = getCanvas();

        if (!c) {
            console.warn(
                "ASTRA: Fit failed - canvas unavailable."
            );
            return;
        }

        

        const workspace =
            document.querySelector(".workspace") ||
            document.querySelector(".editor-workspace") ||
            document.querySelector(".canvas-workspace") ||
            document.querySelector("main");

        if (!workspace) {
            console.warn(
                "ASTRA: Workspace element not found."
            );
            return;
        }

        const workspaceWidth =
            workspace.clientWidth;

        const workspaceHeight =
            workspace.clientHeight;

        const canvasWidth =
            c.getWidth();

        const canvasHeight =
            c.getHeight();

        if (
            workspaceWidth <= 0 ||
            workspaceHeight <= 0 ||
            canvasWidth <= 0 ||
            canvasHeight <= 0
        ) {
            console.warn(
                "ASTRA: Invalid workspace/canvas dimensions."
            );
            return;
        }

        const padding = 50;

        const availableWidth =
            Math.max(
                workspaceWidth - padding * 2,
                100
            );

        const availableHeight =
            Math.max(
                workspaceHeight - padding * 2,
                100
            );

        let scale =
            Math.min(
                availableWidth / canvasWidth,
                availableHeight / canvasHeight
            );

        scale = Math.max(
            MIN_ZOOM,
            Math.min(1, scale)
        );

        const offsetX =
            (
                workspaceWidth -
                canvasWidth * scale
            ) / 2;

        const offsetY =
            (
                workspaceHeight -
                canvasHeight * scale
            ) / 2;

        c.setViewportTransform([
            scale,
            0,
            0,
            scale,
            offsetX,
            offsetY
        ]);

        state.zoom = scale;

        updateZoomDisplay();

        c.requestRenderAll();

        console.log(
            "ASTRA: Canvas fitted.",
            Math.round(scale * 100) + "%"
        );
    }


    
    function resetCanvasView() {

        const c = getCanvas();

        if (!c) return;

        c.setViewportTransform([
            1,
            0,
            0,
            1,
            0,
            0
        ]);

        state.zoom = 1;

        updateZoomDisplay();

        c.requestRenderAll();
    }


    

    function removeGrid() {

        const c = getCanvas();

        if (!c) return;

        gridLines.forEach(
            function (line) {
                c.remove(line);
            }
        );

        gridLines = [];

        c.requestRenderAll();
    }


    

    function createGrid() {

        const c = getCanvas();

        if (!c) return;

        removeGrid();

        const width =
            c.getWidth();

        const height =
            c.getHeight();

        

        for (
            let x = 0;
            x <= width;
            x += GRID_SIZE
        ) {

            const line =
                new fabric.Line(
                    [x, 0, x, height],
                    {
                        stroke:
                            "rgba(100,116,139,0.18)",

                        strokeWidth: 1,

                        selectable: false,

                        evented: false,

                        excludeFromExport: true
                    }
                );

            gridLines.push(line);

            c.add(line);
        }

        

        for (
            let y = 0;
            y <= height;
            y += GRID_SIZE
        ) {

            const line =
                new fabric.Line(
                    [0, y, width, y],
                    {
                        stroke:
                            "rgba(100,116,139,0.18)",

                        strokeWidth: 1,

                        selectable: false,

                        evented: false,

                        excludeFromExport: true
                    }
                );

            gridLines.push(line);

            c.add(line);
        }

      

        gridLines.forEach(
            function (line) {

                c.sendToBack(line);

            }
        );

        c.requestRenderAll();
    }


    
    function toggleGrid() {

        state.gridVisible =
            !state.gridVisible;

        if (state.gridVisible) {

            createGrid();

            if (gridBtn) {

                gridBtn.classList.add(
                    "active"
                );

                gridBtn.setAttribute(
                    "aria-pressed",
                    "true"
                );
            }

        } else {

            removeGrid();

            if (gridBtn) {

                gridBtn.classList.remove(
                    "active"
                );

                gridBtn.setAttribute(
                    "aria-pressed",
                    "false"
                );
            }
        }
    }


    

    function initializeSpacePan() {

        document.addEventListener(
            "keydown",
            function (event) {

                const target =
                    event.target;

                const isTyping =
                    target &&
                    (
                        target.tagName === "INPUT" ||
                        target.tagName === "TEXTAREA" ||
                        target.tagName === "SELECT" ||
                        target.isContentEditable
                    );

                if (isTyping) {
                    return;
                }

                if (
                    event.code === "Space"
                ) {

                    event.preventDefault();

                    state.isPanning = true;

                    const c =
                        getCanvas();

                    if (!c) return;

                    c.defaultCursor =
                        "grab";

                    c.hoverCursor =
                        "grab";
                }
            }
        );


        document.addEventListener(
            "keyup",
            function (event) {

                if (
                    event.code !== "Space"
                ) {
                    return;
                }

                state.isPanning = false;

                state.isDragging = false;

                const c =
                    getCanvas();

                if (!c) return;

                c.defaultCursor =
                    "default";

                c.hoverCursor =
                    "move";
            }
        );
    }


    
    function initializeCanvasPan() {

        const c = getCanvas();

        if (!c) return;

        c.on(
            "mouse:down",
            function (opt) {

                if (!state.isPanning) {
                    return;
                }

                const event =
                    opt.e;

                state.isDragging = true;

                state.lastPosX =
                    event.clientX;

                state.lastPosY =
                    event.clientY;

                c.defaultCursor =
                    "grabbing";
            }
        );


        c.on(
            "mouse:move",
            function (opt) {

                if (!state.isDragging) {
                    return;
                }

                const event =
                    opt.e;

                const viewport =
                    c.viewportTransform;

                if (!viewport) return;

                viewport[4] +=
                    event.clientX -
                    state.lastPosX;

                viewport[5] +=
                    event.clientY -
                    state.lastPosY;

                state.lastPosX =
                    event.clientX;

                state.lastPosY =
                    event.clientY;

                c.requestRenderAll();
            }
        );


        c.on(
            "mouse:up",
            function () {

                state.isDragging = false;

                c.defaultCursor =
                    state.isPanning
                        ? "grab"
                        : "default";
            }
        );
    }


    

    function initializeDOM() {

        zoomValue =
            document.getElementById(
                "zoomValue"
            );

        zoomInBtn =
            document.getElementById(
                "zoomInBtn"
            );

        zoomOutBtn =
            document.getElementById(
                "zoomOutBtn"
            );

        gridBtn =
            document.getElementById(
                "toggleGrid"
            );

        fitBtn =
            document.getElementById(
                "fitCanvas"
            );
    }


    

    function initializeCore() {

        if (state.initialized) {
            return;
        }

        const c = getCanvas();

        if (!c) {

            console.warn(
                "ASTRA: Canvas Core waiting for canvas..."
            );

            return;
        }

        initializeDOM();


        

        if (zoomInBtn) {

            zoomInBtn.addEventListener(
                "click",
                function () {

                    setCanvasZoom(
                        c.getZoom() +
                        ZOOM_STEP
                    );
                }
            );
        }


        

        if (zoomOutBtn) {

            zoomOutBtn.addEventListener(
                "click",
                function () {

                    setCanvasZoom(
                        c.getZoom() -
                        ZOOM_STEP
                    );
                }
            );
        }


        
        if (fitBtn) {

            fitBtn.addEventListener(
                "click",
                function () {

                    fitCanvasToWorkspace();

                }
            );
        }


        

        if (gridBtn) {

            gridBtn.addEventListener(
                "click",
                function () {

                    toggleGrid();

                }
            );
        }


        
        initializeWheelZoom();

        initializeSpacePan();

        initializeCanvasPan();


        state.initialized = true;


        updateZoomDisplay();


        
        requestAnimationFrame(
            function () {

                setTimeout(
                    function () {

                        fitCanvasToWorkspace();

                    },
                    100
                );
            }
        );


        console.log(
            "ASTRA: Canvas Core initialized successfully."
        );
    }


    

    window.addEventListener(
        "ASTRA_CANVAS_READY",
        function () {

            initializeCore();

        }
    );


    

    document.addEventListener(
        "DOMContentLoaded",
        function () {

            /*
             * Canvas may already exist.
             */

            setTimeout(
                function () {

                    initializeCore();

                },
                50
            );

        }
    );


    

    window.addEventListener(
        "resize",
        function () {

            clearTimeout(
                resizeTimer
            );

            resizeTimer =
                setTimeout(
                    function () {

                        if (
                            state.initialized
                        ) {

                            fitCanvasToWorkspace();

                        }

                    },
                    200
                );
        }
    );


    
    window.getAstraCanvas =
        getCanvas;

    window.setCanvasZoom =
        setCanvasZoom;

    window.fitCanvasToWorkspace =
        fitCanvasToWorkspace;

    window.resetCanvasView =
        resetCanvasView;

    window.createGrid =
        createGrid;

    window.removeGrid =
        removeGrid;

    window.updateZoomDisplay =
        updateZoomDisplay;



    console.log(
        "ASTRA: canvas-core.js loaded."
    );

})();