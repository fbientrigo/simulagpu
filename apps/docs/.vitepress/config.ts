import { defineConfig } from 'vitepress';

/**
 * Static documentation site.
 *
 * `base` targets GitHub Pages project pages (https://<user>.github.io/simulagpu/).
 * Override it with SIMULAGPU_BASE when serving from a different prefix.
 *
 * Workspace packages are shipped as TypeScript/SFC source, so they must not be
 * externalized during SSR.
 */
export default defineConfig({
  lang: 'es',
  title: 'SimulaGPU',
  description:
    'Aprende programación GPU y paralela con modelos deterministas, código ejecutable y ejercicios.',
  base: process.env.SIMULAGPU_BASE ?? '/simulagpu/',
  srcExclude: ['**/README.md'],
  cleanUrls: true,
  lastUpdated: true,

  head: [['meta', { name: 'theme-color', content: '#7c3aed' }]],

  vite: {
    ssr: {
      noExternal: ['@simulagpu/contracts', '@simulagpu/core', '@simulagpu/visuals', '@simulagpu/theme'],
    },
  },

  themeConfig: {
    outline: { label: 'En esta página', level: [2, 3] },
    docFooter: { prev: 'Anterior', next: 'Siguiente' },
    darkModeSwitchLabel: 'Apariencia',
    returnToTopLabel: 'Volver arriba',
    sidebarMenuLabel: 'Menú',
    lastUpdatedText: 'Última actualización',

    nav: [
      { text: 'Clases', link: '/leccion/indice-global-suma-vectores' },
      { text: 'Laboratorio de reducción', link: '/leccion/reduccion-paralela#laboratorio-interactivo' },
      { text: 'Guía', link: '/guia/instalacion' },
      { text: 'Referencia', link: '/referencia/arquitectura' },
    ],

    sidebar: [
      {
        text: 'Empezar',
        items: [
          { text: 'Qué es SimulaGPU', link: '/' },
          { text: 'Instalación', link: '/guia/instalacion' },
          { text: 'Comandos', link: '/guia/comandos' },
        ],
      },
      {
        text: 'Clase 01 — Índice global',
        items: [
          { text: 'Del índice global a la suma de vectores', link: '/leccion/indice-global-suma-vectores' },
          { text: 'Ejercicio 01: suma de vectores', link: '/leccion/ejercicio-01-suma-de-vectores' },
        ],
      },
      {
        text: 'Clase 02 — Reducción paralela',
        items: [
          { text: 'De la suma a una reducción en árbol', link: '/leccion/reduccion-paralela' },
          { text: 'Laboratorio interactivo', link: '/leccion/reduccion-paralela#laboratorio-interactivo' },
          { text: 'Ejercicio 02: una pasada', link: '/leccion/ejercicio-02-reduccion' },
        ],
      },
      {
        text: 'Repaso',
        items: [{ text: 'Tarjetas Anki — Clases 01 y 02', link: '/leccion/anki' }],
      },
      {
        text: 'Referencia',
        items: [
          { text: 'Arquitectura', link: '/referencia/arquitectura' },
          { text: 'Fuentes y atribución', link: '/referencia/fuentes' },
        ],
      },
    ],

    socialLinks: [{ icon: 'github', link: 'https://github.com/fbientrigo/simulagpu' }],

    footer: {
      message: 'Contenido educativo escrito para SimulaGPU. Ver la página de fuentes y atribución.',
      copyright: 'SimulaGPU',
    },
  },
});
