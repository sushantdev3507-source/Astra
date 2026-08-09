

const pages = [];

let currentPage=0;

const pagesList=document.getElementById("pagesList");
function saveCurrentPage(){

    pages[currentPage] = {

        json: JSON.stringify(canvas.toJSON()),

        thumbnail: canvas.toDataURL({
            format:"png",
            quality:0.5
        })

    };

}
function loadPage(index){

saveCurrentPage();

currentPage=index;

canvas.loadFromJSON(

pages[currentPage].json,

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

const img = div.querySelector(".page-preview");

if(pages[index].thumbnail){

img.src = pages[index].thumbnail;

}else{

img.src = "";

}

if(index===currentPage){

div.classList.add("active");

}

div.onclick=()=>{

loadPage(index);

};

pagesList.appendChild(div);

});

}
pages.push({

    json: JSON.stringify(canvas.toJSON()),

    thumbnail: ""

});

refreshPages();
function duplicatePage(index){

    saveCurrentPage();

    pages.splice(

index+1,

0,

{

json:pages[index].json,

thumbnail:pages[index].thumbnail

}

);

    refreshPages();

}
function deletePage(index){

    if(pages.length===1){

        alert("At least one page required.");

        return;

    }

    pages.splice(index,1);

    if(currentPage>=pages.length){

        currentPage=pages.length-1;

    }

    loadPage(currentPage);

}
const div=document.createElement("div");

div.className="page-item";

if(index===currentPage){

div.classList.add("active");

}

div.innerHTML=`

<img class="page-preview" src="${pages[index].thumbnail}" alt="Page Preview">

<span>Page ${index+1}</span>

<div class="page-actions">

<button class="duplicate-page">

📄

</button>

<button class="delete-page">

🗑

</button>

</div>

`;
div.querySelector(".duplicate-page").onclick=(e)=>{

e.stopPropagation();

duplicatePage(index);

};

div.querySelector(".delete-page").onclick=(e)=>{

e.stopPropagation();

deletePage(index);

};

div.onclick=()=>{

loadPage(index);

};
const thumb=div.querySelector(".page-preview");

const ctx=thumb.getContext("2d");

ctx.fillStyle="#ffffff";

ctx.fillRect(0,0,thumb.width,thumb.height);

ctx.fillStyle="#555";

ctx.font="14px Poppins";

ctx.fillText(

"Preview",

20,

60

);
canvas.on("object:added",()=>{

saveCurrentPage();

refreshPages();

});

canvas.on("object:modified",()=>{

saveCurrentPage();

refreshPages();

});

canvas.on("object:removed",()=>{

saveCurrentPage();

refreshPages();

});