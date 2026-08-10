
"use strict";

(function () {

    console.log("ASTRA: Template Tool Loading...");


    
    const templateTool =
        document.getElementById("templatesTool");

    const templatePanel =
        document.getElementById("templatePanel");

    const closeTemplates =
        document.getElementById("closeTemplates");

    const saveTemplateBtn =
        document.getElementById("saveTemplateBtn");

    const templateList =
        document.getElementById("templateList");

    const templateStatus =
        document.getElementById("templateStatus");

    const categoryButtons =
        document.querySelectorAll(
            ".astra-template-category"
        );


    

    function openTemplatePanel() {

        if (!templatePanel) {

            console.error(
                "ASTRA: #templatePanel not found."
            );

            return;

        }

        templatePanel.classList.add("active");

        console.log(
            "ASTRA: Template Panel opened."
        );

    }


    

    function closeTemplatePanel() {

        if (!templatePanel) return;

        templatePanel.classList.remove(
            "active"
        );

    }


    
    if (templateTool) {

        templateTool.addEventListener(
            "click",
            function () {

                openTemplatePanel();

            }
        );

    } else {

        console.warn(
            "ASTRA: #templatesTool not found."
        );

    }


    

    if (closeTemplates) {

        closeTemplates.addEventListener(
            "click",
            function () {

                closeTemplatePanel();

            }
        );

    }


    

    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Escape"
            ) {

                closeTemplatePanel();

            }

        }
    );


    

    categoryButtons.forEach(
        function (button) {

            button.addEventListener(
                "click",
                function () {

                    categoryButtons.forEach(
                        function (btn) {

                            btn.classList.remove(
                                "active"
                            );

                        }
                    );


                    button.classList.add(
                        "active"
                    );


                    const category =
                        button.dataset.type;


                    filterTemplates(
                        category
                    );

                }
            );

        }
    );


    

    function filterTemplates(
        category
    ) {

        if (!templateList) return;


        const cards =
            templateList.querySelectorAll(
                ".astra-template-card"
            );


        cards.forEach(
            function (card) {

                const type =
                    card.dataset.template;


                if (
                    category === "custom"
                ) {

                    card.style.display =
                        "flex";

                    return;

                }


                if (
                    type === category ||
                    category === "instagram" ||
                    category === "youtube" ||
                    category === "facebook" ||
                    category === "poster"
                ) {

                    card.style.display =
                        "flex";

                } else {

                    card.style.display =
                        "none";

                }

            }
        );

    }


    
    function getCanvas() {

        return (
            window.canvas &&
            typeof window.canvas.setWidth ===
                "function"
        )
            ? window.canvas
            : null;

    }


    
    function applyTemplate(
        type
    ) {

        const canvas =
            getCanvas();


        if (!canvas) {

            showStatus(
                "Canvas is not ready yet.",
                true
            );

            return;

        }


        let width =
            1080;

        let height =
            1080;


        switch (type) {

            case "instagram":

                width = 1080;
                height = 1080;

                break;


            case "facebook":

                width = 1200;
                height = 630;

                break;


            case "youtube":

                width = 1280;
                height = 720;

                break;


            case "poster":

                width = 1080;
                height = 1350;

                break;


            case "custom":

                width = 1000;
                height = 650;

                break;


            default:

                width = 1000;
                height = 650;

        }


        
        canvas.setWidth(
            width
        );

        canvas.setHeight(
            height
        );


        canvas.backgroundColor =
            "#ffffff";


        canvas.renderAll();


        

        if (
            typeof window.fitCanvasToWorkspace ===
                "function"
        ) {

            setTimeout(
                function () {

                    window.fitCanvasToWorkspace();

                },
                100
            );

        }


        
        showStatus(
            "✓ " +
            getTemplateName(type) +
            " applied successfully."
        );


        console.log(
            "ASTRA: Template applied:",
            type,
            width,
            height
        );


        
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


    
    if (templateList) {

        templateList.addEventListener(
            "click",
            function (event) {

                const card =
                    event.target.closest(
                        ".astra-template-card"
                    );


                if (!card) return;


                const type =
                    card.dataset.template;


                if (!type) return;


                applyTemplate(
                    type
                );

            }
        );

    }


    

    function getTemplateName(
        type
    ) {

        const names = {

            instagram:
                "Instagram Post",

            facebook:
                "Facebook Post",

            youtube:
                "YouTube Thumbnail",

            poster:
                "Creative Poster",

            custom:
                "Custom Design"

        };


        return (
            names[type] ||
            "Template"
        );

    }


    
    function showStatus(
        message,
        error = false
    ) {

        if (!templateStatus) return;


        templateStatus.innerHTML =
            error
                ? `
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    ${message}
                  `
                : `
                    <i class="fa-solid fa-circle-check"></i>
                    ${message}
                  `;

    }


    

    if (saveTemplateBtn) {

        saveTemplateBtn.addEventListener(
            "click",
            function () {

                const canvas =
                    getCanvas();


                if (!canvas) {

                    showStatus(
                        "Canvas is not ready.",
                        true
                    );

                    return;

                }


                try {

                    const data =
                        JSON.stringify(
                            canvas.toJSON()
                        );


                    localStorage.setItem(
                        "ASTRA_SAVED_TEMPLATE",
                        data
                    );


                    showStatus(
                        "Current design saved successfully."
                    );


                } catch (error) {

                    console.error(
                        "ASTRA: Template save failed.",
                        error
                    );


                    showStatus(
                        "Unable to save template.",
                        true
                    );

                }

            }
        );

    }



    window.openAstraTemplates =
        openTemplatePanel;


    window.closeAstraTemplates =
        closeTemplatePanel;


    window.applyAstraTemplate =
        applyTemplate;


    

    console.log(
        "ASTRA: Template Tool READY."
    );

})();