"use strict";

(function () {

    console.log("ASTRA: UI Controller loading...");

    const UI = {
        activeTool: null,
        activePanel: null,
        initialized: false,
        propertiesContainer: null
    };

    function getCanvas() {

        if (
            window.canvas &&
            typeof window.canvas.getActiveObject === "function"
        ) {

            return window.canvas;

        }

        return null;

    }

    function getActiveObject() {

        const c = getCanvas();

        if (!c) return null;

        return c.getActiveObject();

    }

    function refreshCanvas() {

        const c = getCanvas();

        if (!c) return;

        c.requestRenderAll();

    }

    function saveHistorySafe() {

        if (
            typeof window.saveHistory === "function"
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

    function findPropertiesContainer() {

        const possibleSelectors = [
            "#propertiesPanel",
            "#rightProperties",
            "#propertiesContent",
            ".properties-panel",
            ".right-properties",
            ".right-panel",
            ".properties-content"
        ];

        for (const selector of possibleSelectors) {

            const element =
                document.querySelector(selector);

            if (element) {

                return element;

            }

        }

        return null;

    }

    function ensurePropertiesContainer() {

        let container =
            findPropertiesContainer();

        if (container) {

            UI.propertiesContainer =
                container;

            return container;

        }

        const rightPanel =
            document.querySelector(
                ".right-sidebar, .right-panel, aside"
            );

        if (!rightPanel) {

            console.warn(
                "ASTRA: Right properties sidebar not found."
            );

            return null;

        }

        container =
            document.createElement("div");

        container.id =
            "propertiesPanel";

        container.className =
            "astra-properties-panel";

        rightPanel.appendChild(
            container
        );

        UI.propertiesContainer =
            container;

        return container;

    }

    function setPanelContent(
        title,
        subtitle,
        content
    ) {

        const container =
            ensurePropertiesContainer();

        if (!container) return;

        container.innerHTML = `
            <div class="astra-panel-header">
                <div>
                    <h3>${title}</h3>
                    <span>${subtitle || ""}</span>
                </div>
                <button
                    type="button"
                    class="astra-panel-close"
                    data-close-properties
                >
                    ×
                </button>
            </div>

            <div class="astra-panel-body">
                ${content}
            </div>
        `;

        container.classList.add(
            "visible"
        );

        const closeButton =
            container.querySelector(
                "[data-close-properties]"
            );

        if (closeButton) {

            closeButton.addEventListener(
                "click",
                function () {

                    container.classList.remove(
                        "visible"
                    );

                }
            );

        }

    }

    function numberField(
        label,
        value,
        attribute,
        step = "1"
    ) {

        return `
            <div class="astra-property-row">
                <label>${label}</label>

                <input
                    type="number"
                    class="astra-property-input"
                    data-property="${attribute}"
                    value="${value ?? 0}"
                    step="${step}"
                >
            </div>
        `;

    }

    function rangeField(
        label,
        value,
        attribute,
        min,
        max,
        step = "1"
    ) {

        return `
            <div class="astra-property-group">
                <div class="astra-property-label-row">
                    <label>${label}</label>

                    <span data-value-for="${attribute}">
                        ${value}
                    </span>
                </div>

                <input
                    type="range"
                    class="astra-property-range"
                    data-property="${attribute}"
                    value="${value}"
                    min="${min}"
                    max="${max}"
                    step="${step}"
                >
            </div>
        `;

    }

    function colorField(
        label,
        value,
        attribute
    ) {

        return `
            <div class="astra-property-row">
                <label>${label}</label>

                <input
                    type="color"
                    class="astra-color-input"
                    data-property="${attribute}"
                    value="${value || "#000000"}"
                >
            </div>
        `;

    }

    function selectField(
        label,
        value,
        attribute,
        options
    ) {

        return `
            <div class="astra-property-row">
                <label>${label}</label>

                <select
                    class="astra-property-select"
                    data-property="${attribute}"
                >
                    ${options.map(
                        option => `
                            <option
                                value="${option.value}"
                                ${option.value === value ? "selected" : ""}
                            >
                                ${option.label}
                            </option>
                        `
                    ).join("")}
                </select>
            </div>
        `;

    }

    function showEmptyProperties() {

        setPanelContent(
            "Properties",
            "Select an object to edit",
            `
                <div class="astra-empty-properties">
                    <div class="astra-empty-icon">
                        ✦
                    </div>

                    <h4>
                        Nothing Selected
                    </h4>

                    <p>
                        Select text, image, shape or frame
                        on the canvas to edit its properties.
                    </p>
                </div>
            `
        );

    }

    function showTextProperties(object) {

        if (!object) return;

        const fontFamily =
            object.fontFamily || "Arial";

        const fontSize =
            object.fontSize || 32;

        const fill =
            typeof object.fill === "string"
                ? object.fill
                : "#000000";

        const textAlign =
            object.textAlign || "left";

        setPanelContent(
            "Text Properties",
            "Edit selected text",
            `
                ${numberField(
                    "Font Size",
                    fontSize,
                    "fontSize",
                    "1"
                )}

                ${selectField(
                    "Font Family",
                    fontFamily,
                    "fontFamily",
                    [
                        {
                            value: "Arial",
                            label: "Arial"
                        },
                        {
                            value: "Georgia",
                            label: "Georgia"
                        },
                        {
                            value: "Verdana",
                            label: "Verdana"
                        },
                        {
                            value: "Times New Roman",
                            label: "Times New Roman"
                        },
                        {
                            value: "Courier New",
                            label: "Courier New"
                        }
                    ]
                )}

                ${colorField(
                    "Text Color",
                    fill,
                    "fill"
                )}

                ${selectField(
                    "Alignment",
                    textAlign,
                    "textAlign",
                    [
                        {
                            value: "left",
                            label: "Left"
                        },
                        {
                            value: "center",
                            label: "Center"
                        },
                        {
                            value: "right",
                            label: "Right"
                        },
                        {
                            value: "justify",
                            label: "Justify"
                        }
                    ]
                )}

                ${rangeField(
                    "Opacity",
                    Math.round(
                        (object.opacity ?? 1) * 100
                    ),
                    "opacity",
                    0,
                    100,
                    1
                )}

                <div class="astra-property-actions">

                    <button
                        type="button"
                        data-text-bold
                    >
                        <b>B</b>
                    </button>

                    <button
                        type="button"
                        data-text-italic
                    >
                        <i>I</i>
                    </button>

                    <button
                        type="button"
                        data-text-underline
                    >
                        <u>U</u>
                    </button>

                </div>
            `
        );

        bindPropertyEvents(object);

    }

    function showImageProperties(object) {

        if (!object) return;

        setPanelContent(
            "Image Properties",
            "Edit selected image",
            `
                ${numberField(
                    "X Position",
                    Math.round(object.left || 0),
                    "left"
                )}

                ${numberField(
                    "Y Position",
                    Math.round(object.top || 0),
                    "top"
                )}

                ${numberField(
                    "Width",
                    Math.round(
                        object.getScaledWidth()
                    ),
                    "imageWidth"
                )}

                ${numberField(
                    "Height",
                    Math.round(
                        object.getScaledHeight()
                    ),
                    "imageHeight"
                )}

                ${rangeField(
                    "Rotation",
                    Math.round(object.angle || 0),
                    "angle",
                    0,
                    360,
                    1
                )}

                ${rangeField(
                    "Opacity",
                    Math.round(
                        (object.opacity ?? 1) * 100
                    ),
                    "opacity",
                    0,
                    100,
                    1
                )}

                <div class="astra-property-actions">

                    <button
                        type="button"
                        data-flip-horizontal
                    >
                        ↔ Flip
                    </button>

                    <button
                        type="button"
                        data-flip-vertical
                    >
                        ↕ Flip
                    </button>

                </div>
            `
        );

        bindPropertyEvents(object);

    }

    function showShapeProperties(object) {

        if (!object) return;

        const fill =
            typeof object.fill === "string"
                ? object.fill
                : "#2563eb";

        const stroke =
            typeof object.stroke === "string"
                ? object.stroke
                : "#000000";

        setPanelContent(
            "Shape Properties",
            "Edit selected shape",
            `
                ${colorField(
                    "Fill",
                    fill,
                    "fill"
                )}

                ${colorField(
                    "Stroke",
                    stroke,
                    "stroke"
                )}

                ${numberField(
                    "Stroke Width",
                    object.strokeWidth || 1,
                    "strokeWidth"
                )}

                ${rangeField(
                    "Rotation",
                    Math.round(object.angle || 0),
                    "angle",
                    0,
                    360,
                    1
                )}

                ${rangeField(
                    "Opacity",
                    Math.round(
                        (object.opacity ?? 1) * 100
                    ),
                    "opacity",
                    0,
                    100,
                    1
                )}
            `
        );

        bindPropertyEvents(object);

    }

    function showFrameProperties(object) {

        if (!object) return;

        setPanelContent(
            "Frame Properties",
            "Edit selected frame",
            `
                ${colorField(
                    "Border Color",
                    object.stroke || "#2563eb",
                    "stroke"
                )}

                ${numberField(
                    "Border Width",
                    object.strokeWidth || 2,
                    "strokeWidth"
                )}

                ${rangeField(
                    "Rotation",
                    Math.round(object.angle || 0),
                    "angle",
                    0,
                    360,
                    1
                )}

                ${rangeField(
                    "Opacity",
                    Math.round(
                        (object.opacity ?? 1) * 100
                    ),
                    "opacity",
                    0,
                    100,
                    1
                )}
            `
        );

        bindPropertyEvents(object);

    }

    function showGenericProperties(object) {

        if (!object) {

            showEmptyProperties();

            return;

        }

        setPanelContent(
            "Object Properties",
            object.type || "Object",
            `
                ${numberField(
                    "X Position",
                    Math.round(object.left || 0),
                    "left"
                )}

                ${numberField(
                    "Y Position",
                    Math.round(object.top || 0),
                    "top"
                )}

                ${rangeField(
                    "Rotation",
                    Math.round(object.angle || 0),
                    "angle",
                    0,
                    360,
                    1
                )}

                ${rangeField(
                    "Opacity",
                    Math.round(
                        (object.opacity ?? 1) * 100
                    ),
                    "opacity",
                    0,
                    100,
                    1
                )}
            `
        );

        bindPropertyEvents(object);

    }

    function bindPropertyEvents(object) {

        const container =
            UI.propertiesContainer;

        if (!container) return;

        const inputs =
            container.querySelectorAll(
                "[data-property]"
            );

        inputs.forEach(
            input => {

                input.addEventListener(
                    "input",
                    function () {

                        updateObjectProperty(
                            object,
                            input
                        );

                    }
                );

                input.addEventListener(
                    "change",
                    function () {

                        updateObjectProperty(
                            object,
                            input
                        );

                    }
                );

            }
        );

        const boldButton =
            container.querySelector(
                "[data-text-bold]"
            );

        if (boldButton) {

            boldButton.addEventListener(
                "click",
                function () {

                    object.set(
                        "fontWeight",
                        object.fontWeight === "bold"
                            ? "normal"
                            : "bold"
                    );

                    refreshCanvas();
                    saveHistorySafe();
                    showTextProperties(object);

                }
            );

        }

        const italicButton =
            container.querySelector(
                "[data-text-italic]"
            );

        if (italicButton) {

            italicButton.addEventListener(
                "click",
                function () {

                    object.set(
                        "fontStyle",
                        object.fontStyle === "italic"
                            ? "normal"
                            : "italic"
                    );

                    refreshCanvas();
                    saveHistorySafe();
                    showTextProperties(object);

                }
            );

        }

        const underlineButton =
            container.querySelector(
                "[data-text-underline]"
            );

        if (underlineButton) {

            underlineButton.addEventListener(
                "click",
                function () {

                    object.set(
                        "underline",
                        !object.underline
                    );

                    refreshCanvas();
                    saveHistorySafe();
                    showTextProperties(object);

                }
            );

        }

        const flipHorizontal =
            container.querySelector(
                "[data-flip-horizontal]"
            );

        if (flipHorizontal) {

            flipHorizontal.addEventListener(
                "click",
                function () {

                    object.set(
                        "flipX",
                        !object.flipX
                    );

                    refreshCanvas();
                    saveHistorySafe();

                }
            );

        }

        const flipVertical =
            container.querySelector(
                "[data-flip-vertical]"
            );

        if (flipVertical) {

            flipVertical.addEventListener(
                "click",
                function () {

                    object.set(
                        "flipY",
                        !object.flipY
                    );

                    refreshCanvas();
                    saveHistorySafe();

                }
            );

        }

    }

    function updateObjectProperty(
        object,
        input
    ) {

        if (!object) return;

        const property =
            input.dataset.property;

        let value =
            input.value;

        if (
            property === "opacity"
        ) {

            value =
                Number(value) / 100;

        } else if (
            property === "fontSize" ||
            property === "left" ||
            property === "top" ||
            property === "strokeWidth" ||
            property === "angle"
        ) {

            value =
                Number(value);

        }

        if (
            property === "imageWidth"
        ) {

            const width =
                Number(value);

            if (
                width > 0 &&
                object.width
            ) {

                object.scaleToWidth(
                    width
                );

            }

            refreshCanvas();

            return;

        }

        if (
            property === "imageHeight"
        ) {

            const height =
                Number(value);

            if (
                height > 0 &&
                object.height
            ) {

                object.scaleToHeight(
                    height
                );

            }

            refreshCanvas();

            return;

        }

        object.set(
            property,
            value
        );

        object.setCoords();

        refreshCanvas();

        saveHistorySafe();

        const valueLabel =
            UI.propertiesContainer.querySelector(
                `[data-value-for="${property}"]`
            );

        if (valueLabel) {

            valueLabel.textContent =
                input.value;

        }

    }

    function showObjectProperties(object) {

        if (!object) {

            showEmptyProperties();

            return;

        }

        if (
            object.isFrame === true
        ) {

            showFrameProperties(
                object
            );

            return;

        }

        if (
            object.type === "textbox" ||
            object.type === "text" ||
            object.type === "i-text"
        ) {

            showTextProperties(
                object
            );

            return;

        }

        if (
            object.type === "image"
        ) {

            showImageProperties(
                object
            );

            return;

        }

        if (
            object.type === "rect" ||
            object.type === "circle" ||
            object.type === "triangle" ||
            object.type === "ellipse" ||
            object.type === "polygon" ||
            object.type === "line"
        ) {

            showShapeProperties(
                object
            );

            return;

        }

        showGenericProperties(
            object
        );

    }

    function initializeToolButtons() {

        const toolButtons =
            document.querySelectorAll(
                "[data-tool]"
            );

        toolButtons.forEach(
            button => {

                button.addEventListener(
                    "click",
                    function () {

                        const tool =
                            button.dataset.tool;

                        if (!tool) return;

                        activateTool(
                            tool
                        );

                    }
                );

            }
        );

    }

    function activateTool(tool) {

        UI.activeTool =
            tool;

        document
            .querySelectorAll(
                "[data-tool]"
            )
            .forEach(
                button => {

                    button.classList.toggle(
                        "active",
                        button.dataset.tool === tool
                    );

                }
            );

        switch (tool) {

            case "templates":

                showTemplatesPanel();

                break;

            case "ai":
            case "ai-tools":

                showAIToolsPanel();

                break;

            case "text":

                showTextToolPanel();

                break;

            case "image":

                showImageToolPanel();

                break;

            case "shape":

                showShapeToolPanel();

                break;

            default:

                const object =
                    getActiveObject();

                if (object) {

                    showObjectProperties(
                        object
                    );

                } else {

                    showGenericToolPanel(
                        tool
                    );

                }

                break;

        }

    }

    function showTextToolPanel() {

        setPanelContent(
            "Text",
            "Add and edit text",
            `
                <button
                    type="button"
                    class="astra-main-action"
                    data-add-text
                >
                    ＋ Add Text
                </button>

                <div class="astra-info-card">
                    <strong>
                        Text Tool
                    </strong>

                    <p>
                        Add text to your design,
                        then select it to edit its
                        properties.
                    </p>
                </div>
            `
        );

        const addButton =
            UI.propertiesContainer.querySelector(
                "[data-add-text]"
            );

        if (addButton) {

            addButton.addEventListener(
                "click",
                addTextObject
            );

        }

    }

    function addTextObject() {

        const c =
            getCanvas();

        if (
            !c ||
            typeof fabric === "undefined"
        ) {

            return;

        }

        const text =
            new fabric.IText(
                "Type your text",
                {
                    left:
                        c.getWidth() / 2,

                    top:
                        c.getHeight() / 2,

                    originX:
                        "center",

                    originY:
                        "center",

                    fontSize:
                        48,

                    fontFamily:
                        "Arial",

                    fill:
                        "#111827",

                    fontWeight:
                        "normal",

                    editable:
                        true,

                    layerName:
                        "Text"
                }
            );

        c.add(text);

        c.setActiveObject(
            text
        );

        text.enterEditing();

        refreshCanvas();

        saveHistorySafe();

        showTextProperties(
            text
        );

    }

    function showImageToolPanel() {

        setPanelContent(
            "Image",
            "Add an image",
            `
                <button
                    type="button"
                    class="astra-main-action"
                    data-open-upload
                >
                    ＋ Upload Image
                </button>

                <div class="astra-info-card">
                    <strong>
                        Image Tool
                    </strong>

                    <p>
                        Upload an image and select
                        it on the canvas to edit
                        position, size, rotation
                        and opacity.
                    </p>
                </div>
            `
        );

        const button =
            UI.propertiesContainer.querySelector(
                "[data-open-upload]"
            );

        if (button) {

            button.addEventListener(
                "click",
                function () {

                    const upload =
                        document.getElementById(
                            "uploadImage"
                        );

                    if (upload) {

                        upload.click();

                    }

                }
            );

        }

    }

    function showShapeToolPanel() {

        setPanelContent(
            "Shapes",
            "Add a shape",
            `
                <button
                    type="button"
                    class="astra-main-action"
                    data-add-rectangle
                >
                    ▭ Rectangle
                </button>

                <button
                    type="button"
                    class="astra-main-action secondary"
                    data-add-circle
                >
                    ○ Circle
                </button>
            `
        );

        const rectangle =
            UI.propertiesContainer.querySelector(
                "[data-add-rectangle]"
            );

        const circle =
            UI.propertiesContainer.querySelector(
                "[data-add-circle]"
            );

        if (rectangle) {

            rectangle.addEventListener(
                "click",
                function () {

                    if (
                        typeof window.addRectangle ===
                        "function"
                    ) {

                        window.addRectangle();

                        return;

                    }

                    createFallbackRectangle();

                }
            );

        }

        if (circle) {

            circle.addEventListener(
                "click",
                function () {

                    if (
                        typeof window.addCircle ===
                        "function"
                    ) {

                        window.addCircle();

                        return;

                    }

                    createFallbackCircle();

                }
            );

        }

    }

    function createFallbackRectangle() {

        const c =
            getCanvas();

        if (
            !c ||
            typeof fabric === "undefined"
        ) {

            return;

        }

        const rect =
            new fabric.Rect({
                left:
                    c.getWidth() / 2 - 100,

                top:
                    c.getHeight() / 2 - 75,

                width:
                    200,

                height:
                    150,

                fill:
                    "#2563eb",

                layerName:
                    "Rectangle"
            });

        c.add(rect);

        c.setActiveObject(
            rect
        );

        refreshCanvas();

        saveHistorySafe();

        showShapeProperties(
            rect
        );

    }

    function createFallbackCircle() {

        const c =
            getCanvas();

        if (
            !c ||
            typeof fabric === "undefined"
        ) {

            return;

        }

        const circle =
            new fabric.Circle({
                left:
                    c.getWidth() / 2,

                top:
                    c.getHeight() / 2,

                radius:
                    80,

                originX:
                    "center",

                originY:
                    "center",

                fill:
                    "#8b5cf6",

                layerName:
                    "Circle"
            });

        c.add(circle);

        c.setActiveObject(
            circle
        );

        refreshCanvas();

        saveHistorySafe();

        showShapeProperties(
            circle
        );

    }

    function showTemplatesPanel() {

        setPanelContent(
            "Templates",
            "Choose a design size",
            `
                <div class="astra-template-categories">

                    <button
                        data-template-category="instagram"
                    >
                        Instagram
                    </button>

                    <button
                        data-template-category="youtube"
                    >
                        YouTube
                    </button>

                    <button
                        data-template-category="facebook"
                    >
                        Facebook
                    </button>

                    <button
                        data-template-category="poster"
                    >
                        Poster
                    </button>

                    <button
                        data-template-category="custom"
                    >
                        Custom
                    </button>

                </div>

                <div
                    class="astra-template-grid"
                    id="astraTemplateGrid"
                >

                    <div class="astra-template-card">

                        <div class="astra-template-preview">
                            <div class="template-preview-content">
                                Facebook Post
                            </div>
                        </div>

                        <strong>
                            Facebook Post
                        </strong>

                        <span>
                            1080 × 1080
                        </span>

                        <button
                            data-template="facebook"
                        >
                            Use Template
                        </button>

                    </div>

                    <div class="astra-template-card">

                        <div class="astra-template-preview youtube">
                            YouTube
                        </div>

                        <strong>
                            YouTube Thumbnail
                        </strong>

                        <span>
                            1280 × 720
                        </span>

                        <button
                            data-template="youtube"
                        >
                            Use Template
                        </button>

                    </div>

                    <div class="astra-template-card">

                        <div class="astra-template-preview instagram">
                            Instagram
                        </div>

                        <strong>
                            Instagram Post
                        </strong>

                        <span>
                            1080 × 1080
                        </span>

                        <button
                            data-template="instagram"
                        >
                            Use Template
                        </button>

                    </div>

                    <div class="astra-template-card">

                        <div class="astra-template-preview poster">
                            Poster
                        </div>

                        <strong>
                            Poster
                        </strong>

                        <span>
                            1080 × 1350
                        </span>

                        <button
                            data-template="poster"
                        >
                            Use Template
                        </button>

                    </div>

                </div>
            `
        );

        bindTemplateEvents();

    }

    function bindTemplateEvents() {

        const buttons =
            UI.propertiesContainer.querySelectorAll(
                "[data-template]"
            );

        buttons.forEach(
            button => {

                button.addEventListener(
                    "click",
                    function () {

                        applyTemplate(
                            button.dataset.template
                        );

                    }
                );

            }
        );

        const categories =
            UI.propertiesContainer.querySelectorAll(
                "[data-template-category]"
            );

        categories.forEach(
            button => {

                button.addEventListener(
                    "click",
                    function () {

                        filterTemplates(
                            button.dataset.templateCategory
                        );

                    }
                );

            }
        );

    }

    function applyTemplate(type) {

        if (
            typeof window.applyTemplate === "function" &&
            window.applyTemplate !== applyTemplate
        ) {

            window.applyTemplate(
                type
            );

            return;

        }

        const c =
            getCanvas();

        if (!c) return;

        let width =
            1080;

        let height =
            1080;

        switch (type) {

            case "youtube":

                width =
                    1280;

                height =
                    720;

                break;

            case "instagram":

                width =
                    1080;

                height =
                    1080;

                break;

            case "facebook":

                width =
                    1080;

                height =
                    1080;

                break;

            case "poster":

                width =
                    1080;

                height =
                    1350;

                break;

        }

        c.setWidth(
            width
        );

        c.setHeight(
            height
        );

        c.backgroundColor =
            "#ffffff";

        c.requestRenderAll();

        if (
            typeof window.fitCanvasToWorkspace ===
            "function"
        ) {

            window.fitCanvasToWorkspace();

        }

        saveHistorySafe();

    }

    function filterTemplates(category) {

        const cards =
            UI.propertiesContainer.querySelectorAll(
                ".astra-template-card"
            );

        cards.forEach(
            card => {

                card.style.display =
                    "block";

            }
        );

        console.log(
            "ASTRA: Template category:",
            category
        );

    }

    function showAIToolsPanel() {

        setPanelContent(
            "AI Tools",
            "Smart image editing tools",
            `
                <div class="astra-ai-grid">

                    <button
                        data-ai-action="remove-background"
                    >
                        <span>✂</span>
                        <strong>
                            Remove Background
                        </strong>
                        <small>
                            Remove image background
                        </small>
                    </button>

                    <button
                        data-ai-action="enhance"
                    >
                        <span>✨</span>
                        <strong>
                            Auto Enhance
                        </strong>
                        <small>
                            Improve overall image
                        </small>
                    </button>

                    <button
                        data-ai-action="sharpen"
                    >
                        <span>◈</span>
                        <strong>
                            Sharpen
                        </strong>
                        <small>
                            Increase image detail
                        </small>
                    </button>

                    <button
                        data-ai-action="color"
                    >
                        <span>🎨</span>
                        <strong>
                            Auto Color
                        </strong>
                        <small>
                            Improve colors
                        </small>
                    </button>

                    <button
                        data-ai-action="grayscale"
                    >
                        <span>◐</span>
                        <strong>
                            Grayscale
                        </strong>
                        <small>
                            Convert to grayscale
                        </small>
                    </button>

                    <button
                        data-ai-action="upscale"
                    >
                        <span>⬆</span>
                        <strong>
                            Upscale
                        </strong>
                        <small>
                            Improve image resolution
                        </small>
                    </button>

                </div>

                <div class="astra-ai-generate">

                    <label>
                        AI Image Prompt
                    </label>

                    <textarea
                        id="astraAIPrompt"
                        placeholder="Describe your image..."
                    ></textarea>

                    <button
                        type="button"
                        class="astra-main-action"
                        id="astraAIGenerate"
                    >
                        ✨ Generate
                    </button>

                </div>

                <button
                    type="button"
                    class="astra-reset-ai"
                    id="astraResetAI"
                >
                    Reset AI
                </button>
            `
        );

        bindAIEvents();

    }

    function bindAIEvents() {

        const buttons =
            UI.propertiesContainer.querySelectorAll(
                "[data-ai-action]"
            );

        buttons.forEach(
            button => {

                button.addEventListener(
                    "click",
                    function () {

                        executeAIAction(
                            button.dataset.aiAction
                        );

                    }
                );

            }
        );

        const generate =
            document.getElementById(
                "astraAIGenerate"
            );

        if (generate) {

            generate.addEventListener(
                "click",
                generateAI
            );

        }

        const reset =
            document.getElementById(
                "astraResetAI"
            );

        if (reset) {

            reset.addEventListener(
                "click",
                resetAI
            );

        }

    }

    function executeAIAction(action) {

        const object =
            getActiveObject();

        if (!object) {

            alert(
                "Please select an image first."
            );

            return;

        }

        const functionMap = {

            "remove-background":
                "removeBackground",

            "enhance":
                "autoEnhance",

            "sharpen":
                "sharpenImage",

            "color":
                "autoColor",

            "grayscale":
                "applyGrayscale",

            "upscale":
                "upscaleImage"

        };

        const functionName =
            functionMap[action];

        if (
            functionName &&
            typeof window[functionName] === "function"
        ) {

            try {

                window[functionName](
                    object
                );

                return;

            } catch (error) {

                console.error(
                    "ASTRA AI error:",
                    error
                );

            }

        }

        if (
            action === "grayscale"
        ) {

            object.filters =
                object.filters || [];

            if (
                typeof fabric !== "undefined" &&
                fabric.Image
            ) {

                object.filters.push(
                    new fabric.Image.filters.Grayscale()
                );

                object.applyFilters();

                refreshCanvas();

                saveHistorySafe();

                return;

            }

        }

        if (
            action === "sharpen"
        ) {

            object.filters =
                object.filters || [];

            if (
                typeof fabric !== "undefined" &&
                fabric.Image
            ) {

                object.filters.push(
                    new fabric.Image.filters.Convolute({
                        matrix: [
                            0, -1, 0,
                            -1, 5, -1,
                            0, -1, 0
                        ]
                    })
                );

                object.applyFilters();

                refreshCanvas();

                saveHistorySafe();

                return;

            }

        }

        alert(
            "AI feature is ready for connection."
        );

    }

    function generateAI() {

        const prompt =
            document.getElementById(
                "astraAIPrompt"
            );

        if (!prompt) return;

        const value =
            prompt.value.trim();

        if (!value) {

            alert(
                "Please describe your image."
            );

            return;

        }

        console.log(
            "ASTRA AI Prompt:",
            value
        );

        alert(
            "AI generation request created."
        );

    }

    function resetAI() {

        const c =
            getCanvas();

        if (!c) return;

        const object =
            c.getActiveObject();

        if (
            object &&
            object.type === "image"
        ) {

            object.filters = [];

            object.applyFilters();

            object.opacity = 1;

            object.set({
                angle: 0,
                flipX: false,
                flipY: false
            });

            refreshCanvas();

            saveHistorySafe();

            showImageProperties(
                object
            );

        }

    }

    function showGenericToolPanel(tool) {

        setPanelContent(
            tool
                ? tool.charAt(0).toUpperCase() +
                  tool.slice(1)
                : "Tool",
            "ASTRA Editor",
            `
                <div class="astra-empty-properties">

                    <div class="astra-empty-icon">
                        ✦
                    </div>

                    <h4>
                        ${tool || "Tool"} Ready
                    </h4>

                    <p>
                        Select an object on the canvas
                        to view its properties here.
                    </p>

                </div>
            `
        );

    }

    function initializeCanvasEvents() {

        const c =
            getCanvas();

        if (!c) {

            return;

        }

        c.on(
            "selection:created",
            function (event) {

                const object =
                    event.selected &&
                    event.selected[0]
                        ? event.selected[0]
                        : c.getActiveObject();

                showObjectProperties(
                    object
                );

            }
        );

        c.on(
            "selection:updated",
            function (event) {

                const object =
                    event.selected &&
                    event.selected[0]
                        ? event.selected[0]
                        : c.getActiveObject();

                showObjectProperties(
                    object
                );

            }
        );

        c.on(
            "selection:cleared",
            function () {

                showEmptyProperties();

            }
        );

        c.on(
            "object:modified",
            function () {

                const object =
                    c.getActiveObject();

                if (object) {

                    showObjectProperties(
                        object
                    );

                }

            }
        );

    }

    function initializeUI() {

        if (UI.initialized) {

            return;

        }

        ensurePropertiesContainer();

        initializeToolButtons();

        const c =
            getCanvas();

        if (c) {

            initializeCanvasEvents();

        }

        UI.initialized =
            true;

        console.log(
            "ASTRA: Unified UI initialized successfully."
        );

    }

    window.addEventListener(
        "ASTRA_CANVAS_READY",
        function () {

            setTimeout(
                initializeUI,
                50
            );

        }
    );

    document.addEventListener(
        "DOMContentLoaded",
        function () {

            setTimeout(
                initializeUI,
                150
            );

        }
    );

    window.ASTRA_UI =
        UI;

    window.activateAstraTool =
        activateTool;

    window.showObjectProperties =
        showObjectProperties;

    window.showTextProperties =
        showTextProperties;

    window.showImageProperties =
        showImageProperties;

    window.showShapeProperties =
        showShapeProperties;

    window.showFrameProperties =
        showFrameProperties;

    window.showTemplatesPanel =
        showTemplatesPanel;

    window.showAIToolsPanel =
        showAIToolsPanel;

    window.showEmptyProperties =
        showEmptyProperties;

    console.log(
        "ASTRA: UI Controller loaded."
    );

})();