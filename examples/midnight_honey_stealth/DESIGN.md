---
name: Midnight Honey Stealth
colors:
  surface: '#0f141b'
  surface-dim: '#0f141b'
  surface-bright: '#343941'
  surface-container-lowest: '#090f15'
  surface-container-low: '#171c23'
  surface-container: '#1b2027'
  surface-container-high: '#252a32'
  surface-container-highest: '#30353d'
  on-surface: '#dee2ec'
  on-surface-variant: '#d6c4ac'
  inverse-surface: '#dee2ec'
  inverse-on-surface: '#2c3138'
  outline: '#9f8e78'
  outline-variant: '#514533'
  surface-tint: '#ffba3f'
  primary: '#ffd698'
  on-primary: '#432c00'
  primary-container: '#ffb100'
  on-primary-container: '#6a4700'
  inverse-primary: '#7f5600'
  secondary: '#e9c349'
  on-secondary: '#3c2f00'
  secondary-container: '#af8d11'
  on-secondary-container: '#342800'
  tertiary: '#dadce5'
  on-tertiary: '#2e3037'
  tertiary-container: '#bec0c9'
  on-tertiary-container: '#4c4e56'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdeae'
  primary-fixed-dim: '#ffba3f'
  on-primary-fixed: '#281800'
  on-primary-fixed-variant: '#604100'
  secondary-fixed: '#ffe088'
  secondary-fixed-dim: '#e9c349'
  on-secondary-fixed: '#241a00'
  on-secondary-fixed-variant: '#574500'
  tertiary-fixed: '#e1e2eb'
  tertiary-fixed-dim: '#c4c6cf'
  on-tertiary-fixed: '#191c22'
  on-tertiary-fixed-variant: '#44474e'
  background: '#0f141b'
  on-background: '#dee2ec'
  surface-variant: '#30353d'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
  body-base:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.05em
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.1em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-padding: 32px
  gutter: 24px
  component-gap: 16px
  stack-sm: 4px
  stack-md: 12px
  stack-lg: 24px
---

## Brand & Style

This design system is built for an elite social media management experience, emphasizing high-performance data processing and exclusive access. The aesthetic direction blends **Modern Stealth Tech** with **Glassmorphism**, creating a high-contrast environment where critical information glows against a dark, void-like backdrop. 

The visual narrative is driven by the "Hive" concept—efficient, structured, and industrious. To reinforce this, the system utilizes subtle hexagonal background textures and micro-patterns that appear only under specific lighting conditions (hover states or active gradients). The interface feels like a sophisticated command center: silent, powerful, and impeccably organized. Depth is achieved through layered translucency rather than traditional lighting, ensuring the UI feels lightweight despite its professional gravity.

## Colors

The palette is anchored by **Deep Obsidian**, providing a near-black foundation that eliminates visual noise and reduces eye strain during long-form data analysis. 

- **Primary (Warm Amber):** Used for high-priority actions, primary buttons, and critical data points. It represents the "energy" of the hive.
- **Secondary (Honey Gold):** Reserved for rewards, premium status indicators, and subtle decorative accents. It provides a more muted, sophisticated metallic contrast to the vibrant amber.
- **Surface Strategy:** We utilize a tiered dark scale. The base is `#0B0E14`, while elevated cards and navigation elements sit on `#161B22` to create a discernible hierarchy without breaking the stealth aesthetic.
- **Functional Colors:** Success and error states are saturated to ensure visibility against the dark base, but they are used sparingly to maintain the "Honey" focus.

## Typography

The typography system strikes a balance between human-centric readability and technical precision. 

**Inter** serves as the primary typeface for all UI labels, body copy, and headlines. It is chosen for its exceptional legibility at small sizes and its neutral, modern tone. Headlines should utilize tighter letter-spacing and heavier weights to feel impactful.

**JetBrains Mono** is the specialized data typeface. It is used exclusively for metrics, timestamps, API keys, and performance logs. By switching to a monospaced font for numbers, we provide the user with a sense of "tech-first" accuracy. Small labels in all-caps JetBrains Mono are used to denote categories and metadata, reinforcing the stealth-tech aesthetic.

## Layout & Spacing

This design system employs a **12-column fluid grid** for main dashboard views, allowing data visualizations to expand and contract based on screen real estate. 

The rhythm is governed by an **8px base unit**. All padding, margins, and component heights must be multiples of 8. For high-density data tables, a compact 4px scale may be used internally. 

Layouts should favor ample whitespace (internal padding) within containers to prevent the dark UI from feeling claustrophobic. Deep Obsidian "voids" between cards act as natural dividers, reducing the need for heavy border lines.

## Elevation & Depth

Hierarchy is established through **translucency and backdrop filters** rather than traditional drop shadows.

1.  **Level 0 (Base):** Deep Obsidian (#0B0E14).
2.  **Level 1 (Cards/Containers):** Secondary Surface (#161B22) with a 1px subtle border (#262C35).
3.  **Level 2 (Modals/Overlays):** Glassmorphic surfaces using a 60% opacity fill of the surface color and a 20px Backdrop Blur.
4.  **The "Honey Glow":** High-priority elements use an outer neon-style glow (0px 0px 15px) using a low-opacity version of Warm Amber (#FFB100). 

Shadows, when used, are never black; they are tinted with the primary color at extremely low opacities (e.g., `rgba(255, 177, 0, 0.05)`) to simulate light reflecting off honey-colored accents.

## Shapes

The design system uses a consistent **8px (0.5rem)** corner radius for all standard UI components, including buttons, input fields, and cards. This "Soft-Rounded" approach balances the aggressive nature of the stealth color palette with a sense of modern approachability.

Larger containers like modals or hero sections may scale up to **16px (1rem)** to emphasize their containment. Hexagonal shapes should be reserved strictly for decorative patterns, iconography containers, or profile avatars to reinforce the "Hive" branding without compromising the usability of standard rectangular UI layouts.

## Components

- **Buttons:** Primary buttons are solid Warm Amber with JetBrains Mono bold text. Secondary buttons use a "Ghost" style with a 1px Gold border and a subtle glass fill.
- **Inputs:** Fields are dark with a 1px Deep Grey border. Upon focus, the border glows Warm Amber and a subtle hexagonal pattern becomes visible in the background fill.
- **Chips/Badges:** Small, pill-shaped elements with low-opacity background tints (e.g., Amber text on a 10% Amber background).
- **Cards:** No heavy shadows. Use a 1px border (#262C35) and a slight gradient from Top-Left to Bottom-Right to simulate a brushed metal or carbon fiber texture.
- **Glass Overlays:** Used for sidebars and top navigation. They must feature a `backdrop-filter: blur(12px)` to maintain legibility over moving data feeds.
- **Hive Indicators:** A custom component for "Boost Hive"—a small hexagonal progress ring used to show account growth or task completion percentages.