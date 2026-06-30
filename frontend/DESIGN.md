# Brand & Design System: Insurance AI B2B Gateway (German Industrial)

## Core Philosophy
- **Anti-Black-Box**: Expose AI operations with micro-animations and highlights.
- **Zero-Lag Form**: Strict uncontrolled components, 0 latency for high-density inputs.
- **German Industrial Aesthetics**: 
  - Pure white canvas (`#ffffff`) as the base.
  - Razor-thin 1px hairlines (`#e6e6e6` or `border-slate-200`) for slicing dense data tables and grids.
  - Dark thematic isolation (`#1a2129` or `#0f172a`) reserved strictly for "Security/Terminal" zones or "AI Copilot" panels on the side. 
  - Rigid `rounded-none` borders (0px corner radius) on all UI elements (buttons, inputs, cards).
  - Dense 8px incremental spacing system.
  - High-contrast text colors (`#0f172a` for primary, `#475569` for secondary).
  - Avoid generic red/blue. Use curated colors: Error/Fraud (`#dc2626`), Success/Verified (`#16a34a`), Action (`#1c69d4`).

## Components
### Visual Harmony & Anti-Fatigue Restraints
1. **Canvas Leveling**: Use `bg-[#f8fafc]` (Matte Slate-White) for the absolute outer page wrapper. Never use toxic `#ffffff` for full-screen saturation.
2. **High-Density Table Contrast**: Table body row hover states MUST use a soft gray fade `hover:bg-[#f1f5f9]`. Do not use flashing or hard borders on hover.
3. **Micro-Warning Badges**: Status dots for Error/Fraud (`#dc2626`) and Success (`#16a34a`) should be embedded within a low-opacity wrapper (e.g., `bg-red-50 text-red-600 border border-red-100` for micro-badges) rather than raw saturated text strings.
4. **0px Active States**: All input boxes (`rounded-none border-[#e6e6e6]`) MUST implement smooth outline transitions via `transition-all duration-150 ease-in-out focus:border-[#1c69d4] focus:outline-none`.

### Layout & Spacings
- **Primary**: Sharp, no rounded corners (`rounded-none`), background `#1c69d4`, white text, crisp hover states (`#0653b6`).
- **Secondary**: Transparent background, 1px border `#e6e6e6`, text `#0f172a`.

### Inputs
- **Forms**: Pure non-controlled inputs. `h-12` for primary fields, `h-8` for dense table inputs. No rounded corners (`rounded-none`). 1px solid border (`border-[#e6e6e6]`). Focus state: `focus:border-[#1c69d4] focus:outline-none`.

### Tables (Inbox/Triage)
- **Structure**: Extreme high-density. Minimal padding (`py-2 px-3`). 
- **Dividers**: 1px `#e6e6e6` borders between rows. 
- **Typography**: Headers are uppercase, small font size (`text-[11px]`), high letter-spacing (`tracking-wider`), color `#64748b`.
- **Status Indicators**: Use tiny status dots or minimalist badges. Red for anomalies/fraud, Green for cleared, Blue for AI-processing.

### Typography
- **Headings**: Heavy weights (`font-bold`), tight tracking (`tracking-tight`), absolute black/dark slate (`#0f172a`).
- **Body**: Light/Regular weights, crisp sizing (`text-[13px]` or `text-[14px]`).
