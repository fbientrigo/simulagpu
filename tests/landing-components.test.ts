// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import LandingIntro from '../apps/docs/.vitepress/theme/components/landing/LandingIntro.vue';
import GpuClassMap from '../apps/docs/.vitepress/theme/components/landing/GpuClassMap.vue';
import LandingHome from '../apps/docs/.vitepress/theme/components/landing/LandingHome.vue';
import { landingClasses } from '../apps/docs/.vitepress/theme/components/landing/classes';

/**
 * `LandingIntro` and `GpuClassMap` are pure, prop/emit-driven components:
 * neither touches `window`/`location` nor needs VitePress's app context, so
 * they can be mounted directly with Vue Test Utils under happy-dom.
 */
describe('LandingIntro (arrival state)', () => {
  it('renders the Enter GPU CTA on first render', () => {
    const wrapper = mount(LandingIntro);
    const cta = wrapper.get('[data-test="enter-gpu-cta"]');
    expect(cta.text()).toContain('Entrar a la GPU');
  });

  it('is a real button, so click and keyboard activation both work natively', () => {
    const wrapper = mount(LandingIntro);
    const cta = wrapper.get('[data-test="enter-gpu-cta"]');
    expect(cta.element.tagName).toBe('BUTTON');
  });

  it('emits "enter" when the CTA is activated', async () => {
    const wrapper = mount(LandingIntro);
    await wrapper.get('[data-test="enter-gpu-cta"]').trigger('click');
    expect(wrapper.emitted('enter')).toHaveLength(1);
  });
});

describe('GpuClassMap (class-selection state)', () => {
  const items = landingClasses.map((item) => ({ ...item, href: `/simulagpu${item.href}` }));

  it('renders exactly one link per known class, with the resolved href', () => {
    const wrapper = mount(GpuClassMap, { props: { items } });
    const cards = wrapper.findAll('[data-test="class-card"]');
    expect(cards).toHaveLength(items.length);
    cards.forEach((card, i) => {
      expect(card.element.tagName).toBe('A');
      expect(card.attributes('href')).toBe(items[i]!.href);
    });
  });

  it('exposes no href outside the known route list', () => {
    const wrapper = mount(GpuClassMap, { props: { items } });
    const known = new Set(items.map((item) => item.href));
    wrapper.findAll('[data-test="class-card"]').forEach((card) => {
      expect(known.has(card.attributes('href')!)).toBe(true);
    });
  });

  it('emits "back" when the back control is activated', async () => {
    const wrapper = mount(GpuClassMap, { props: { items } });
    await wrapper.get('[data-test="back-to-intro"]').trigger('click');
    expect(wrapper.emitted('back')).toHaveLength(1);
  });

  it('shows the secondary link (e.g. exercise) only for classes that have one', () => {
    const wrapper = mount(GpuClassMap, { props: { items } });
    const withSecondary = items.filter((item) => item.secondary).length;
    expect(wrapper.findAll('[data-test="class-card-secondary"]')).toHaveLength(withSecondary);
  });
});

describe('LandingHome (arrival -> class-selection state machine)', () => {
  it('shows only the CTA initially, not the class selector', () => {
    const wrapper = mount(LandingHome);
    expect(wrapper.find('[data-test="enter-gpu-cta"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="gpu-class-map"]').exists()).toBe(false);
  });

  it('activating Enter GPU first plays the entry transition, then switches to the class-selection state', async () => {
    vi.useFakeTimers();
    try {
      const wrapper = mount(LandingHome);
      await wrapper.get('[data-test="enter-gpu-cta"]').trigger('click');

      // Mid-transition: still the intro, now visually "entering".
      expect(wrapper.find('[data-test="landing-intro"]').exists()).toBe(true);
      expect(wrapper.find('[data-test="gpu-class-map"]').exists()).toBe(false);

      await vi.advanceTimersByTimeAsync(600);

      expect(wrapper.find('[data-test="landing-intro"]').exists()).toBe(false);
      expect(wrapper.find('[data-test="gpu-class-map"]').exists()).toBe(true);
      expect(wrapper.findAll('[data-test="class-card"]')).toHaveLength(landingClasses.length);
    } finally {
      vi.useRealTimers();
    }
  });

  it('skips the entry transition and goes straight to the class-selection state when reduced motion is preferred', async () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;

    try {
      const wrapper = mount(LandingHome);
      await wrapper.get('[data-test="enter-gpu-cta"]').trigger('click');
      expect(wrapper.find('[data-test="landing-intro"]').exists()).toBe(false);
      expect(wrapper.find('[data-test="gpu-class-map"]').exists()).toBe(true);
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });

  it('the back control returns to the arrival state', async () => {
    vi.useFakeTimers();
    try {
      const wrapper = mount(LandingHome);
      await wrapper.get('[data-test="enter-gpu-cta"]').trigger('click');
      await vi.advanceTimersByTimeAsync(600);
      await wrapper.get('[data-test="back-to-intro"]').trigger('click');
      expect(wrapper.find('[data-test="landing-intro"]').exists()).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
