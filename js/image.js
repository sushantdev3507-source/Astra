

const imageInput = document.getElementById("imageInput");
const uploadBtn = document.getElementById("uploadImage");

// Upload Image
uploadBtn.onclick = () => imageInput.click();

imageInput.onchange = function(e){

    const file = e.target.files[0];

    if(!file) return;

    const reader = new FileReader();

    reader.onload = function(event){

        fabric.Image.fromURL(event.target.result,function(img){

            img.set({
                left:150,
                top:100
            });

            img.scaleToWidth(400);

            canvas.add(img);

            canvas.setActiveObject(img);

            canvas.requestRenderAll();

        });

    };

    reader.readAsDataURL(file);

};
const replaceBtn = document.getElementById("replaceImage");

replaceBtn.onclick = ()=>{

    const active = canvas.getActiveObject();

    if(!active || active.type!=="image"){

        alert("Select an image first.");

        return;

    }

    imageInput.click();

    imageInput.onchange=function(e){

        const file=e.target.files[0];

        if(!file) return;

        const reader=new FileReader();

        reader.onload=function(event){

            fabric.Image.fromURL(event.target.result,function(newImg){

                newImg.left=active.left;
                newImg.top=active.top;
                newImg.scaleX=active.scaleX;
                newImg.scaleY=active.scaleY;
                newImg.angle=active.angle;

                canvas.remove(active);

                canvas.add(newImg);

                canvas.setActiveObject(newImg);

                canvas.renderAll();

            });

        };

        reader.readAsDataURL(file);

    };

};
function duplicateActiveObject(){

    const obj=canvas.getActiveObject();

    if(!obj) return;

    obj.clone(function(clone){

        clone.left+=25;

        clone.top+=25;

        canvas.add(clone);

        canvas.setActiveObject(clone);

        canvas.renderAll();

    });

}
document.getElementById("duplicateImage").onclick=duplicateActiveObject;
document.getElementById("deleteImage").onclick=()=>{

    const obj=canvas.getActiveObject();

    if(!obj) return;

    canvas.remove(obj);

    canvas.renderAll();

};
document.getElementById("fitCanvas").onclick=()=>{

    const obj=canvas.getActiveObject();

    if(!obj) return;

    obj.scaleToWidth(canvas.width-80);

    canvas.centerObject(obj);

    canvas.renderAll();

};
document.getElementById("setBackground").onclick=()=>{

    const obj=canvas.getActiveObject();

    if(!obj || obj.type!=="image") return;

    obj.selectable=false;
    obj.evented=false;

    obj.sendToBack();

    canvas.renderAll();

};