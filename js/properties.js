

"use strict";

(function () {

    let panel = null;

    

    function getCanvas() {

        return (
            window.canvas &&
            typeof window.canvas.getActiveObject === "function"
        )
            ? window.canvas
            : null;

    }


    
    function init() {

        panel =
            document.getElementById(
                "propertiesPanel"
            );

        if (!panel) {

            console.warn(
                "ASTRA: #propertiesPanel not found."
            );

            return;

        }


        const c = getCanvas();

        if (!c) {

            console.warn(
                "ASTRA: Waiting for canvas..."
            );

            return;

        }


        c.on(
            "selection:created",
            updateProperties
        );

        c.on(
            "selection:updated",
            updateProperties
        );

        c.on(
            "selection:cleared",
            showEmptyState
        );

        c.on(
            "object:modified",
            updateProperties
        );


        showEmptyState();


        console.log(
            "ASTRA: Properties UI READY."
        );

    }


    

    function showEmptyState() {

        if (!panel) return;


        panel.innerHTML = `

            <div class="properties-empty">

                <i class="fa-solid fa-sliders"></i>

                <h4>
                    No Object Selected
                </h4>

                <p>
                    Select an image, text,
                    shape or other object
                    to edit its properties.
                </p>

            </div>

        `;

    }




    function updateProperties() {

        const c = getCanvas();

        if (!c || !panel) return;


        const obj =
            c.getActiveObject();


        if (!obj) {

            showEmptyState();

            return;

        }


        

        if (
            obj.type === "image"
        ) {

            renderImageProperties(obj);

            return;

        }


        

        if (
            obj.type === "textbox" ||
            obj.type === "i-text" ||
            obj.type === "text"
        ) {

            renderTextProperties(obj);

            return;

        }


        
        if (
            obj.type === "rect" ||
            obj.type === "circle" ||
            obj.type === "triangle" ||
            obj.type === "line" ||
            obj.type === "polygon"
        ) {

            renderShapeProperties(obj);

            return;

        }


       

        renderBasicProperties(obj);

    }


    
    function renderImageProperties(obj) {

        panel.innerHTML = `

            <div class="property-section image-properties">

                <h2>
                    Image Properties
                </h2>

                <p>
                    Edit selected image
                </p>

                <div class="transform-grid">

                    <div class="transform-field">

                        <label>
                            X Position
                        </label>

                        <input
                            type="number"
                            id="propLeft"
                            value="${Math.round(obj.left || 0)}"
                        >

                    </div>


                    <div class="transform-field">

                        <label>
                            Y Position
                        </label>

                        <input
                            type="number"
                            id="propTop"
                            value="${Math.round(obj.top || 0)}"
                        >

                    </div>

                </div>


                <div class="transform-grid">

                    <div class="transform-field">

                        <label>
                            Width
                        </label>

                        <input
                            type="number"
                            id="propWidth"
                            value="${Math.round(obj.getScaledWidth())}"
                        >

                    </div>


                    <div class="transform-field">

                        <label>
                            Height
                        </label>

                        <input
                            type="number"
                            id="propHeight"
                            value="${Math.round(obj.getScaledHeight())}"
                        >

                    </div>

                </div>


                <label>
                    Rotation
                    <span
                        class="property-value"
                        id="rotationValue"
                    >
                        ${Math.round(obj.angle || 0)}°
                    </span>
                </label>

                <input
                    type="range"
                    id="propRotation"
                    min="0"
                    max="360"
                    value="${obj.angle || 0}"
                >


                <label>
                    Opacity
                    <span
                        class="property-value"
                        id="opacityValue"
                    >
                        ${Math.round((obj.opacity ?? 1) * 100)}%
                    </span>
                </label>

                <input
                    type="range"
                    id="propOpacity"
                    min="0"
                    max="100"
                    value="${Math.round((obj.opacity ?? 1) * 100)}"
                >


                <hr>


                <h4>
                    Transform
                </h4>


                <div class="transform-grid">

                    <button
                        type="button"
                        id="flipHorizontal"
                    >
                        ↔ Flip
                    </button>

                    <button
                        type="button"
                        id="flipVertical"
                    >
                        ↕ Flip
                    </button>

                </div>


                <hr>


                <h4>
                    Appearance
                </h4>


                <label>
                    Opacity
                </label>

                <input
                    type="range"
                    id="imageOpacity"
                    min="0"
                    max="100"
                    value="${Math.round((obj.opacity ?? 1) * 100)}"
                >


                <button
                    type="button"
                    class="primary"
                    id="resetImageTransform"
                >
                    Reset Transform
                </button>

            </div>

        `;


        bindImageProperties(obj);

    }


    

    function bindImageProperties(obj) {

        const c = getCanvas();

        if (!c) return;


        const left =
            document.getElementById(
                "propLeft"
            );

        const top =
            document.getElementById(
                "propTop"
            );

        const width =
            document.getElementById(
                "propWidth"
            );

        const height =
            document.getElementById(
                "propHeight"
            );

        const rotation =
            document.getElementById(
                "propRotation"
            );

        const opacity =
            document.getElementById(
                "propOpacity"
            );


        if (left) {

            left.addEventListener(
                "input",
                function () {

                    obj.set({
                        left: Number(this.value)
                    });

                    obj.setCoords();

                    c.requestRenderAll();

                }
            );

        }


        if (top) {

            top.addEventListener(
                "input",
                function () {

                    obj.set({
                        top: Number(this.value)
                    });

                    obj.setCoords();

                    c.requestRenderAll();

                }
            );

        }


        if (width) {

            width.addEventListener(
                "input",
                function () {

                    if (obj.width) {

                        obj.scaleToWidth(
                            Number(this.value)
                        );

                    }

                    obj.setCoords();

                    c.requestRenderAll();

                }
            );

        }


        if (height) {

            height.addEventListener(
                "input",
                function () {

                    if (obj.height) {

                        obj.scaleToHeight(
                            Number(this.value)
                        );

                    }

                    obj.setCoords();

                    c.requestRenderAll();

                }
            );

        }


        if (rotation) {

            rotation.addEventListener(
                "input",
                function () {

                    obj.rotate(
                        Number(this.value)
                    );

                    const output =
                        document.getElementById(
                            "rotationValue"
                        );

                    if (output) {

                        output.textContent =
                            `${this.value}°`;

                    }

                    obj.setCoords();

                    c.requestRenderAll();

                }
            );

        }


        if (opacity) {

            opacity.addEventListener(
                "input",
                function () {

                    const value =
                        Number(this.value) / 100;

                    obj.set({
                        opacity: value
                    });

                    const output =
                        document.getElementById(
                            "opacityValue"
                        );

                    if (output) {

                        output.textContent =
                            `${this.value}%`;

                    }

                    c.requestRenderAll();

                }
            );

        }


        const imageOpacity =
            document.getElementById(
                "imageOpacity"
            );

        if (imageOpacity) {

            imageOpacity.addEventListener(
                "input",
                function () {

                    obj.set({
                        opacity:
                            Number(this.value) / 100
                    });

                    c.requestRenderAll();

                }
            );

        }


        const flipHorizontal =
            document.getElementById(
                "flipHorizontal"
            );

        if (flipHorizontal) {

            flipHorizontal.addEventListener(
                "click",
                function () {

                    obj.set({
                        flipX: !obj.flipX
                    });

                    c.requestRenderAll();

                }
            );

        }


        const flipVertical =
            document.getElementById(
                "flipVertical"
            );

        if (flipVertical) {

            flipVertical.addEventListener(
                "click",
                function () {

                    obj.set({
                        flipY: !obj.flipY
                    });

                    c.requestRenderAll();

                }
            );

        }


        const reset =
            document.getElementById(
                "resetImageTransform"
            );

        if (reset) {

            reset.addEventListener(
                "click",
                function () {

                    obj.set({

                        angle: 0,

                        flipX: false,

                        flipY: false,

                        opacity: 1

                    });

                    obj.setCoords();

                    c.requestRenderAll();

                    updateProperties();

                }
            );

        }

    }




    function renderTextProperties(obj) {

        panel.innerHTML = `

            <div class="property-section">

                <h2>
                    Text Properties
                </h2>

                <p>
                    Edit selected text
                </p>


                <label>
                    Text
                </label>

                <input
                    type="text"
                    id="propText"
                    value="${escapeHTML(obj.text || "")}"
                >


                <label>
                    Font Family
                </label>

                <select id="propFont">

                    <option value="Poppins">
                        Poppins
                    </option>

                    <option value="Arial">
                        Arial
                    </option>

                    <option value="Verdana">
                        Verdana
                    </option>

                    <option value="Georgia">
                        Georgia
                    </option>

                </select>


                <label>
                    Font Size
                </label>

                <input
                    type="number"
                    id="propFontSize"
                    min="8"
                    max="300"
                    value="${obj.fontSize || 40}"
                >


                <label>
                    Text Color
                </label>

                <input
                    type="color"
                    id="propTextColor"
                    value="${colorToHex(obj.fill) || "#ffffff"}"
                >


                <div class="text-style-buttons">

                    <button
                        id="propBold"
                        type="button"
                    >
                        <strong>B</strong>
                    </button>

                    <button
                        id="propItalic"
                        type="button"
                    >
                        <em>I</em>
                    </button>

                    <button
                        id="propUnderline"
                        type="button"
                    >
                        <u>U</u>
                    </button>

                </div>


                <label>
                    Rotation
                </label>

                <input
                    type="range"
                    id="propTextRotation"
                    min="0"
                    max="360"
                    value="${obj.angle || 0}"
                >


                <label>
                    Opacity
                </label>

                <input
                    type="range"
                    id="propTextOpacity"
                    min="0"
                    max="100"
                    value="${Math.round((obj.opacity ?? 1) * 100)}"
                >

            </div>

        `;


        bindTextProperties(obj);

    }


    

    function bindTextProperties(obj) {

        const c = getCanvas();


        const text =
            document.getElementById(
                "propText"
            );

        if (text) {

            text.addEventListener(
                "input",
                function () {

                    obj.set({
                        text: this.value
                    });

                    c.requestRenderAll();

                }
            );

        }


        const font =
            document.getElementById(
                "propFont"
            );

        if (font) {

            font.value =
                obj.fontFamily ||
                "Poppins";

            font.addEventListener(
                "change",
                function () {

                    obj.set({
                        fontFamily:
                            this.value
                    });

                    c.requestRenderAll();

                }
            );

        }


        const fontSize =
            document.getElementById(
                "propFontSize"
            );

        if (fontSize) {

            fontSize.addEventListener(
                "input",
                function () {

                    obj.set({
                        fontSize:
                            Number(this.value)
                    });

                    c.requestRenderAll();

                }
            );

        }


        const color =
            document.getElementById(
                "propTextColor"
            );

        if (color) {

            color.addEventListener(
                "input",
                function () {

                    obj.set({
                        fill:
                            this.value
                    });

                    c.requestRenderAll();

                }
            );

        }


        const bold =
            document.getElementById(
                "propBold"
            );

        if (bold) {

            bold.addEventListener(
                "click",
                function () {

                    obj.set({
                        fontWeight:
                            obj.fontWeight === "bold"
                                ? "normal"
                                : "bold"
                    });

                    c.requestRenderAll();

                }
            );

        }


        const italic =
            document.getElementById(
                "propItalic"
            );

        if (italic) {

            italic.addEventListener(
                "click",
                function () {

                    obj.set({
                        fontStyle:
                            obj.fontStyle === "italic"
                                ? "normal"
                                : "italic"
                    });

                    c.requestRenderAll();

                }
            );

        }


        const underline =
            document.getElementById(
                "propUnderline"
            );

        if (underline) {

            underline.addEventListener(
                "click",
                function () {

                    obj.set({
                        underline:
                            !obj.underline
                    });

                    c.requestRenderAll();

                }
            );

        }


        const rotation =
            document.getElementById(
                "propTextRotation"
            );

        if (rotation) {

            rotation.addEventListener(
                "input",
                function () {

                    obj.set({
                        angle:
                            Number(this.value)
                    });

                    c.requestRenderAll();

                }
            );

        }


        const opacity =
            document.getElementById(
                "propTextOpacity"
            );

        if (opacity) {

            opacity.addEventListener(
                "input",
                function () {

                    obj.set({
                        opacity:
                            Number(this.value) / 100
                    });

                    c.requestRenderAll();

                }
            );

        }

    }


    

    function renderShapeProperties(obj) {

        panel.innerHTML = `

            <div class="property-section">

                <h2>
                    Shape Properties
                </h2>

                <p>
                    Edit selected shape
                </p>


                <label>
                    Fill
                </label>

                <input
                    type="color"
                    id="shapePropFill"
                    value="${colorToHex(obj.fill) || "#4f46e5"}"
                >


                <label>
                    Stroke
                </label>

                <input
                    type="color"
                    id="shapePropStroke"
                    value="${colorToHex(obj.stroke) || "#000000"}"
                >


                <label>
                    Stroke Width
                </label>

                <input
                    type="range"
                    id="shapePropStrokeWidth"
                    min="0"
                    max="30"
                    value="${obj.strokeWidth || 0}"
                >


                <label>
                    Rotation
                </label>

                <input
                    type="range"
                    id="shapePropRotation"
                    min="0"
                    max="360"
                    value="${obj.angle || 0}"
                >


                <label>
                    Opacity
                </label>

                <input
                    type="range"
                    id="shapePropOpacity"
                    min="0"
                    max="100"
                    value="${Math.round((obj.opacity ?? 1) * 100)}"
                >

            </div>

        `;


        const c = getCanvas();


        document
            .getElementById("shapePropFill")
            ?.addEventListener(
                "input",
                function () {

                    obj.set({
                        fill: this.value
                    });

                    c.requestRenderAll();

                }
            );


        document
            .getElementById("shapePropStroke")
            ?.addEventListener(
                "input",
                function () {

                    obj.set({
                        stroke: this.value
                    });

                    c.requestRenderAll();

                }
            );


        document
            .getElementById("shapePropStrokeWidth")
            ?.addEventListener(
                "input",
                function () {

                    obj.set({
                        strokeWidth:
                            Number(this.value)
                    });

                    c.requestRenderAll();

                }
            );


        document
            .getElementById("shapePropRotation")
            ?.addEventListener(
                "input",
                function () {

                    obj.set({
                        angle:
                            Number(this.value)
                    });

                    c.requestRenderAll();

                }
            );


        document
            .getElementById("shapePropOpacity")
            ?.addEventListener(
                "input",
                function () {

                    obj.set({
                        opacity:
                            Number(this.value) / 100
                    });

                    c.requestRenderAll();

                }
            );

    }


    

    function renderBasicProperties(obj) {

        panel.innerHTML = `

            <div class="property-section">

                <h2>
                    Object Properties
                </h2>

                <p>
                    Selected object
                </p>

                <label>
                    X Position
                </label>

                <input
                    type="number"
                    value="${Math.round(obj.left || 0)}"
                    id="basicLeft"
                >

                <label>
                    Y Position
                </label>

                <input
                    type="number"
                    value="${Math.round(obj.top || 0)}"
                    id="basicTop"
                >

            </div>

        `;


        const c = getCanvas();


        document
            .getElementById("basicLeft")
            ?.addEventListener(
                "input",
                function () {

                    obj.set({
                        left:
                            Number(this.value)
                    });

                    obj.setCoords();

                    c.requestRenderAll();

                }
            );


        document
            .getElementById("basicTop")
            ?.addEventListener(
                "input",
                function () {

                    obj.set({
                        top:
                            Number(this.value)
                    });

                    obj.setCoords();

                    c.requestRenderAll();

                }
            );

    }


    
    function escapeHTML(value) {

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    }


    function colorToHex(color) {

        if (
            typeof color !== "string"
        ) {

            return "#000000";

        }

        if (
            color.startsWith("#")
        ) {

            return color;

        }

        return "#000000";

    }


    

    window.addEventListener(
        "ASTRA_CANVAS_READY",
        init
    );


    document.addEventListener(
        "DOMContentLoaded",
        function () {

            setTimeout(
                init,
                150
            );

        }
    );

})();