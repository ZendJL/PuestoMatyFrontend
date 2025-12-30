export const imprimirRecibo = (abono, cuentaExpandida) => {
  const win = window.open('', '_blank', 'width=400,height=600');
  if (!win) {
    alert('No se pudo abrir la ventana de impresión.');
    return;
  }

  try {
    // ✅ Helper para formatear dinero (igual que tu utils)
    const formatMoney = (amount) => {
      return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount || 0);
    };

    const fechaRecibo = new Date().toLocaleDateString('es-MX', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });

    const html = `
      <html>
        <head>
          <title>Recibo Abono #${abono.id}</title>
          <style>
            @media print { body { margin: 0; } }
            body { font-family: monospace; margin: 0; padding: 8px; }
            .ticket { width: 58mm; max-width: 100%; font-size: 11px; line-height: 1.2; }
            .centro { text-align: center; }
            .linea { display: flex; justify-content: space-between; margin: 2px 0; }
            .linea-total { font-weight: bold; font-size: 12px; }
            hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
            .negrita { font-weight: bold; }
            .saldo-anterior { color: #666; }
            .abono-recibido { color: #28a745; }
            .saldo-actual { color: ${abono.nuevoSaldo > 0 ? '#dc3545' : '#28a745'}; }
          </style>
        </head>
        <body>
          <div class="ticket">
            <div class="centro">
              <div><strong>Puesto Maty</strong></div>
              <div>Sistema POS</div>
              <div>RECIBO DE ABONO</div>
            </div>
            <hr />
            <div class="linea">
              <span>Folio:</span>
              <span>#${abono.id}</span>
            </div>
            <div class="linea">
              <span>Fecha:</span>
              <span>${fechaRecibo}</span>
            </div>
            <div class="linea">
              <span>Cliente:</span>
              <span>${cuentaExpandida.nombre || 'N/A'}</span>
            </div>
            ${cuentaExpandida.descripcion ? `
              <div class="linea">
                <span>Info:</span>
                <span>${cuentaExpandida.descripcion}</span>
              </div>
            ` : ''}
            <hr />
            
            <div class="linea">
              <span class="saldo-anterior">Saldo Anterior:</span>
              <span class="saldo-anterior">${formatMoney(abono.viejoSaldo)}</span>
            </div>
            
            <div class="linea linea-total">
              <span class="negrita abono-recibido">+ Abono:</span>
              <span class="negrita abono-recibido">${formatMoney(abono.cantidad)}</span>
            </div>
            
            <hr />
            
            <div class="linea linea-total">
              <span class="negrita">Saldo Actual:</span>
              <span class="negrita saldo-actual">${formatMoney(abono.nuevoSaldo)}</span>
            </div>
            
            <hr />
            
            <div class="centro negrita" style="margin-top: 8px;">
              ${abono.nuevoSaldo > 0 ? '*** SALDO PENDIENTE ***' : '*** CUENTA AL CORRIENTE ***'}
            </div>
            
            <div class="centro" style="font-size: 9px; margin-top: 4px;">
              Firma del cliente: ________________
            </div>
            
            <hr />
            <div class="centro">¡Gracias por su pago!</div>
            <div class="centro" style="font-size: 9px;">Puesto Maty - Mexicali BC</div>
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

    win.document.open();
    win.document.write(html);
    win.document.close();

    // ✅ Auto imprimir (igual que imprimirTicketVenta)
    win.onload = () => {
      win.focus();
      win.print();
      win.onafterprint = () => setTimeout(() => win.close(), 1000);
    };

  } catch (error) {
    win.close();
    alert('Error al generar recibo');
    console.error(error);
  }
};
