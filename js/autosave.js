

const AUTO_SAVE_KEY = "ASTRA_AUTOSAVE";

function autoSaveProject() {

    const data = JSON.stringify(canvas.toJSON());

    localStorage.setItem(AUTO_SAVE_KEY, data);

}
setInterval(() => {

    autoSaveProject();

}, 10000);
canvas.on("object:added", autoSaveProject);

canvas.on("object:modified", autoSaveProject);

canvas.on("object:removed", autoSaveProject);
window.addEventListener("load", () => {

    const project = localStorage.getItem(AUTO_SAVE_KEY);

    if (!project) return;

    const restore = confirm(

        "Recovered project found.\nDo you want to restore it?"

    );

    if (restore) {

        canvas.loadFromJSON(project, () => {

            canvas.renderAll();

            if (typeof refreshLayers === "function") {

                refreshLayers();

            }

        });

    }

});
function clearAutoSave() {

    localStorage.removeItem(AUTO_SAVE_KEY);

}
document.getElementById("clearRecovery").onclick = () => {

    if (confirm("Delete saved recovery project?")) {

        clearAutoSave();

        alert("Recovery deleted successfully.");

    }

};