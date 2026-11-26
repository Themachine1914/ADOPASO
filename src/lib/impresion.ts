export type DocumentoImpreso = 'certificado' | 'genealogia' | 'historial'

export function imprimirDocumento(documento: DocumentoImpreso, origen?: 'admin') {
  document.body.dataset.imprimir = documento
  if (origen) document.body.dataset.imprimirOrigen = origen
  else delete document.body.dataset.imprimirOrigen
  const limpiar = () => {
    delete document.body.dataset.imprimir
    delete document.body.dataset.imprimirOrigen
    window.removeEventListener('afterprint', limpiar)
  }
  window.addEventListener('afterprint', limpiar)
  window.setTimeout(() => window.print(), 80)
}
