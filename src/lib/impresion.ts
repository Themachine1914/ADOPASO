export type DocumentoImpreso = 'certificado' | 'genealogia' | 'ambos' | 'historial'
export type PapelImpresion = 'blanco' | 'timbrado'

export function imprimirDocumento(
  documento: DocumentoImpreso,
  origen?: 'admin',
  papel?: PapelImpresion,
) {
  document.body.dataset.imprimir = documento
  if (origen) document.body.dataset.imprimirOrigen = origen
  else delete document.body.dataset.imprimirOrigen
  if (papel && documento !== 'historial') document.body.dataset.papel = papel
  else delete document.body.dataset.papel
  const limpiar = () => {
    delete document.body.dataset.imprimir
    delete document.body.dataset.imprimirOrigen
    delete document.body.dataset.papel
    window.removeEventListener('afterprint', limpiar)
  }
  window.addEventListener('afterprint', limpiar)
  window.setTimeout(() => window.print(), 80)
}
