ASTRA.updateLayers=()=>{};
ASTRA.bringFront=()=>{const o=ASTRA.active();if(!o)return ASTRA.toast('Select an object first');ASTRA.state.canvas.bringToFront(o);ASTRA.markDirty();ASTRA.refresh()};
ASTRA.sendBack=()=>{const o=ASTRA.active();if(!o)return ASTRA.toast('Select an object first');ASTRA.state.canvas.sendToBack(o);ASTRA.markDirty();ASTRA.refresh()};
ASTRA.duplicate=()=>{const c=ASTRA.state.canvas,o=ASTRA.active();if(!o)return ASTRA.toast('Select an object first');o.clone(clone=>{clone.set({left:(o.left||0)+20,top:(o.top||0)+20});c.add(clone);c.setActiveObject(clone);ASTRA.markDirty();ASTRA.updateSelection?.();c.requestRenderAll()})};
ASTRA.deleteActive=()=>{const c=ASTRA.state.canvas,o=ASTRA.active();if(!o)return ASTRA.toast('Select an object first');c.remove(o);c.discardActiveObject();ASTRA.markDirty();ASTRA.updateSelection?.();c.requestRenderAll()};
