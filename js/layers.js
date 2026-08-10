

"use strict";



const layersList =
document.getElementById("layersList");



function getLayersCanvas() {

    if (
        typeof window.canvas !== "undefined" &&
        window.canvas
    ) {

        return window.canvas;

    }

    console.warn(
        "ASTRA: Canvas is not initialized yet."
    );

    return null;

}



function refreshLayers() {

    const canvas =
        getLayersCanvas();

    if (!canvas) {
        return;
    }

    if (!layersList) {

        console.warn(
            "ASTRA: layersList element not found."
        );

        return;

    }

    layersList.innerHTML = "";

    const objects =
        canvas.getObjects();

    console.log(
        "ASTRA: Layers refreshed. Objects:",
        objects.length
    );

    if (objects.length === 0) {

        const emptyMessage =
            document.createElement("div");

        emptyMessage.className =
            "layers-empty";

        emptyMessage.textContent =
            "No layers yet";

        layersList.appendChild(
            emptyMessage
        );

        return;

    }

    objects
        .slice()
        .reverse()
        .forEach(
            function (obj, index) {

                const layer =
                    document.createElement("div");

                layer.className =
                    "layer-item";

                if (
                    canvas.getActiveObject() === obj
                ) {

                    layer.classList.add(
                        "active"
                    );

                }

                const layerName =
                    obj.layerName ||
                    (
                        obj.type
                            ? obj.type.toUpperCase()
                            : "OBJECT"
                    );

                const layerNumber =
                    objects.length - index;

                layer.innerHTML = `

                    <span class="layer-name">
                        ${layerName} ${layerNumber}
                    </span>

                    <div class="layer-actions">

                        <button
                            type="button"
                            class="lockLayer"
                            title="Lock / Unlock Layer">

                            ${obj.selectable === false
                                ? "🔒"
                                : "🔓"}

                        </button>

                        <button
                            type="button"
                            class="toggleLayer"
                            title="Show / Hide Layer">

                            ${obj.visible === false
                                ? "🚫"
                                : "👁"}

                        </button>

                    </div>

                `;

                

                const toggleBtn =
                    layer.querySelector(
                        ".toggleLayer"
                    );

                if (toggleBtn) {

                    toggleBtn.onclick =
                        function (e) {

                            e.stopPropagation();

                            obj.visible =
                                obj.visible === false;

                            if (
                                obj.visible === false &&
                                canvas.getActiveObject() === obj
                            ) {

                                canvas.discardActiveObject();

                            }

                            canvas.requestRenderAll();

                            refreshLayers();

                        };

                }

                

                const lockBtn =
                    layer.querySelector(
                        ".lockLayer"
                    );

                if (lockBtn) {

                    lockBtn.onclick =
                        function (e) {

                            e.stopPropagation();

                            const isLocked =
                                obj.selectable === false;

                            if (isLocked) {

                                obj.selectable = true;
                                obj.evented = true;
                                obj.hasControls = true;
                                obj.lockMovementX = false;
                                obj.lockMovementY = false;
                                obj.lockRotation = false;
                                obj.lockScalingX = false;
                                obj.lockScalingY = false;

                            } else {

                                obj.selectable = false;
                                obj.evented = false;
                                obj.hasControls = false;
                                obj.lockMovementX = true;
                                obj.lockMovementY = true;
                                obj.lockRotation = true;
                                obj.lockScalingX = true;
                                obj.lockScalingY = true;

                                if (
                                    canvas.getActiveObject() === obj
                                ) {

                                    canvas.discardActiveObject();

                                }

                            }

                            canvas.requestRenderAll();

                            refreshLayers();

                        };

                }

                
                layer.onclick =
                    function () {

                        if (
                            obj.visible === false
                        ) {
                            return;
                        }

                        if (
                            obj.selectable === false
                        ) {
                            return;
                        }

                        canvas.setActiveObject(
                            obj
                        );

                        canvas.requestRenderAll();

                        refreshLayers();

                    };

                
                layer.ondblclick =
                    function (e) {

                        e.stopPropagation();

                        const currentName =
                            obj.layerName ||
                            obj.type ||
                            "Layer";

                        const name =
                            prompt(
                                "Enter Layer Name:",
                                currentName
                            );

                        if (
                            name &&
                            name.trim() !== ""
                        ) {

                            obj.layerName =
                                name.trim();

                            canvas.requestRenderAll();

                            refreshLayers();

                        }

                    };

                

                layersList.appendChild(
                    layer
                );

            }
        );

}



function initializeLayerCanvasEvents() {

    const canvas =
        getLayersCanvas();

    if (!canvas) {
        return;
    }

    canvas.on(
        "object:added",
        refreshLayers
    );

    canvas.on(
        "object:removed",
        refreshLayers
    );

    canvas.on(
        "selection:created",
        refreshLayers
    );

    canvas.on(
        "selection:updated",
        refreshLayers
    );

    canvas.on(
        "selection:cleared",
        refreshLayers
    );

    canvas.on(
        "object:modified",
        refreshLayers
    );

}



const layerFront =
document.getElementById(
    "layerFront"
);

if (layerFront) {

    layerFront.onclick =
        function () {

            const canvas =
                getLayersCanvas();

            if (!canvas) {
                return;
            }

            const obj =
                canvas.getActiveObject();

            if (!obj) {

                alert(
                    "Please select a layer first."
                );

                return;

            }

            canvas.bringToFront(
                obj
            );

            canvas.requestRenderAll();

            refreshLayers();

        };

}



const layerBack =
document.getElementById(
    "layerBack"
);

if (layerBack) {

    layerBack.onclick =
        function () {

            const canvas =
                getLayersCanvas();

            if (!canvas) {
                return;
            }

            const obj =
                canvas.getActiveObject();

            if (!obj) {

                alert(
                    "Please select a layer first."
                );

                return;

            }

            canvas.sendToBack(
                obj
            );

            canvas.requestRenderAll();

            refreshLayers();

        };

}



const layerDuplicate =
document.getElementById(
    "layerDuplicate"
);

if (layerDuplicate) {

    layerDuplicate.onclick =
        function () {

            const canvas =
                getLayersCanvas();

            if (!canvas) {
                return;
            }

            const obj =
                canvas.getActiveObject();

            if (!obj) {

                alert(
                    "Please select a layer first."
                );

                return;

            }

            obj.clone(
                function (clone) {

                    clone.set({

                        left:
                            (obj.left || 0) + 20,

                        top:
                            (obj.top || 0) + 20

                    });

                    clone.layerName =
                        obj.layerName
                            ? `${obj.layerName} Copy`
                            : `${obj.type || "Layer"} Copy`;

                    clone.selectable =
                        true;

                    clone.evented =
                        true;

                    canvas.add(
                        clone
                    );

                    canvas.setActiveObject(
                        clone
                    );

                    canvas.requestRenderAll();

                    refreshLayers();

                }
            );

        };

}


const layerDelete =
document.getElementById(
    "layerDelete"
);

if (layerDelete) {

    layerDelete.onclick =
        function () {

            const canvas =
                getLayersCanvas();

            if (!canvas) {
                return;
            }

            const obj =
                canvas.getActiveObject();

            if (!obj) {

                alert(
                    "Please select a layer first."
                );

                return;

            }

            canvas.remove(
                obj
            );

            canvas.discardActiveObject();

            canvas.requestRenderAll();

            refreshLayers();

        };

}



function initializeLayers() {

    const canvas =
        getLayersCanvas();

    if (!canvas) {

        let attempts = 0;

        const maxAttempts = 50;

        const waitForCanvas =
            setInterval(
                function () {

                    attempts++;

                    const currentCanvas =
                        getLayersCanvas();

                    if (currentCanvas) {

                        clearInterval(
                            waitForCanvas
                        );

                        initializeLayerCanvasEvents();

                        refreshLayers();

                        console.log(
                            "ASTRA: Layers initialized successfully."
                        );

                    }

                    if (
                        attempts >= maxAttempts
                    ) {

                        clearInterval(
                            waitForCanvas
                        );

                        console.error(
                            "ASTRA: Layers initialization failed - Canvas not found."
                        );

                    }

                },
                100
            );

        return;

    }

    initializeLayerCanvasEvents();

    refreshLayers();

    console.log(
        "ASTRA: Layers initialized successfully."
    );

}



document.addEventListener(
    "DOMContentLoaded",
    function () {

        initializeLayers();

    }
);



window.refreshLayers =
    refreshLayers;



console.log(
    "ASTRA: Layers module loaded."
);
