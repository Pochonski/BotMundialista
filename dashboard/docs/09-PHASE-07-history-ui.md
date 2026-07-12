# Fase 7 — Frontend: componentes de interfaz de historia

## Objetivo

Implementar los componentes React que consumen los nuevos hooks y endpoints para enriquecer la sección Historia. Esto incluye la mejora del `HistoryTab` existente y la creación de una página de detalle por edición.

## Entregables

### 7.1 HistoryTab mejorado

**Archivo:** `src/presentation/components/competition/HistoryTab.tsx`

#### Mejoras en la tarjeta contraída (botón)

Estado actual:
```
2022  [ARG badge] Argentina vs [FRA badge] Francia   Lusail Stadium
```

Estado deseado:
```
2022  [ARG badge] Argentina 3-3(4) [FRA badge] Francia   Lusail Stadium
```

- [ ] Agregar marcador (`homeScore - awayScore`) entre los badges
- [ ] Si hubo penales, mostrar `3-3(4)` entre paréntesis
- [ ] Si el año tiene `secondaryTitle`, mostrar tooltip o texto secundario
- [ ] Detectar y mostrar si fue por penales con icono ⚽

#### Mejoras en el expandido

Estado actual:
```
Sede
Lusail Stadium

[lista de participantes con badges y etiqueta Campeón/Subcampeón]
```

Estado deseado:
```
Sede
Lusail Stadium — 18 diciembre 2022

Marcador Final
Argentina 3 — 3 Francia (4-2 penales)
🕒 Prórroga: Sí

📊 Ver estadísticas del partido   👥 Ver alineaciones
```

- [ ] Mostrar fecha del partido
- [ ] Mostrar marcador completo con penales
- [ ] Indicar si hubo prórroga
- [ ] Botón "Ver estadísticas del partido" — abre modal o navega a detalle
- [ ] Botón "Ver alineaciones" — abre modal o navega a detalle
- [ ] Los botones solo aparecen si hay `matchId` disponible

#### Skeletons

- [ ] Skeletons actualizados para reflejar el nuevo layout
- [ ] Skeleton de marcador: rectángulos simulando scores

### 7.2 Componente HistoryStatsBanner

**Archivo:** `src/presentation/components/competition/HistoryStatsBanner.tsx`

Barra de estadísticas agregadas arriba del grid de historia:

```
🏆 22 ediciones   |   🇧🇷 Brasil: 5 títulos   |   🇩🇪 Alemania: 8 finales   |   🇮🇹 Italia: 2 consecutivos
```

- [ ] Usa `useHistoryStats()`
- [ ] Diseño: barras horizontales con iconos
- [ ] Responsive: en mobile colapsa a 2 columnas
- [ ] Modo skeleton mientras carga
- [ ] Si no hay datos, no se renderiza

### 7.3 Página de detalle de edición

**Archivo:** `src/presentation/pages/HistoryEditionPage.tsx`

Ruta propuesta: `/historial/:seasonNum`

#### Secciones de la página:

**Header hero:**
```
🏆 2022 — Argentina vs Francia
🇶🇦 Lusail Stadium · 18 diciembre 2022
```

**Match stats card:**
```
Estadísticas del Partido
┌─────────────────────┬──────┬──────┐
│                     │ ARG  │ FRA  │
├─────────────────────┼──────┼──────┤
│ Posesión            │ 45%  │ 55%  │
│ Tiros               │ 12   │ 15   │
│ Tiros a puerta      │ 4    │ 6    │
│ Córners             │ 3    │ 6    │
│ Faltas              │ 16   │ 19   │
│ Tarjetas amarillas  │ 5    │ 4    │
│ Tarjetas rojas      │ 0    │ 0    │
└─────────────────────┴──────┴──────┘
```
- [ ] Componente `HistoricalMatchStatsCard` reutilizable
- [ ] Usa `useHistoryDetail(seasonNum)`
- [ ] Renderiza tabla de stats 2 columnas
- [ ] Si no hay stats disponibles, muestra mensaje "Estadísticas no disponibles"

**Lineups card (si hay datos):**
```
Alineaciones
─────────────
Argentina (4-3-3)         Francia (4-3-1-2)
─────────────              ─────────────
E. Martínez               H. Lloris
N. Molina                 R. Varane
C. Romero                 D. Upamecano
N. Otamendi               L. Hernández
...
Entrenador: L. Scaloni    Entrenador: D. Deschamps
```
- [ ] Componente `HistoricalMatchLineupsCard`
- [ ] Formación, titulares, banco, entrenador
- [ ] Layout side-by-side en desktop, stacked en mobile

**Navigation:**
```
← 2018 (Francia 4-2 Croacia)    |    2026 → (próximo)
```
- [ ] Navegación entre ediciones (anterior/siguiente `seasonNum`)
- [ ] Al final de la lista, deshabilitar botones

#### Loading state:
- [ ] Skeleton full page: header placeholder, stats table skeleton, lineups skeleton

#### Error state:
- [ ] "Edición no encontrada" con link de regreso a `/competicion`

### 7.4 Modal de stats rápidas (alternativa a página completa)

**Archivo:** `src/presentation/components/competition/HistoricalMatchStatsModal.tsx`

- [ ] Modal overlay que muestra match stats + lineups
- [ ] Se abre desde los botones en `HistoryTab` expandido
- [ ] Cierra con click fuera, ESC, o botón X
- [ ] Mismo contenido que la página de detalle pero en modal

### 7.5 Ruteo

**Archivo:** `src/App.tsx`

Agregar ruta:

```tsx
<Route path="/historial/:seasonNum" element={<HistoryEditionPage />} />
```

Y desde `HistoryTab`, cada tarjeta expandida puede navegar a `/historial/:seasonNum`:

```tsx
// En AccordionCard, dentro del expandido:
<Link to={`/historial/${edition.seasonNum}`}
      className="text-accent-blue text-xs hover:underline">
  Ver detalle completo →
</Link>
```

## Tareas detalladas

```
7.1 Mejorar HistoryTab
    → Agregar scores y penales en la vista contraída
    → Agregar fecha, marcador completo, indicador de prórroga en expandido
    → Agregar botones "Ver estadísticas" y "Ver alineaciones"
    → Actualizar skeletons

7.2 HistoryStatsBanner
    → Crear componente con useHistoryStats()
    → Diseño responsive con iconos de banderas
    → Skeletons

7.3 HistoryEditionPage
    → Crear página con ruta /historial/:seasonNum
    → Header hero con info de la edición
    → HistoricalMatchStatsCard
    → HistoricalMatchLineupsCard
    → Navegación entre ediciones
    → Skeleton full page
    → Error state

7.4 HistoricalMatchStatsModal
    → Crear componente modal
    → Abrir desde HistoryTab
    → Cerrar con ESC/click fuera

7.5 Ruteo
    → Agregar ruta en App.tsx
    → Navegación desde HistoryTab
```

## Criterios de aceptación

- [ ] `HistoryTab` muestra scores y penales en cada tarjeta
- [ ] `HistoryStatsBanner` se renderiza arriba del grid con estadísticas reales
- [ ] `/historial/22` carga la página de detalle con stats y lineups
- [ ] La navegación entre ediciones funciona (anterior/siguiente)
- [ ] Los botones "Ver estadísticas" abren modal o redirigen correctamente
- [ ] Skeletons visibles durante carga en todos los componentes nuevos
- [ ] Mensaje de error si la edición no existe
- [ ] Responsive: se ve bien en mobile y desktop
- [ ] No hay regresiones en el `HistoryTab` existente
- [ ] Los links funcionan con React Router sin recargar la página
