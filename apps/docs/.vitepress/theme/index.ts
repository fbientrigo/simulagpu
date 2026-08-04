import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme';
import { ExploradorIndiceGlobal, SimuladorIsometricoGPU } from '@simulagpu/visuals';

/**
 * The documentation application is the only layer allowed to wire
 * visualizations into pages. Visualizations know nothing about VitePress.
 */
const theme: Theme = {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('ExploradorIndiceGlobal', ExploradorIndiceGlobal);
    app.component('SimuladorIsometricoGPU', SimuladorIsometricoGPU);
  },
};

export default theme;
