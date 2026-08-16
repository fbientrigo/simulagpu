import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme';
import {
  ClaseCudaMalloc,
  ExploradorIndiceGlobal,
  LaboratorioReduccion,
  SimuladorIsometricoGPU,
} from '@simulagpu/visuals';
import LandingHome from './components/landing/LandingHome.vue';
import './landing.css';

/**
 * The documentation application is the only layer allowed to wire
 * visualizations into pages. Visualizations know nothing about VitePress.
 */
const theme: Theme = {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('ClaseCudaMalloc', ClaseCudaMalloc);
    app.component('ExploradorIndiceGlobal', ExploradorIndiceGlobal);
    app.component('SimuladorIsometricoGPU', SimuladorIsometricoGPU);
    app.component('LaboratorioReduccion', LaboratorioReduccion);
    app.component('LandingHome', LandingHome);
  },
};

export default theme;
