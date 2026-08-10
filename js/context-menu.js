const contextMenu =
    document.getElementById("contextMenu");




function isContextMenuReady() {

    return (
        typeof canvas !== "undefined" &&
        canvas &&
        canvas.upperCanvasEl
    );

}




function hideContextMenu() {

    if (!contextMenu) {
        return;
    }

    contextMenu.style.display =
        "none";

}




function showContextMenu(
    event
) {

    if (!contextMenu) {
        return;
    }


    

    contextMenu.style.display =
        "flex";


    let left =
        event.pageX;


    let top =
        event.pageY;


    

    const menuWidth =
        contextMenu.offsetWidth;


    const menuHeight =
        contextMenu.offsetHeight;


    const viewportWidth =
        window.innerWidth;


    const viewportHeight =
        window.innerHeight;


    const scrollX =
        window.scrollX;


    const scrollY =
        window.scrollY;


    if (
        left + menuWidth >
        scrollX + viewportWidth
    ) {

        left =
            scrollX +
            viewportWidth -
            menuWidth -
            10;

    }


    if (
        top + menuHeight >
        scrollY + viewportHeight
    ) {

        top =
            scrollY +
            viewportHeight -
            menuHeight -
            10;

    }


    contextMenu.style.left =
        `${Math.max(left, 5)}px`;


    contextMenu.style.top =
        `${Math.max(top, 5)}px`;

}




if (
    isContextMenuReady()
) {

    canvas.upperCanvasEl.addEventListener(
        "contextmenu",
        function (event) {

            event.preventDefault();

            event.stopPropagation();


            

            const pointer =
                canvas.getPointer(
                    event
                );


            const target =
                canvas.findTarget(
                    event
                );


            if (target) {

                canvas.setActiveObject(
                    target
                );

                canvas.requestRenderAll();

            }
            else {

                canvas.discardActiveObject();

                canvas.requestRenderAll();

            }


            showContextMenu(
                event
            );

        }
    );

}



if (contextMenu) {

    contextMenu.addEventListener(
        "click",
        function (event) {

            event.stopPropagation();

        }
    );

}



document.addEventListener(
    "click",
    function () {

        hideContextMenu();

    }
);




document.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key ===
            "Escape"
        ) {

            hideContextMenu();

        }

    }
);



const ctxCopy =
    document.getElementById(
        "ctxCopy"
    );


if (ctxCopy) {

    ctxCopy.addEventListener(
        "click",
        function () {

            if (
                typeof copyObject ===
                "function"
            ) {

                copyObject();

            }

            hideContextMenu();

        }
    );

}



const ctxPaste =
    document.getElementById(
        "ctxPaste"
    );


if (ctxPaste) {

    ctxPaste.addEventListener(
        "click",
        function () {

            if (
                typeof pasteObject ===
                "function"
            ) {

                pasteObject();

            }

            hideContextMenu();

        }
    );

}




const ctxDuplicate =
    document.getElementById(
        "ctxDuplicate"
    );


if (ctxDuplicate) {

    ctxDuplicate.addEventListener(
        "click",
        function () {

            if (
                typeof duplicateObject ===
                "function"
            ) {

                duplicateObject();

            }

            hideContextMenu();

        }
    );

}




const ctxDelete =
    document.getElementById(
        "ctxDelete"
    );


if (ctxDelete) {

    ctxDelete.addEventListener(
        "click",
        function () {

            if (
                typeof deleteObject ===
                "function"
            ) {

                deleteObject();

            }

            hideContextMenu();

        }
    );

}



const ctxFront =
    document.getElementById(
        "ctxFront"
    );


if (ctxFront) {

    ctxFront.addEventListener(
        "click",
        function () {

            if (
                !isContextMenuReady()
            ) {

                return;

            }


            const object =
                canvas.getActiveObject();


            if (!object) {

                hideContextMenu();

                return;

            }


            canvas.bringObjectToFront(
                object
            );


            object.setCoords();


            canvas.requestRenderAll();


            

            if (
                typeof saveHistory ===
                "function"
            ) {

                saveHistory();

            }


            

            if (
                typeof autoSaveProject ===
                "function"
            ) {

                autoSaveProject();

            }


            hideContextMenu();

        }
    );

}




const ctxBack =
    document.getElementById(
        "ctxBack"
    );


if (ctxBack) {

    ctxBack.addEventListener(
        "click",
        function () {

            if (
                !isContextMenuReady()
            ) {

                return;

            }


            const object =
                canvas.getActiveObject();


            if (!object) {

                hideContextMenu();

                return;

            }


            canvas.sendObjectToBack(
                object
            );


            object.setCoords();


            canvas.requestRenderAll();


            

            if (
                typeof saveHistory ===
                "function"
            ) {

                saveHistory();

            }


            

            if (
                typeof autoSaveProject ===
                "function"
            ) {

                autoSaveProject();

            }


            hideContextMenu();

        }
    );

}




hideContextMenu();


console.log(
    "ASTRA: Context Menu Loaded Successfully."
);