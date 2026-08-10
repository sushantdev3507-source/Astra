
"use strict";



let astraTextToolsInitialized = false;



function isTextCanvasReady() {

    return (
        typeof canvas !== "undefined" &&
        canvas &&
        typeof canvas.add === "function" &&
        typeof canvas.getActiveObject === "function"
    );

}



function getTextCanvas() {

    if (isTextCanvasReady()) {
        return canvas;
    }

    return null;

}



function isTextObject(obj) {

    if (!obj) {
        return false;
    }

    return (
        obj.type === "i-text" ||
        obj.type === "textbox" ||
        obj.type === "text"
    );

}



function getSelectedTextObject() {

    const currentCanvas = getTextCanvas();

    if (!currentCanvas) {
        return null;
    }

    const obj =
        currentCanvas.getActiveObject();

    if (!isTextObject(obj)) {
        return null;
    }

    return obj;

}



function saveTextHistory() {

    if (
        typeof saveHistory === "function"
    ) {

        try {

            saveHistory();

        } catch (error) {

            console.warn(
                "ASTRA: Text history error:",
                error
            );

        }

    }

}



function renderTextCanvas() {

    const currentCanvas =
        getTextCanvas();

    if (!currentCanvas) {
        return;
    }

    currentCanvas.requestRenderAll();

}



function addAstraHeading() {

    const currentCanvas =
        getTextCanvas();

    if (!currentCanvas) {

        alert(
            "ASTRA canvas is not ready yet."
        );

        return;

    }

    if (
        typeof fabric === "undefined" ||
        !fabric.IText
    ) {

        console.error(
            "ASTRA: Fabric.IText is unavailable."
        );

        return;

    }

    const centerX =
        currentCanvas.getWidth() / 2;

    const centerY =
        currentCanvas.getHeight() / 2;

    const text =
        new fabric.IText(
            "Heading",
            {

                left: centerX,

                top: centerY - 100,

                originX: "center",

                originY: "center",

                fontFamily: "Poppins",

                fontSize: 48,

                fontWeight: "700",

                fontStyle: "normal",

                fill: "#000000",

                textAlign: "center",

                underline: false,

                editable: true,

                selectable: true,

                evented: true,

                objectCaching: false

            }
        );

    currentCanvas.add(text);

    currentCanvas.setActiveObject(text);

    text.enterEditing();

    text.selectAll();

    currentCanvas.requestRenderAll();

    syncTextPanel();

    saveTextHistory();

}


function addAstraParagraph() {

    const currentCanvas =
        getTextCanvas();

    if (!currentCanvas) {

        alert(
            "ASTRA canvas is not ready yet."
        );

        return;

    }

    if (
        typeof fabric === "undefined" ||
        !fabric.Textbox
    ) {

        console.error(
            "ASTRA: Fabric.Textbox is unavailable."
        );

        return;

    }

    const centerX =
        currentCanvas.getWidth() / 2;

    const centerY =
        currentCanvas.getHeight() / 2;

    const text =
        new fabric.Textbox(
            "Type your paragraph here",
            {

                left: centerX,

                top: centerY,

                width: 400,

                originX: "center",

                originY: "center",

                fontFamily: "Poppins",

                fontSize: 24,

                fontWeight: "400",

                fontStyle: "normal",

                fill: "#333333",

                lineHeight: 1.4,

                textAlign: "left",

                underline: false,

                editable: true,

                selectable: true,

                evented: true,

                objectCaching: false

            }
        );

    currentCanvas.add(text);

    currentCanvas.setActiveObject(text);

    text.enterEditing();

    text.selectAll();

    currentCanvas.requestRenderAll();

    syncTextPanel();

    saveTextHistory();

}



function normalizeTextColor(color) {

    if (
        typeof color !== "string"
    ) {

        return null;

    }

    const value =
        color.trim();

    if (
        /^#[0-9A-Fa-f]{6}$/.test(value)
    ) {

        return value;

    }

    if (
        /^#[0-9A-Fa-f]{3}$/.test(value)
    ) {

        return (
            "#" +
            value[1] + value[1] +
            value[2] + value[2] +
            value[3] + value[3]
        );

    }

    return null;

}



function syncTextPanel() {

    const obj =
        getSelectedTextObject();

    if (!obj) {
        return;
    }

    const fontFamily =
        document.getElementById(
            "fontFamily"
        );

    const fontSize =
        document.getElementById(
            "fontSize"
        );

    const fontColor =
        document.getElementById(
            "fontColor"
        );

    const textAlign =
        document.getElementById(
            "textAlign"
        );

    const boldBtn =
        document.getElementById(
            "boldBtn"
        );

    const italicBtn =
        document.getElementById(
            "italicBtn"
        );

    const underlineBtn =
        document.getElementById(
            "underlineBtn"
        );

    if (fontFamily) {

        const exists =
            Array.from(
                fontFamily.options
            ).some(
                option =>
                    option.value ===
                    obj.fontFamily
            );

        if (exists) {

            fontFamily.value =
                obj.fontFamily;

        }

    }

    if (fontSize) {

        fontSize.value =
            Math.round(
                obj.fontSize || 40
            );

    }

    if (fontColor) {

        const color =
            normalizeTextColor(
                obj.fill
            );

        if (color) {

            fontColor.value =
                color;

        }

    }

    if (textAlign) {

        textAlign.value =
            obj.textAlign ||
            "left";

    }

    if (boldBtn) {

        boldBtn.classList.toggle(
            "active",
            obj.fontWeight === "bold" ||
            obj.fontWeight === "700"
        );

    }

    if (italicBtn) {

        italicBtn.classList.toggle(
            "active",
            obj.fontStyle === "italic"
        );

    }

    if (underlineBtn) {

        underlineBtn.classList.toggle(
            "active",
            obj.underline === true
        );

    }

}



function initializeAstraTextTools() {

    if (astraTextToolsInitialized) {
        return;
    }

    const currentCanvas =
        getTextCanvas();

    if (!currentCanvas) {

        console.warn(
            "ASTRA: Waiting for Fabric canvas..."
        );

        return;

    }

    

    const headingBtn =
        document.getElementById(
            "addHeading"
        );

    const paragraphBtn =
        document.getElementById(
            "addParagraph"
        );

    const fontFamily =
        document.getElementById(
            "fontFamily"
        );

    const fontSize =
        document.getElementById(
            "fontSize"
        );

    const fontColor =
        document.getElementById(
            "fontColor"
        );

    const textAlign =
        document.getElementById(
            "textAlign"
        );

    const boldBtn =
        document.getElementById(
            "boldBtn"
        );

    const italicBtn =
        document.getElementById(
            "italicBtn"
        );

    const underlineBtn =
        document.getElementById(
            "underlineBtn"
        );

    

    if (headingBtn) {

        headingBtn.addEventListener(
            "click",
            addAstraHeading
        );

    }

    

    if (paragraphBtn) {

        paragraphBtn.addEventListener(
            "click",
            addAstraParagraph
        );

    }

    
    if (fontFamily) {

        fontFamily.addEventListener(
            "change",
            function () {

                const obj =
                    getSelectedTextObject();

                if (!obj) {

                    alert(
                        "Please select a text object first."
                    );

                    return;

                }

                obj.set({
                    fontFamily:
                        fontFamily.value
                });

                obj.setCoords();

                renderTextCanvas();

                saveTextHistory();

            }
        );

    }

    

    if (fontSize) {

        fontSize.addEventListener(
            "input",
            function () {

                const obj =
                    getSelectedTextObject();

                if (!obj) {
                    return;
                }

                const value =
                    Number(
                        fontSize.value
                    );

                if (
                    !Number.isFinite(value) ||
                    value < 8 ||
                    value > 200
                ) {

                    return;

                }

                obj.set({
                    fontSize:
                        value
                });

                obj.setCoords();

                renderTextCanvas();

            }
        );

        fontSize.addEventListener(
            "change",
            function () {

                const obj =
                    getSelectedTextObject();

                if (!obj) {
                    return;
                }

                saveTextHistory();

            }
        );

    }

    

    if (fontColor) {

        fontColor.addEventListener(
            "input",
            function () {

                const obj =
                    getSelectedTextObject();

                if (!obj) {
                    return;
                }

                obj.set({
                    fill:
                        fontColor.value
                });

                obj.setCoords();

                renderTextCanvas();

            }
        );

        fontColor.addEventListener(
            "change",
            function () {

                const obj =
                    getSelectedTextObject();

                if (!obj) {
                    return;
                }

                saveTextHistory();

            }
        );

    }

    
    if (boldBtn) {

        boldBtn.addEventListener(
            "click",
            function () {

                const obj =
                    getSelectedTextObject();

                if (!obj) {

                    alert(
                        "Please select a text object first."
                    );

                    return;

                }

                obj.set({

                    fontWeight:
                        (
                            obj.fontWeight === "bold" ||
                            obj.fontWeight === "700"
                        )
                            ? "normal"
                            : "bold"

                });

                obj.setCoords();

                renderTextCanvas();

                syncTextPanel();

                saveTextHistory();

            }
        );

    }

    
    if (italicBtn) {

        italicBtn.addEventListener(
            "click",
            function () {

                const obj =
                    getSelectedTextObject();

                if (!obj) {

                    alert(
                        "Please select a text object first."
                    );

                    return;

                }

                obj.set({

                    fontStyle:
                        obj.fontStyle === "italic"
                            ? "normal"
                            : "italic"

                });

                obj.setCoords();

                renderTextCanvas();

                syncTextPanel();

                saveTextHistory();

            }
        );

    }

    

    if (underlineBtn) {

        underlineBtn.addEventListener(
            "click",
            function () {

                const obj =
                    getSelectedTextObject();

                if (!obj) {

                    alert(
                        "Please select a text object first."
                    );

                    return;

                }

                obj.set({

                    underline:
                        !obj.underline

                });

                obj.setCoords();

                renderTextCanvas();

                syncTextPanel();

                saveTextHistory();

            }
        );

    }

    

    if (textAlign) {

        textAlign.addEventListener(
            "change",
            function () {

                const obj =
                    getSelectedTextObject();

                if (!obj) {

                    alert(
                        "Please select a text object first."
                    );

                    return;

                }

                obj.set({

                    textAlign:
                        textAlign.value

                });

                obj.setCoords();

                renderTextCanvas();

                syncTextPanel();

                saveTextHistory();

            }
        );

    }

    

    currentCanvas.on(
        "selection:created",
        function () {

            syncTextPanel();

        }
    );

    currentCanvas.on(
        "selection:updated",
        function () {

            syncTextPanel();

        }
    );

    currentCanvas.on(
        "selection:cleared",
        function () {

            if (boldBtn) {
                boldBtn.classList.remove(
                    "active"
                );
            }

            if (italicBtn) {
                italicBtn.classList.remove(
                    "active"
                );
            }

            if (underlineBtn) {
                underlineBtn.classList.remove(
                    "active"
                );
            }

        }
    );

    currentCanvas.on(
        "object:modified",
        function () {

            syncTextPanel();

        }
    );

    astraTextToolsInitialized =
        true;

    console.log(
        "ASTRA: Text Tools initialized successfully."
    );

}



function waitForAstraTextCanvas() {

    if (
        astraTextToolsInitialized
    ) {

        return;

    }

    if (
        isTextCanvasReady()
    ) {

        initializeAstraTextTools();

        return;

    }

    let attempts = 0;

    const maxAttempts = 50;

    const timer =
        setInterval(
            function () {

                attempts++;

                if (
                    isTextCanvasReady()
                ) {

                    clearInterval(
                        timer
                    );

                    initializeAstraTextTools();

                }

                if (
                    attempts >= maxAttempts
                ) {

                    clearInterval(
                        timer
                    );

                    console.error(
                        "ASTRA: Text tools could not find Fabric canvas."
                    );

                }

            },
            100
        );

}



if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        waitForAstraTextCanvas
    );

} else {

    waitForAstraTextCanvas();

}


window.addAstraHeading =
    addAstraHeading;

window.addAstraParagraph =
    addAstraParagraph;

window.syncTextPanel =
    syncTextPanel;



console.log(
    "ASTRA: Text Tools file loaded."
);