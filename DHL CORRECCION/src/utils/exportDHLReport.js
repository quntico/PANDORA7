import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

async function waitImages(root) {
  await document.fonts?.ready;
  await Promise.all(Array.from(root.querySelectorAll('img')).map(async img=>{
    if (!img.complete) await Promise.race([
      new Promise((resolve,reject)=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',()=>reject(new Error(`No se cargó una imagen: ${img.alt}`)),{once:true});}),
      new Promise((_,reject)=>setTimeout(()=>reject(new Error(`Tiempo agotado al cargar imagen: ${img.alt}`)),15000)),
    ]);
    if (!img.naturalWidth) throw new Error(`Imagen no disponible: ${img.alt}`);
    if (img.decode) await img.decode();
  }));
}

// El diseño se conserva como imagen; el texto del DOM se incorpora también
// como texto PDF transparente, seleccionable y buscable. No es OCR.
function searchableText(doc,page,width,height) {
  const bounds=page.getBoundingClientRect();
  const sx=width/bounds.width,sy=height/bounds.height;
  const walker=document.createTreeWalker(page,NodeFilter.SHOW_TEXT);
  doc.saveGraphicsState();
  doc.setGState(new doc.GState({opacity:0}));
  let node;
  while((node=walker.nextNode())) {
    if (!node.textContent.trim() || !node.parentElement || /^(STYLE|SCRIPT)$/.test(node.parentElement.tagName)) continue;
    const style=getComputedStyle(node.parentElement);
    if (style.display==='none'||style.visibility==='hidden') continue;
    doc.setFont('helvetica',Number(style.fontWeight)>=600?'bold':'normal');
    doc.setFontSize(parseFloat(style.fontSize)*sy);
    const range=document.createRange();
    let line='',box=null;
    const flush=()=>{
      if (line.trim()&&box) doc.text(line.replace(/−/g,'-').replace(/→/g,' a ').replace(/≤/g,'<=').replace(/≥/g,'>=').replace(/≈/g,'aprox. ').replace(/×/g,'x'), (box.left-bounds.left)*sx, (box.top-bounds.top)*sy+parseFloat(style.fontSize)*sy*0.82);
      line='';box=null;
    };
    for(let k=0;k<node.textContent.length;k++) {
      range.setStart(node,k);range.setEnd(node,k+1);
      const rect=range.getBoundingClientRect();
      if (!rect.width&&!rect.height) continue;
      if (box&&Math.abs(rect.top-box.top)>2) flush();
      if (!box) box=rect;
      line+=node.textContent[k];
    }
    flush();
  }
  doc.restoreGraphicsState();
}

export async function exportDHLReport(root,{progress=()=>{}}={}) {
  if (!root) throw new Error('No se montó el informe en pantalla.');
  await waitImages(root);
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  const pages=Array.from(root.querySelectorAll('.pdf-page'));
  if (pages.length!==13) throw new Error(`Informe incompleto: ${pages.length} páginas; se requieren 13.`);
  for (const [index,page] of pages.entries()) {
    const body=page.querySelector('.body'),footer=page.querySelector('.footer');
    if (body&&footer) {
      const limit=footer.getBoundingClientRect().top-8;
      const children=Array.from(body.children).filter(el=>el.tagName!=='STYLE');
      if (children.some(el=>el.getBoundingClientRect().bottom>limit)) throw new Error(`Contenido desbordado en página ${index+1}.`);
    }
  }
  const doc=new jsPDF({orientation:'landscape',unit:'pt',format:'a4',compress:true});
  doc.setProperties({title:'DHL | Simulación 2027-2030 | BWD-350 + BA + SWM-1000',author:'SOLIMAQ / Soliwaste',subject:'Informe paramétrico de revisión técnica; supuestos y pendientes FAT/SAT'});
  const width=doc.internal.pageSize.getWidth(),height=doc.internal.pageSize.getHeight();
  for (let k=0;k<pages.length;k++) {
    progress(15+Math.round(k/pages.length*80));
    const canvas=await html2canvas(pages[k],{scale:2,useCORS:true,backgroundColor:'#ffffff',logging:false,windowWidth:Math.max(1200,document.documentElement.clientWidth)});
    if (k) doc.addPage('a4','landscape');
    doc.addImage(canvas.toDataURL('image/jpeg',0.95),'JPEG',0,0,width,height,undefined,'FAST');
    searchableText(doc,pages[k],width,height);
  }
  progress(100);
  return doc;
}
