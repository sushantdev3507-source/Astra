

document.addEventListener("DOMContentLoaded", function () {

    const params = new URLSearchParams(
        window.location.search
    );

    const mode = params.get("mode");

    const banner =
        document.getElementById("sonamModeBanner");

    const closeBanner =
        document.getElementById("closeSonamBanner");


   
    if (mode !== "sonam") {

        if (banner) {
            banner.style.display = "none";
        }

        return;
    }


    

    if (banner) {
        banner.classList.add("active");
    }


    

    const sonamImage =
        localStorage.getItem(
            "sonamGeneratedImage"
        );


    if (!sonamImage) {

        console.warn(
            "No image received from Sonam."
        );

        return;
    }


    

    loadSonamImage(sonamImage);


    

    if (closeBanner) {

        closeBanner.addEventListener(
            "click",
            function () {

                banner.classList.remove(
                    "active"
                );

            }
        );

    }

});




function loadSonamImage(imageData) {

    

    if (
        typeof canvas === "undefined" ||
        !canvas
    ) {

        console.error(
            "ASTRA Fabric canvas is not ready."
        );

        return;
    }


    fabric.Image.fromURL(
        imageData,
        function (img) {

            if (!img) {

                console.error(
                    "Unable to load Sonam image."
                );

                return;
            }


            

            canvas.clear();


            

            const maxWidth =
                canvas.getWidth() * 0.9;

            const maxHeight =
                canvas.getHeight() * 0.9;


            const scaleX =
                maxWidth / img.width;

            const scaleY =
                maxHeight / img.height;


            const scale =
                Math.min(
                    scaleX,
                    scaleY,
                    1
                );


            img.scale(scale);


            

            img.set({

                left:
                    canvas.getWidth() / 2,

                top:
                    canvas.getHeight() / 2,

                originX: "center",

                originY: "center",

                selectable: true,

                evented: true

            });


            

            canvas.add(img);

            canvas.setActiveObject(img);

            canvas.renderAll();


            console.log(
                "Sonam image loaded into ASTRA."
            );

        },
        {
            crossOrigin: "anonymous"
        }
    );

}