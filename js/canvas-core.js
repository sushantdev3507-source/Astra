window.ASTRA=window.ASTRA||{};
ASTRA.state={canvas:null,tool:'select',history:[],historyIndex:-1,pages:[],pageIndex:0,grid:false,zoom:1,crop:null,pen:null,eyedropper:false};
ASTRA.getCanvas=()=>ASTRA.state.canvas;
ASTRA.active=()=>ASTRA.state.canvas?.getActiveObject()||null;
ASTRA.toast=(message)=>{const el=document.getElementById('toast');if(!el)return;el.textContent=message;el.classList.add('show');clearTimeout(ASTRA.toastTimer);ASTRA.toastTimer=setTimeout(()=>el.classList.remove('show'),1800)};
ASTRA.markDirty=()=>{ASTRA.dirty=true;if(typeof ASTRA.saveHistory==='function')ASTRA.saveHistory();if(typeof ASTRA.autosave==='function')ASTRA.autosave()};
ASTRA.refresh=()=>ASTRA.state.canvas?.requestRenderAll();
ASTRA.escape=(v)=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
