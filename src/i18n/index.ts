export type Locale = 'es' | 'en'

export const translations = {
  es: {
    // Stats
    statDistance: 'Distancia',
    statElevGain: 'D+',
    statPoints: 'Puntos',
    // Acciones drawer
    undo: 'Deshacer',
    redo: 'Rehacer',
    closePanel: 'Cerrar panel',
    openPanel: 'Abrir panel',
    clear: 'Limpiar',
    // Exportar
    exportGpx: 'Exportar GPX',
    exported: 'Exportado',
    exportMin2: 'Añade al menos 2 puntos para exportar la ruta.',
    // Capas
    layerTitle: 'Capa',
    closeLayers: 'Cerrar capas',
    layersButton: 'Capas',
    layerOsm: 'Mapa',
    layerTopo: 'Topo',
    layerSatellite: 'Satélite',
    layerCycle: 'Ciclismo',
    layerEsritopo: 'Relieve',
    // Gráfico elevación
    elevationEmpty: 'Añade puntos al mapa para ver el perfil de elevación',
    // Mapa
    routingLoading: 'Trazando ruta…',
    closeMenu: 'Cerrar menú',
    deletePoint: 'Eliminar punto',
    // Zoom
    zoomIn: 'Acercar',
    zoomOut: 'Alejar',
    // Errores
    errorRoute: 'Error al trazar la ruta',
    errorRecalc: 'Error al recalcular la ruta',
    noRouteFound: 'No se encontró ruta entre los puntos seleccionados.',
    noCoordinates: 'El servidor no devolvió coordenadas. Comprueba la configuración.',
    // Idioma
    switchLang: 'EN',
  },
  en: {
    // Stats
    statDistance: 'Distance',
    statElevGain: 'D+',
    statPoints: 'Points',
    // Drawer actions
    undo: 'Undo',
    redo: 'Redo',
    closePanel: 'Close panel',
    openPanel: 'Open panel',
    clear: 'Clear',
    // Export
    exportGpx: 'Export GPX',
    exported: 'Exported',
    exportMin2: 'Add at least 2 points to export the route.',
    // Layers
    layerTitle: 'Layer',
    closeLayers: 'Close layers',
    layersButton: 'Layers',
    layerOsm: 'Map',
    layerTopo: 'Topo',
    layerSatellite: 'Satellite',
    layerCycle: 'Cycling',
    layerEsritopo: 'Relief',
    // Elevation chart
    elevationEmpty: 'Add points to the map to see the elevation profile',
    // Map
    routingLoading: 'Tracing route…',
    closeMenu: 'Close menu',
    deletePoint: 'Delete point',
    // Zoom
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    // Errors
    errorRoute: 'Error tracing the route',
    errorRecalc: 'Error recalculating the route',
    noRouteFound: 'No route found between the selected points.',
    noCoordinates: 'The server returned no coordinates. Check your configuration.',
    // Language
    switchLang: 'ES',
  },
} as const

export type TranslationKeys = typeof translations.es
