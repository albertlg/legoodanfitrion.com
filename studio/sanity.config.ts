import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { schemaTypes } from './schemaTypes'

// 1. Importamos el plugin que acabamos de instalar
import { documentInternationalization } from '@sanity/document-internationalization'

export default defineConfig({
  name: 'default',
  title: 'LeGoodAnfitrion.com Blog Studio',
  projectId: 'bmf59j7w',
  dataset: 'production',

  plugins: [
    structureTool(),
    visionTool(),
    // 2. Añadimos y configuramos el plugin aquí
    documentInternationalization({
      // ¿A qué esquemas le aplicamos idiomas? Al blog (post)
      schemaTypes: ['post', 'category'],
      // Definimos nuestros idiomas
      supportedLanguages: [
        { id: 'es', title: 'Español' },
        { id: 'ca', title: 'Català' },
        { id: 'en', title: 'English' },
        { id: 'fr', title: 'Français' },
        { id: 'it', title: 'Italiano' }
      ],
    }),
  ],

  schema: {
    types: schemaTypes,
  },
})
