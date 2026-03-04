# Plan: Sugerir Menú y Lista de Compras

## Objetivo
Diseñar una pantalla dedicada de **planificación de menú y lista de compras** para un evento específico, que combine sugerencias inteligentes (AI) con edición manual. Se accede desde el detalle de un evento.

## Concepto
La pantalla analiza los perfiles de los invitados confirmados (dietas, alergias, preferencias, restricciones) y genera:
1. **Menú sugerido** - Entrantes, platos principales, postres y bebidas adaptados a los invitados
2. **Alertas de restricciones** - Resumen visual de alergias e intolerancias del grupo
3. **Lista de compras** - Ingredientes agrupados por categoría, con cantidades estimadas

## Flujo de acceso
Event Detail → Botón "Planificar Menú" → Pantalla dedicada (Menu Planner)

## Estructura de Pantallas (2 pantallas Desktop)

### Pantalla 1: Menu Planner - Menú (tab activo)
```
┌─────────┬──────────────────────────────────────────────────┐
│ Sidebar │  ← Cena de Navidad / Planificar Menú            │
│  280px  │  [Regenerar con AI ✨] [Exportar PDF]           │
│         ├──────────────────────────────────────────────────│
│         │  ┌────────┐┌──────────┐┌────────────┐           │
│         │  │18 conf.││4 dietas  ││2 alergias  │           │
│         │  │invitados││especiales││críticas    │           │
│         │  └────────┘└──────────┘└────────────┘           │
│         ├──────────────────────────────────────────────────│
│         │  ⚠️ Alerta: 2 invitados con alergia a frutos    │
│         │  secos. 3 vegetarianos. 1 intolerante lactosa.  │
│         ├──────────────────────────────────────────────────│
│         │  TABS: [🍽️ Menú] [🛒 Lista de Compras]          │
│         ├──────────────────────────────────────────────────│
│         │  ┌─────────────────┐ ┌─────────────────┐        │
│         │  │ ENTRANTES       │ │ PLATO PRINCIPAL  │        │
│         │  │ ✨ AI sugerido   │ │ ✨ AI sugerido    │        │
│         │  │                 │ │                  │        │
│         │  │ · Bruschetta de │ │ · Risotto de     │        │
│         │  │   tomate        │ │   setas (vegano) │        │
│         │  │ · Hummus con    │ │ · Salmón al horno│        │
│         │  │   crudités      │ │   con verduras   │        │
│         │  │ · Croquetas de  │ │                  │        │
│         │  │   espinacas     │ │ 🔒 Sin frutos    │        │
│         │  │                 │ │    secos          │        │
│         │  └─────────────────┘ └─────────────────┘        │
│         │  ┌─────────────────┐ ┌─────────────────┐        │
│         │  │ POSTRES         │ │ BEBIDAS          │        │
│         │  │ ✨ AI sugerido   │ │ ✨ AI sugerido    │        │
│         │  │                 │ │                  │        │
│         │  │ · Tarta de      │ │ · Vino tinto     │        │
│         │  │   manzana       │ │   Rioja          │        │
│         │  │ · Sorbete de    │ │ · Agua con gas   │        │
│         │  │   limón (s/l)   │ │ · Zumo natural   │        │
│         │  └─────────────────┘ └─────────────────┘        │
└─────────┴──────────────────────────────────────────────────┘
```

### Pantalla 2: Menu Planner - Lista de Compras (tab activo)
```
┌─────────┬──────────────────────────────────────────────────┐
│ Sidebar │  ← Cena de Navidad / Lista de Compras           │
│  280px  │  [Regenerar con AI ✨] [Exportar PDF]           │
│         ├──────────────────────────────────────────────────│
│         │  (mismas stats y alerta)                        │
│         ├──────────────────────────────────────────────────│
│         │  TABS: [🍽️ Menú] [🛒 Lista de Compras]          │
│         ├──────────────────────────────────────────────────│
│         │  Resumen: 24 ingredientes · ~€85-120 estimado   │
│         │                                                  │
│         │  ┌──────────────────────────────────────────┐    │
│         │  │ 🥬 VERDURAS Y HORTALIZAS                 │    │
│         │  │ ☑ Tomates cherry          500g           │    │
│         │  │ ☑ Espinacas frescas       300g           │    │
│         │  │ ☑ Setas variadas          400g           │    │
│         │  │ ☑ Calabacín               2 uds          │    │
│         │  ├──────────────────────────────────────────│    │
│         │  │ 🐟 PESCADO Y PROTEÍNAS                   │    │
│         │  │ ☑ Salmón fresco           1.2 kg         │    │
│         │  ├──────────────────────────────────────────│    │
│         │  │ 🧀 LÁCTEOS (⚠️ sin lactosa)              │    │
│         │  │ ☑ Queso parmesano         200g           │    │
│         │  │ ☑ Nata sin lactosa        500ml          │    │
│         │  ├──────────────────────────────────────────│    │
│         │  │ 🍷 BEBIDAS                               │    │
│         │  │ ☑ Vino tinto Rioja        3 botellas     │    │
│         │  │ ☑ Agua con gas            6 botellas     │    │
│         │  │ ☑ Zumo de naranja         2 litros       │    │
│         │  └──────────────────────────────────────────┘    │
└─────────┴──────────────────────────────────────────────────┘
```

## Especificaciones de Diseño

### Layout general
- **1440×960** desktop, misma estructura que otras pantallas (sidebar + main content)
- **Sidebar**: Eventos activo en nav
- **Main**: padding [32, 40], gap 24, vertical

### Header
- Breadcrumb: "Eventos / Cena de Navidad / Planificar Menú"
- Botones: "Regenerar con AI ✨" (Secondary) + "Exportar PDF" (Outline)

### Stats Row (3 cards)
- Card con icono + número grande + label
- 18 invitados confirmados, 4 dietas especiales, 2 alergias críticas

### Alerta de Restricciones
- Alert/Warning con resumen de restricciones del grupo
- "2 invitados con alergia a frutos secos. 3 vegetarianos. 1 intolerante a lactosa."

### Tabs
- [Menú] [Lista de Compras] usando Tabs component (Kbr4h)

### Menu Cards (Pantalla 1)
- **Grid 2×2** de cards (ERkuB)
- Cada card tiene:
  - Header: Categoría (Entrantes, Plato Principal, Postres, Bebidas) + badge "✨ AI"
  - Body: Lista de platos con bullet points
  - Notas de restricción donde aplique (icono shield + texto)

### Shopping List (Pantalla 2)
- **Resumen**: texto con total ingredientes y rango de precio estimado
- **Lista agrupada** en una sola card grande con secciones
- Cada sección: icono emoji + nombre categoría
- Cada item: checkbox + nombre + cantidad alineada a la derecha
- Secciones separadas por divider

## Pantallas a Generar (2)

1. **Menu Planner - Menú** (tab Menú activo, grid 2×2 de cards de platos)
2. **Menu Planner - Lista de Compras** (tab Lista activo, lista agrupada con checkboxes)

## Componentes Reutilizados
- Sidebar (d5ZTS), Card (ERkuB)
- Tab Item Active/Inactive (KbyBJ/BdBJJ), Tabs (Kbr4h)
- Button variants (ZETEA, U83R7, 4x7RU)
- Alert/Warning (vbyqV)
- Checkbox/Checked (r91nP), Checkbox/Default (Wxq1C)
- Icon Label variants para badges AI
- Breadcrumb Items

## Pasos de Implementación

1. **Crear 2 placeholder frames** posicionadas en espacio libre del canvas
2. **Pantalla 1 - Menú**: Sidebar + header con breadcrumb + stats row + alerta + tabs + grid 2×2 de menu cards
3. **Pantalla 2 - Lista de Compras**: Copiar pantalla 1, cambiar tab activo, reemplazar contenido con lista de compras agrupada
4. **Validación visual** con screenshots
