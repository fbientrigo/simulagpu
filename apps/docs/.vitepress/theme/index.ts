import type { Theme } from 'vitepress';
import { h } from 'vue';
import DefaultTheme from 'vitepress/theme';
import {
  ClaseCudaMalloc,
  ClaseCudaMemcpy,
  ExploradorIndiceGlobal,
  InteractiveAnkiReviewer,
  LaboratorioReduccion,
  ModeloMentalGpu,
} from '@simulagpu/visuals';
import LandingHome from './components/landing/LandingHome.vue';
import ResponsiveSidebarToggle from './components/ResponsiveSidebarToggle.vue';
import './landing.css';
import './mobile.css';

/**
 * The documentation application is the only layer allowed to wire
 * visualizations into pages. Visualizations know nothing about VitePress.
 */
const theme: Theme = {
  extends: DefaultTheme,
  Layout: () =>
    h(DefaultTheme.Layout, null, {
      'layout-top': () => h(ResponsiveSidebarToggle),
    }),
  enhanceApp({ app }) {
    app.component('ClaseCudaMalloc', ClaseCudaMalloc);
    app.component('ClaseCudaMemcpy', ClaseCudaMemcpy);
    app.component('ExploradorIndiceGlobal', ExploradorIndiceGlobal);
    app.component('InteractiveAnkiReviewer', InteractiveAnkiReviewer);
    app.component('ModeloMentalGpu', ModeloMentalGpu);
    app.component('LaboratorioReduccion', LaboratorioReduccion);
    app.component('LandingHome', LandingHome);
  },
};

export default theme;
