

"use strict";

(function () {

    

    let pages = [];

    let currentPageIndex = 0;

    let initialized = false;

    let isSwitchingPage = false;


   

    function getCanvas() {

        if (
            window.canvas &&
            typeof window.canvas.add === "function"
        ) {

            return window.canvas;

        }

        return null;

    }


    

    function savePageHistory() {

        if (
            typeof window.saveHistory ===
            "function"
        ) {

            try {

                window.saveHistory();

            } catch (error) {

                console.warn(
                    "ASTRA: Page history save failed.",
                    error
                );

            }

        }

    }


    

    function createPageData(name) {

        return {

            id:
                "page-" +
                Date.now() +
                "-" +
                Math.random()
                    .toString(36)
                    .substring(2, 8),

            name:
                name ||
                "Page " +
                (pages.length + 1),

            width: 1000,

            height: 650,

            background: "#ffffff",

            objects: []

        };

    }


    

    function serializeCurrentPage() {

        const canvas =
            getCanvas();

        if (!canvas) {

            return;

        }

        if (!pages[currentPageIndex]) {

            return;

        }

        try {

            pages[currentPageIndex]
                .objects =
                canvas.toJSON([
                    "layerName",
                    "isFrame",
                    "frameType",
                    "excludeFromExport"
                ]).objects || [];


            pages[currentPageIndex]
                .background =
                canvas.backgroundColor ||
                "#ffffff";


            pages[currentPageIndex]
                .width =
                canvas.getWidth();


            pages[currentPageIndex]
                .height =
                canvas.getHeight();

        } catch (error) {

            console.error(
                "ASTRA: Unable to save current page.",
                error
            );

        }

    }


    

    function clearCanvas() {

        const canvas =
            getCanvas();

        if (!canvas) return;


        canvas.clear();

        canvas.backgroundColor =
            "#ffffff";

        canvas.discardActiveObject();

        canvas.requestRenderAll();

    }


    

    function loadPage(index) {

        const canvas =
            getCanvas();

        if (!canvas) {

            console.error(
                "ASTRA: Canvas unavailable."
            );

            return;

        }

        if (
            index < 0 ||
            index >= pages.length
        ) {

            return;

        }

        const page =
            pages[index];

        isSwitchingPage =
            true;


        canvas.clear();

        canvas.backgroundColor =
            page.background ||
            "#ffffff";


        const objects =
            page.objects || [];


        if (objects.length === 0) {

            currentPageIndex =
                index;

            updatePageUI();

            canvas.requestRenderAll();

            isSwitchingPage =
                false;

            return;

        }


        try {

            canvas.loadFromJSON(
                {
                    objects: objects
                },
                function () {

                    canvas.renderAll();

                    currentPageIndex =
                        index;

                    updatePageUI();


                    if (
                        typeof window.refreshLayers ===
                        "function"
                    ) {

                        try {

                            window.refreshLayers();

                        } catch (error) {

                            console.warn(
                                "ASTRA: Layer refresh failed.",
                                error
                            );

                        }

                    }


                    canvas.requestRenderAll();

                    isSwitchingPage =
                        false;


                    console.log(
                        "ASTRA: Page loaded:",
                        page.name
                    );

                }
            );

        } catch (error) {

            console.error(
                "ASTRA: Page loading failed.",
                error
            );

            isSwitchingPage =
                false;

        }

    }


    

    function initializeFirstPage() {

        if (pages.length > 0) {

            return;

        }

        const firstPage =
            createPageData("Page 1");

        pages.push(firstPage);


        const canvas =
            getCanvas();

        if (canvas) {

            firstPage.width =
                canvas.getWidth();

            firstPage.height =
                canvas.getHeight();

            firstPage.background =
                canvas.backgroundColor ||
                "#ffffff";

        }

        currentPageIndex =
            0;

        updatePageUI();

    }


    
    function addPage() {

        const canvas =
            getCanvas();

        if (!canvas) {

            alert(
                "ASTRA: Canvas is not ready."
            );

            return;

        }


        serializeCurrentPage();


        const newPage =
            createPageData(
                "Page " +
                (pages.length + 1)
            );


        newPage.width =
            canvas.getWidth();

        newPage.height =
            canvas.getHeight();

        newPage.background =
            "#ffffff";


        pages.push(newPage);


        loadPage(
            pages.length - 1
        );


        savePageHistory();


        console.log(
            "ASTRA: New page added."
        );

    }


    

    function duplicatePage() {

        const canvas =
            getCanvas();

        if (!canvas) {

            return;

        }


        serializeCurrentPage();


        const currentPage =
            pages[currentPageIndex];

        if (!currentPage) {

            return;

        }


        const duplicate =
            JSON.parse(
                JSON.stringify(
                    currentPage
                )
            );


        duplicate.id =
            "page-" +
            Date.now() +
            "-" +
            Math.random()
                .toString(36)
                .substring(2, 8);


        duplicate.name =
            "Page " +
            (pages.length + 1);


        pages.splice(
            currentPageIndex + 1,
            0,
            duplicate
        );


        loadPage(
            currentPageIndex + 1
        );


        savePageHistory();


        console.log(
            "ASTRA: Page duplicated."
        );

    }


    

    function deletePage() {

        if (pages.length <= 1) {

            alert(
                "ASTRA: At least one page is required."
            );

            return;

        }


        const confirmed =
            confirm(
                "Delete this page?"
            );


        if (!confirmed) {

            return;

        }


        serializeCurrentPage();


        pages.splice(
            currentPageIndex,
            1
        );


        if (
            currentPageIndex >=
            pages.length
        ) {

            currentPageIndex =
                pages.length - 1;

        }


        loadPage(
            currentPageIndex
        );


        savePageHistory();


        console.log(
            "ASTRA: Page deleted."
        );

    }


    

    function nextPage() {

        serializeCurrentPage();


        if (
            currentPageIndex <
            pages.length - 1
        ) {

            loadPage(
                currentPageIndex + 1
            );

        }

    }


    

    function previousPage() {

        serializeCurrentPage();


        if (
            currentPageIndex >
            0
        ) {

            loadPage(
                currentPageIndex - 1
            );

        }

    }


    

    function goToPage(index) {

        index =
            Number(index);


        if (!Number.isInteger(index)) {

            return;

        }


        if (
            index < 0 ||
            index >= pages.length
        ) {

            return;

        }


        if (
            index ===
            currentPageIndex
        ) {

            return;

        }


        serializeCurrentPage();


        loadPage(index);

    }


    

    function updatePageUI() {

        const pageNumber =
            document.getElementById(
                "pageNumber"
            );


        const pageCount =
            document.getElementById(
                "pageCount"
            );


        const pageIndicator =
            document.getElementById(
                "pageIndicator"
            );


        if (pageNumber) {

            pageNumber.textContent =
                currentPageIndex + 1;

        }


        if (pageCount) {

            pageCount.textContent =
                pages.length;

        }


        if (pageIndicator) {

            pageIndicator.textContent =
                "Page " +
                (currentPageIndex + 1) +
                " / " +
                pages.length;

        }


        const previousBtn =
            document.getElementById(
                "previousPage"
            );


        if (previousBtn) {

            previousBtn.disabled =
                currentPageIndex === 0;

        }


        const nextBtn =
            document.getElementById(
                "nextPage"
            );


        if (nextBtn) {

            nextBtn.disabled =
                currentPageIndex ===
                pages.length - 1;

        }


        renderPageList();

    }


    

    function renderPageList() {

        const container =
            document.getElementById(
                "pagesList"
            );


        if (!container) {

            return;

        }


        container.innerHTML =
            "";


        pages.forEach(
            function (page, index) {

                const item =
                    document.createElement(
                        "button"
                    );


                item.type =
                    "button";


                item.className =
                    "page-item";


                if (
                    index ===
                    currentPageIndex
                ) {

                    item.classList.add(
                        "active"
                    );

                }


                item.textContent =
                    page.name;


                item.addEventListener(
                    "click",
                    function () {

                        goToPage(index);

                    }
                );


                container.appendChild(
                    item
                );

            }
        );

    }


    

    function renameCurrentPage() {

        const page =
            pages[currentPageIndex];


        if (!page) {

            return;

        }


        const newName =
            prompt(
                "Enter page name:",
                page.name
            );


        if (newName === null) {

            return;

        }


        const trimmed =
            newName.trim();


        if (!trimmed) {

            return;

        }


        page.name =
            trimmed;


        updatePageUI();

        savePageHistory();

    }


    

    function savePages() {

        serializeCurrentPage();


        try {

            localStorage.setItem(
                "ASTRA_PAGES",
                JSON.stringify(pages)
            );


            localStorage.setItem(
                "ASTRA_CURRENT_PAGE",
                String(currentPageIndex)
            );


            console.log(
                "ASTRA: Pages saved."
            );

        } catch (error) {

            console.warn(
                "ASTRA: Unable to save pages.",
                error
            );

        }

    }


    

    function loadSavedPages() {

        try {

            const saved =
                localStorage.getItem(
                    "ASTRA_PAGES"
                );


            const savedIndex =
                localStorage.getItem(
                    "ASTRA_CURRENT_PAGE"
                );


            if (!saved) {

                return false;

            }


            const parsed =
                JSON.parse(saved);


            if (
                !Array.isArray(parsed) ||
                parsed.length === 0
            ) {

                return false;

            }


            pages =
                parsed;


            currentPageIndex =
                Number(
                    savedIndex || 0
                );


            if (
                currentPageIndex < 0 ||
                currentPageIndex >=
                pages.length
            ) {

                currentPageIndex =
                    0;

            }


            return true;

        } catch (error) {

            console.warn(
                "ASTRA: Saved pages could not be loaded.",
                error
            );

            return false;

        }

    }


    

    function initializePageButtons() {

        if (initialized) {

            return;

        }


        initialized =
            true;


        const addBtn =
            document.getElementById(
                "addPage"
            );


        if (addBtn) {

            addBtn.addEventListener(
                "click",
                addPage
            );

        }


        const duplicateBtn =
            document.getElementById(
                "duplicatePage"
            );


        if (duplicateBtn) {

            duplicateBtn.addEventListener(
                "click",
                duplicatePage
            );

        }


        const deleteBtn =
            document.getElementById(
                "deletePage"
            );


        if (deleteBtn) {

            deleteBtn.addEventListener(
                "click",
                deletePage
            );

        }


        const previousBtn =
            document.getElementById(
                "previousPage"
            );


        if (previousBtn) {

            previousBtn.addEventListener(
                "click",
                previousPage
            );

        }


        const nextBtn =
            document.getElementById(
                "nextPage"
            );


        if (nextBtn) {

            nextBtn.addEventListener(
                "click",
                nextPage
            );

        }


        const renameBtn =
            document.getElementById(
                "renamePage"
            );


        if (renameBtn) {

            renameBtn.addEventListener(
                "click",
                renameCurrentPage
            );

        }


        const pagesTool =
            document.getElementById(
                "pagesTool"
            );


        const pagesPanel =
            document.getElementById(
                "pagesPanel"
            );


        if (
            pagesTool &&
            pagesPanel
        ) {

            pagesTool.addEventListener(
                "click",
                function () {

                    pagesPanel.classList.add(
                        "active"
                    );

                }
            );

        }


        const closePagesPanel =
            document.getElementById(
                "closePagesPanel"
            );


        if (
            closePagesPanel &&
            pagesPanel
        ) {

            closePagesPanel.addEventListener(
                "click",
                function () {

                    pagesPanel.classList.remove(
                        "active"
                    );

                }
            );

        }


        console.log(
            "ASTRA: Page buttons connected."
        );

    }


    

    function initializePages() {

        const canvas =
            getCanvas();


        if (!canvas) {

            console.warn(
                "ASTRA: Pages waiting for canvas..."
            );

            return;

        }


        initializePageButtons();


        const restored =
            loadSavedPages();


        if (!restored) {

            initializeFirstPage();

        } else {

            updatePageUI();


            if (
                canvas.getObjects().length === 0
            ) {

                loadPage(
                    currentPageIndex
                );

            }

        }


        canvas.on(
            "object:added",
            function () {

                if (isSwitchingPage) {

                    return;

                }

                serializeCurrentPage();

            }
        );


        canvas.on(
            "object:modified",
            function () {

                if (isSwitchingPage) {

                    return;

                }

                serializeCurrentPage();

            }
        );


        canvas.on(
            "object:removed",
            function () {

                if (isSwitchingPage) {

                    return;

                }

                serializeCurrentPage();

            }
        );


        console.log(
            "ASTRA: Pages Manager READY."
        );

    }


    
    window.addEventListener(
        "ASTRA_CANVAS_READY",
        function () {

            setTimeout(
                initializePages,
                50
            );

        }
    );


    
    

    document.addEventListener(
        "DOMContentLoaded",
        function () {

            setTimeout(
                initializePages,
                150
            );

        }
    );


    

    window.astraAddPage =
        addPage;


    window.astraDuplicatePage =
        duplicatePage;


    window.astraDeletePage =
        deletePage;


    window.astraNextPage =
        nextPage;


    window.astraPreviousPage =
        previousPage;


    window.astraGoToPage =
        goToPage;


    window.astraRenamePage =
        renameCurrentPage;


    window.astraSavePages =
        savePages;


    window.astraLoadPages =
        loadSavedPages;


    window.getAstraPages =
        function () {

            serializeCurrentPage();

            return pages;

        };


    window.getCurrentAstraPage =
        function () {

            return pages[
                currentPageIndex
            ] || null;

        };

})();

