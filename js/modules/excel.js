// ─── MÓDULO EXCEL (export / import con ExcelJS + SheetJS) ───

/* ── Modal ayuda ── */
function excel_toggleAyuda() {
  const m = document.getElementById('modal-excel-ayuda');
  if (!m) return;
  m.style.display = m.style.display === 'none' ? 'flex' : 'none';
}

/* ── Exportar (ExcelJS con estilos) ── */
async function excel_exportar() {
  if (typeof ExcelJS === 'undefined') {
    alert('La librería ExcelJS no está cargada. Comprueba tu conexión.');
    return;
  }

  const btn = document.getElementById('excel-export-btn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Generando...'; }

  try {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Centro de Control';
    wb.created = new Date();

    // Paleta de la app
    const HEADER_BG   = 'FF1B3A5C'; // azul oscuro
    const HEADER_FG   = 'FFFFFFFF'; // blanco
    const ZEBRA_BG    = 'FFF0F4FB'; // azul muy claro
    const BORDER_COL  = 'FF2563EB'; // accent blue

    // Convierte "YYYY-MM-DD" a Date nativa (para formato de fecha en Excel)
    const toDate = str => {
      if (!str || typeof str !== 'string') return str || '';
      const m = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      return m ? new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3])) : str;
    };

    /**
     * Crea una hoja con estilos.
     * colDefs: [{ label, key, isDate? }]
     * dataRows: array de objetos con las mismas keys
     */
    function addSheet(name, colDefs, dataRows) {
      const ws = wb.addWorksheet(name);

      // Definir columnas (ancho provisional = longitud del header)
      ws.columns = colDefs.map(c => ({
        header: c.label,
        key:    c.key,
        width:  Math.max(c.label.length + 4, 12),
      }));

      // ── Estilo encabezado (fila 1) ──
      const headerRow = ws.getRow(1);
      headerRow.height = 24;
      headerRow.eachCell(cell => {
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } };
        cell.font      = { bold: true, color: { argb: HEADER_FG }, size: 11, name: 'Calibri' };
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };
        cell.border    = { bottom: { style: 'medium', color: { argb: BORDER_COL } } };
      });

      // ── Añadir filas de datos ──
      dataRows.forEach((rowData, idx) => {
        // Convertir fechas a objetos Date para las columnas marcadas
        const processedRow = {};
        colDefs.forEach(c => {
          processedRow[c.key] = c.isDate ? toDate(rowData[c.key]) : (rowData[c.key] ?? '');
        });

        const row = ws.addRow(processedRow);
        row.height = 18;

        // Filas alternas (cebra)
        if (idx % 2 === 1) {
          row.eachCell({ includeEmpty: true }, cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA_BG } };
          });
        }

        // Formato de fecha en celdas de fecha
        colDefs.forEach((c, ci) => {
          if (c.isDate) {
            const cell = row.getCell(ci + 1);
            cell.numFmt = 'dd/mm/yyyy';
          }
        });
      });

      // ── Auto-ancho de columnas basado en el contenido real ──
      ws.columns.forEach((col, ci) => {
        let maxLen = colDefs[ci]?.label.length ?? 10;
        col.eachCell({ includeEmpty: false }, cell => {
          let len = 0;
          if (cell.value instanceof Date) {
            len = 10; // "dd/mm/yyyy"
          } else if (cell.value != null) {
            len = String(cell.value).length;
          }
          if (len > maxLen) maxLen = len;
        });
        col.width = Math.min(55, maxLen + 3);
      });

      return ws;
    }

    // ────────────────────────────────────────────────────────
    // ── Carnet: Prácticas ──
    addSheet('Carnet_Practicas',
      [
        { label: 'Fecha',   key: 'fecha', isDate: true },
        { label: 'Minutos', key: 'min' },
        { label: 'Notas',   key: 'nota' },
      ],
      car_getPracticas().map(p => ({ fecha: p.fecha, min: p.min, nota: p.nota || '' }))
    );

    // ── Carnet: Config ──
    const cfg = car_getConfig();
    addSheet('Carnet_Config',
      [
        { label: 'Próxima fecha examen', key: 'prox_fecha', isDate: true },
        { label: 'Estado',               key: 'prox_estado' },
      ],
      [{ prox_fecha: cfg.prox_fecha || '', prox_estado: cfg.prox_estado || '' }]
    );

    // ── Oposiciones ──
    addSheet('Oposiciones',
      [
        { label: 'Convocatoria',           key: 'convocatoria' },
        { label: 'Organismo',              key: 'organismo' },
        { label: 'Puesto',                 key: 'puesto' },
        { label: 'Perfil',                 key: 'perfil' },
        { label: 'Grupo',                  key: 'grupo' },
        { label: 'Estado',                 key: 'estado' },
        { label: 'Fase',                   key: 'fase' },
        { label: 'Tipo Proceso',           key: 'tipo_proceso' },
        { label: 'Tope Meritos',           key: 'tope_meritos' },
        { label: 'Req Euskera',            key: 'req_euskera' },
        { label: 'Nivel Euskera',          key: 'nivel_euskera' },
        { label: 'Tasa Pagada',            key: 'tasa_pagada' },
        { label: 'Fecha Apertura',         key: 'fecha_apertura',    isDate: true },
        { label: 'Fecha Fin Inscripción',  key: 'fecha_fin_inscr',   isDate: true },
        { label: 'Fecha Lista Provisional',key: 'fecha_lista_prov',  isDate: true },
        { label: 'Fecha Alegaciones',      key: 'fecha_alegaciones', isDate: true },
        { label: 'Fecha Lista Definitiva', key: 'fecha_lista_def',   isDate: true },
        { label: 'Fecha Examen',           key: 'fecha_examen',      isDate: true },
        { label: 'En Bolsa',               key: 'bolsa_entrada' },
        { label: 'Fecha Bolsa',            key: 'bolsa_fecha',       isDate: true },
        { label: 'Posición Bolsa',         key: 'bolsa_posicion' },
        { label: 'Llamadas Bolsa',         key: 'bolsa_llamadas' },
        { label: 'Notas Bolsa',            key: 'bolsa_notas' },
        { label: 'URL BOE',                key: 'url_boe' },
        { label: 'URL Bases',              key: 'url_bases' },
        { label: 'URL Temario',            key: 'url_temario' },
        { label: 'URL Extra 1',            key: 'url_extra1' },
        { label: 'URL Extra 2',            key: 'url_extra2' },
        { label: 'Meses misma categoría',  key: 'm_misma' },
        { label: 'Meses otras admin.',     key: 'm_otras' },
        { label: 'Meses sector privado',   key: 'm_priv' },
        { label: 'Euskera',                key: 'm_euskera' },
        { label: 'Titulación extra',       key: 'm_tit' },
        { label: 'Doc Solicitud',          key: 'doc_solicitud' },
        { label: 'Doc Titulación',         key: 'doc_titulacion' },
        { label: 'Doc Euskera',            key: 'doc_euskera' },
        { label: 'Doc DNI',                key: 'doc_dni' },
        { label: 'Doc CV',                 key: 'doc_cv' },
        { label: 'Doc Méritos',            key: 'doc_meritos' },
        { label: 'IT_Txartelas_Requeridas', key: 'it_reqs' },
      ],
      getOposLocal().map(o => ({
        convocatoria:    o.convocatoria || '',
        organismo:       o.organismo || _oposOrgPuesto(o).org || '',
        puesto:          o.puesto    || _oposOrgPuesto(o).pto || '',
        perfil:          o.perfil || '',
        grupo:           o.grupo || '',
        estado:          o.estado || '',
        fase:            o.fase || '',
        tipo_proceso:    o.tipo_proceso || '',
        tope_meritos:    o.tope_meritos ?? '',
        req_euskera:     o.req_euskera === true ? 'Sí' : o.req_euskera === false ? 'No' : '',
        nivel_euskera:   o.nivel_euskera || '',
        tasa_pagada:     o.tasa_pagada || '',
        fecha_apertura:  o.fecha_apertura || '',
        fecha_fin_inscr: o.fecha_fin_inscr || '',
        fecha_lista_prov:o.fecha_lista_prov || '',
        fecha_alegaciones:o.fecha_alegaciones || '',
        fecha_lista_def: o.fecha_lista_def || '',
        fecha_examen:    o.fecha_examen || '',
        bolsa_entrada:   o.bolsa_entrada ? 'Sí' : 'No',
        bolsa_fecha:     o.bolsa_fecha || '',
        bolsa_posicion:  o.bolsa_posicion || '',
        bolsa_llamadas:  o.bolsa_llamadas || '',
        bolsa_notas:     o.bolsa_notas || '',
        url_boe:         o.url_boe || '',
        url_bases:       o.url_bases || '',
        url_temario:     o.url_temario || '',
        url_extra1:      o.url_extra1 || '',
        url_extra2:      o.url_extra2 || '',
        m_misma:         o.meritos_calc?.meses_misma || 0,
        m_otras:         o.meritos_calc?.meses_otras || 0,
        m_priv:          o.meritos_calc?.meses_priv || 0,
        m_euskera:       o.meritos_calc?.euskera || '',
        m_tit:           o.meritos_calc?.tit_extra || '',
        doc_solicitud:   o.doc_solicitud || '',
        doc_titulacion:  o.doc_titulacion || '',
        doc_euskera:     o.doc_euskera || '',
        doc_dni:         o.doc_dni || '',
        doc_cv:          o.doc_cv || '',
        doc_meritos:     o.doc_meritos || '',
        it_reqs:         (o.req_it_txartelas || []).join(', '),
      }))
    );

    // ── Agenda: Cumpleaños ──
    const local = Store.get('local_agenda');
    const cumpleRows = (local.cumples || '').split('\n').filter(l => l.trim()).map(l => {
      const mDate = l.match(/(\d{1,2})[\/\-](\d{1,2})/);
      const nombre = l.replace(/[\-—]\s*\d{1,2}[\/\-]\d{1,2}/, '').replace(/\d{1,2}[\/\-]\d{1,2}/, '').trim();
      return { nombre: nombre || l, fecha_ddmm: mDate ? mDate[1].padStart(2,'0') + '/' + mDate[2].padStart(2,'0') : '' };
    });
    addSheet('Agenda_Cumpleanos',
      [
        { label: 'Nombre',        key: 'nombre' },
        { label: 'Fecha (DD/MM)', key: 'fecha_ddmm' },
      ],
      cumpleRows.length ? cumpleRows : [{ nombre: '', fecha_ddmm: '' }]
    );

    // ── Agenda: Eventos ──
    const eventoRows = (local.eventos || '').split('\n').filter(l => l.trim()).map(l => {
      const parts = l.split(' | ');
      return { evento: parts[0]?.trim() || l, fecha: parts[1]?.trim() || '' };
    });
    addSheet('Agenda_Eventos',
      [
        { label: 'Evento', key: 'evento' },
        { label: 'Fecha',  key: 'fecha', isDate: true },
      ],
      eventoRows.length ? eventoRows : [{ evento: '', fecha: '' }]
    );

    // ── Agenda: Vencimientos ──
    const vencRows = (local.vencimientos || '').split('\n').filter(l => l.trim()).map(l => {
      const parts = l.split(' | ');
      return { venc: parts[0]?.trim() || l, fecha: parts[1]?.trim() || '' };
    });
    addSheet('Agenda_Vencimientos',
      [
        { label: 'Vencimiento', key: 'venc' },
        { label: 'Fecha',       key: 'fecha', isDate: true },
      ],
      vencRows.length ? vencRows : [{ venc: '', fecha: '' }]
    );

    // ── Finanzas: Gastos Fijos ──
    addSheet('Finanzas_GastosFijos',
      [
        { label: 'ID',               key: 'id' },
        { label: 'Nombre',           key: 'nombre' },
        { label: 'Importe',          key: 'importe' },
        { label: 'Cuenta',           key: 'cuenta' },
        { label: 'Tipo',             key: 'tipo' },
        { label: 'Día cobro',        key: 'dia' },
        { label: 'Hasta (YYYY-MM)',  key: 'hasta' },
        { label: 'Activo',           key: 'activo' },
        { label: 'Nota',             key: 'nota' },
      ],
      (typeof fin_getGastosFijos === 'function' ? fin_getGastosFijos() : []).map(g => ({
        id: g.id, nombre: g.nombre, importe: g.importe, cuenta: g.cuenta,
        tipo: g.tipo, dia: g.dia || '', hasta: g.hasta || '',
        activo: g.activo ? 'Sí' : 'No', nota: g.nota || '',
      }))
    );

    // ── Finanzas: Saldos ──
    const s = typeof getSaldosActuales === 'function' ? getSaldosActuales() : {};
    addSheet('Finanzas_Saldos',
      [
        { label: 'Cuenta', key: 'cuenta' },
        { label: 'Clave',  key: 'clave' },
        { label: 'Saldo',  key: 'saldo' },
      ],
      [
        { cuenta: 'KTX - Kutxabank',        clave: 'ktx', saldo: s.ktx ?? '' },
        { cuenta: 'RVP - Revolut Personal', clave: 'rvp', saldo: s.rvp ?? '' },
        { cuenta: 'RVC - Revolut Conjunta', clave: 'rvc', saldo: s.rvc ?? '' },
        { cuenta: 'CTV - Vivienda',         clave: 'ctv', saldo: s.ctv ?? '' },
        { cuenta: 'BP - Baskepensiones',    clave: 'bp',  saldo: s.bp  ?? '' },
        { cuenta: 'FM - Fondo Monetario',   clave: 'fm',  saldo: s.fm  ?? '' },
      ]
    );

    // ── Finanzas: Transacciones ──
    const txnsManuales = Store.get('ufin_movimientos_manuales', []);
    addSheet('Finanzas_Transacciones',
      [
        { label: 'Fecha',       key: 'f',   isDate: true },
        { label: 'Importe',     key: 'i' },
        { label: 'Descripción', key: 'd' },
        { label: 'Categoría',   key: 'c' },
        { label: 'Cuenta',      key: 'ct' },
        { label: 'Referencia',  key: 'ref' },
      ],
      txnsManuales.map(t => ({ f: t.f, i: t.i, d: t.d, c: t.c, ct: t.ct, ref: t.ref || '' }))
    );

    // ── Piso: Visitados ──
    const pisos = typeof piso_getPisos === 'function' ? piso_getPisos() : [];
    addSheet('Piso_Visitados',
      [
        { label: 'Estado',       key: 'estado' },
        { label: 'Dirección',    key: 'dir' },
        { label: 'Barrio',       key: 'barrio' },
        { label: 'm²',           key: 'm2' },
        { label: 'Habitaciones', key: 'hab' },
        { label: 'Altura',       key: 'altura' },
        { label: 'Precio',       key: 'precio' },
        { label: 'Honorarios',   key: 'honor' },
        { label: 'Comunidad',    key: 'comunidad' },
        { label: 'IBI',          key: 'ibi' },
        { label: 'ITE',          key: 'ite' },
        { label: 'Nota',         key: 'nota' },
      ],
      pisos.map(p => ({
        estado: p.estado, dir: p.dir, barrio: p.barrio, m2: p.m2,
        hab: p.hab, altura: p.altura, precio: p.precio, honor: p.honor,
        comunidad: p.comunidad ?? '', ibi: p.ibi ?? '', ite: p.ite ?? '', nota: p.nota || '',
      }))
    );

    // ── Piso: Bancos ──
    const bancos = typeof piso_getBancos === 'function' ? piso_getBancos() : [];
    addSheet('Piso_Bancos',
      [
        { label: 'Estatus', key: 'estatus' },
        { label: 'Banco',   key: 'banco' },
        { label: 'TAE (%)', key: 'tae' },
        { label: 'Años',    key: 'anios' },
        { label: 'Nota',    key: 'nota' },
      ],
      bancos.map(b => ({ estatus: b.estatus, banco: b.banco, tae: b.tae || '', anios: b.anios || '', nota: b.nota || '' }))
    );

    // ── Descargar ──
    const buffer   = await wb.xlsx.writeBuffer();
    const blob     = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const fileName = `centro-control-${(() => { const _d=new Date(); return `${_d.getFullYear()}-${String(_d.getMonth()+1).padStart(2,'0')}-${String(_d.getDate()).padStart(2,'0')}`; })()}.xlsx`;
    const isIOS    = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    if (isIOS) {
      // iOS Safari no soporta download de Blob — convertir a base64 y abrir en nueva pestaña
      const reader = new FileReader();
      reader.onloadend = () => {
        const a = document.createElement('a');
        a.href = reader.result;
        a.download = fileName;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      };
      reader.readAsDataURL(blob);
    } else {
      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href    = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

  } catch (err) {
    alert('Error al generar el Excel: ' + err.message);
    console.error(err);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '⬇️ Descargar Excel'; }
  }
}

/* ── Importar (SheetJS — lectura no necesita estilos) ── */

// Convierte un valor de celda Excel (serial numérico o JS Date) a string ISO YYYY-MM-DD
function _xlToISO(val) {
  if (!val && val !== 0) return '';
  if (val instanceof Date) {
    return `${val.getFullYear()}-${String(val.getMonth()+1).padStart(2,'0')}-${String(val.getDate()).padStart(2,'0')}`;
  }
  const num = parseFloat(val);
  if (!isNaN(num) && num > 40000 && num < 60000) {
    const corrected = num >= 60 ? num - 1 : num;
    const d = new Date(Math.round((corrected - 25568) * 86400 * 1000));
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  return String(val);
}

function excel_importar(file) {
  if (!file) return;
  if (typeof XLSX === 'undefined') { alert('La librería Excel no está cargada.'); return; }

  const progressEl = document.getElementById('excel-import-progress');
  const setProgress = msg => { if (progressEl) { progressEl.style.display = ''; progressEl.textContent = msg; } };
  const hideProgress = () => { if (progressEl) progressEl.style.display = 'none'; };

  setProgress('⏳ Leyendo archivo...');

  const reader = new FileReader();
  reader.onload = e => {
    // Defer heavy processing so the spinner renders first
    setTimeout(() => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'binary', cellDates: true });
        const sheet = name => wb.SheetNames.includes(name) ? XLSX.utils.sheet_to_json(wb.Sheets[name]) : null;
        const importados = [];
        let totalFilas = 0;

        // ── Carnet Tests ──
        const tests = sheet('Carnet_Tests');
        if (tests?.length && tests[0]['Fecha']) {
          totalFilas += tests.length;
          setProgress(`⏳ Procesando ${totalFilas} filas...`);
          car_saveTests(tests.map(r => ({
            num: Number(r['Número Test'])||0, fecha: _xlToISO(r['Fecha']),
            fallos: Number(r['Fallos'])||0, cat: String(r['Categoría']||''), tema: String(r['Notas']||'')
          })).filter(t => t.fecha && t.num));
          importados.push('Carnet Tests');
        }

        // ── Carnet Exámenes ──
        const exams = sheet('Carnet_Examenes');
        if (exams?.length && exams[0]['Fecha']) {
          totalFilas += exams.length;
          setProgress(`⏳ Procesando ${totalFilas} filas...`);
          car_saveExamenes(exams.map(r => ({
            fecha: _xlToISO(r['Fecha']), resultado: String(r['Resultado']||''),
            fallos: Number(r['Fallos'])||0, nota: String(r['Notas']||'')
          })).filter(x => x.fecha));
          importados.push('Carnet Exámenes');
        }

        // ── Carnet Prácticas ──
        const pracs = sheet('Carnet_Practicas');
        if (pracs?.length && pracs[0]['Fecha']) {
          totalFilas += pracs.length;
          car_savePracticas(pracs.map(r => ({
            fecha: _xlToISO(r['Fecha']), min: Number(r['Minutos'])||0, nota: String(r['Notas']||'')
          })).filter(p => p.fecha));
          importados.push('Carnet Prácticas');
        }

        // ── Carnet Config ──
        const cfgRows = sheet('Carnet_Config');
        if (cfgRows?.length) {
          const c = car_getConfig();
          c.prox_fecha  = _xlToISO(cfgRows[0]['Próxima fecha examen']);
          c.prox_estado = String(cfgRows[0]['Estado']||'');
          Store.set('car_config', c);
          importados.push('Carnet Config');
        }

        // ── Oposiciones ──
        const opos = sheet('Oposiciones');
        if (opos?.length && opos[0]['Convocatoria']) {
          totalFilas += opos.length;
          setProgress(`⏳ Procesando ${totalFilas} filas...`);
          saveOposLocal(opos.map((r, idx) => ({
            _id: Date.now()+idx,
            convocatoria: String(r['Convocatoria']||''), perfil: String(r['Perfil']||'Yo'),
            organismo: String(r['Organismo']||''), puesto: String(r['Puesto']||''),
            grupo: String(r['Grupo']||''), estado: String(r['Estado']||'En seguimiento'),
            fase: String(r['Fase']||''),
            tipo_proceso: String(r['Tipo Proceso']||''),
            tope_meritos: r['Tope Meritos'] != null && r['Tope Meritos'] !== '' ? parseFloat(r['Tope Meritos']) : null,
            req_euskera: r['Req Euskera']==='Sí' ? true : r['Req Euskera']==='No' ? false : undefined,
            nivel_euskera: String(r['Nivel Euskera']||''),
            tasa_pagada: String(r['Tasa Pagada']||''),
            fecha_apertura: _xlToISO(r['Fecha Apertura']), fecha_fin_inscr: _xlToISO(r['Fecha Fin Inscripción']),
            fecha_lista_prov: _xlToISO(r['Fecha Lista Provisional']), fecha_alegaciones: _xlToISO(r['Fecha Alegaciones']),
            fecha_lista_def: _xlToISO(r['Fecha Lista Definitiva']), fecha_examen: _xlToISO(r['Fecha Examen']),
            bolsa_entrada: r['En Bolsa']==='Sí', bolsa_fecha: _xlToISO(r['Fecha Bolsa']),
            bolsa_posicion: Number(r['Posición Bolsa'])||0, bolsa_llamadas: Number(r['Llamadas Bolsa'])||0,
            bolsa_notas: String(r['Notas Bolsa']||''),
            url_boe: String(r['URL BOE']||''), url_bases: String(r['URL Bases']||''),
            url_temario: String(r['URL Temario']||''), url_extra1: String(r['URL Extra 1']||''), url_extra2: String(r['URL Extra 2']||''),
            doc_solicitud: String(r['Doc Solicitud']||''), doc_titulacion: String(r['Doc Titulación']||''),
            doc_euskera: String(r['Doc Euskera']||''), doc_dni: String(r['Doc DNI']||''),
            doc_cv: String(r['Doc CV']||''), doc_meritos: String(r['Doc Méritos']||''),
            req_it_txartelas: String(r['IT_Txartelas_Requeridas']||'').split(',').map(s=>s.trim()).filter(Boolean),
            meritos_calc: {
              meses_misma: Number(r['Meses misma categoría'])||0, meses_otras: Number(r['Meses otras admin.'])||0,
              meses_priv: Number(r['Meses sector privado'])||0,
              euskera: String(r['Euskera']||''), tit_extra: String(r['Titulación extra']||''), cursos: []
            },
            historial: []
          })).filter(o => o.convocatoria));
          importados.push('Oposiciones');
        }

        // ── Agenda Cumpleaños ──
        const cumples = sheet('Agenda_Cumpleanos');
        if (cumples?.length && cumples[0]['Nombre']) {
          const datos = Store.get('local_agenda');
          datos.cumples = cumples.map(r => `${r['Nombre']} — ${r['Fecha (DD/MM)']}`).join('\n');
          Store.set('local_agenda', datos);
          importados.push('Agenda Cumpleaños');
        }

        // ── Agenda Eventos ──
        const eventos = sheet('Agenda_Eventos');
        if (eventos?.length && eventos[0]['Evento']) {
          const datos = Store.get('local_agenda');
          datos.eventos = eventos.map(r => r['Evento'] + (r['Fecha'] ? ` | ${r['Fecha']}` : '')).join('\n');
          Store.set('local_agenda', datos);
          importados.push('Agenda Eventos');
        }

        // ── Agenda Vencimientos ──
        const venc = sheet('Agenda_Vencimientos');
        if (venc?.length && venc[0]['Vencimiento']) {
          const datos = Store.get('local_agenda');
          datos.vencimientos = venc.map(r => r['Vencimiento'] + (r['Fecha'] ? ` | ${r['Fecha']}` : '')).join('\n');
          Store.set('local_agenda', datos);
          importados.push('Agenda Vencimientos');
        }

        // ── Gastos Fijos ──
        const gf = sheet('Finanzas_GastosFijos');
        if (gf?.length && gf[0]['Nombre'] && typeof fin_saveGastosFijos === 'function') {
          totalFilas += gf.length;
          fin_saveGastosFijos(gf.map(r => ({
            id: String(r['ID']||'gf_'+Date.now()), nombre: String(r['Nombre']||''),
            importe: parseFloat(r['Importe'])||0, cuenta: String(r['Cuenta']||''),
            tipo: String(r['Tipo']||'personal'), dia: Number(r['Día cobro'])||null,
            hasta: String(r['Hasta (YYYY-MM)']||'')||null, activo: r['Activo']!=='No',
            nota: String(r['Nota']||''), cat: 'otros'
          })).filter(g => g.nombre));
          importados.push('Gastos Fijos');
        }

        // ── Finanzas Saldos ──
        const saldosRows = sheet('Finanzas_Saldos');
        if (saldosRows?.length) {
          const sv = Store.get('fin_saldos');
          saldosRows.forEach(r => {
            const k = r['Clave'] || '';
            if (k && r['Saldo'] !== '' && r['Saldo'] !== undefined) sv[k] = parseFloat(r['Saldo'])||0;
          });
          Store.set('fin_saldos', sv);
          importados.push('Saldos');
        }

        // ── Finanzas Transacciones ──
        const txns = sheet('Finanzas_Transacciones');
        if (txns?.length && txns[0]['Fecha']) {
          totalFilas += txns.length;
          setProgress(`⏳ Procesando ${totalFilas} filas...`);
          localStorage.setItem('ufin_movimientos_manuales', JSON.stringify(txns.map(r => ({
            f: String(r['Fecha']||''), i: parseFloat(r['Importe'])||0,
            d: String(r['Descripción']||''), c: String(r['Categoría']||''),
            ct: String(r['Cuenta']||''), ref: String(r['Referencia']||'')
          })).filter(t => t.f)));
          importados.push('Transacciones');
        }

        // ── Piso Visitados ──
        const pisosRows = sheet('Piso_Visitados');
        if (pisosRows?.length && pisosRows[0]['Dirección']) {
          localStorage.setItem('piso_pisos', JSON.stringify(pisosRows.map(r => ({
            estado: String(r['Estado']||''), dir: String(r['Dirección']||''),
            barrio: String(r['Barrio']||''), m2: Number(r['m²'])||0,
            hab: String(r['Habitaciones']||''), altura: String(r['Altura']||''),
            precio: Number(r['Precio'])||0, honor: String(r['Honorarios']||''),
            comunidad: r['Comunidad']!=='' ? Number(r['Comunidad']) : null,
            ibi: r['IBI']!=='' ? Number(r['IBI']) : null,
            ite: r['ITE']!=='' ? Number(r['ITE']) : null, nota: String(r['Nota']||'')
          }))));
          importados.push('Piso Visitados');
        }

        // ── Piso Bancos ──
        const bancosRows = sheet('Piso_Bancos');
        if (bancosRows?.length && bancosRows[0]['Banco']) {
          localStorage.setItem('piso_bancos', JSON.stringify(bancosRows.map(r => ({
            estatus: String(r['Estatus']||''), banco: String(r['Banco']||''),
            tae: String(r['TAE (%)']||''), anios: String(r['Años']||''), nota: String(r['Nota']||'')
          }))));
          importados.push('Piso Bancos');
        }

        hideProgress();
        if (importados.length) {
          setProgress(`✅ Importado: ${importados.join(', ')} (${totalFilas} filas)`);
          setTimeout(hideProgress, 5000);
          loadCarnet(); loadOposiciones(); loadAgenda(); loadPiso();
          if (typeof loadFinanzas === 'function') loadFinanzas();
          if (typeof renderUpdOposList === 'function') renderUpdOposList();
        } else {
          setProgress('⚠️ No se encontraron datos válidos. Usa un Excel exportado desde esta app.');
          setTimeout(hideProgress, 5000);
        }

      } catch (err) {
        hideProgress();
        alert('Error al leer el archivo: ' + err.message);
        console.error(err);
      }
    }, 50);
  };
  reader.readAsBinaryString(file);
}
