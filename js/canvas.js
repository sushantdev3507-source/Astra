
"use strict";

(function () {

    

    if (window.ASTRA_CANVAS_INITIALIZED) {

        console.warn(
            "ASTRA: Canvas is already initialized."
        );

        return;
    }


    

    function initializeAstraCanvas() {

        

        if (
            typeof fabric === "undefined"
        ) {

            console.error(
                "ASTRA ERROR: Fabric.js is not loaded."
            );

            return false;
        }


        

        if (
            window.canvas &&
            typeof window.canvas.add === "function"
        ) {

            console.log(
                "ASTRA: Existing Fabric canvas detected."
            );

            window.ASTRA_CANVAS_INITIALIZED = true;

            window.dispatchEvent(
                new CustomEvent(
                    "ASTRA_CANVAS_READY"
                )
            );

            return true;
        }


        

        const canvasElement =
            document.getElementById(
                "editorCanvas"
            );


        if (!canvasElement) {

            console.error(
                "ASTRA ERROR: #editorCanvas not found."
            );

            return false;
        }


        

        try {

            window.canvas =
                new fabric.Canvas(
                    canvasElement,
                    {

                        preserveObjectStacking:
                            true,

                        selection:
                            true,

                        backgroundColor:
                            "#ffffff",

                        uniformScaling:
                            false,

                        fireRightClick:
                            true,

                        stopContextMenu:
                            true

                    }
                );


        } catch (error) {

            console.error(
                "ASTRA ERROR: Failed to create Fabric canvas.",
                error
            );

            return false;
        }


        

        if (
            !window.canvas ||
            typeof window.canvas.add !== "function"
        ) {

            console.error(
                "ASTRA ERROR: Fabric canvas creation failed."
            );

            return false;
        }


        
        window.canvas.set({

            selection:
                true,

            preserveObjectStacking:
                true

        });


        

        window.canvas.on(
            "selection:created",
            function () {

                window.dispatchEvent(
                    new CustomEvent(
                        "ASTRA_OBJECT_SELECTED"
                    )
                );

            }
        );


        window.canvas.on(
            "selection:updated",
            function () {

                window.dispatchEvent(
                    new CustomEvent(
                        "ASTRA_OBJECT_SELECTED"
                    )
                );

            }
        );


        window.canvas.on(
            "selection:cleared",
            function () {

                window.dispatchEvent(
                    new CustomEvent(
                        "ASTRA_SELECTION_CLEARED"
                    )
                );

            }
        );


        
        window.canvas.on(
            "object:modified",
            function () {

                if (
                    typeof window.saveHistory ===
                    "function"
                ) {

                    try {

                        window.saveHistory();

                    } catch (error) {

                        console.warn(
                            "ASTRA: History save failed.",
                            error
                        );

                    }

                }

            }
        );


        
        window.canvas.on(
            "object:added",
            function (event) {

                const object =
                    event.target;


                if (object) {

                    object.set({
                        selectable: true,
                        evented: true
                    });

                }


                window.dispatchEvent(
                    new CustomEvent(
                        "ASTRA_OBJECT_ADDED",
                        {
                            detail: {
                                object: object
                            }
                        }
                    )
                );

            }
        );


        

        window.canvas.on(
            "object:removed",
            function (event) {

                window.dispatchEvent(
                    new CustomEvent(
                        "ASTRA_OBJECT_REMOVED",
                        {
                            detail: {
                                object:
                                    event.target
                            }
                        }
                    )
                );

            }
        );


        
        window.canvas.requestRenderAll();


        

        window.ASTRA_CANVAS_INITIALIZED =
            true;


        console.log(
            "ASTRA: Fabric canvas initialized successfully."
        );


        

        window.dispatchEvent(
            new CustomEvent(
                "ASTRA_CANVAS_READY"
            )
        );


        return true;

    }


    

    function startCanvasInitialization() {

        if (
            window.ASTRA_CANVAS_INITIALIZED
        ) {

            return;
        }


        initializeAstraCanvas();

    }


    

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            startCanvasInitialization,
            {
                once: true
            }
        );

    } else {

        startCanvasInitialization();

    }


    

    window.getAstraCanvas =
        function () {

            if (
                window.canvas &&
                typeof window.canvas.add ===
                    "function"
            ) {

                return window.canvas;

            }

            return null;

        };


    

    window.isAstraCanvasReady =
        function () {

            return !!(
                window.canvas &&
                typeof window.canvas.add ===
                    "function"
            );

        };


    

    window.initializeAstraCanvas =
        initializeAstraCanvas;


    

    console.log(
        "ASTRA: canvas.js loaded successfully."
    );

})();