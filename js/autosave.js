ASTRA.autosave=()=>{if(!ASTRA.state.canvas||ASTRA.restoring)return;try{localStorage.setItem('astraRecovery',ASTRA.serialize())}catch(e){}};
ASTRA.restoreAutosave=()=>{const raw=localStorage.getItem('astraRecovery');if(!raw)return;ASTRA.state.canvas.loadFromJSON(raw,()=>{ASTRA.state.canvas.renderAll();ASTRA.updateSelection?.()})};
