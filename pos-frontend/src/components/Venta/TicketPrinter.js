import axios from 'axios';
import { formatMoney, formatFecha } from '../../utils/format';

export const imprimirTicketVenta = async (ventaId, opciones = {}) => {
  const win = window.open('', '_blank', 'width=400,height=600');
  if (!win) {
    alert('No se pudo abrir la ventana de impresión.');
    return;
  }

  try {
    const response = await axios.get(`/api/ventas/${ventaId}/ticket-completo`);
    const { venta, productos } = response.data;

    const { infoPago = null } = opciones;

    const total = Number(venta.total || 0);
    const pagoCliente = Number(venta.pagoCliente || 0);
    const cambio = Math.max(pagoCliente - total, 0);
    const esPrestamo = venta.status === 'PRESTAMO';
    const cuentaSeleccionada = venta.cuentaId ? { id: venta.cuentaId, nombre: venta.cuentaNombre } : null;
    const fechaTicket = formatFecha(venta.fecha);

    const html = generarHtmlTicket({
      venta, total, pagoCliente, cambio, esPrestamo,
      cuentaSeleccionada, productosVenta: productos, fechaTicket, infoPago
    });

    win.document.open();
    win.document.write(html);
    win.document.close();

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

const generarHtmlTicket = ({ venta, total, pagoCliente, cambio, esPrestamo, cuentaSeleccionada, productosVenta, fechaTicket, infoPago }) => {
  const pago = Number(pagoCliente) || 0;
  const esTarjeta = infoPago?.modoPago === 'TARJETA';

  const seccionPagoDolares = () => {
    if (!infoPago) return '';
    if (infoPago.modoPago === 'TARJETA') {
      return `<div class="linea small"><span>  Forma de pago:</span><span>💳 Tarjeta</span></div>`;
    }
    if (infoPago.modoPago === 'DOLARES') {
      return `
        <div class="linea small"><span>  Forma de pago:</span><span>🇺🇸 Dólares</span></div>
        <div class="linea small">
          <span>  USD $${Number(infoPago.pagoDolares).toFixed(2)}</span>
          <span>T/C: ${infoPago.tasaCambio}</span>
        </div>
      `;
    }
    if (infoPago.modoPago === 'MIXTO') {
      return `
        <div class="linea small"><span>  Forma de pago:</span><span>🔀 Mixto</span></div>
        <div class="linea small">
          <span>  Pesos:</span>
          <span>${formatMoney(Number(infoPago.pagoMixtoPesos))}</span>
        </div>
        <div class="linea small">
          <span>  USD $${Number(infoPago.pagoMixtoDolares).toFixed(2)}</span>
          <span>T/C: ${infoPago.tasaCambio}</span>
        </div>
      `;
    }
    return `<div class="linea small"><span>  Forma de pago:</span><span>🇲🇽 Pesos</span></div>`;
  };

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
          .small { font-size: 10px; color: #555; }
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
          ${esPrestamo && cuentaSeleccionada
            ? `<div>Cuenta: ${cuentaSeleccionada.nombre}</div>`
            : `<div>Cliente contado</div>`
          }
          <hr />
          ${productosVenta.map((vp) => {
            const desc    = vp.producto?.descripcion || vp.descripcion || `Prod ${vp.producto?.id || vp.id}`;
            const cant    = vp.cantidad || 0;
            const precio  = vp.precioUnitario || vp.precio || 0;
            const importe = cant * precio;
            return `
              <div class="linea"><span>${desc}</span></div>
              <div class="linea">
                <span>${cant} x ${formatMoney(precio)}</span>
                <span>${formatMoney(importe)}</span>
              </div>
            `;
          }).join('') || '<div class="centro">Sin productos</div>'}
          <hr />
          <div class="linea">
            <span><strong>Total</strong></span>
            <span><strong>${formatMoney(total)}</strong></span>
          </div>
          ${!esPrestamo ? `
            <div class="linea">
              <span>Pago</span>
              <span>${esTarjeta ? '💳 Tarjeta' : formatMoney(pago)}</span>
            </div>
            ${seccionPagoDolares()}
            ${!esTarjeta ? `
              <div class="linea">
                <span>Cambio</span>
                <span>${formatMoney(cambio)}</span>
              </div>
            ` : ''}
          ` : '<div class="centro">*** SALDO PENDIENTE ***</div>'}
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
