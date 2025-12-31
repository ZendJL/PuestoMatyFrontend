import axios from 'axios';
import { formatMoney, formatFecha } from '../../utils/format';

export const imprimirTicketVenta = async (ventaId) => {
  try {
    const { data } = await axios.get(`/api/ventas/${ventaId}/ticket-completo`);
    const { venta, productos } = data;

    let ticket = `Puesto Maty
Folio: ${venta.id}
Fecha: ${formatFecha(venta.fecha)}
Cliente: ${venta.cuentaNombre || 'Contado'}
----------------------------------------
`;

    productos.forEach(p => {
      const desc = (p.producto?.descripcion || p.descripcion || 'Prod').substring(0, 22);
      ticket += `${desc.padEnd(25)}${(p.cantidad || 0)}x${formatMoney(p.precioUnitario || 0)}
${''.padStart(26)}${formatMoney((p.cantidad || 0) * (p.precioUnitario || 0))}
`;
    });

    ticket += `----------------------------------------
Total:           ${formatMoney(venta.total)}
`;

    if (venta.status !== 'PRESTAMO') {
      ticket += `Pago recibido:    ${formatMoney(venta.pagoCliente)}
Cambio:          ${formatMoney(venta.pagoCliente - venta.total)}
`;
    } else {
      ticket += `*** SALDO PENDIENTE ***
`;
    }

    ticket += `----------------------------------------
¡Gracias!
`;

    // ✅ TEXTO PLANO PURO - Sin HTML
    const win = window.open('', '_blank', 'width=1,height=1');
    const html = ticket.split('\n').map(line => `<div style="font:9px monospace;margin:0;padding:0;line-height:1;">${line}</div>`).join('');
    
    win.document.write(`
<!DOCTYPE html>
<html><head></head>
<body style="margin:0;padding:0;overflow:hidden;">
${html}
</body>
<script>
setTimeout(()=>{
  window.print();
  setTimeout(()=>window.close(),50);
},10);
</script>
</html>`);
    win.document.close();

  } catch (error) {
    alert('Error');
  }
};
