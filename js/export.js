document.getElementById("exportPNG").onclick=()=>{

const url=canvas.toDataURL({

format:"png",

quality:1

});

const a=document.createElement("a");

a.href=url;

a.download="astra-design.png";

a.click();

};
document.getElementById("exportJPG").onclick=()=>{

const url=canvas.toDataURL({

format:"jpeg",

quality:1

});

const a=document.createElement("a");

a.href=url;

a.download="astra-design.jpg";

a.click();

};
document.getElementById("saveProject").onclick=()=>{

const json=JSON.stringify(

canvas.toJSON()

);

const blob=new Blob(

[json],

{

type:"application/json"

}

);

const url=URL.createObjectURL(blob);

const a=document.createElement("a");

a.href=url;

a.download="project.astra";

a.click();

URL.revokeObjectURL(url);

};
const projectFile=document.getElementById("projectFile");

document.getElementById("openProject").onclick=()=>{

projectFile.click();

};

projectFile.onchange=(e)=>{

const file=e.target.files[0];

if(!file) return;

const reader=new FileReader();

reader.onload=(event)=>{

canvas.loadFromJSON(

event.target.result,

()=>{

canvas.renderAll();

refreshLayers();

saveHistory();

}

);

};

reader.readAsText(file);

};
document.getElementById("printCanvas").onclick=()=>{

const data=canvas.toDataURL();

const win=window.open("");

win.document.write(

`<img src="${data}" style="width:100%">`

);

win.print();

};
document.getElementById("exportPDF").onclick=()=>{

const pdf=new jspdf.jsPDF({

orientation:"landscape"

});

const img=canvas.toDataURL("image/png");

pdf.addImage(

img,

"PNG",

10,

10,

270,

150

);

pdf.save("astra-design.pdf");

};