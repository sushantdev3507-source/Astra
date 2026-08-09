// ==============================
// ASTRA Multi Page
// ==============================

const pages=[];

let currentPage=0;

const pagesList=document.getElementById("pagesList");
function saveCurrentPage(){

pages[currentPage]=JSON.stringify(

canvas.toJSON()

);

}
function loadPage(index){

saveCurrentPage();

currentPage=index;

canvas.loadFromJSON(

pages[currentPage],

()=>{

canvas.renderAll();

refreshPages();

if(typeof refreshLayers==="function"){

refreshLayers();

}

}

);

}
function refreshPages(){

pagesList.innerHTML="";

pages.forEach((page,index)=>{

const div=document.createElement("div");

div.className="page-item";

div.innerHTML="Page "+(index+1);

if(index===currentPage){

div.classList.add("active");

}

div.onclick=()=>{

loadPage(index);

};

pagesList.appendChild(div);

});

}
pages.push(

JSON.stringify(canvas.toJSON())

);

refreshPages();