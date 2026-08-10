"use strict";

(function () {

    console.log("ASTRA: AI Tools loading.");

    function getCanvas() {
        if (
            window.canvas &&
            typeof window.canvas.add === "function"
        ) {
            return window.canvas;
        }

        console.warn("ASTRA AI: Canvas is not ready.");
        return null;
    }

    function getActiveObject() {
        const c = getCanvas();

        if (!c) {
            return null;
        }

        return c.getActiveObject();
    }

    function saveAIHistory() {
        if (typeof window.saveHistory === "function") {
            try {
                window.saveHistory();
            } catch (error) {
                console.warn(
                    "ASTRA AI: History save failed.",
                    error
                );
            }
        }
    }

    function renderCanvas() {
        const c = getCanvas();

        if (!c) {
            return;
        }

        c.requestRenderAll();
    }

    function initializeAIPanel() {
        const aiTool = document.getElementById("aiTool");
        const aiPanel = document.getElementById("aiPanel");
        const closeAIPanel = document.getElementById("closeAIPanel");

        if (aiTool && aiPanel) {
            aiTool.addEventListener("click", function () {
                aiPanel.classList.add("active");
            });
        }

        if (closeAIPanel && aiPanel) {
            closeAIPanel.addEventListener("click", function () {
                aiPanel.classList.remove("active");
            });
        }
    }

    function getActiveImage() {
        const object = getActiveObject();

        if (!object || object.type !== "image") {
            alert("Please select an image first.");
            return null;
        }

        return object;
    }

    function removeBackground() {
        const image = getActiveImage();

        if (!image) {
            return;
        }

        image.set({
            opacity: 0.95
        });

        image.aiAction = "background-removed";

        renderCanvas();
        saveAIHistory();

        alert(
            "AI Background Remove is ready. Connect an AI background-removal API/model for actual pixel removal."
        );
    }

    function autoEnhance() {
        const image = getActiveImage();

        if (!image) {
            return;
        }

        if (!fabric.Image || !fabric.Image.filters) {
            return;
        }

        image.filters = [
            new fabric.Image.filters.Contrast({
                contrast: 0.15
            }),
            new fabric.Image.filters.Brightness({
                brightness: 0.08
            }),
            new fabric.Image.filters.Saturation({
                saturation: 0.12
            })
        ];

        image.applyFilters();
        image.aiAction = "auto-enhance";

        renderCanvas();
        saveAIHistory();

        console.log("ASTRA AI: Auto Enhance applied.");
    }

    function sharpenImage() {
        const image = getActiveImage();

        if (!image) {
            return;
        }

        if (!fabric.Image || !fabric.Image.filters) {
            return;
        }

        image.filters = image.filters || [];

        image.filters.push(
            new fabric.Image.filters.Convolute({
                matrix: [
                    0, -1, 0,
                    -1, 5, -1,
                    0, -1, 0
                ]
            })
        );

        image.applyFilters();
        image.aiAction = "sharpen";

        renderCanvas();
        saveAIHistory();

        console.log("ASTRA AI: Sharpen applied.");
    }

    function grayscaleImage() {
        const image = getActiveImage();

        if (!image) {
            return;
        }

        image.filters = image.filters || [];

        image.filters.push(
            new fabric.Image.filters.Grayscale()
        );

        image.applyFilters();
        image.aiAction = "grayscale";

        renderCanvas();
        saveAIHistory();
    }

    function autoColor() {
        const image = getActiveImage();

        if (!image) {
            return;
        }

        image.filters = image.filters || [];

        image.filters.push(
            new fabric.Image.filters.Saturation({
                saturation: 0.25
            }),
            new fabric.Image.filters.Contrast({
                contrast: 0.10
            })
        );

        image.applyFilters();
        image.aiAction = "auto-color";

        renderCanvas();
        saveAIHistory();
    }

    function resetAI() {
        const image = getActiveImage();

        if (!image) {
            return;
        }

        image.filters = [];
        image.applyFilters();

        delete image.aiAction;

        renderCanvas();
        saveAIHistory();

        console.log("ASTRA AI: Filters reset.");
    }

    function upscaleImage() {
        const image = getActiveImage();

        if (!image) {
            return;
        }

        const scaleX = image.scaleX || 1;
        const scaleY = image.scaleY || 1;

        image.set({
            scaleX: scaleX * 1.25,
            scaleY: scaleY * 1.25
        });

        image.aiAction = "upscaled";
        image.setCoords();

        renderCanvas();
        saveAIHistory();

        console.log("ASTRA AI: Image enlarged.");
    }

    function initializeAIButtons() {
        const buttons = document.querySelectorAll("[data-ai]");

        buttons.forEach(function (button) {
            if (button.dataset.astraAIBound) {
                return;
            }

            button.dataset.astraAIBound = "true";

            button.addEventListener("click", function () {
                runAITool(button.dataset.ai);
            });
        });
    }

    function runAITool(action) {
        switch (action) {
            case "remove-background":
                removeBackground();
                break;

            case "enhance":
                autoEnhance();
                break;

            case "sharpen":
                sharpenImage();
                break;

            case "grayscale":
                grayscaleImage();
                break;

            case "auto-color":
                autoColor();
                break;

            case "upscale":
                upscaleImage();
                break;

            case "reset":
                resetAI();
                break;

            default:
                console.warn(
                    "ASTRA AI: Unknown action:",
                    action
                );
        }
    }

    function initializeAIPrompt() {
        const generateBtn = document.getElementById("aiGenerateBtn");
        const promptInput = document.getElementById("aiPrompt");

        if (!generateBtn) {
            return;
        }

        generateBtn.addEventListener("click", function () {
            const prompt = promptInput
                ? promptInput.value.trim()
                : "";

            if (!prompt) {
                alert("Enter an AI prompt first.");
                return;
            }

            console.log("ASTRA AI Prompt:", prompt);

            alert(
                "AI prompt received. Connect your image-generation API/model to generate an image."
            );
        });
    }

    function initializeAITools() {
        initializeAIPanel();
        initializeAIButtons();
        initializeAIPrompt();

        console.log(
            "ASTRA: AI Tools initialized successfully."
        );
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initializeAITools
        );
    } else {
        initializeAITools();
    }

    window.addEventListener(
        "ASTRA_CANVAS_READY",
        function () {
            console.log(
                "ASTRA AI: Canvas connected."
            );
        }
    );

    window.removeBackground = removeBackground;
    window.autoEnhance = autoEnhance;
    window.sharpenImage = sharpenImage;
    window.grayscaleImage = grayscaleImage;
    window.autoColor = autoColor;
    window.upscaleImage = upscaleImage;
    window.resetAI = resetAI;
    window.runAITool = runAITool;

    console.log(
        "ASTRA: AI Tools loaded successfully."
    );

})();