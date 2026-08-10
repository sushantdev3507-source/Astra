
const brightnessControl = document.getElementById("brightness");
const contrastControl = document.getElementById("contrast");
const saturationControl = document.getElementById("saturation");
const blurControl = document.getElementById("blur");

const grayBtn = document.getElementById("grayBtn");
const sepiaBtn = document.getElementById("sepiaBtn");
const invertBtn = document.getElementById("invertBtn");
const resetFiltersBtn = document.getElementById("resetFilters");




function getActiveImage() {

    const activeObject = canvas.getActiveObject();

    if (!activeObject) {
        return null;
    }

    if (activeObject.type !== "image") {
        return null;
    }

    return activeObject;
}




function applyImageFilters() {

    const image = getActiveImage();

    if (!image) {
        return;
    }


    const brightness =
        Number(brightnessControl?.value || 0);

    const contrast =
        Number(contrastControl?.value || 0);

    const saturation =
        Number(saturationControl?.value || 0);

    const blur =
        Number(blurControl?.value || 0);


    
    image.filters = image.filters.filter(filter => {

        return !(
            filter instanceof fabric.Image.filters.Brightness ||
            filter instanceof fabric.Image.filters.Contrast ||
            filter instanceof fabric.Image.filters.Saturation ||
            filter instanceof fabric.Image.filters.Blur
        );

    });


   
    if (brightness !== 0) {

        image.filters.push(
            new fabric.Image.filters.Brightness({

                brightness: brightness

            })
        );

    }


    
    if (contrast !== 0) {

        image.filters.push(
            new fabric.Image.filters.Contrast({

                contrast: contrast

            })
        );

    }


   
    if (saturation !== 0) {

        image.filters.push(
            new fabric.Image.filters.Saturation({

                saturation: saturation

            })
        );

    }



    if (blur > 0) {

        image.filters.push(
            new fabric.Image.filters.Blur({

                blur: blur

            })
        );

    }


    
    image.applyFilters();

    canvas.renderAll();

}



if (brightnessControl) {

    brightnessControl.addEventListener("input", () => {

        applyImageFilters();

    });

}




if (contrastControl) {

    contrastControl.addEventListener("input", () => {

        applyImageFilters();

    });

}




if (saturationControl) {

    saturationControl.addEventListener("input", () => {

        applyImageFilters();

    });

}




if (blurControl) {

    blurControl.addEventListener("input", () => {

        applyImageFilters();

    });

}




if (grayBtn) {

    grayBtn.addEventListener("click", () => {

        const image = getActiveImage();

        if (!image) {

            alert("Please select an image first.");

            return;

        }


        
        image.filters = image.filters.filter(filter => {

            return !(filter instanceof fabric.Image.filters.Grayscale);

        });


        image.filters.push(
            new fabric.Image.filters.Grayscale()
        );


        image.applyFilters();

        canvas.renderAll();

    });

}




if (sepiaBtn) {

    sepiaBtn.addEventListener("click", () => {

        const image = getActiveImage();

        if (!image) {

            alert("Please select an image first.");

            return;

        }


        // Remove existing sepia filter
        image.filters = image.filters.filter(filter => {

            return !(filter instanceof fabric.Image.filters.Sepia);

        });


        image.filters.push(
            new fabric.Image.filters.Sepia()
        );


        image.applyFilters();

        canvas.renderAll();

    });

}



if (invertBtn) {

    invertBtn.addEventListener("click", () => {

        const image = getActiveImage();

        if (!image) {

            alert("Please select an image first.");

            return;

        }


        
        image.filters = image.filters.filter(filter => {

            return !(filter instanceof fabric.Image.filters.Invert);

        });


        image.filters.push(
            new fabric.Image.filters.Invert()
        );


        image.applyFilters();

        canvas.renderAll();

    });

}




if (resetFiltersBtn) {

    resetFiltersBtn.addEventListener("click", () => {

        const image = getActiveImage();

        if (!image) {

            alert("Please select an image first.");

            return;

        }


        
        image.filters = [];

        image.applyFilters();


        // Reset sliders
        if (brightnessControl) {

            brightnessControl.value = 0;

        }

        if (contrastControl) {

            contrastControl.value = 0;

        }

        if (saturationControl) {

            saturationControl.value = 0;

        }

        if (blurControl) {

            blurControl.value = 0;

        }


        canvas.renderAll();

    });

}




function syncFilterPanel() {

    const image = getActiveImage();

    if (!image) {
        return;
    }


    let brightness = 0;
    let contrast = 0;
    let saturation = 0;
    let blur = 0;


    image.filters.forEach(filter => {

        if (
            filter instanceof fabric.Image.filters.Brightness
        ) {

            brightness = filter.brightness;

        }


        if (
            filter instanceof fabric.Image.filters.Contrast
        ) {

            contrast = filter.contrast;

        }


        if (
            filter instanceof fabric.Image.filters.Saturation
        ) {

            saturation = filter.saturation;

        }


        if (
            filter instanceof fabric.Image.filters.Blur
        ) {

            blur = filter.blur;

        }

    });


    if (brightnessControl) {

        brightnessControl.value = brightness;

    }

    if (contrastControl) {

        contrastControl.value = contrast;

    }

    if (saturationControl) {

        saturationControl.value = saturation;

    }

    if (blurControl) {

        blurControl.value = blur;

    }

}




canvas.on("selection:created", () => {

    syncFilterPanel();

});


canvas.on("selection:updated", () => {

    syncFilterPanel();

});


canvas.on("selection:cleared", () => {

    if (brightnessControl) {
        brightnessControl.value = 0;
    }

    if (contrastControl) {
        contrastControl.value = 0;
    }

    if (saturationControl) {
        saturationControl.value = 0;
    }

    if (blurControl) {
        blurControl.value = 0;
    }

});