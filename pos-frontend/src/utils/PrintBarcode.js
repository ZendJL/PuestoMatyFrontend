// src/utils/PrintBarcode.js ⭐ DINÁMICO COMPLETO
import axios from 'axios';

export const imprimirCodigoBarras = async (producto) => {
  if (!producto?.codigo) {
    alert('❌ No hay código');
    return false;
  }

  try {
    const html = generarHtmlDinamico(producto);
    abrirImpresion(html);
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
};

// ⭐ CALCULA TAMAÑO EXACTO
const generarHtmlDinamico = (producto) => {
  const nombre = (producto.descripcion || 'PRODUCTO')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  
  // ⭐ MEDIR NOMBRE
  const lineas = nombre.split(' ').length;
  const largoNombre = nombre.length;
  
  // ⭐ TAMAÑO DINÁMICO (mm)
  const altura = Math.max(22, 14 + (lineas * 1.2) + 12); // Mínimo 22mm
  const ancho = 48; // Fijo 48mm
  
  const fontSize = Math.max(9, 22 - (lineas * 0.8)); // Se reduce con más líneas
  
  return `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
<style>
*{margin:0!important;padding:0!important;box-sizing:border-box!important;}
html,body{height:${altura}mm!important;width:${ancho}mm!important;overflow:hidden!important;background:white!important;}
body{padding:1.5mm 1mm!important;display:flex!important;flex-direction:column!important;justify-content:space-between!important;font-family:Arial,sans-serif!important;}
.nombre{font-size:${fontSize}px!important;font-weight:700!important;line-height:1.05!important;text-align:center!important;max-height:${Math.max(8, 10 + (lineas * 0.5))}mm!important;overflow:hidden!important;text-transform:uppercase!important;letter-spacing:.1px!important;margin-bottom:.3mm!important;}
.barcode{width:100%!important;height:11mm!important;margin:.3mm 0!important;}
.codigo{font-size:8.5px!important;font-weight:600!important;font-family:'Courier New',monospace!important;letter-spacing:.6px!important;text-align:center!important;}
@media print{body{height:${altura}mm!important;width:${ancho}mm!important;}* {page-break-inside:avoid!important;}}
</style>
</head><body>
<div class="nombre">${nombre}</div>
<svg class="barcode" id="barcode"></svg>
<div class="codigo">${producto.codigo}</div>
<script>
JsBarcode("#barcode","${producto.codigo}",{format:"CODE128",width:1.3,height:42,displayValue:false,margin:0,background:"transparent"});
setTimeout(()=>window.print(),100);window.onafterprint=()=>window.close();
</script></body></html>`;
};

const abrirImpresion = (html) => {
  const printWindow = window.open('', '_blank', 'width=300,height=180');
  printWindow.document.write(html);
  printWindow.document.close();
};
