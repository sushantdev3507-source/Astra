
let verticalGuide = null;
let horizontalGuide = null;
const OBJECT_SNAP_DISTANCE = 8;
const SNAP_DISTANCE = 10;

canvas.on("object:moving", function (e) {

    const obj = e.target;

    const center = canvas.getCenter();

    const objCenter = obj.getCenterPoint();

    // Horizontal Center
    if (Math.abs(objCenter.x - center.left) < SNAP_DISTANCE) {

        obj.left = center.left - obj.getScaledWidth() / 2;

    }

    // Vertical Center
    if (Math.abs(objCenter.y - center.top) < SNAP_DISTANCE) {

        obj.top = center.top - obj.getScaledHeight() / 2;

    }

});
function drawGuides() {

    if (verticalGuide) {

        canvas.remove(verticalGuide);

    }

    if (horizontalGuide) {

        canvas.remove(horizontalGuide);

    }

    const center = canvas.getCenter();

    verticalGuide = new fabric.Line(

        [center.left, 0, center.left, canvas.height],

        {

            stroke: "#ff3b30",

            strokeWidth: 1,

            selectable: false,

            evented: false,

            excludeFromExport: true

        }

    );

    horizontalGuide = new fabric.Line(

        [0, center.top, canvas.width, center.top],

        {

            stroke: "#ff3b30",

            strokeWidth: 1,

            selectable: false,

            evented: false,

            excludeFromExport: true

        }

    );

    canvas.add(verticalGuide);

    canvas.add(horizontalGuide);

    verticalGuide.sendToBack();

    horizontalGuide.sendToBack();

}
function hideGuides() {

    if (verticalGuide) {

        canvas.remove(verticalGuide);

        verticalGuide = null;

    }

    if (horizontalGuide) {

        canvas.remove(horizontalGuide);

        horizontalGuide = null;

    }

}
canvas.on("object:moving", function (e) {

    const obj = e.target;

    const center = canvas.getCenter();

    const objCenter = obj.getCenterPoint();

    let show = false;

    if (Math.abs(objCenter.x - center.left) < SNAP_DISTANCE) {

        obj.left = center.left - obj.getScaledWidth() / 2;

        show = true;

    }

    if (Math.abs(objCenter.y - center.top) < SNAP_DISTANCE) {

        obj.top = center.top - obj.getScaledHeight() / 2;

        show = true;

    }

    snapToObjects(obj);

if(show){

    drawGuides();

}else{

    hideGuides();

}
});
canvas.on("mouse:up",()=>{

    canvas.getObjects().forEach(obj=>{

        if(obj.excludeFromExport){

            canvas.remove(obj);

        }

    });

});
function snapToObjects(activeObject){

    const objects = canvas.getObjects();

    objects.forEach(obj=>{

        if(obj===activeObject) return;

        if(obj.excludeFromExport) return;

        const activeCenter = activeObject.getCenterPoint();
        const targetCenter = obj.getCenterPoint();

        // Center X
        if(Math.abs(activeCenter.x-targetCenter.x)<OBJECT_SNAP_DISTANCE){

    activeObject.left += targetCenter.x-activeCenter.x;

    canvas.add(

        new fabric.Line(

            [

                targetCenter.x,

                0,

                targetCenter.x,

                canvas.height

            ],

            {

                stroke:"#00b7ff",

                selectable:false,

                evented:false,

                excludeFromExport:true

            }

        )

    );

}

        // Center Y
        if(Math.abs(activeCenter.y-targetCenter.y)<OBJECT_SNAP_DISTANCE){

    activeObject.top += targetCenter.y-activeCenter.y;

    canvas.add(

        new fabric.Line(

            [

                0,

                targetCenter.y,

                canvas.width,

                targetCenter.y

            ],

            {

                stroke:"#00b7ff",

                selectable:false,

                evented:false,

                excludeFromExport:true

            }

        )

    );

}

    });

}