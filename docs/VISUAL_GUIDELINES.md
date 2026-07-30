# BoxBox — Lineamientos visuales

> Documento maestro de identidad visual y UI de BoxBox.
>
> Este archivo define la fuente de verdad para cualquier pantalla, componente, campaña, pieza gráfica o producto nuevo asociado a BoxBox.

---

## 1. Identidad de marca

### Concepto

BoxBox debe sentirse como una plataforma de automovilismo moderna, competitiva y tecnológica, sin copiar la identidad visual oficial de Fórmula 1 ni la de ningún equipo.

La experiencia combina:

- **Competición:** rojo, jerarquías fuertes, datos destacados y sensación de urgencia.
- **Tecnología:** fondos oscuros, celeste como acento informativo y componentes limpios.
- **Comunidad:** avatares, rankings, torneos y mensajes con un tono cercano.
- **Claridad:** la información deportiva debe poder leerse rápido, incluso en móvil.

### Personalidad visual

- Directa
- Competitiva
- Moderna
- Oscura
- Enérgica, pero no estridente
- Técnica, sin parecer una consola compleja
- Juvenil, sin caer en estética infantil

### Principio rector

> La interfaz debe parecer una transmisión deportiva convertida en producto digital: rápida de escanear, jerárquica y orientada a la acción.

---

## 2. Logo

### Logo principal actual

El logo utilizado actualmente por la aplicación es:

```text
https://i.imgur.com/VfzbTsC.png
```

En el header se muestra con una altura de `40px` y ancho automático.

```tsx
<img
  src="https://i.imgur.com/VfzbTsC.png"
  alt="BoxBox Logo"
  className="h-10 w-auto"
/>
```

### Uso recomendado

- Usar siempre el archivo original, sin deformarlo.
- Mantener la relación de aspecto.
- No aplicar sombras, contornos, degradados ni efectos adicionales.
- No recolorear el logo salvo que exista una variante oficial preparada para ese uso.
- Colocarlo preferentemente sobre fondos oscuros.
- Usar una altura mínima digital de `28px`.
- En navegación principal: `40px`.
- En pantallas de acceso o branding central: entre `48px` y `72px`.

### Área de seguridad

Mantener alrededor del logo un espacio libre mínimo equivalente al **25 % de su altura**.

Ejemplo: para un logo de `40px` de alto, dejar al menos `10px` libres en cada lado.

### Usos incorrectos

- No estirar ni comprimir.
- No rotar.
- No cortar.
- No usar sobre fondos con poco contraste.
- No reemplazarlo por texto escrito con Poppins cuando el logo gráfico esté disponible.
- No combinarlo con logos oficiales de F1 de forma que parezca una marca licenciada.

### Recomendación técnica

El logo no debería depender permanentemente de Imgur. Conviene incorporarlo al repositorio, por ejemplo:

```text
/public/brand/boxbox-logo.png
```

Y consumirlo mediante:

```tsx
<img src="/brand/boxbox-logo.png" alt="BoxBox" />
```

---

## 3. Paleta de colores

### Colores base oficiales

| Token | Valor | Uso |
|---|---:|---|
| `--background-dark` | `#0A0A0A` | Fondo general de la aplicación |
| `--background-medium` | `#18181B` | Header, cards, modales y superficies principales |
| `--background-light` | `#27272A` | Inputs, estados hover, cards internas y superficies elevadas |
| `--border-color` | `#3F3F46` | Bordes, divisores y contornos |
| `--text-primary` | `#F4F4F5` | Texto principal y títulos |
| `--text-secondary` | `#A1A1AA` | Texto secundario, metadatos y labels |
| `--accent-red` | `#E10600` | Acción principal, selección, énfasis competitivo |
| `--accent-blue` | `#00D2FF` | Links, información y acento técnico |

### Variables CSS oficiales

```css
:root {
  --background-dark: #0A0A0A;
  --background-medium: #18181B;
  --background-light: #27272A;
  --border-color: #3F3F46;
  --text-primary: #F4F4F5;
  --text-secondary: #A1A1AA;
  --accent-red: #E10600;
  --accent-blue: #00D2FF;
}
```

### Jerarquía de superficies

La profundidad visual se construye por luminosidad, no por colores arbitrarios:

1. **Página:** `#0A0A0A`
2. **Superficie principal:** `#18181B`
3. **Superficie secundaria o interactiva:** `#27272A`
4. **Borde:** `#3F3F46`

No se deben introducir grises nuevos si uno de estos cuatro cumple la función.

### Uso del rojo

El rojo es el color de acción y competencia.

Usar para:

- Botón primario.
- Navegación activa.
- Indicadores principales.
- Etiquetas de máximo énfasis.
- Bordes destacados.
- Focus de formularios.
- Cuenta regresiva o llamada urgente.

No usar para:

- Grandes fondos de página.
- Párrafos completos.
- Más de una acción primaria por bloque.
- Estados de error y acción principal simultáneamente sin diferenciación.

### Uso del celeste

El celeste representa información, navegación secundaria y tecnología.

Usar para:

- Links.
- Estados informativos.
- Etiquetas técnicas como Sprint.
- Elementos secundarios que requieran contraste.
- Datos destacados que no sean una acción principal.

No debe competir visualmente con el rojo.

### Colores semánticos

Los colores semánticos pueden utilizar la escala estándar de Tailwind, respetando estos roles:

| Estado | Color recomendado | Ejemplo Tailwind |
|---|---|---|
| Éxito | Verde | `text-green-400`, `bg-green-600` |
| Advertencia | Ámbar | `text-amber-400`, `bg-amber-500/10` |
| Error | Rojo claro distinto del primario | `text-red-400`, `bg-red-900/20` |
| Información | Celeste de marca | `var(--accent-blue)` |
| Deshabilitado | Gris | opacidad entre `40 %` y `50 %` |

El rojo de error debe diferenciarse por contexto, texto o iconografía del rojo de acción.

### Colores de equipos

Los colores de equipos y pilotos pueden aparecer como acentos de datos:

- Barras verticales.
- Bordes laterales.
- Indicadores pequeños.
- Avatares o badges.

No deben reemplazar la paleta principal de una pantalla completa.

---

## 4. Fondos y atmósfera

El fondo principal utiliza una base negra con dos halos radiales muy sutiles:

```css
body {
  background-color: var(--background-dark);
  background-image:
    radial-gradient(
      circle at 10% 10%,
      rgba(225, 6, 0, 0.1),
      transparent 30%
    ),
    radial-gradient(
      circle at 90% 80%,
      rgba(0, 210, 255, 0.1),
      transparent 30%
    );
}
```

### Reglas

- Los halos deben ser ambientales, nunca protagonistas.
- La opacidad habitual no debe superar `0.10`.
- Evitar sumar texturas, banderas a cuadros o imágenes de autos como fondo global.
- En heroes puede usarse un degradado rojo localizado:

```css
linear-gradient(
  135deg,
  rgba(230, 36, 41, 0.14),
  rgba(230, 36, 41, 0.04)
)
```

---

## 5. Tipografía

### Familia principal

**Poppins** es la tipografía oficial de interfaz.

Pesos cargados:

- `400` — Regular
- `500` — Medium
- `600` — Semibold
- `700` — Bold

```html
<link
  href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap"
  rel="stylesheet"
/>
```

```css
body {
  font-family: 'Poppins', sans-serif;
}
```

### Escala recomendada

| Nivel | Tamaño | Peso | Uso |
|---|---:|---:|---|
| Display | `48–54px` | `700` | Hero principal en escritorio |
| H1 | `36–40px` | `700` | Título de página |
| H2 | `24–30px` | `700` | Sección principal |
| H3 | `18–20px` | `600–700` | Card o subsección |
| Body | `15–16px` | `400` | Texto general |
| Small | `13–14px` | `400–500` | Metadatos y ayudas |
| Micro | `11–12px` | `600–700` | Badges y labels técnicos |

### Títulos

- Usar peso `700`.
- Mantener interlineado compacto en títulos grandes: `0.95–1.1`.
- Evitar títulos enteros en mayúsculas.
- Las mayúsculas se reservan para etiquetas cortas.

### Etiquetas técnicas

Los badges y labels pueden usar:

```text
font-size: 11–12px
font-weight: 700
text-transform: uppercase
letter-spacing: 0.18em–0.22em
```

Ejemplos: `PRÓXIMO GP`, `SPRINT`, `CLASIFICACIÓN`.

### Texto secundario

- Usar `--text-secondary`.
- No reducir demasiado el tamaño para compensar falta de espacio.
- El cuerpo secundario debe conservar una altura de línea relajada: `1.5–1.7`.

---

## 6. Retícula y layout

### Contenedor principal

El ancho máximo recomendado para páginas generales es:

```text
max-width: 1280px (`max-w-7xl`)
```

Patrón base:

```tsx
<div className="container mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
```

### Espaciado exterior

| Breakpoint | Padding sugerido |
|---|---:|
| Móvil | `16px` |
| Tablet | `24px` |
| Escritorio | `32px` |

### Sistema de espaciado

Usar múltiplos de `4px`.

Escala preferida:

```text
4, 8, 12, 16, 20, 24, 32, 40, 48, 64
```

### Separación vertical

- Elementos internos pequeños: `8–12px`.
- Contenido de card: `16–24px`.
- Secciones: `32px`.
- Grandes bloques editoriales: `48–64px`.

### Grillas

- Móvil: una columna.
- Tablet: dos columnas cuando la lectura lo permita.
- Escritorio: usar grillas de 12 columnas para heroes o dashboards complejos.
- El contenido crítico siempre debe aparecer primero en el DOM móvil.

---

## 7. Bordes y radios

### Radios oficiales

| Uso | Radio |
|---|---:|
| Input o botón compacto | `6px` (`rounded-md`) |
| Card estándar | `8px` (`rounded-lg`) |
| Panel destacado | `16px` (`rounded-2xl`) |
| Hero principal | `28px` |
| Badge | `9999px` (`rounded-full`) |

### Criterio

- No mezclar radios distintos dentro de un mismo grupo visual sin intención.
- Los heroes pueden ser más redondeados que las cards internas.
- Los elementos deportivos o de datos deben conservar geometría firme; evitar una estética excesivamente blanda.

### Bordes

Patrón estándar:

```text
1px solid var(--border-color)
```

Los bordes de color se reservan para:

- Estado activo.
- Posición de podio.
- Color de equipo.
- Información especial.
- Error o éxito.

---

## 8. Sombras

La profundidad debe ser discreta y oscura.

### Card o modal

```text
shadow-2xl shadow-black/50
```

### Panel grande

```text
shadow-2xl shadow-black/20
```

### Reglas

- No usar sombras claras o de color fuerte.
- No combinar borde intenso, sombra intensa y fondo brillante en el mismo elemento.
- En la mayoría de las cards alcanza con borde y contraste de superficie.

---

## 9. Componentes

### Botón primario

Uso: acción principal de una pantalla o bloque.

```tsx
className="rounded-md bg-[var(--accent-red)] px-4 py-2.5
text-sm font-bold text-white transition-opacity
hover:opacity-90 focus:outline-none focus:ring-2
focus:ring-[var(--accent-red)]
disabled:opacity-50"
```

Reglas:

- Una acción primaria clara por bloque.
- Texto corto y verbal: `Predecir`, `Registrarse`, `Guardar cambios`.
- Altura táctil mínima recomendada: `44px`.

### Botón secundario

```text
Fondo: background-light
Texto: text-primary
Hover: superficie ligeramente más clara o borde reforzado
```

Nunca debe tener el mismo peso visual que el botón rojo principal.

### Botón terciario / link

- Sin fondo.
- Texto `--accent-blue` o `--text-secondary`.
- Hover mediante opacidad o cambio a blanco.

### Inputs

Patrón oficial:

```tsx
className="w-full rounded-md border border-[var(--border-color)]
bg-[var(--background-light)] px-3 py-2 text-white
shadow-sm focus:border-[var(--accent-red)]
focus:outline-none focus:ring-2 focus:ring-[var(--accent-red)]"
```

Reglas:

- Label siempre visible sobre el campo.
- Placeholder nunca reemplaza al label.
- Error debajo del campo, en `text-red-400`.
- Focus rojo consistente.
- Inputs deshabilitados con opacidad y cursor adecuados.

### Cards

Card estándar:

```text
background: var(--background-medium)
border: 1px solid var(--border-color)
border-radius: 8–16px
padding: 16–24px
```

Card interna:

```text
background: var(--background-light)
border-radius: 8px
```

### Hero

- Radio de `28px`.
- Fondo `background-medium`.
- Borde estándar.
- Puede incluir degradado rojo de baja opacidad.
- Título grande y acción clara.
- Datos secundarios separados en un panel interno oscuro.

### Badges

- Forma píldora.
- Texto uppercase.
- Tracking amplio.
- Máximo una o dos palabras.

Variantes:

- Principal: fondo rojo, texto blanco.
- Informativa: borde y fondo celeste translúcido.
- Neutra: fondo `background-light`, texto secundario.

### Navegación

Desktop:

- Header de `64px` de alto.
- Fondo `background-medium`.
- Borde inferior.
- Item activo en rojo.
- Item inactivo en texto secundario con hover blanco.

Móvil:

- Item activo con fondo rojo y texto blanco.
- Items apilados.
- Área táctil generosa.

### Dropdowns y modales

- Fondo `background-medium`.
- Borde estándar.
- Radio `8px`.
- Sombra negra al `50 %`.
- `z-index` suficiente para superar navegación y contenido.
- Cerrar al hacer clic afuera cuando corresponda.

### Tablas y rankings

- Priorizar lectura horizontal clara.
- Números alineados.
- Posición con peso alto.
- Color de equipo como acento fino, no como fondo completo.
- En móvil, ocultar primero datos secundarios, no los esenciales.

### Podios

Convención actual:

- P1: rojo BoxBox.
- P2: gris.
- P3: dorado/amarillo oscuro.

La posición debe expresarse también con texto (`P1`, `P2`, `P3`) para no depender sólo del color.

---

## 10. Iconografía

### Estilo

La iconografía actual utiliza SVG lineales:

- Sin relleno.
- Trazo de `2px`.
- Extremos y uniones redondeados.
- Tamaño habitual: `20px` o `24px`.

### Reglas

- Mantener un único estilo lineal dentro de la interfaz.
- No mezclar íconos 3D, sólidos y lineales en la misma navegación.
- Los emojis pueden aparecer en notificaciones o contenido social, pero no reemplazar iconos funcionales centrales.
- Cada icono sin texto debe tener `aria-label` o texto accesible.

---

## 11. Imágenes, banderas y contenido deportivo

### Fotografías

- Priorizar imágenes con contraste alto y fondos simples.
- Usar overlays oscuros para garantizar legibilidad.
- No llenar la interfaz de fotografías; los datos siguen siendo protagonistas.

### Banderas

- Mantener relación de aspecto consistente.
- Usarlas como contexto del GP o nacionalidad, no como decoración de fondo completa.
- Nunca reemplazar el nombre del país únicamente por la bandera.

### Escudos y marcas de equipos

- Respetar proporciones.
- Evitar recolorear.
- Verificar licencias y derechos de uso antes de incorporar assets oficiales.

### Contenido generado por usuarios

- Recortar avatares de forma consistente.
- Mantener fallback visual cuando no exista imagen.
- Evitar que imágenes externas rompan el layout mediante `object-fit` y tamaños definidos.

---

## 12. Movimiento y transiciones

### Principios

- La animación debe comunicar estado o jerarquía.
- No debe demorar la interacción.
- No debe competir con los datos.

### Transiciones estándar

Para hover, color y opacidad:

```text
150–200ms ease
```

### Entrada destacada

La animación existente `float-up-slow` dura `0.9s`:

```css
@keyframes float-up-slow {
  0% {
    transform: translateY(12px);
    opacity: 0;
  }
  60% {
    transform: translateY(-4px);
    opacity: 1;
  }
  100% {
    transform: translateY(0);
    opacity: 1;
  }
}
```

Debe reservarse para momentos especiales, no para cada card de una página.

### Avatares animados

La animación `avatar-bob` puede utilizarse en experiencias celebratorias o lúdicas, pero no en navegación permanente ni pantallas de alta concentración.

### Accesibilidad de movimiento

Agregar soporte para:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## 13. Responsive

### Mobile first

Toda pantalla nueva debe diseñarse primero para móvil.

### Breakpoints de referencia

Se utilizan los breakpoints estándar de Tailwind:

| Prefijo | Inicio aproximado |
|---|---:|
| `sm` | `640px` |
| `md` | `768px` |
| `lg` | `1024px` |
| `xl` | `1280px` |

### Reglas

- No depender de hover para acciones esenciales.
- Área táctil mínima: `44 × 44px`.
- Evitar tablas horizontales extensas sin estrategia móvil.
- Los títulos grandes deben escalar, no mantener tamaño fijo.
- Cards complejas deben apilarse antes de comprimirse.
- Los controles principales deben permanecer visibles y alcanzables.

---

## 14. Accesibilidad

### Contraste

- Texto principal sobre fondos oscuros: usar `--text-primary`.
- Texto secundario: usar `--text-secondary` sólo para información no crítica.
- No usar gris oscuro sobre `background-light`.
- Verificar contraste WCAG AA en nuevas combinaciones.

### Focus

Todo elemento interactivo debe mostrar focus visible.

Patrón recomendado:

```text
focus:outline-none
focus:ring-2
focus:ring-[var(--accent-red)]
focus:ring-offset-2
focus:ring-offset-[var(--background-medium)]
```

### Color

Nunca comunicar un estado sólo mediante color.

Agregar al menos uno de estos recursos:

- Texto.
- Icono.
- Etiqueta.
- Patrón.
- Posición.

### Lenguaje

- Botones claros y concretos.
- Mensajes de error accionables.
- Evitar tecnicismos innecesarios.
- Mantener consistencia entre `Iniciar sesión`, `Registrarse`, `Predecir`, etc.

---

## 15. Tono visual por contexto

### Competición

- Rojo protagonista.
- Números grandes.
- Posiciones y tiempos visibles.
- Bordes laterales y badges.

### Información

- Celeste y texto secundario.
- Cards más neutras.
- Jerarquía clara y menor intensidad visual.

### Comunidad

- Avatares.
- Nombres de usuario.
- Badges y mensajes cercanos.
- Emojis sólo cuando suman contexto humano.

### Administración

- Priorizar funcionalidad.
- Menos decoración.
- Estados semánticos claros.
- Tablas y formularios consistentes con el resto del sistema.

### Celebración / Wrapped

- Puede aumentar el uso de animación, gradientes y escala tipográfica.
- Debe conservar Poppins, la base oscura y los colores de marca.

---

## 16. Convenciones de implementación

### Usar tokens antes que valores directos

Correcto:

```tsx
className="bg-[var(--background-medium)] text-[var(--text-primary)]"
```

Evitar:

```tsx
className="bg-zinc-900 text-zinc-100"
```

salvo que se trate de un color semántico o una excepción documentada.

### Evitar colores similares no oficiales

Actualmente aparecen algunos valores cercanos pero no idénticos, como:

- `rgba(230, 36, 41, ...)` frente a `#E10600`.
- `bg-red-500`, `bg-red-800` y otros rojos funcionales.
- `bg-gray-700` para botones secundarios.

Estas variantes pueden existir para estados semánticos, pero no deben reemplazar al rojo o a los grises oficiales en elementos de marca.

### Clases reutilizables

Cuando un patrón se repita tres veces o más, convertirlo en:

- Componente compartido.
- Función de variantes.
- Clase CSS semántica.
- Token de diseño.

Ejemplos candidatos:

- `Button`.
- `Card`.
- `Badge`.
- `FormField`.
- `PageContainer`.
- `Modal`.

---

## 17. Tokens ampliados recomendados

Para reducir inconsistencias, se recomienda evolucionar a este sistema:

```css
:root {
  /* Brand */
  --color-brand-primary: #E10600;
  --color-brand-info: #00D2FF;

  /* Surfaces */
  --color-bg-page: #0A0A0A;
  --color-bg-surface: #18181B;
  --color-bg-elevated: #27272A;
  --color-border: #3F3F46;

  /* Text */
  --color-text-primary: #F4F4F5;
  --color-text-secondary: #A1A1AA;

  /* Radius */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 16px;
  --radius-hero: 28px;
  --radius-pill: 9999px;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;

  /* Motion */
  --duration-fast: 150ms;
  --duration-normal: 200ms;
  --duration-celebration: 900ms;
  --ease-standard: ease;
  --ease-out: ease-out;
}
```

Los nombres actuales pueden mantenerse por compatibilidad y mapearse progresivamente a estos tokens.

---

## 18. Checklist para pantallas nuevas

Antes de aprobar una pantalla:

- [ ] Usa Poppins.
- [ ] Usa los tokens oficiales de fondo y texto.
- [ ] Tiene una sola acción primaria dominante por bloque.
- [ ] El rojo se reserva para acción o competencia.
- [ ] El celeste se usa para información o navegación secundaria.
- [ ] Respeta la escala de espaciado de 4px.
- [ ] Mantiene radios coherentes.
- [ ] Funciona correctamente desde `320px` de ancho.
- [ ] Tiene estados hover, focus, disabled, loading y error.
- [ ] No comunica información únicamente con color.
- [ ] Los textos secundarios conservan contraste suficiente.
- [ ] Las animaciones tienen una razón funcional.
- [ ] No introduce un nuevo color, fuente o estilo de icono sin justificarlo.
- [ ] Las imágenes tienen tamaño, recorte y fallback definidos.
- [ ] La interfaz sigue siendo reconocible como BoxBox sin depender del logo.

---

## 19. Resumen ejecutivo

La identidad visual de BoxBox se construye con cinco decisiones centrales:

1. **Base negra y superficies zinc oscuras.**
2. **Rojo competitivo como acción principal.**
3. **Celeste técnico como acento informativo.**
4. **Poppins con títulos fuertes y labels espaciados.**
5. **Cards limpias, bordes discretos y datos fáciles de escanear.**

Cualquier elemento nuevo debe reforzar este sistema y no crear una identidad paralela.
