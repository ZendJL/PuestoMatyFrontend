import axios from 'axios';
import { formatMoney, formatFecha } from '../../utils/format';  // ✅ IMPORT CORREGIDO

export const imprimirTicketVenta = async (ventaId, opciones = {}) => {
  const win = window.open('', '_blank', 'width=400,height=600');
  if (!win) {
    alert('No se pudo abrir la ventana de impresión.');
    return;
  }

  try {
    // ✅ 1 SOLA LLAMADA - trae TODO (cuando tengas el endpoint)
    const response = await axios.get(`/api/ventas/${ventaId}/ticket-completo`);
    const { venta, productos } = response.data;

    const total = Number(venta.total || 0);
    const pagoCliente = Number(venta.pagoCliente || 0);
    const cambio = Math.max(pagoCliente - total, 0);
    const esPrestamo = venta.status === 'PRESTAMO';
    const cuentaSeleccionada = venta.cuentaId ? {
      id: venta.cuentaId,
      nombre: venta.cuentaNombre
    } : null;
    const fechaTicket = formatFecha(venta.fecha);

    // ✅ Usa productos del JOIN único
    const html = generarHtmlTicket({
      venta,
      total,
      pagoCliente,
      cambio,
      esPrestamo,
      cuentaSeleccionada,
      productosVenta: productos,  // ✅ PASAR productos
      fechaTicket
    });

    win.document.open();
    win.document.write(html);
    win.document.close();

    // ✅ Auto imprimir
    win.onload = () => {
      win.focus();
      win.print();
      win.onafterprint = () => setTimeout(() => win.close(), 1000);
    };

  } catch (error) {
    win.close();
    alert('Error al cargar datos del ticket');
    console.error(error);
  }
};

// ✅ FUNCIÓN HTML CORREGIDA
const generarHtmlTicket = ({ venta, total, pagoCliente, cambio, esPrestamo, cuentaSeleccionada, productosVenta, fechaTicket }) => {
  const pago = Number(pagoCliente) || 0;  // ✅ Variable definida

  return `
    <html>
      <head>
        <title>Ticket ${venta.id}</title>
        <style>
          @media print { body { margin: 0; } }
          body { font-family: monospace; margin: 0; padding: 8px; }
          .ticket { width: 58mm; max-width: 100%; font-size: 11px; }
          .centro { text-align: center; }
          .linea { display: flex; justify-content: space-between; }
          hr { border: none; border-top: 1px dashed #000; margin: 4px 0; }
        </style>
      </head>
      <body>
        <div class="ticket">
          <div class="centro">
            <div><strong>Puesto Maty</strong></div>
            <div>Punto de venta</div>
          </div>
          <hr />
          <div>Folio: ${venta.id}</div>
          <div>Fecha: ${fechaTicket}</div>
          ${
            esPrestamo && cuentaSeleccionada
              ? `<div>Cuenta: ${cuentaSeleccionada.nombre || cuentaSeleccionada}</div>`
              : `<div>Cliente contado</div>`
          }
          <hr />
          ${
            productosVenta.map((vp) => {  // ✅ productosVenta NO productos
              const desc = vp.producto?.descripcion || 
                          vp.descripcion || 
                          `Prod ${vp.producto?.id || vp.id}`;
              const cant = vp.cantidad || 0;
              const precio = vp.precioUnitario || vp.precio || 0;
              const importe = cant * precio;
              
              return `
                <div class="linea">
                  <span>${desc}</span>
                </div>
                <div class="linea">
                  <span>${cant} x ${formatMoney(precio)}</span>
                  <span>${formatMoney(importe)}</span>
                </div>
              `;
            }).join('') || '<div class="centro text-muted">Sin productos</div>'
          }
          <hr />
          <div class="linea">
            <span><strong>Total</strong></span>
            <span><strong>${formatMoney(total)}</strong></span>
          </div>
          ${
            !esPrestamo
              ? `
              <div class="linea">
                <span>Pago</span>
                <span>${formatMoney(pago)}</span>  <!-- ✅ pago definido -->
              </div>
              <div class="linea">
                <span>Cambio</span>
                <span>${formatMoney(cambio)}</span>
              </div>
              `
              : '<div class="centro text-warning">*** SALDO PENDIENTE ***</div>'
          }
          <hr />
          <div class="centro">¡Gracias por su compra!</div>
          <div class="centro small mt-2">Puesto Maty - Mexicali BC</div>
        </div>
        <script>
          window.onload = function () {
            window.focus();
            window.print();
            window.onafterprint = function () { 
              setTimeout(() => window.close(), 1000); 
            };
          };
        </script>
      </body>
    </html>
  `;
};
