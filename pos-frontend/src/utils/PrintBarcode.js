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

// ⭐ NUEVA FUNCIÓN: Imprimir múltiples códigos en 3 columnas con varias filas
export const imprimirCodigosBarrasMasivo = async (productos) => {
  if (!productos || productos.length === 0) {
    console.error('No hay productos para imprimir');
    return;
  }

  // Crear ventana de impresión
  const ventanaImpresion = window.open('', '_blank', 'width=1200,height=800');
  
  if (!ventanaImpresion) {
    alert('❌ No se pudo abrir la ventana de impresión. Verifica que los pop-ups estén permitidos.');
    return;
  }

  // HTML base
  ventanaImpresion.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Códigos de Barras - Impresión Masiva</title>
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: Arial, sans-serif;
          padding: 8px;
        }
        
        h1 {
          font-size: 16px;
          text-align: center;
          margin-bottom: 10px;
          color: #333;
        }
        
        /* ⭐ CONTENEDOR EN 3 COLUMNAS - FILL: VERTICAL (MÚLTIPLES FILAS) */
        .barcodes-wrapper {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          grid-auto-flow: dense;
        }
        
        .barcode-container {
          padding: 8px;
          border: 1px solid #ccc;
          text-align: center;
          page-break-inside: avoid;
          background: #f9f9f9;
          border-radius: 4px;
        }
        
        .descripcion {
          font-size: 11px;
          font-weight: bold;
          margin-bottom: 4px;
          word-wrap: break-word;
          min-height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #333;
        }
        
        svg {
          max-width: 100%;
          height: auto;
          margin: 4px 0;
        }
        
        .codigo-texto {
          font-size: 10px;
          margin-top: 2px;
          color: #666;
        }
        
        @media print {
          body {
            padding: 5mm;
          }
          
          h1 {
            display: none;
          }
          
          .barcodes-wrapper {
            gap: 6px;
          }
          
          .barcode-container {
            border: 0.5px solid #ddd;
            padding: 6px;
            background: white;
          }
        }
        
        @page {
          margin: 8mm;
          size: A4 portrait;
        }
      </style>
    </head>
    <body>
      <h1>Códigos de Barras - Impresión Masiva</h1>
      <div id="barcodes-wrapper" class="barcodes-wrapper"></div>
    </body>
    </html>
  `);

  ventanaImpresion.document.close();

  // Esperar a que cargue JsBarcode
  await new Promise(resolve => {
    const checkJsBarcode = setInterval(() => {
      if (ventanaImpresion.JsBarcode) {
        clearInterval(checkJsBarcode);
        resolve();
      }
    }, 100);
  });

  // Contenedor principal
  const wrapper = ventanaImpresion.document.getElementById('barcodes-wrapper');

  console.log(`📋 Generando ${productos.length} códigos de barras...`);

  // Generar todos los códigos de barras
  productos.forEach((producto, index) => {
    const container = ventanaImpresion.document.createElement('div');
    container.className = 'barcode-container';

    const descripcion = ventanaImpresion.document.createElement('div');
    descripcion.className = 'descripcion';
    descripcion.textContent = producto.descripcion || 'Sin descripción';

    const svg = ventanaImpresion.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = `barcode-${index}`;

    const codigoTexto = ventanaImpresion.document.createElement('div');
    codigoTexto.className = 'codigo-texto';
    codigoTexto.textContent = `${producto.codigo}`;

    container.appendChild(descripcion);
    container.appendChild(svg);
    container.appendChild(codigoTexto);
    wrapper.appendChild(container);

    // Generar código de barras
    try {
      ventanaImpresion.JsBarcode(`#barcode-${index}`, producto.codigo, {
        format: 'CODE128',
        width: 1.8,
        height: 50,
        displayValue: false,
        fontSize: 12,
        margin: 3
      });
    } catch (error) {
      console.error(`Error generando código ${producto.codigo}:`, error);
      svg.innerHTML = `<text x="50%" y="50%" text-anchor="middle" fill="red" font-size="12">Error</text>`;
    }
  });

  // Esperar un momento para que se renderice todo
  setTimeout(() => {
    console.log(`✅ Se generaron ${productos.length} códigos. Preparando impresión...`);
    ventanaImpresion.print();
    
    // Opcional: cerrar ventana después de imprimir
    // ventanaImpresion.onafterprint = () => {
    //   ventanaImpresion.close();
    // };
  }, 800);
};
