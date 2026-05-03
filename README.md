# LifeOS

LifeOS es una aplicacion de autogestion personal para Android y web, enfocada en registrar, organizar y visualizar la rutina diaria desde un solo lugar. El proyecto permite hacer seguimiento de habitos, tareas, estado de animo, sueno, agua, lectura, estudio, pomodoro, actividad fisica, peso, tiempo en pantalla, contenido multimedia, calendario, insights y exportacion de datos.

El MVP esta construido con un enfoque **local-first**: la informacion del usuario se guarda en el dispositivo mediante IndexedDB y no requiere un backend remoto para funcionar.

## Objetivo del proyecto

El objetivo de LifeOS es transformar registros diarios dispersos en una vista clara del progreso personal. La aplicacion busca que el usuario pueda observar su rutina, reconocer patrones, mejorar su constancia y tomar decisiones mas conscientes sobre sus habitos, bienestar y productividad.

## Stack tecnologico

- **React 18:** construccion de interfaces por componentes.
- **TypeScript:** tipado estatico y mayor mantenibilidad.
- **Vite:** entorno de desarrollo y build rapido.
- **Tailwind CSS:** sistema de estilos responsive.
- **React Router:** navegacion entre modulos.
- **Dexie + IndexedDB:** persistencia local de datos.
- **Zustand:** manejo ligero de estado y preferencias.
- **Capacitor:** empaquetado de la app para Android.
- **Recharts:** graficas e indicadores visuales.
- **FullCalendar:** calendario mensual interactivo.
- **Framer Motion:** animaciones de interfaz.
- **PapaParse + SheetJS:** exportacion CSV y XLSX.
- **Lucide React:** iconografia.

## Funcionalidades principales

- **Dashboard:** resumen del dia, metricas principales, progreso y accesos rapidos.
- **Day Log:** registro diario de estado de animo, habitos, sueno, agua, lectura, estudio, peso, pantalla, meditacion y entrenamientos.
- **Calendario:** vista mensual para consultar registros por fecha.
- **Habitos:** gestion de habitos por categorias, estado activo y orden.
- **Tareas:** listas, subtareas, fechas, recurrencias, estados y seguimiento de pendientes.
- **Libros:** registro de libros, autores, progreso de lectura, valoraciones y estadisticas.
- **Media:** seguimiento de peliculas, series u otros contenidos con estado, rating y tags.
- **Entrenamientos:** rutinas, ejercicios, series, repeticiones, peso, RPE e insights.
- **Sueno:** analisis de horas dormidas, calidad y tendencias.
- **Estudio:** registro de sesiones, plataformas, cursos y minutos estudiados.
- **Pomodoro:** sesiones de enfoque asociadas al dia.
- **Peso:** seguimiento de peso corporal y evolucion.
- **Tiempo en pantalla:** registro o importacion de uso de aplicaciones cuando el dispositivo lo permite.
- **Insights:** visualizaciones y analisis para identificar patrones personales.
- **Exportacion:** generacion de archivos CSV y XLSX por rango de fechas.

## Arquitectura

LifeOS usa una arquitectura local-first organizada por capas:

- **Capa de presentacion:** pantallas, componentes UI, formularios, tarjetas, graficas y navegacion.
- **Capa de logica de aplicacion:** reglas de negocio, calculos, metricas, validaciones, preferencias y coordinacion entre modulos.
- **Capa de datos:** persistencia local con Dexie sobre IndexedDB.
- **Capa de integracion Android:** ejecucion movil mediante Capacitor y acceso a capacidades del dispositivo cuando aplica.

En esta fase no se implementa API REST ni servidor con Express, porque el MVP puede funcionar completamente desde el cliente. En futuras versiones se podria agregar backend para autenticacion, sincronizacion en la nube o uso multi-dispositivo.

## Modelo de datos principal

La base de datos local se llama `LifeOSv4` y se administra con Dexie. Algunas tablas principales son:

- `habitCategories`: categorias de habitos.
- `habits`: habitos configurados por el usuario.
- `dailyEntries`: registro principal por fecha.
- `entryHabits`: cumplimiento diario de habitos.
- `entryReadings`: avances de lectura por dia.
- `entryWorkouts`: entrenamientos registrados.
- `entryStudy`: sesiones de estudio.
- `entryAppUsage`: uso de aplicaciones.
- `pomodoroSessions`: sesiones pomodoro.
- `books` y `authors`: biblioteca personal.
- `routines`, `routineExercises` y `exerciseCatalog`: rutinas y ejercicios.
- `taskLists`, `tasks` y `listTemplates`: gestion de tareas y listas.
- `mediaItems`: contenido multimedia visto, pendiente o en progreso.

## Estructura del proyecto

```text
lifeos/
+-- android/                 # Proyecto Android generado por Capacitor
+-- dist/                    # Build de produccion
+-- docs/                    # Documentacion academica y tecnica
+-- public/                  # Assets publicos
+-- src/
|   +-- components/          # Componentes reutilizables de interfaz
|   +-- context/             # Contextos globales
|   +-- data/                # Tipos, base de datos Dexie y seed inicial
|   +-- features/            # Modulos funcionales de la aplicacion
|   +-- hooks/               # Hooks reutilizables
|   +-- services/            # Servicios e integraciones
|   +-- utils/               # Utilidades generales
|   +-- App.tsx              # Rutas principales
|   +-- main.tsx             # Punto de entrada
+-- capacitor.config.ts      # Configuracion de Capacitor
+-- package.json             # Dependencias y scripts
+-- tailwind.config.js       # Configuracion visual
+-- tsconfig.json            # Configuracion TypeScript
+-- vite.config.ts           # Configuracion Vite
```

## Requisitos previos

- Node.js instalado.
- npm instalado.
- Android Studio instalado si se desea ejecutar la app en Android.
- Git para control de versiones.

## Instalacion

```bash
npm install
```

## Ejecucion en desarrollo

```bash
npm run dev
```

Luego abrir:

```text
http://localhost:5173
```

## Build de produccion

```bash
npm run build
```

Para previsualizar el build:

```bash
npm run preview
```

## Ejecucion en Android

Generar build y sincronizar con Android:

```bash
npm run android:dev
```

Abrir el proyecto Android:

```bash
npm run android:open
```

Tambien se pueden ejecutar los pasos por separado:

```bash
npm run build
npm run cap:sync
```

## Scripts disponibles

```bash
npm run dev          # Ejecuta Vite en modo desarrollo
npm run build        # Compila TypeScript y genera dist
npm run preview      # Sirve el build localmente
npm run cap:copy     # Copia el build web al proyecto Capacitor
npm run cap:sync     # Sincroniza Capacitor
npm run android:open # Abre Android Studio
npm run android:dev  # Build + sync Android
```

## Datos iniciales

En el primer arranque, LifeOS crea datos base para probar el prototipo:

- Categorias y habitos iniciales.
- Libros de ejemplo.
- Catalogo de ejercicios.
- Rutinas de entrenamiento.
- Apps y plataformas de estudio.
- Contenido multimedia de muestra.
- Registros diarios historicos para graficas e insights.
- Tareas, listas y subtareas de ejemplo.

Este seed facilita demostrar el dashboard, calendario, exportacion y analisis sin tener que ingresar informacion manualmente desde cero.

## Exportacion de datos

El modulo de exportacion permite generar archivos:

- CSV para analisis simple o carga en herramientas externas.
- XLSX para Excel o Power BI.

La exportacion se realiza por rango de fechas y usa los datos almacenados localmente en IndexedDB.

## Documentacion del proyecto

La carpeta `docs/` contiene documentacion asociada a la entrega academica del proyecto, incluyendo el documento base de actividad y los recursos tecnicos que se agreguen durante el desarrollo.

Elementos recomendados para la segunda entrega:

- Historias de usuario priorizadas.
- Diagramas C4 nivel 1 y nivel 2.
- ADR con decisiones tecnicas.
- Evidencia de prototipo funcional.
- Resultados de pruebas de usabilidad.
- Retrospectiva del sprint.

## Flujo sugerido con Git

Crear una rama de desarrollo:

```bash
git checkout -b dev
git push -u origin dev
```

Crear ramas por funcionalidad:

```bash
git checkout -b feature/nombre-funcionalidad
```

Ejemplo de commit:

```bash
git add .
git commit -m "feat: agregar seguimiento de habitos"
```

## Calidad y mantenibilidad

El proyecto esta organizado por modulos para facilitar crecimiento y mantenimiento. Se recomienda mantener:

- Componentes reutilizables en `src/components`.
- Funcionalidades completas dentro de `src/features`.
- Tipos compartidos en `src/data/types.ts`.
- Acceso a datos centralizado en `src/data/db`.
- Utilidades generales en `src/utils`.
- Nombres claros para ramas y commits.

Para una fase posterior, se recomienda formalizar scripts de calidad con ESLint y Prettier si se desea automatizar revision de estilo y formato.

## Alcance actual del MVP

El prototipo actual demuestra una aplicacion funcional con interfaz principal, persistencia local, multiples modulos de seguimiento y exportacion. No incluye backend remoto, autenticacion en servidor ni sincronizacion entre dispositivos.

## Posibles mejoras futuras

- Autenticacion de usuarios.
- Sincronizacion en la nube.
- Backend con Node.js y Express.
- API REST para respaldo y consulta externa.
- Notificaciones y recordatorios.
- Backup automatico de datos.
- Integracion avanzada con servicios Android.
- Pruebas automatizadas.

## Resumen

LifeOS es una base funcional para una aplicacion de organizacion personal y seguimiento de vida diaria. Su valor principal esta en centralizar datos personales, convertirlos en visualizaciones utiles y permitir que el usuario observe su progreso de forma clara, privada y continua.
