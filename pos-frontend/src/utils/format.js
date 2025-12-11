// src/utils/money.js (o format.js)
const moneyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export function formatMoney(value) {
  return moneyFormatter.format(Number(value || 0));
}

export function formatFecha(fechaISO) {
  // 1. Nada o cadena vacía
  if (!fechaISO) return '';

  // 2. Normalizar: si viene algo como "2024-05-01T12:34:56.0000000Z"
  const normalizada = typeof fechaISO === 'string'
    ? fechaISO.replace('Z', '')
    : fechaISO;

  const date = new Date(normalizada);
  if (isNaN(date.getTime())) {
    // Si sigue siendo inválida, mejor devolver vacío
    return '';
  }

  const dia = date.getDate().toString().padStart(2, '0');
  const mes = meses[date.getMonth()] ?? '---';
  const año = date.getFullYear();

  const horas = date.getHours();
  const minutos = date.getMinutes().toString().padStart(2, '0');
  const segundos = date.getSeconds().toString().padStart(2, '0');

  const hora12 = horas % 12 || 12;
  const ampm = horas >= 12 ? 'pm' : 'am';

  return `${dia}/${mes}/${año} ${hora12}:${minutos}:${segundos} ${ampm}`;
}