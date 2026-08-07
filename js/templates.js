// ===========================
// ASTRA Templates
// ===========================
if(type==="custom"){

const saved=JSON.parse(

localStorage.getItem(CUSTOM_TEMPLATE_KEY)

)||[];

list.innerHTML="";

saved.forEach(item=>{

const card=document.createElement("div");

card.className="template-card";

card.innerHTML=`

<img src="${item.thumbnail}">

<h4>${item.name}</h4>

`;

card.onclick=()=>{

canvas.loadFromJSON(

item.json,

()=>{

canvas.renderAll();

if(typeof refreshLayers==="function"){

refreshLayers();

}

}

);

};

list.appendChild(card);

});

return;

}
const CUSTOM_TEMPLATE_KEY="ASTRA_CUSTOM_TEMPLATES";
const templates = {

instagram:[

{

name:"Instagram Post",

image:"assets/templates/instagram.jpg",

file:"templates/instagram.json"

}

],

youtube:[

{

name:"YouTube Thumbnail",

image:"assets/templates/youtube.jpg",

file:"templates/youtube.json"

}

],

facebook:[

{

name:"Facebook Post",

image:"assets/templates/facebook.jpg",

file:"templates/facebook.json"

}

],

poster:[

{

name:"Poster",

image:"assets/templates/poster.jpg",

file:"templates/poster.json"

}

]

};
const panel = document.getElementById("templatePanel");

document.getElementById("openTemplates").onclick = () => {

    panel.classList.add("active");

};

document.getElementById("closeTemplates").onclick = () => {

    panel.classList.remove("active");

};
const list = document.getElementById("templateList");

document.querySelectorAll(".template-categories button")

.forEach(btn=>{

btn.onclick=()=>{

const type=btn.dataset.type;

loadTemplates(type);

};

});
function loadTemplates(type){

list.innerHTML="";

templates[type].forEach(item=>{

const card=document.createElement("div");

card.className="template-card";

card.innerHTML=`

<img src="${item.thumbnail}">

<h4>${item.name}</h4>

<button class="delete-template">

🗑 Delete

</button>

`;

card.onclick=()=>{

loadTemplate(item.file);

};

list.appendChild(card);

});

}
async function loadTemplate(file){

const response = await fetch(file);

const json = await response.text();

canvas.loadFromJSON(json,()=>{

canvas.renderAll();

if(typeof refreshLayers==="function"){

refreshLayers();


}

});

}

function saveCurrentTemplate(){

const name=prompt("Template Name");

if(!name) return;

const template={

name:name,

thumbnail:canvas.toDataURL({

format:"png",

quality:.5

}),

json:JSON.stringify(

canvas.toJSON()

)

};

const saved=JSON.parse(

localStorage.getItem(CUSTOM_TEMPLATE_KEY)

)||[];

saved.push(template);

localStorage.setItem(

CUSTOM_TEMPLATE_KEY,

JSON.stringify(saved)

);

alert("Template Saved Successfully!");

}
document.getElementById("saveTemplateBtn").onclick=saveCurrentTemplate;
custom:[]
card.querySelector(".delete-template").onclick=(e)=>{

e.stopPropagation();

saved.splice(index,1);

localStorage.setItem(

CUSTOM_TEMPLATE_KEY,

JSON.stringify(saved)

);

loadTemplates("custom");

};