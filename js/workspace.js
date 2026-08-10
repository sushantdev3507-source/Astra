const workspace =
    document.getElementById("workspace");

const workspaceContainer =
    document.getElementById(
        "workspaceContainer"
    );

const canvasWrapper =
    document.getElementById(
        "canvasWrapper"
    );


function isWorkspaceCanvasReady() {

    return (
        typeof canvas !== "undefined" &&
        canvas &&
        typeof canvas.getWidth ===
            "function"
    );

}


function getWorkspaceSize() {

    if (!workspaceContainer) {

        return {
            width:
                window.innerWidth,

            height:
                window.innerHeight
        };

    }

    return {
        width:
            workspaceContainer.clientWidth,

        height:
            workspaceContainer.clientHeight
    };

}


function centerWorkspaceCanvas() {

    if (
        !isWorkspaceCanvasReady()
    ) {

        return;

    }

    if (!canvasWrapper) {

        return;

    }

    const workspaceSize =
        getWorkspaceSize();

    const canvasWidth =
        canvas.getWidth();

    const canvasHeight =
        canvas.getHeight();

    const left =
        Math.max(
            0,
            (
                workspaceSize.width -
                canvasWidth
            ) / 2
        );

    const top =
        Math.max(
            0,
            (
                workspaceSize.height -
                canvasHeight
            ) / 2
        );

    canvasWrapper.style.left =
        `${left}px`;

    canvasWrapper.style.top =
        `${top}px`;

}


function fitCanvasToWorkspace() {

    if (
        !isWorkspaceCanvasReady()
    ) {

        return;

    }

    if (!canvasWrapper) {

        return;

    }

    const workspaceSize =
        getWorkspaceSize();

    const canvasWidth =
        canvas.getWidth();

    const canvasHeight =
        canvas.getHeight();

    if (
        canvasWidth <= 0 ||
        canvasHeight <= 0
    ) {

        return;

    }

    const horizontalPadding =
        80;

    const verticalPadding =
        80;

    const availableWidth =
        Math.max(
            100,
            workspaceSize.width -
            horizontalPadding
        );

    const availableHeight =
        Math.max(
            100,
            workspaceSize.height -
            verticalPadding
        );

    const scaleX =
        availableWidth /
        canvasWidth;

    const scaleY =
        availableHeight /
        canvasHeight;

    const scale =
        Math.min(
            scaleX,
            scaleY,
            1
        );

    if (
        typeof canvas.setZoom ===
            "function"
    ) {

        canvas.setZoom(
            scale
        );

    }

    if (
        typeof canvas.setDimensions ===
            "function"
    ) {

        canvas.setDimensions({
            width:
                canvasWidth *
                scale,

            height:
                canvasHeight *
                scale
        });

    }

    canvas.requestRenderAll();

}


function handleWorkspaceResize() {

    if (
        !isWorkspaceCanvasReady()
    ) {

        return;

    }

    centerWorkspaceCanvas();

    if (
        typeof canvas.calcOffset ===
            "function"
    ) {

        canvas.calcOffset();

    }

}


window.addEventListener(
    "resize",
    handleWorkspaceResize
);


function zoomWorkspace(
    factor
) {

    if (
        !isWorkspaceCanvasReady()
    ) {

        return;

    }

    if (
        typeof canvas.getZoom !==
            "function" ||
        typeof canvas.setZoom !==
            "function"
    ) {

        return;

    }

    const currentZoom =
        canvas.getZoom();

    const newZoom =
        Math.min(
            4,
            Math.max(
                0.1,
                currentZoom *
                factor
            )
        );

    canvas.setZoom(
        newZoom
    );

    canvas.requestRenderAll();

    if (
        typeof canvas.calcOffset ===
            "function"
    ) {

        canvas.calcOffset();

    }

}


function zoomIn() {

    zoomWorkspace(
        1.1
    );

}


function zoomOut() {

    zoomWorkspace(
        0.9
    );

}


function resetWorkspaceZoom() {

    if (
        !isWorkspaceCanvasReady()
    ) {

        return;

    }

    if (
        typeof canvas.setZoom !==
            "function"
    ) {

        return;

    }

    canvas.setZoom(
        1
    );

    canvas.requestRenderAll();

    if (
        typeof canvas.calcOffset ===
            "function"
    ) {

        canvas.calcOffset();

    }

    centerWorkspaceCanvas();

}


const zoomInBtn =
    document.getElementById(
        "zoomIn"
    );

const zoomOutBtn =
    document.getElementById(
        "zoomOut"
    );

const resetZoomBtn =
    document.getElementById(
        "resetZoom"
    );

const fitWorkspaceBtn =
    document.getElementById(
        "fitWorkspace"
    );


if (zoomInBtn) {

    zoomInBtn.addEventListener(
        "click",
        zoomIn
    );

}


if (zoomOutBtn) {

    zoomOutBtn.addEventListener(
        "click",
        zoomOut
    );

}


if (resetZoomBtn) {

    resetZoomBtn.addEventListener(
        "click",
        resetWorkspaceZoom
    );

}


if (fitWorkspaceBtn) {

    fitWorkspaceBtn.addEventListener(
        "click",
        fitCanvasToWorkspace
    );

}


if (
    isWorkspaceCanvasReady()
) {

    canvas.on(
        "mouse:wheel",
        function (event) {

            const nativeEvent =
                event.e;

            if (
                !nativeEvent.ctrlKey &&
                !nativeEvent.metaKey
            ) {

                return;

            }

            nativeEvent.preventDefault();

            let zoom =
                canvas.getZoom();

            zoom *=
                Math.pow(
                    0.999,
                    nativeEvent.deltaY
                );

            zoom =
                Math.min(
                    4,
                    Math.max(
                        0.1,
                        zoom
                    )
                );

            canvas.zoomToPoint(
                {
                    x:
                        nativeEvent.offsetX,

                    y:
                        nativeEvent.offsetY
                },
                zoom
            );

            canvas.requestRenderAll();

            if (
                typeof canvas.calcOffset ===
                    "function"
            ) {

                canvas.calcOffset();

            }

        }
    );

}


document.addEventListener(
    "keydown",
    function (event) {

        const activeElement =
            document.activeElement;

        if (
            activeElement &&
            (
                activeElement.tagName ===
                    "INPUT" ||
                activeElement.tagName ===
                    "TEXTAREA"
            )
        ) {

            return;

        }

        if (
            event.ctrlKey &&
            (
                event.key === "+" ||
                event.key === "="
            )
        ) {

            event.preventDefault();

            zoomIn();

        }

        if (
            event.ctrlKey &&
            event.key === "-"
        ) {

            event.preventDefault();

            zoomOut();

        }

        if (
            event.ctrlKey &&
            event.key === "0"
        ) {

            event.preventDefault();

            resetWorkspaceZoom();

        }

    }
);


function initializeWorkspace() {

    if (
        !isWorkspaceCanvasReady()
    ) {

        return;

    }

    if (
        typeof canvas.calcOffset ===
            "function"
    ) {

        canvas.calcOffset();

    }

    centerWorkspaceCanvas();

    canvas.requestRenderAll();

    console.log(
        "ASTRA: Workspace Initialized Successfully."
    );

}


function waitForWorkspaceCanvas() {

    if (
        isWorkspaceCanvasReady()
    ) {

        initializeWorkspace();

        return;

    }

    setTimeout(
        waitForWorkspaceCanvas,
        100
    );

}


if (
    document.readyState ===
        "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        waitForWorkspaceCanvas
    );

} else {

    waitForWorkspaceCanvas();

}