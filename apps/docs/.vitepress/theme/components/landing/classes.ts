/**
 * Single source of truth for "classes that already exist" on the landing
 * page. Every entry here must resolve to a real file under `apps/docs/`;
 * `tests/landing-classes.test.ts` enforces that on disk, so nobody can add
 * a future/invented class here without the test suite catching it.
 *
 * Paths are root-relative and do not include the VitePress `base` prefix.
 * `LandingHome.vue` resolves that with `withBase()` before rendering links.
 */
export interface LandingClass {
  /** Stable id for :key and data-test attributes. */
  id: string;
  /** Short kicker, e.g. "Clase 0". */
  eyebrow: string;
  /** Class title shown on the card. */
  title: string;
  /** One short sentence describing what the class covers. */
  description: string;
  /** Root-relative route, without the VitePress base prefix. */
  href: string;
  /** Optional secondary link shown inside the card (e.g. an exercise). */
  secondary?: { label: string; href: string };
}

export const landingClasses: LandingClass[] = [
  {
    id: 'clase-0',
    eyebrow: 'Clase 0',
    title: 'El modelo mental de una GPU',
    description: 'Cómo se dividen los datos en chunks y se reparten entre bloques e hilos. Sin código.',
    href: '/clase-0/modelo-mental-gpu',
  },
  {
    id: 'indice-global',
    eyebrow: 'Clase 01',
    title: 'Índice global',
    description: 'Cómo una grilla reparte un vector entre hilos: guard de límites y división redondeada hacia arriba.',
    href: '/leccion/indice-global-suma-vectores',
    secondary: { label: 'Ejercicio 01', href: '/leccion/ejercicio-01-suma-de-vectores' },
  },
  {
    id: 'cuda-malloc',
    eyebrow: 'Clase complementaria',
    title: 'cudaMalloc',
    description: 'Predice la transición de cudaMalloc y comprueba que reservar memoria no la inicializa.',
    href: '/clases/cuda-malloc',
  },
  {
    id: 'reduccion-paralela',
    eyebrow: 'Clase 02',
    title: 'Reducción paralela',
    description: 'Por qué un acumulador compartido crea una carrera y cómo un árbol combina pares disjuntos.',
    href: '/leccion/reduccion-paralela',
    secondary: { label: 'Ejercicio 02', href: '/leccion/ejercicio-02-reduccion' },
  },
  {
    id: 'anki',
    eyebrow: 'Repaso',
    title: 'Tarjetas Anki',
    description: 'Repaso espaciado de las clases 01 y 02.',
    href: '/leccion/anki',
  },
];
