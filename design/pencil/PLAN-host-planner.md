# Plan: "Plan de Anfitrión" — Motor IA integral

## Concepto

Transformar el actual "Menu Planner" en un **"Plan de Anfitrión"** completo: un planificador integral impulsado por IA que genera no solo menú y compras, sino también ambiente, timings, comunicación y gestión de riesgos. Todo en **una sola pantalla con navegación por tabs**, más un **modal de contexto IA** donde el anfitrión puede revisar/ajustar los parámetros antes de generar.

La clave: el prompt/contexto que se envía a la IA está **visible y editable** por el usuario, lo que genera confianza, transparencia y control.

---

## Arquitectura de pantallas (4 pantallas nuevas desktop + 4 mobile = 8 total)

### Pantalla 1: **Host Plan — Desktop** (reemplaza/evoluciona el Menu Planner)
- **Renombra** la sección de "Planificar Menú" → "Plan de Anfitrión"
- **6 tabs horizontales** dentro de la misma pantalla:
  1. **Menú** — Lo que ya existe (entrantes, principal, postres, bebidas)
  2. **Compras** — Lo que ya existe (lista de ingredientes categorizada)
  3. **Ambiente** — Decoración, música, iluminación, distribución de mesas/espacios
  4. **Timings** — Timeline del evento: preparación, recepción, servicio, sobremesa, cierre
  5. **Comunicación** — Mensajes sugeridos: recordatorio pre-evento, bienvenida, agradecimiento post
  6. **Riesgos** — Alertas de alergias, conflictos dietéticos, planes B por clima, nº invitados, etc.

- **Top bar**: Breadcrumb + título "Plan de Anfitrión" + badge AI + botones "Contexto IA" (nuevo) + "Regenerar" + "Exportar PDF"
- **Stats row**: Se mantienen las 3 cards de stats (Confirmados, Dietas, Alergias)
- **Warning alert**: Se mantiene (restricciones del grupo)
- **Tab bar**: 6 tabs (Menú activo por defecto)
- **Content area**: Cambia según tab activo
- **Footer**: Regenerar + Exportar

### Pantalla 2: **Modal Contexto IA — Desktop**
Se abre al hacer click en botón "Contexto IA". Muestra **todo lo que la IA "sabe"** y permite al usuario ajustarlo antes de regenerar.

- **Modal ancho** (640px) con overlay sobre el Host Plan
- **Header**: Título "Contexto para la IA" + icono sparkles + botón cerrar
- **Secciones colapsables con accordion pattern** (usando los componentes `DFcCn`/`3bQzF`):

  1. **Evento** (auto-rellenado desde datos del evento)
     - Tipo: Cena formal | Fecha: 24 Dic | Hora: 20:30 | Lugar: Casa
     - Capacidad: 30 | Dress code: Elegante casual

  2. **Invitados** (auto-rellenado desde perfiles)
     - 18 confirmados de 24 invitados
     - 3 vegetarianos, 1 vegano, 2 alérgicos a frutos secos, 1 intolerante a lactosa
     - Rango edad: 25-65 | Niños: 2

  3. **Preferencias del anfitrión** (editable por el usuario)
     - Presupuesto: €80-120 (input editable)
     - Cocina preferida: Mediterránea (select)
     - Nivel de cocina: Intermedio (select)
     - Tiempo de preparación máximo: 4 horas (input)

  4. **Ambiente y estilo** (editable)
     - Ambiente deseado: Elegante pero acogedor (textarea)
     - Música: Instrumental / Jazz suave
     - Iluminación: Cálida, velas

  5. **Instrucciones adicionales** (textarea libre)
     - Campo de texto libre para cualquier indicación extra
     - Placeholder: "Ej: Mi suegra no puede comer picante, quiero impresionar a mi jefe..."

- **Footer**: "Cancelar" + "Generar Plan Completo" (botón primario con sparkles)
- **Vista de "prompt crudo"**: Toggle/link pequeño "Ver prompt técnico" que muestra el JSON/texto estructurado que se enviará a la API

### Pantalla 3: **Host Plan — Mobile** (misma estructura adaptada)
- Top bar con back + "Plan de Anfitrión" + badge AI
- Stats cards horizontales (scroll)
- Alert
- 6 tabs (scroll horizontal si necesario)
- Content según tab
- Footer sticky con Regenerar + Exportar

### Pantalla 4: **Modal Contexto IA — Mobile**
- Bottom sheet full-height (como los modals existentes mobile)
- Mismas secciones colapsables
- Scroll vertical del contenido
- Footer sticky: Cancelar + Generar

---

## Detalle de contenido por tab

### Tab "Ambiente" (nuevo)
Card con secciones:
- **Decoración**: Sugerencias de decoración temática (centro de mesa, colores, flores)
- **Música**: Playlist sugerida con 3-4 géneros/artistas
- **Iluminación**: Recomendaciones (velas, luces cálidas, dimmers)
- **Distribución**: Sugerencia de disposición de mesas/espacios

### Tab "Timings" (nuevo)
Timeline vertical con:
- **16:30** — Preparación: mise en place
- **19:00** — Preparación final: entrantes, poner mesa
- **20:00** — Recepción: aperitivos, bebida de bienvenida
- **20:30** — Entrantes
- **21:15** — Plato principal
- **22:00** — Postres y café
- **22:30** — Sobremesa
- **00:00** — Cierre sugerido

### Tab "Comunicación" (nuevo)
3 cards de mensajes pre-escritos:
- **Recordatorio** (2 días antes): Mensaje con detalles logísticos
- **Bienvenida** (día del evento): Mensaje corto de bienvenida
- **Agradecimiento** (día después): Mensaje de gracias con foto placeholder

Cada card con botón "Copiar" y "Personalizar"

### Tab "Riesgos" (nuevo)
Cards de alertas categorizadas:
- **Crítico** (rojo): Alergias severas que requieren atención
- **Importante** (naranja): Conflictos dietéticos, opciones limitadas
- **Bajo** (azul): Sugerencias de plan B (clima, retrasos, etc.)

---

## Modificaciones a pantallas existentes

### Event Detail Desktop (`nFFRC`)
- Añadir en la columna derecha (`fXabL`) una **nueva card** "Plan de Anfitrión" con:
  - Badge AI
  - Estado: "Sin generar" / "Generado" / "Actualizado hace 2h"
  - Botón "Generar Plan" / "Ver Plan"

### Event Detail Mobile (`bfF8s`)
- Añadir card similar en el content area

---

## Orden de implementación

1. **Host Plan Desktop** — Pantalla completa con 6 tabs (evolución del Menu Planner)
2. **Modal Contexto IA Desktop** — Overlay sobre el Host Plan
3. **Host Plan Mobile** — Adaptación mobile
4. **Modal Contexto IA Mobile** — Bottom sheet
5. **CTA en Event Detail Desktop** — Card en columna derecha
6. **CTA en Event Detail Mobile** — Card en content area

---

## Notas técnicas para implementación futura

El modal de contexto IA genera un **objeto JSON estructurado** que sirve como prompt para la API:

```json
{
  "event": { "type", "date", "time", "location", "capacity", "dressCode" },
  "guests": { "confirmed", "total", "dietary", "allergies", "ageRange", "children" },
  "hostPreferences": { "budget", "cuisine", "cookingLevel", "maxPrepTime" },
  "ambiance": { "mood", "music", "lighting" },
  "additionalInstructions": "free text",
  "sections": ["menu", "shopping", "ambiance", "timings", "communication", "risks"]
}
```

Cada tab puede regenerarse individualmente o todo el plan completo.
