let cropRect = null;
let cropMode = false;



const uploadBtn =
document.getElementById("uploadImage");

const imageInput =
document.getElementById("imageInput");

const addHeadingBtn =
document.getElementById("addHeading");

const addParagraphBtn =
document.getElementById("addParagraph");

const fontFamilyControl =
document.getElementById("fontFamily");

const fontSizeControl =
document.getElementById("fontSize");

const fontColorControl =
document.getElementById("fontColor");

const fillColorControl =
document.getElementById("fillColor");

const strokeColorControl =
document.getElementById("strokeColor");

const strokeWidthControl =
document.getElementById("strokeWidth");

const opacityControl =
document.getElementById("opacity");

const rotationControl =
document.getElementById("rotation");



if (uploadBtn && imageInput) {

    uploadBtn.addEventListener(
        "click",
        function () {

            imageInput.click();

        }
    );


    imageInput.addEventListener(
        "change",
        function (event) {

            const file =
                event.target.files[0];


            if (!file) {
                return;
            }


            if (!file.type.startsWith("image/")) {

                alert(
                    "Please select a valid image file."
                );

                return;

            }


            const reader =
                new FileReader();


            reader.onload =
                function (e) {

                    fabric.Image.fromURL(
                        e.target.result,
                        function (img) {

                            if (
                                img.width &&
                                img.width > 500
                            ) {

                                img.scaleToWidth(500);

                            }


                            canvas.add(img);

                            canvas.centerObject(img);

                            canvas.setActiveObject(img);

                            canvas.requestRenderAll();

                        }
                    );

                };


            reader.readAsDataURL(file);

            imageInput.value = "";

        }
    );

}



if (addHeadingBtn) {

    addHeadingBtn.addEventListener(
        "click",
        function () {

            const text =
                new fabric.IText(
                    "Heading",
                    {

                        left: 250,

                        top: 150,

                        fontSize: 48,

                        fontFamily: "Poppins",

                        fill: "#000000",

                        fontWeight: "bold"

                    }
                );


            canvas.add(text);

            canvas.setActiveObject(text);

            canvas.requestRenderAll();

        }
    );

}



if (addParagraphBtn) {

    addParagraphBtn.addEventListener(
        "click",
        function () {

            const text =
                new fabric.IText(
                    "Start typing...",
                    {

                        left: 250,

                        top: 250,

                        fontSize: 24,

                        fontFamily: "Poppins",

                        fill: "#000000"

                    }
                );


            canvas.add(text);

            canvas.setActiveObject(text);

            canvas.requestRenderAll();

        }
    );

}


if (fontFamilyControl) {

    fontFamilyControl.addEventListener(
        "change",
        function () {

            const obj =
                canvas.getActiveObject();


            if (!obj) {
                return;
            }


            if (
                obj.type === "i-text" ||
                obj.type === "text" ||
                obj.type === "textbox"
            ) {

                obj.set(
                    "fontFamily",
                    fontFamilyControl.value
                );

                canvas.requestRenderAll();

            }

        }
    );

}



if (fontSizeControl) {

    fontSizeControl.addEventListener(
        "input",
        function () {

            const obj =
                canvas.getActiveObject();


            if (!obj) {
                return;
            }


            if (
                obj.type === "i-text" ||
                obj.type === "text" ||
                obj.type === "textbox"
            ) {

                obj.set(
                    "fontSize",
                    Number(fontSizeControl.value)
                );

                canvas.requestRenderAll();

            }

        }
    );

}



if (fontColorControl) {

    fontColorControl.addEventListener(
        "input",
        function () {

            const obj =
                canvas.getActiveObject();


            if (!obj) {
                return;
            }


            if (
                obj.type === "i-text" ||
                obj.type === "text" ||
                obj.type === "textbox"
            ) {

                obj.set(
                    "fill",
                    fontColorControl.value
                );

                canvas.requestRenderAll();

            }

        }
    );

}



const boldBtn =
document.getElementById("boldBtn");

if (boldBtn) {

    boldBtn.addEventListener(
        "click",
        function () {

            const obj =
                canvas.getActiveObject();


            if (!obj) {
                return;
            }


            if (
                obj.type !== "i-text" &&
                obj.type !== "text" &&
                obj.type !== "textbox"
            ) {

                return;

            }


            obj.set(
                "fontWeight",
                obj.fontWeight === "bold"
                    ? "normal"
                    : "bold"
            );


            canvas.requestRenderAll();

        }
    );

}



const italicBtn =
document.getElementById("italicBtn");

if (italicBtn) {

    italicBtn.addEventListener(
        "click",
        function () {

            const obj =
                canvas.getActiveObject();


            if (!obj) {
                return;
            }


            if (
                obj.type !== "i-text" &&
                obj.type !== "text" &&
                obj.type !== "textbox"
            ) {

                return;

            }


            obj.set(
                "fontStyle",
                obj.fontStyle === "italic"
                    ? "normal"
                    : "italic"
            );


            canvas.requestRenderAll();

        }
    );

}



const underlineBtn =
document.getElementById("underlineBtn");

if (underlineBtn) {

    underlineBtn.addEventListener(
        "click",
        function () {

            const obj =
                canvas.getActiveObject();


            if (!obj) {
                return;
            }


            if (
                obj.type !== "i-text" &&
                obj.type !== "text" &&
                obj.type !== "textbox"
            ) {

                return;

            }


            obj.set(
                "underline",
                !obj.underline
            );


            canvas.requestRenderAll();

        }
    );

}



const addRectangleBtn =
document.getElementById("addRectangle");

if (addRectangleBtn) {

    addRectangleBtn.addEventListener(
        "click",
        function () {

            const rect =
                new fabric.Rect(
                    {

                        left: 200,

                        top: 150,

                        width: 220,

                        height: 140,

                        fill: "#4f46e5",

                        stroke: "#000000",

                        strokeWidth: 2,

                        rx: 12,

                        ry: 12

                    }
                );


            canvas.add(rect);

            canvas.setActiveObject(rect);

            canvas.requestRenderAll();

        }
    );

}



const addCircleBtn =
document.getElementById("addCircle");

if (addCircleBtn) {

    addCircleBtn.addEventListener(
        "click",
        function () {

            const circle =
                new fabric.Circle(
                    {

                        left: 250,

                        top: 220,

                        radius: 70,

                        fill: "#06b6d4",

                        stroke: "#000000",

                        strokeWidth: 2

                    }
                );


            canvas.add(circle);

            canvas.setActiveObject(circle);

            canvas.requestRenderAll();

        }
    );

}



const addTriangleBtn =
document.getElementById("addTriangle");

if (addTriangleBtn) {

    addTriangleBtn.addEventListener(
        "click",
        function () {

            const triangle =
                new fabric.Triangle(
                    {

                        left: 320,

                        top: 180,

                        width: 120,

                        height: 120,

                        fill: "#f97316",

                        stroke: "#000000",

                        strokeWidth: 2

                    }
                );


            canvas.add(triangle);

            canvas.setActiveObject(triangle);

            canvas.requestRenderAll();

        }
    );

}



const addLineBtn =
document.getElementById("addLine");

if (addLineBtn) {

    addLineBtn.addEventListener(
        "click",
        function () {

            const line =
                new fabric.Line(
                    [
                        50,
                        50,
                        250,
                        50
                    ],
                    {

                        stroke: "#000000",

                        strokeWidth: 4

                    }
                );


            canvas.add(line);

            canvas.setActiveObject(line);

            canvas.requestRenderAll();

        }
    );

}



if (fillColorControl) {

    fillColorControl.addEventListener(
        "input",
        function () {

            const obj =
                canvas.getActiveObject();


            if (!obj) {
                return;
            }


            obj.set(
                "fill",
                fillColorControl.value
            );


            canvas.requestRenderAll();

        }
    );

}



if (strokeColorControl) {

    strokeColorControl.addEventListener(
        "input",
        function () {

            const obj =
                canvas.getActiveObject();


            if (!obj) {
                return;
            }


            obj.set(
                "stroke",
                strokeColorControl.value
            );


            canvas.requestRenderAll();

        }
    );

}



if (strokeWidthControl) {

    strokeWidthControl.addEventListener(
        "input",
        function () {

            const obj =
                canvas.getActiveObject();


            if (!obj) {
                return;
            }


            obj.set(
                "strokeWidth",
                Number(strokeWidthControl.value)
            );


            canvas.requestRenderAll();

        }
    );

}



if (opacityControl) {

    opacityControl.addEventListener(
        "input",
        function () {

            const obj =
                canvas.getActiveObject();


            if (!obj) {
                return;
            }


            obj.set(
                "opacity",
                Number(opacityControl.value) / 100
            );


            canvas.requestRenderAll();

        }
    );

}



if (rotationControl) {

    rotationControl.addEventListener(
        "input",
        function () {

            const obj =
                canvas.getActiveObject();


            if (!obj) {
                return;
            }


            obj.rotate(
                Number(rotationControl.value)
            );


            canvas.requestRenderAll();

        }
    );

}



function deleteSelectedObject() {

    const obj =
        canvas.getActiveObject();


    if (!obj) {
        return;
    }


    canvas.remove(obj);

    canvas.discardActiveObject();

    canvas.requestRenderAll();

}

const deleteObjectBtn =
document.getElementById("deleteObject");

if (deleteObjectBtn) {

    deleteObjectBtn.addEventListener(
        "click",
        deleteSelectedObject
    );

}

const deleteBtn =
document.getElementById("deleteBtn");

if (deleteBtn) {

    deleteBtn.addEventListener(
        "click",
        deleteSelectedObject
    );

}



function duplicateSelectedObject() {

    if (
        typeof window.duplicateObject ===
        "function"
    ) {

        window.duplicateObject();

        return;

    }


    const obj =
        canvas.getActiveObject();


    if (!obj) {
        return;
    }


    obj.clone(
        function (clone) {

            clone.set(
                {

                    left:
                        (obj.left || 0) + 20,

                    top:
                        (obj.top || 0) + 20

                }
            );


            if (obj.layerName) {

                clone.layerName =
                    obj.layerName + " Copy";

            }


            canvas.add(clone);

            canvas.setActiveObject(clone);

            canvas.requestRenderAll();

        }
    );

}

const duplicateBtn =
document.getElementById("duplicateBtn");

if (duplicateBtn) {

    duplicateBtn.addEventListener(
        "click",
        duplicateSelectedObject
    );

}



function syncProperties() {

    const obj =
        canvas.getActiveObject();


    if (!obj) {
        return;
    }


    if (fillColorControl) {

        if (
            typeof obj.fill === "string"
        ) {

            fillColorControl.value =
                obj.fill;

        }

    }


    if (strokeColorControl) {

        if (
            typeof obj.stroke === "string"
        ) {

            strokeColorControl.value =
                obj.stroke;

        }

    }


    if (strokeWidthControl) {

        strokeWidthControl.value =
            obj.strokeWidth != null
                ? obj.strokeWidth
                : 0;

    }


    if (opacityControl) {

        opacityControl.value =
            Math.round(
                (obj.opacity ?? 1) * 100
            );

    }


    if (rotationControl) {

        rotationControl.value =
            Math.round(
                obj.angle || 0
            );

    }


    if (
        obj.type === "i-text" ||
        obj.type === "text" ||
        obj.type === "textbox"
    ) {

        if (
            fontFamilyControl &&
            obj.fontFamily
        ) {

            fontFamilyControl.value =
                obj.fontFamily;

        }


        if (
            fontSizeControl &&
            obj.fontSize
        ) {

            fontSizeControl.value =
                obj.fontSize;

        }


        if (
            fontColorControl &&
            typeof obj.fill === "string"
        ) {

            fontColorControl.value =
                obj.fill;

        }

    }

}


canvas.on(
    "selection:created",
    syncProperties
);

canvas.on(
    "selection:updated",
    syncProperties
);



const cropToolBtn =
document.getElementById("cropTool");

if (cropToolBtn) {

    cropToolBtn.addEventListener(
        "click",
        function () {

            const obj =
                canvas.getActiveObject();


            if (
                !obj ||
                obj.type !== "image"
            ) {

                alert(
                    "Please select an image."
                );

                return;
            }


            if (cropRect) {

                canvas.remove(cropRect);

                cropRect = null;

            }


            cropMode = true;


            cropRect =
                new fabric.Rect(
                    {

                        left:
                            (obj.left || 0) + 40,

                        top:
                            (obj.top || 0) + 40,

                        width: 250,

                        height: 250,

                        fill:
                            "rgba(0,0,0,0.15)",

                        stroke:
                            "#00A8FF",

                        strokeWidth: 2,

                        strokeDashArray:
                            [6, 6],

                        transparentCorners:
                            false,

                        cornerColor:
                            "#00A8FF",

                        hasRotatingPoint:
                            false

                    }
                );


            canvas.add(cropRect);

            canvas.setActiveObject(cropRect);

            canvas.requestRenderAll();

        }
    );

}


const applyCropBtn =
document.getElementById("applyCrop");

if (applyCropBtn) {

    applyCropBtn.addEventListener(
        "click",
        function () {

            if (!cropMode || !cropRect) {

                alert(
                    "Please activate crop mode first."
                );

                return;

            }


            canvas.remove(cropRect);

            cropRect = null;

            cropMode = false;

            canvas.discardActiveObject();

            canvas.requestRenderAll();

        }
    );

}



const exportImageBtn =
document.getElementById("exportImage");

if (exportImageBtn) {

    exportImageBtn.addEventListener(
        "click",
        function () {

            const dataURL =
                canvas.toDataURL(
                    {

                        format: "png",

                        quality: 1,

                        multiplier: 1

                    }
                );


            const link =
                document.createElement("a");


            link.download =
                "astra-design.png";


            link.href =
                dataURL;


            link.click();

        }
    );

}



const saveProjectBtn =
document.getElementById("saveProject");

if (saveProjectBtn) {

    saveProjectBtn.addEventListener(
        "click",
        function () {

            const projectData =
                JSON.stringify(
                    canvas.toJSON()
                );


            localStorage.setItem(
                "astra-project",
                projectData
            );


            alert(
                "Project Saved Successfully!"
            );

        }
    );

}


syncProperties();

canvas.requestRenderAll();