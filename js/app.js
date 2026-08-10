
"use strict";

console.log("ASTRA: app.js loading...");


const astraAppState = {

    initialized: false,

    replaceMode: false,

    eventsInitialized: false,

    canvasReady: false

};



function getAstraCanvasInstance() {

    

    if (
        window.canvas &&
        typeof window.canvas.add === "function"
    ) {

        return window.canvas;

    }

   

    if (
        window.astraCanvas &&
        typeof window.astraCanvas.add === "function"
    ) {

        return window.astraCanvas;

    }

    

    try {

        if (
            typeof canvas !== "undefined" &&
            canvas &&
            typeof canvas.add === "function"
        ) {

            window.canvas = canvas;

            window.astraCanvas = canvas;

            return canvas;

        }

    } catch (error) {

      

    }

    return null;

}



function ensureAstraCanvas() {

    let currentCanvas =
        getAstraCanvasInstance();

    

    if (currentCanvas) {

        window.canvas =
            currentCanvas;

        window.astraCanvas =
            currentCanvas;

        return currentCanvas;

    }

    

    if (
        typeof fabric === "undefined"
    ) {

        console.error(
            "ASTRA ERROR: Fabric.js is not loaded."
        );

        return null;

    }


    const canvasElement =
        document.getElementById(
            "editorCanvas"
        );

    if (!canvasElement) {

        console.error(
            "ASTRA ERROR: #editorCanvas was not found."
        );

        return null;

    }

    

    currentCanvas =
        new fabric.Canvas(
            "editorCanvas",
            {

                width: 1000,

                height: 650,

                backgroundColor:
                    "#ffffff",

                preserveObjectStacking:
                    true,

                selection:
                    true,

                renderOnAddRemove:
                    true

            }
        );

    

    window.canvas =
        currentCanvas;

    window.astraCanvas =
        currentCanvas;

    console.log(
        "ASTRA: Fabric canvas created."
    );

    

    window.dispatchEvent(
        new CustomEvent(
            "ASTRA_CANVAS_READY"
        )
    );

    return currentCanvas;

}


function getActiveObject() {

    const currentCanvas =
        getAstraCanvasInstance();

    if (!currentCanvas) {

        return null;

    }

    return currentCanvas.getActiveObject();

}


function renderCanvas() {

    const currentCanvas =
        getAstraCanvasInstance();

    if (!currentCanvas) {

        return;

    }

    currentCanvas.requestRenderAll();

}


function astraSaveHistory() {

    if (
        typeof window.saveHistory ===
        "function"
    ) {

        try {

            window.saveHistory();

        } catch (error) {

            console.warn(
                "ASTRA: saveHistory failed.",
                error
            );

        }

    }

}



function astraRefreshLayers() {

    if (
        typeof window.refreshLayers ===
        "function"
    ) {

        try {

            window.refreshLayers();

        } catch (error) {

            console.warn(
                "ASTRA: refreshLayers failed.",
                error
            );

        }

    }

}



function isImageFile(file) {

    if (!file) {

        return false;

    }

    return (
        typeof file.type === "string" &&
        file.type.startsWith("image/")
    );

}


function calculateImageScale(image) {

    if (!image) {

        return 1;

    }

    const currentCanvas =
        getAstraCanvasInstance();

    if (!currentCanvas) {

        return 1;

    }

    const maxWidth =
        currentCanvas.getWidth() * 0.75;

    const maxHeight =
        currentCanvas.getHeight() * 0.75;

    let scale = 1;

    if (
        image.width > maxWidth
    ) {

        scale =
            maxWidth /
            image.width;

    }

    if (
        image.height * scale >
        maxHeight
    ) {

        scale =
            maxHeight /
            image.height;

    }

    return Math.max(
        scale,
        0.05
    );

}


function addImageToCanvas(dataURL) {

    const currentCanvas =
        getAstraCanvasInstance();

    if (!currentCanvas) {

        alert(
            "ASTRA: Canvas is not ready."
        );

        return;

    }

    if (
        typeof fabric === "undefined"
    ) {

        alert(
            "ASTRA: Fabric.js is not loaded."
        );

        return;

    }

    if (!dataURL) {

        return;

    }

    fabric.Image.fromURL(
        dataURL,
        function (img) {

            if (!img) {

                alert(
                    "ASTRA: Unable to load image."
                );

                return;

            }

            const scale =
                calculateImageScale(
                    img
                );

            img.set({

                left:
                    currentCanvas.getWidth() / 2,

                top:
                    currentCanvas.getHeight() / 2,

                originX:
                    "center",

                originY:
                    "center",

                scaleX:
                    scale,

                scaleY:
                    scale,

                selectable:
                    true,

                evented:
                    true,

                hasControls:
                    true,

                hasBorders:
                    true

            });

            img.layerName =
                "Image";

            /*
             * Add image
             */

            currentCanvas.add(
                img
            );

            /*
             * Select image
             */

            currentCanvas.setActiveObject(
                img
            );

            img.setCoords();

            /*
             * Render
             */

            currentCanvas.requestRenderAll();

            /*
             * History
             */

            astraSaveHistory();

            /*
             * Layers
             */

            astraRefreshLayers();

            console.log(
                "ASTRA: Image added successfully."
            );

        },
        {
            crossOrigin:
                "anonymous"
        }
    );

}



function replaceSelectedImage(dataURL) {

    const currentCanvas =
        getAstraCanvasInstance();

    if (!currentCanvas) {

        return;

    }

    const selectedObject =
        getActiveObject();

    if (
        !selectedObject ||
        selectedObject.type !== "image"
    ) {

        alert(
            "Please select an image first."
        );

        return;

    }

    fabric.Image.fromURL(
        dataURL,
        function (newImage) {

            if (!newImage) {

                alert(
                    "ASTRA: Unable to load replacement image."
                );

                return;

            }

            

            const scale =
                calculateImageScale(
                    newImage
                );

            newImage.set({

                left:
                    selectedObject.left,

                top:
                    selectedObject.top,

                angle:
                    selectedObject.angle || 0,

                originX:
                    selectedObject.originX ||
                    "center",

                originY:
                    selectedObject.originY ||
                    "center",

                flipX:
                    selectedObject.flipX ||
                    false,

                flipY:
                    selectedObject.flipY ||
                    false,

                scaleX:
                    scale,

                scaleY:
                    scale,

                selectable:
                    true,

                evented:
                    true,

                hasControls:
                    true,

                hasBorders:
                    true

            });

            newImage.layerName =
                selectedObject.layerName ||
                "Image";

            

            const objects =
                currentCanvas.getObjects();

            const oldIndex =
                objects.indexOf(
                    selectedObject
                );

            
            currentCanvas.remove(
                selectedObject
            );

            

            currentCanvas.add(
                newImage
            );

            

            if (
                oldIndex >= 0
            ) {

                currentCanvas.moveObjectTo(
                    newImage,
                    oldIndex
                );

            }

            

            currentCanvas.setActiveObject(
                newImage
            );

            newImage.setCoords();

            currentCanvas.requestRenderAll();

            astraSaveHistory();

            astraRefreshLayers();

            console.log(
                "ASTRA: Image replaced successfully."
            );

        },
        {
            crossOrigin:
                "anonymous"
        }
    );

}


function createImageInputIfNeeded() {

    let input =
        document.getElementById(
            "imageInput"
        );

    if (input) {

        return input;

    }

    

    input =
        document.createElement(
            "input"
        );

    input.type =
        "file";

    input.accept =
        "image/*";

    input.id =
        "imageInput";

    input.style.display =
        "none";

    document.body.appendChild(
        input
    );

    return input;

}



function openImagePicker(
    replace = false
) {

    const input =
        createImageInputIfNeeded();

    astraAppState.replaceMode =
        replace;

    input.value =
        "";

    input.click();

}


function initializeImageUpload() {

    const input =
        createImageInputIfNeeded();

   

    if (
        input.dataset.astraInitialized ===
        "true"
    ) {

        return;

    }

    input.dataset.astraInitialized =
        "true";

    input.addEventListener(
        "change",
        function (event) {

            const file =
                event.target.files &&
                event.target.files[0];

            if (!file) {

                return;

            }

            

            if (
                !isImageFile(file)
            ) {

                alert(
                    "Please select a valid image file."
                );

                input.value =
                    "";

                astraAppState.replaceMode =
                    false;

                return;

            }

            

            const reader =
                new FileReader();

            reader.onload =
                function (e) {

                    const dataURL =
                        e.target.result;

                    if (
                        astraAppState.replaceMode
                    ) {

                        replaceSelectedImage(
                            dataURL
                        );

                    } else {

                        addImageToCanvas(
                            dataURL
                        );

                    }

                    astraAppState.replaceMode =
                        false;

                    input.value =
                        "";

                };

            reader.onerror =
                function () {

                    alert(
                        "ASTRA: Unable to read image."
                    );

                    astraAppState.replaceMode =
                        false;

                    input.value =
                        "";

                };

            reader.readAsDataURL(
                file
            );

        }
    );

}


function initializeImageButtons() {

    const uploadButton =
        document.getElementById(
            "uploadImage"
        );

    const replaceButton =
        document.getElementById(
            "replaceImage"
        );

    

    if (uploadButton) {

        uploadButton.addEventListener(
            "click",
            function (event) {

                event.preventDefault();

                openImagePicker(
                    false
                );

            }
        );

    }

   

    if (replaceButton) {

        replaceButton.addEventListener(
            "click",
            function (event) {

                event.preventDefault();

                const object =
                    getActiveObject();

                if (
                    !object ||
                    object.type !== "image"
                ) {

                    alert(
                        "Please select an image first."
                    );

                    return;

                }

                openImagePicker(
                    true
                );

            }
        );

    }

}


function deleteSelectedObject() {

    const currentCanvas =
        getAstraCanvasInstance();

    if (!currentCanvas) {

        return;

    }

    const object =
        currentCanvas.getActiveObject();

    if (!object) {

        alert(
            "Please select an object first."
        );

        return;

    }

    

    if (
        object.type === "activeSelection"
    ) {

        const objects =
            object.getObjects();

        currentCanvas.discardActiveObject();

        objects.forEach(
            function (item) {

                currentCanvas.remove(
                    item
                );

            }
        );

    } else {

        currentCanvas.remove(
            object
        );

    }

    currentCanvas.discardActiveObject();

    currentCanvas.requestRenderAll();

    astraSaveHistory();

    astraRefreshLayers();

    console.log(
        "ASTRA: Object deleted."
    );

}



function initializeDeleteButtons() {

    const buttonIds = [

        "deleteImage",

        "deleteBtn",

        "layerDelete"

    ];

    buttonIds.forEach(
        function (id) {

            const button =
                document.getElementById(
                    id
                );

            if (!button) {

                return;

            }

            button.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();

                    deleteSelectedObject();

                }
            );

        }
    );

}



function duplicateSelectedObject() {

    const currentCanvas =
        getAstraCanvasInstance();

    if (!currentCanvas) {

        return;

    }

    const object =
        currentCanvas.getActiveObject();

    if (!object) {

        alert(
            "Please select an object first."
        );

        return;

    }

    

    if (
        object.type === "activeSelection"
    ) {

        const objects =
            object.getObjects();

        const clones = [];

        let completed =
            0;

        objects.forEach(
            function (item) {

                item.clone(
                    function (cloned) {

                        cloned.set({

                            left:
                                (item.left || 0) +
                                30,

                            top:
                                (item.top || 0) +
                                30

                        });

                        if (
                            item.layerName
                        ) {

                            cloned.layerName =
                                item.layerName +
                                " Copy";

                        }

                        currentCanvas.add(
                            cloned
                        );

                        clones.push(
                            cloned
                        );

                        completed++;

                        if (
                            completed ===
                            objects.length
                        ) {

                            currentCanvas.discardActiveObject();

                            const selection =
                                new fabric.ActiveSelection(
                                    clones,
                                    {
                                        canvas:
                                            currentCanvas
                                    }
                                );

                            currentCanvas.setActiveObject(
                                selection
                            );

                            currentCanvas.requestRenderAll();

                            astraSaveHistory();

                            astraRefreshLayers();

                        }

                    }
                );

            }
        );

        return;

    }

    
    object.clone(
        function (cloned) {

            cloned.set({

                left:
                    (object.left || 0) +
                    30,

                top:
                    (object.top || 0) +
                    30

            });

            cloned.layerName =
                object.layerName
                    ? object.layerName +
                      " Copy"
                    : "Copy";

            currentCanvas.add(
                cloned
            );

            currentCanvas.setActiveObject(
                cloned
            );

            cloned.setCoords();

            currentCanvas.requestRenderAll();

            astraSaveHistory();

            astraRefreshLayers();

            console.log(
                "ASTRA: Object duplicated."
            );

        }
    );

}


function initializeDuplicateButtons() {

    const buttonIds = [

        "duplicateImage",

        "duplicateBtn",

        "layerDuplicate"

    ];

    buttonIds.forEach(
        function (id) {

            const button =
                document.getElementById(
                    id
                );

            if (!button) {

                return;

            }

            button.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();

                    duplicateSelectedObject();

                }
            );

        }
    );

}



function initializeBackground() {

    const button =
        document.getElementById(
            "setBackground"
        );

    let input =
        document.getElementById(
            "astraBackgroundInput"
        );

    

    if (!input) {

        input =
            document.createElement(
                "input"
            );

        input.type =
            "color";

        input.id =
            "astraBackgroundInput";

        input.value =
            "#ffffff";

        input.style.position =
            "fixed";

        input.style.left =
            "-9999px";

        input.style.opacity =
            "0";

        document.body.appendChild(
            input
        );

    }

    

    if (button) {

        button.addEventListener(
            "click",
            function (event) {

                event.preventDefault();

                const currentCanvas =
                    getAstraCanvasInstance();

                if (!currentCanvas) {

                    return;

                }

                const background =
                    currentCanvas.backgroundColor;

                if (
                    typeof background ===
                    "string" &&
                    background.startsWith("#")
                ) {

                    input.value =
                        background;

                }

                input.click();

            }
        );

    }

    

    input.addEventListener(
        "change",
        function () {

            const currentCanvas =
                getAstraCanvasInstance();

            if (!currentCanvas) {

                return;

            }

            currentCanvas.set(
                "backgroundColor",
                input.value
            );

            currentCanvas.requestRenderAll();

            astraSaveHistory();

        }
    );

}


function handleSaveProject() {

    const currentCanvas =
        getAstraCanvasInstance();

    if (!currentCanvas) {

        alert(
            "ASTRA: Canvas is not ready."
        );

        return;

    }

    

    if (
        typeof window.saveProject ===
        "function" &&
        window.saveProject !==
        handleSaveProject
    ) {

        try {

            window.saveProject();

            return;

        } catch (error) {

            console.warn(
                "ASTRA: Existing saveProject failed.",
                error
            );

        }

    }

    

    try {

        const projectData =
            currentCanvas.toJSON(
                [
                    "layerName",
                    "excludeFromExport"
                ]
            );

        localStorage.setItem(
            "ASTRA_PROJECT",
            JSON.stringify(
                projectData
            )
        );

        alert(
            "Project saved successfully!"
        );

    } catch (error) {

        console.error(
            "ASTRA: Save failed.",
            error
        );

        alert(
            "Unable to save project."
        );

    }

}


function initializeSaveButtons() {

    const ids = [

        "saveBtn",

        "saveProject"

    ];

    ids.forEach(
        function (id) {

            const button =
                document.getElementById(
                    id
                );

            if (!button) {

                return;

            }

            button.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();

                    handleSaveProject();

                }
            );

        }
    );

}



function exportCanvasPNG() {

    const currentCanvas =
        getAstraCanvasInstance();

    if (!currentCanvas) {

        alert(
            "ASTRA: Canvas is not ready."
        );

        return;

    }

    

    if (
        typeof window.exportPNG ===
        "function" &&
        window.exportPNG !==
        exportCanvasPNG
    ) {

        try {

            window.exportPNG();

            return;

        } catch (error) {

            console.warn(
                "ASTRA: Existing exportPNG failed.",
                error
            );

        }

    }

    try {

        const dataURL =
            currentCanvas.toDataURL({

                format:
                    "png",

                multiplier:
                    1

            });

        const link =
            document.createElement(
                "a"
            );

        link.download =
            "astra-design.png";

        link.href =
            dataURL;

        document.body.appendChild(
            link
        );

        link.click();

        link.remove();

        console.log(
            "ASTRA: PNG exported."
        );

    } catch (error) {

        console.error(
            "ASTRA: PNG export failed.",
            error
        );

        alert(
            "Unable to export PNG."
        );

    }

}



function exportCanvasJPG() {

    const currentCanvas =
        getAstraCanvasInstance();

    if (!currentCanvas) {

        alert(
            "ASTRA: Canvas is not ready."
        );

        return;

    }

    if (
        typeof window.exportJPG ===
        "function" &&
        window.exportJPG !==
        exportCanvasJPG
    ) {

        try {

            window.exportJPG();

            return;

        } catch (error) {

            console.warn(
                "ASTRA: Existing exportJPG failed.",
                error
            );

        }

    }

    try {

        const dataURL =
            currentCanvas.toDataURL({

                format:
                    "jpeg",

                quality:
                    0.9,

                multiplier:
                    1

            });

        const link =
            document.createElement(
                "a"
            );

        link.download =
            "astra-design.jpg";

        link.href =
            dataURL;

        document.body.appendChild(
            link
        );

        link.click();

        link.remove();

        console.log(
            "ASTRA: JPG exported."
        );

    } catch (error) {

        console.error(
            "ASTRA: JPG export failed.",
            error
        );

        alert(
            "Unable to export JPG."
        );

    }

}


function initializeExportButtons() {

    const pngButton =
        document.getElementById(
            "exportPNG"
        );

    const jpgButton =
        document.getElementById(
            "exportJPG"
        );

    const exportButton =
        document.getElementById(
            "exportBtn"
        );

    const printButton =
        document.getElementById(
            "printCanvas"
        );

    if (pngButton) {

        pngButton.addEventListener(
            "click",
            function (event) {

                event.preventDefault();

                exportCanvasPNG();

            }
        );

    }

    if (jpgButton) {

        jpgButton.addEventListener(
            "click",
            function (event) {

                event.preventDefault();

                exportCanvasJPG();

            }
        );

    }

    if (exportButton) {

        exportButton.addEventListener(
            "click",
            function (event) {

                event.preventDefault();

                exportCanvasPNG();

            }
        );

    }

    if (printButton) {

        printButton.addEventListener(
            "click",
            function (event) {

                event.preventDefault();

                window.print();

            }
        );

    }

}



function initializeClearRecovery() {

    const button =
        document.getElementById(
            "clearRecovery"
        );

    if (!button) {

        return;

    }

    button.addEventListener(
        "click",
        function (event) {

            event.preventDefault();

            const confirmed =
                confirm(
                    "Clear all ASTRA recovery data?"
                );

            if (!confirmed) {

                return;

            }

            localStorage.removeItem(
                "ASTRA_AUTOSAVE"
            );

            localStorage.removeItem(
                "ASTRA_PROJECT"
            );

            alert(
                "Recovery data cleared."
            );

        }
    );

}



function copySelectedObject() {

    const object =
        getActiveObject();

    if (!object) {

        return;

    }

    

    object.clone(
        function (cloned) {

            window.astraClipboardObject =
                cloned;

        }
    );

}



function pasteSelectedObject() {

    const currentCanvas =
        getAstraCanvasInstance();

    const object =
        window.astraClipboardObject;

    if (
        !currentCanvas ||
        !object
    ) {

        return;

    }

    object.clone(
        function (cloned) {

            cloned.set({

                left:
                    (object.left || 0) +
                    30,

                top:
                    (object.top || 0) +
                    30

            });

            currentCanvas.add(
                cloned
            );

            currentCanvas.setActiveObject(
                cloned
            );

            currentCanvas.requestRenderAll();

            astraSaveHistory();

            astraRefreshLayers();

        }
    );

}


function initializeKeyboardShortcuts() {

    document.addEventListener(
        "keydown",
        function (event) {

            const target =
                event.target;

            if (!target) {

                return;

            }

            const tag =
                target.tagName
                    ? target.tagName.toUpperCase()
                    : "";

            const isTyping =
                tag === "INPUT" ||
                tag === "TEXTAREA" ||
                tag === "SELECT" ||
                target.isContentEditable;

            if (isTyping) {

                return;

            }

            

            if (
                event.key === "Delete"
            ) {

                event.preventDefault();

                deleteSelectedObject();

            }

            

            if (
                event.key === "Backspace"
            ) {

                event.preventDefault();

                deleteSelectedObject();

            }

            

            if (
                event.ctrlKey &&
                event.key.toLowerCase() === "d"
            ) {

                event.preventDefault();

                duplicateSelectedObject();

            }

            
            if (
                event.ctrlKey &&
                event.key.toLowerCase() === "c"
            ) {

                copySelectedObject();

            }

            

            if (
                event.ctrlKey &&
                event.key.toLowerCase() === "v"
            ) {

                event.preventDefault();

                pasteSelectedObject();

            }

        }
    );

}



function initializeCanvasEvents() {

    const currentCanvas =
        getAstraCanvasInstance();

    if (!currentCanvas) {

        return;

    }

    if (
        currentCanvas.__astraAppEventsInitialized
    ) {

        return;

    }

    currentCanvas.__astraAppEventsInitialized =
        true;

    

    currentCanvas.on(
        "selection:created",
        function () {

            astraRefreshLayers();

        }
    );


    currentCanvas.on(
        "selection:updated",
        function () {

            astraRefreshLayers();

        }
    );

    

    currentCanvas.on(
        "selection:cleared",
        function () {

            astraRefreshLayers();

        }
    );

    

    currentCanvas.on(
        "object:modified",
        function () {

            astraSaveHistory();

            astraRefreshLayers();

        }
    );

    

    currentCanvas.on(
        "object:added",
        function () {

            astraRefreshLayers();

        }
    );

    

    currentCanvas.on(
        "object:removed",
        function () {

            astraRefreshLayers();

        }
    );

    console.log(
        "ASTRA: Canvas events initialized."
    );

}


function initializeAppButtons() {

    if (
        astraAppState.eventsInitialized
    ) {

        return;

    }

    initializeImageUpload();

    initializeImageButtons();

    initializeDeleteButtons();

    initializeDuplicateButtons();

    initializeBackground();

    initializeSaveButtons();

    initializeExportButtons();

    initializeClearRecovery();

    initializeKeyboardShortcuts();

    astraAppState.eventsInitialized =
        true;

    console.log(
        "ASTRA: Application buttons initialized."
    );

}


function initializeAstraApp() {

    
    if (
        astraAppState.initialized
    ) {

        return true;

    }

    console.log(
        "ASTRA: Initializing application..."
    );

    

    const currentCanvas =
        ensureAstraCanvas();

    if (!currentCanvas) {

        console.warn(
            "ASTRA: Canvas not ready yet."
        );

        return false;

    }

    astraAppState.canvasReady =
        true;

    

    initializeAppButtons();

    

    initializeCanvasEvents();

    

    currentCanvas.requestRenderAll();

    

    astraRefreshLayers();

    

    astraAppState.initialized =
        true;

    console.log(
        "ASTRA: Main application initialized successfully."
    );

    return true;

}



function waitForAstraCanvas() {

    

    if (
        initializeAstraApp()
    ) {

        return;

    }

    

    window.addEventListener(
        "ASTRA_CANVAS_READY",
        function () {

            initializeAstraApp();

        },
        {
            once:
                true
        }
    );

    

    let attempts =
        0;

    const maxAttempts =
        50;

    const timer =
        setInterval(
            function () {

                attempts++;

                if (
                    initializeAstraApp()
                ) {

                    clearInterval(
                        timer
                    );

                    return;

                }

                if (
                    attempts >=
                    maxAttempts
                ) {

                    clearInterval(
                        timer
                    );

                    console.error(
                        "ASTRA ERROR: Canvas could not be initialized."
                    );

                }

            },
            100
        );

}


function startAstraApplication() {

    console.log(
        "ASTRA: DOM ready."
    );

    

    if (
        typeof fabric === "undefined"
    ) {

        console.error(
            "ASTRA ERROR: Fabric.js is not loaded. Check script order."
        );

        return;

    }

    

    waitForAstraCanvas();

}



if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        startAstraApplication,
        {
            once:
                true
        }
    );

} else {

    startAstraApplication();

}


window.getAstraCanvasInstance =
    getAstraCanvasInstance;

window.ensureAstraCanvas =
    ensureAstraCanvas;

window.getActiveObject =
    getActiveObject;

window.renderCanvas =
    renderCanvas;

window.addImageToCanvas =
    addImageToCanvas;

window.replaceSelectedImage =
    replaceSelectedImage;

window.deleteSelectedObject =
    deleteSelectedObject;

window.duplicateSelectedObject =
    duplicateSelectedObject;

window.handleSaveProject =
    handleSaveProject;

window.exportCanvasPNG =
    exportCanvasPNG;

window.exportCanvasJPG =
    exportCanvasJPG;

window.copySelectedObject =
    copySelectedObject;

window.pasteSelectedObject =
    pasteSelectedObject;

window.openImagePicker =
    openImagePicker;


console.log(
    "ASTRA: app.js loaded successfully."
);

