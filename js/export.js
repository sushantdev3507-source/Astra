

const exportPNGBtn =
    document.getElementById("exportPNG");

const exportJPGBtn =
    document.getElementById("exportJPG");

const saveProjectBtn =
    document.getElementById("saveProject");

const openProjectBtn =
    document.getElementById("openProject");

const projectFile =
    document.getElementById("projectFile");

const printCanvasBtn =
    document.getElementById("printCanvas");

const exportPDFBtn =
    document.getElementById("exportPDF");



function isExportCanvasReady() {

    return (
        typeof canvas !== "undefined" &&
        canvas &&
        typeof canvas.toDataURL === "function"
    );

}




function downloadFile(
    dataURL,
    filename
) {

    if (!dataURL) {
        return;
    }


    const link =
        document.createElement("a");


    link.href =
        dataURL;


    link.download =
        filename;


    document.body.appendChild(
        link
    );


    link.click();


    document.body.removeChild(
        link
    );

}




if (exportPNGBtn) {

    exportPNGBtn.addEventListener(
        "click",
        function () {

            if (
                !isExportCanvasReady()
            ) {

                alert(
                    "Canvas is not ready."
                );

                return;

            }


            const url =
                canvas.toDataURL({
                    format: "png",
                    multiplier: 1
                });


            downloadFile(
                url,
                "astra-design.png"
            );

        }
    );

}



if (exportJPGBtn) {

    exportJPGBtn.addEventListener(
        "click",
        function () {

            if (
                !isExportCanvasReady()
            ) {

                alert(
                    "Canvas is not ready."
                );

                return;

            }


            

            const oldBackground =
                canvas.backgroundColor;


            canvas.backgroundColor =
                "#ffffff";


            canvas.requestRenderAll();


            const url =
                canvas.toDataURL({
                    format: "jpeg",
                    quality: 1,
                    multiplier: 1
                });


            canvas.backgroundColor =
                oldBackground;


            canvas.requestRenderAll();


            downloadFile(
                url,
                "astra-design.jpg"
            );

        }
    );

}




if (saveProjectBtn) {

    saveProjectBtn.addEventListener(
        "click",
        function () {

            if (
                !isExportCanvasReady()
            ) {

                alert(
                    "Canvas is not ready."
                );

                return;

            }


            

            const projectData = {

                version: "1.0",

                application:
                    "ASTRA Photo Editor",

                canvas:
                    canvas.toJSON()

            };


            const json =
                JSON.stringify(
                    projectData,
                    null,
                    2
                );


            const blob =
                new Blob(
                    [json],
                    {
                        type:
                            "application/json"
                    }
                );


            const url =
                URL.createObjectURL(
                    blob
                );


            const link =
                document.createElement(
                    "a"
                );


            link.href =
                url;


            link.download =
                "astra-project.astra";


            document.body.appendChild(
                link
            );


            link.click();


            document.body.removeChild(
                link
            );


            

            setTimeout(
                function () {

                    URL.revokeObjectURL(
                        url
                    );

                },
                1000
            );

        }
    );

}



if (
    openProjectBtn &&
    projectFile
) {

    openProjectBtn.addEventListener(
        "click",
        function () {

            projectFile.value = "";

            projectFile.click();

        }
    );


    projectFile.addEventListener(
        "change",
        function (event) {

            const file =
                event.target.files[0];


            if (!file) {
                return;
            }


            const reader =
                new FileReader();


            reader.onload =
                function (e) {

                    try {

                        const project =
                            JSON.parse(
                                e.target.result
                            );


                        

                        const canvasJSON =
                            project.canvas ||
                            project;


                        canvas.loadFromJSON(
                            canvasJSON,
                            function () {

                                canvas.renderAll();


                                

                                if (
                                    typeof refreshLayers ===
                                    "function"
                                ) {

                                    refreshLayers();

                                }


                                

                                if (
                                    typeof clearHistory ===
                                    "function"
                                ) {

                                    clearHistory();

                                }
                                else if (
                                    typeof saveHistory ===
                                    "function"
                                ) {

                                    saveHistory();

                                }


                                

                                if (
                                    typeof refreshPages ===
                                    "function"
                                ) {

                                    refreshPages();

                                }


                                

                                if (
                                    typeof autoSaveProject ===
                                    "function"
                                ) {

                                    autoSaveProject();

                                }


                                alert(
                                    "Project loaded successfully."
                                );

                            }
                        );

                    }
                    catch (error) {

                        console.error(
                            "ASTRA Project Load Error:",
                            error
                        );


                        alert(
                            "Invalid ASTRA project file."
                        );

                    }

                };


            reader.onerror =
                function () {

                    alert(
                        "Unable to read project file."
                    );

                };


            reader.readAsText(
                file
            );

        }
    );

}




if (printCanvasBtn) {

    printCanvasBtn.addEventListener(
        "click",
        function () {

            if (
                !isExportCanvasReady()
            ) {

                alert(
                    "Canvas is not ready."
                );

                return;

            }


            const data =
                canvas.toDataURL({
                    format: "png",
                    multiplier: 1
                });


            const printWindow =
                window.open(
                    "",
                    "_blank"
                );


            if (!printWindow) {

                alert(
                    "Please allow pop-ups to print."
                );

                return;

            }


            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>ASTRA Print</title>

                    <style>
                        html,
                        body {
                            margin: 0;
                            padding: 0;
                            background: #ffffff;
                            text-align: center;
                        }

                        img {
                            max-width: 100%;
                            height: auto;
                        }

                        @media print {

                            body {
                                margin: 0;
                            }

                            img {
                                width: 100%;
                            }

                        }
                    </style>
                </head>

                <body>

                    <img
                        src="${data}"
                        alt="ASTRA Design"
                    >

                    <script>

                        window.onload = function () {

                            window.print();

                        };

                    <\/script>

                </body>
                </html>
            `);


            printWindow.document.close();

        }
    );

}




if (exportPDFBtn) {

    exportPDFBtn.addEventListener(
        "click",
        function () {

            if (
                !isExportCanvasReady()
            ) {

                alert(
                    "Canvas is not ready."
                );

                return;

            }


            /*
             * Check jsPDF
             */

            if (
                typeof jspdf ===
                "undefined"
            ) {

                alert(
                    "jsPDF library is not loaded."
                );

                return;

            }


            const width =
                canvas.getWidth();


            const height =
                canvas.getHeight();


            const image =
                canvas.toDataURL({
                    format: "png",
                    multiplier: 1
                });


            /*
             * Select PDF orientation
             */

            const orientation =
                width >= height
                    ? "landscape"
                    : "portrait";


            /*
             * Use pixel dimensions
             * converted to mm.
             */

            const pxToMm =
                0.264583;


            const pdfWidth =
                width * pxToMm;


            const pdfHeight =
                height * pxToMm;


            const PDF =
                jspdf.jsPDF;


            const pdf =
                new PDF({
                    orientation:
                        orientation,

                    unit: "mm",

                    format: [
                        pdfWidth,
                        pdfHeight
                    ]
                });


            pdf.addImage(
                image,
                "PNG",
                0,
                0,
                pdfWidth,
                pdfHeight
            );


            pdf.save(
                "astra-design.pdf"
            );

        }
    );

}





console.log(
    "ASTRA: Export Tools Loaded Successfully."
);