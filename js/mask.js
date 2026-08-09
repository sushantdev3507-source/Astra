const maskType = document.getElementById("maskType");

const applyMaskBtn = document.getElementById("applyMask");

const removeMaskBtn = document.getElementById("removeMask");


if (applyMaskBtn) {

    applyMaskBtn.addEventListener("click", function () {

        if (typeof canvas === "undefined") {

            alert("Canvas is not ready.");

            return;

        }


        const obj = canvas.getActiveObject();


        if (!obj) {

            alert("Please select an image first.");

            return;

        }


        if (obj.type !== "image") {

            alert("Mask can only be applied to an image.");

            return;

        }


        const type = maskType.value;


        obj.clipPath = null;


        if (type === "circle") {

            const size = Math.min(
                obj.width,
                obj.height
            );

            obj.clipPath = new fabric.Circle({

                radius: size / 2,

                originX: "center",

                originY: "center",

                left: 0,

                top: 0

            });

        }


        else if (type === "rectangle") {

            obj.clipPath = new fabric.Rect({

                width: obj.width,

                height: obj.height,

                originX: "center",

                originY: "center",

                left: 0,

                top: 0

            });

        }


        else if (type === "rounded") {

            const radius =
                Math.min(
                    obj.width,
                    obj.height
                ) * 0.10;


            obj.clipPath = new fabric.Rect({

                width: obj.width,

                height: obj.height,

                rx: radius,

                ry: radius,

                originX: "center",

                originY: "center",

                left: 0,

                top: 0

            });

        }


        canvas.requestRenderAll();


        if (typeof saveHistory === "function") {

            saveHistory();

        }

    });

}


if (removeMaskBtn) {

    removeMaskBtn.addEventListener("click", function () {

        if (typeof canvas === "undefined") {

            alert("Canvas is not ready.");

            return;

        }


        const obj = canvas.getActiveObject();


        if (!obj) {

            alert("Please select an image first.");

            return;

        }


        if (obj.type !== "image") {

            alert("Mask can only be removed from an image.");

            return;

        }


        obj.clipPath = null;


        canvas.requestRenderAll();


        if (typeof saveHistory === "function") {

            saveHistory();

        }

    });

}