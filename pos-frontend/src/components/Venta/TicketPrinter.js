import { formatMoney, formatFecha } from '../../utils/format';

export const imprimirTicketVenta = (
  venta,
  { total, pagoCliente, cambio, modoPrestamo, cuentaSeleccionada }
) => {
  const win = window.open('', '_blank', 'width=400,height=600');

  // Si el popup fue bloqueado o falló
  if (!win) {
    alert(
      'No se pudo abrir la ventana de impresión.\n' +
        'Revisa el bloqueador de ventanas emergentes del navegador.'
    );
    return;
  }

  const pago = Number(pagoCliente) || 0;
  const esPrestamo = modoPrestamo;
  const fechaTicket = formatFecha(venta.fecha || new Date().toISOString());

  const html = `
    <html>
      <head>
        <title>Ticket ${venta.id}</title>
        <style>
          @media print {
            body { margin: 0; }
          }
          body {
            font-family: monospace;
            margin: 0;
            padding: 8px;
          }
          .ticket {
            width: 58mm;
            max-width: 100%;
            font-size: 11px;
          }
          .centro { text-align: center; }
          .linea {
            display: flex;
            justify-content: space-between;
          }
          hr {
            border: none;
            border-top: 1px dashed #000;
            margin: 4px 0;
          }
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
              ? `<div>Cuenta: ${cuentaSeleccionada.nombre}</div>`
              : ''
          }
          <hr />
          ${venta.ventaProductos
            .map((vp) => {
              const desc =
                vp.producto?.descripcion ||
                vp.descripcion ||
                'Producto ' + (vp.producto?.id || '');
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
            })
            .join('')}
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
            <span>${formatMoney(pago)}</span>
          </div>
          <div class="linea">
            <span>Cambio</span>
            <span>${formatMoney(cambio)}</span>
          </div>
          `
              : ''
          }
          <hr />
          <div class="centro">¡Gracias por su compra!</div>
        </div>
        <script>
          window.onload = function () {
            window.print();
            window.onafterprint = function () { window.close(); };
          };
        </script>
      </body>
    </html>
  `;

  win.document.open();
  win.document.write(html);
  win.document.close();
};
