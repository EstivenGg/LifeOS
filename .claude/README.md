# Rutinas y Ejecucion de Entrenamientos

## Objetivo

La experiencia de entrenamientos debe pasar de ser un registro suelto de ejercicios a un sistema completo de:

- configuracion de rutinas
- ejecucion guiada paso a paso
- registro real de lo realizado
- conservacion del historico sin perder contexto

La idea principal es que una rutina no sea solo una lista de ejercicios. Debe quedar definida como un entrenamiento completo desde el inicio, con suficiente informacion para poder ejecutarse despues de forma clara, rapida y consistente.

## Que se quiere lograr

### 1. Rutinas realmente completas

Cuando el usuario cree una rutina, deberia poder dejar definidos al menos estos aspectos:

- nombre de la rutina
- objetivo o contexto de la rutina
- ejercicios en orden
- cantidad de series esperadas por ejercicio
- reps objetivo o rango esperado por ejercicio
- descanso entre series
- descanso al terminar un ejercicio, si aplica
- duracion estimada o referencia general de la rutina, si aplica
- horario o momento de uso, si aplica
- notas o instrucciones breves por ejercicio

La rutina deberia sentirse preparada para usarse, no solo guardada.

### 2. Ejecucion interactiva del entrenamiento

Desde el diario o desde entrenamientos, el usuario deberia poder iniciar una rutina con un boton claro tipo `Iniciar`.

Al iniciar:

- la app deberia llevar al usuario al primer ejercicio
- mostrar el ejercicio actual con sus series esperadas
- permitir registrar el peso usado y, si el usuario quiere, el peso sugerido para la proxima vez
- permitir completar series una por una
- iniciar automaticamente el descanso configurado cuando una serie se marca como hecha
- permitir avanzar al siguiente set o al siguiente ejercicio sin friccion
- permitir agregar sets extra si en la practica hizo mas de lo planeado
- permitir terminar la rutina dejando guardado lo que realmente se hizo

La experiencia debe sentirse como un runner de entrenamiento, no como un formulario largo.

### 3. Diferencia entre plan y ejecucion real

Debe quedar claro que:

- la rutina es el plan
- la sesion iniciada es la ejecucion
- el historico es el resultado final

Si despues se cambia una rutina, eso no deberia reescribir visualmente entrenamientos ya hechos en el pasado.

### 4. Consistencia de historico

El historico deberia conservar:

- el nombre de la rutina tal como fue usada
- los ejercicios tal como se ejecutaron ese dia
- las series realmente completadas
- pesos usados
- pesos sugeridos para la proxima vez, si fueron definidos
- descansos y estructura relevantes de la rutina que expliquen como se ejecuto

La idea es que el pasado siga siendo legible aunque la rutina cambie despues.

### 5. Flexibilidad durante la ejecucion

Aunque la rutina se configure desde antes, durante la ejecucion el usuario deberia poder:

- agregar sets extra
- modificar el peso real usado
- saltar o no completar un ejercicio
- no definir peso sugerido si no quiere
- ajustar el flujo sin romper el registro

La configuracion debe guiar, no encerrar.

## Flujo ideal del usuario

### Crear rutina

El usuario entra a entrenamientos, crea una rutina y deja configurado:

- el nombre
- los ejercicios
- el orden
- las series
- las reps esperadas
- los descansos
- cualquier nota util

La rutina queda lista para usarse.

### Iniciar rutina

Desde el diario o desde la seccion de workouts:

- el usuario toca `Iniciar rutina`
- la app abre la ejecucion del entrenamiento
- muestra el primer ejercicio
- va guiando el progreso set por set

### Completar rutina

Durante la sesion:

- el usuario registra lo que hizo
- la app dispara descansos automaticamente
- el usuario avanza de forma simple

Al final:

- la sesion queda guardada
- el historico refleja lo realizado
- la proxima vez se puede reutilizar el contexto previo

## Reglas funcionales importantes

- Crear una rutina debe equivaler a dejar un entrenamiento utilizable.
- Iniciar una rutina debe abrir una experiencia enfocada en ejecutar, no en editar.
- El descanso automatico debe respetar lo configurado en la rutina.
- El usuario debe poder registrar mas o menos de lo planeado sin bloquearse.
- El peso sugerido para la proxima vez es opcional.
- El historico no debe cambiar retroactivamente al editar la rutina despues.
- La rutina debe servir como base, pero la sesion real manda sobre lo que finalmente se guarda.

## Archivos y alcance funcional

### `src/features/workouts/WorkoutsPage.tsx`

Debe ser el lugar principal para crear y editar rutinas completas.

Aqui deberia quedar claro:

- que una rutina tiene estructura
- que cada ejercicio dentro de la rutina tiene parametros propios
- que la configuracion de la rutina queda lista para ser ejecutada despues

### `src/features/daylog/DayLog.tsx`

Debe servir como punto rapido de entrada para el entrenamiento del dia.

Aqui deberia poder:

- verse que rutina toca o se quiere hacer
- iniciarse una rutina facilmente
- reflejarse el estado general del entrenamiento del dia

### `src/features/daylog/sections/WorkoutSection.tsx`

Debe mostrar el acceso directo a la experiencia de entrenamiento y el resumen de lo que se esta haciendo o ya se hizo.

No deberia cargar con toda la complejidad de configurar rutinas completas.

### `src/data/types.ts`

Debe reflejar claramente la diferencia entre:

- ejercicio de catalogo
- rutina configurada
- ejercicio dentro de una rutina
- sesion activa o ejecutada
- historico final

El modelo funcional debe permitir entender bien plan vs ejecucion vs historico.

### `src/data/db/index.ts`

Debe acompañar la persistencia de esta experiencia completa.

Lo importante aqui es que la informacion necesaria para crear, ejecutar y conservar rutinas quede persistida de forma coherente y estable en el tiempo.

### `src/features/workouts/WorkoutInsightsView.tsx`

Debe adaptarse a leer entrenamientos que ya no son solo una lista simple, sino sesiones completas ejecutadas a partir de rutinas.

Los insights deberian basarse en lo realmente hecho, no solo en lo planeado.

### `src/features/workouts/ExerciseInsightPanel.tsx`

Debe mostrar progreso por ejercicio con base en la ejecucion real:

- pesos usados
- repeticiones
- volumen
- frecuencia

Sin perder legibilidad aunque una rutina cambie despues.

### `src/features/workouts/WorkoutAutoInsights.tsx`

Debe interpretar el historico de entrenamiento con el nuevo flujo completo de rutina y ejecucion.

### `src/features/dashboard/DashboardModal.tsx`

Debe resumir bien lo que se hizo en una sesion de entrenamiento, manteniendo contexto suficiente para que ese dia sea entendible al revisarlo despues.

### `src/features/export/ExportPage.tsx`

Debe exportar el entrenamiento de manera que se entienda:

- que rutina se ejecuto
- que ejercicios se hicieron
- que series reales se completaron
- que pesos se registraron

### `src/features/insights/InsightsPage.tsx`

Debe seguir pudiendo contar entrenamientos y tendencias con base en sesiones reales y no solo con checks basicos de si hubo o no hubo workout.

## Archivos nuevos esperables dentro del alcance

Es razonable que esta mejora necesite una vista o modulo especifico para ejecutar la rutina paso a paso.

Ese espacio funcional nuevo deberia encargarse de:

- mostrar ejercicio actual
- controlar progreso de sets
- disparar descansos
- permitir avanzar en el flujo del entrenamiento

No hace falta decidir aqui el nombre tecnico exacto, pero funcionalmente deberia existir una pantalla o modulo de ejecucion dedicada.

## Resultado esperado final

Al terminar este rediseño, el usuario deberia sentir que:

- configurar una rutina realmente sirve para entrenar despues
- iniciar una rutina es rapido y guiado
- completar una serie activa el descanso automaticamente
- avanzar por el entrenamiento es natural
- el historico conserva fielmente lo que se hizo
- los cambios futuros en la rutina no destruyen el pasado

## Nota de enfoque

Este documento describe como deberia funcionar la experiencia.

No define como implementarlo tecnicamente.

La prioridad es mantener claridad de producto:

- primero una buena configuracion de rutina
- despues una buena ejecucion interactiva
- finalmente un historico confiable y util

## Fases

### Fase 1. Base de configuracion de rutinas

Objetivo:

- hacer que una rutina deje de ser solo una lista de ejercicios

En esta fase deberia quedar resuelto:

- creacion de rutinas con estructura real
- configuracion de series, reps y descansos por ejercicio
- configuracion general de la rutina
- orden claro de los ejercicios
- notas e instrucciones basicas dentro de la rutina

Resultado esperado:

- el usuario puede dejar una rutina verdaderamente lista para usarse

### Fase 2. Inicio de rutina y sesion activa

Objetivo:

- permitir que una rutina configurada pueda iniciarse como entrenamiento real

En esta fase deberia quedar resuelto:

- boton claro de `Iniciar rutina`
- apertura de una experiencia dedicada de ejecucion
- creacion de una sesion basada en la rutina elegida
- paso del plan a una ejecucion activa y visible

Resultado esperado:

- el usuario puede comenzar una rutina sin tener que reconstruirla manualmente cada vez

### Fase 3. Runner interactivo de entrenamiento

Objetivo:

- guiar al usuario ejercicio por ejercicio y serie por serie

En esta fase deberia quedar resuelto:

- visualizacion del ejercicio actual
- avance natural entre sets y ejercicios
- registro del peso usado
- registro opcional del peso sugerido para la proxima vez
- posibilidad de agregar sets extra
- posibilidad de completar lo planeado o desviarse si la practica lo requiere

Resultado esperado:

- entrenar dentro de la app se siente fluido, rapido y util

### Fase 4. Descansos y automatismos de ejecucion

Objetivo:

- hacer que la ejecucion tenga sentido practico en tiempo real

En esta fase deberia quedar resuelto:

- disparo automatico del descanso al completar una serie
- respeto de los descansos configurados en la rutina
- avance claro al terminar cada descanso
- continuidad natural durante toda la sesion

Resultado esperado:

- la app acompaña el entrenamiento y no solo lo registra

### Fase 5. Historico confiable

Objetivo:

- asegurar que lo ejecutado quede bien guardado y siga siendo entendible en el futuro

En esta fase deberia quedar resuelto:

- conservacion del nombre de la rutina usada
- conservacion de los ejercicios tal como se hicieron
- guardado de las series reales completadas
- guardado de pesos usados y sugeridos
- independencia entre el historico y cambios posteriores en la rutina

Resultado esperado:

- revisar un entrenamiento pasado sigue teniendo sentido aunque la rutina haya sido editada despues

### Fase 6. Insights, dashboard y exportacion

Objetivo:

- hacer que el resto del producto lea correctamente el nuevo flujo de entrenamiento

En esta fase deberia quedar resuelto:

- insights basados en ejecucion real
- resumen claro en dashboard
- exportacion util del entrenamiento
- continuidad de metricas y analiticas sin perder contexto

Resultado esperado:

- todo el ecosistema de analisis refleja lo que realmente se entreno

### Fase 7. Ajustes de calidad y refinamiento

Objetivo:

- pulir la experiencia una vez el flujo principal ya exista

En esta fase deberia revisarse:

- claridad de la interfaz durante la ejecucion
- velocidad para registrar sets
- facilidad para corregir errores
- legibilidad del historico
- coherencia entre daily log, workouts e insights

Resultado esperado:

- una experiencia de entrenamiento solida, clara y agradable de usar

## Implementacion

### Fase 1 ✅ COMPLETADA

#### Tipos ampliados (`src/data/types.ts`)
- **Routine**: agregados `objective`, `estimatedDuration`, `timeOfDay`, `notes`
- **RoutineExercise**: agregados `setsPlanned`, `repsTarget`, `restBetweenSets`, `restAfterExercise`, `notes`

#### Base de datos (`src/data/db/index.ts`)
- Nueva versión 9 con índices actualizados
- Backward compatible con datos existentes
- Seed actualizado con valores por defecto (3 series, 8-12 reps, 90s descanso)

#### Componentes nuevos (`src/features/workouts/components/`)
1. **RoutineEditor.tsx** — Formulario completo de rutina
   - Secciones collapsibles: general + ejercicios
   - Campos: nombre, objetivo, duración, hora, notas
   - Drag-and-drop con dnd-kit para reordenar ejercicios
   - Botón para agregar ejercicios

2. **RoutineExerciseCard.tsx** — Card de ejercicio en la lista
   - Muestra: nombre, series, reps, descansos, notas
   - Handles para drag, editar, eliminar
   - Formato de descansos legible (90s, 1:30, etc)

3. **RoutineExerciseModal.tsx** — Modal para editar ejercicio
   - Campos editables: series, reps, descansos, notas
   - Validación básica

4. **ExerciseCatalogPicker.tsx** — Selector de ejercicios
   - Búsqueda por nombre/grupo muscular
   - Opción de crear ejercicio personalizado
   - Integrado en RoutineEditor

#### Integración (`src/features/workouts/WorkoutsPage.tsx`)
- Reemplazado modal simple con RoutineEditor completo
- Función `saveRoutine()` ampliada para guardar estructura completa
- Nueva función `updateRoutineExercise()` para editar ejercicios
- Nueva función `addExerciseToRoutine()` para agregar ejercicios desde editor
- Botón "Nueva rutina" ahora abre editor con formulario vacío

#### UX resultante
1. Usuario toca "Nueva rutina" → abre RoutineEditor vacío
2. Completa: nombre, objetivo, duración, hora (opcional)
3. Agrega ejercicios buscando en catálogo o creando personalizado
4. Para cada ejercicio configura: series, reps, descansos (entre y post), notas
5. Puede reordenar ejercicios con drag
6. Guarda → rutina lista para usar en Fase 2

#### Estado final
✅ Rutinas configurables con estructura real
✅ Ejercicios con parámetros de sets, reps, descansos
✅ Interfaz mobile-first sin performance issues
✅ Drag-and-drop para orden de ejercicios
✅ Build pasa sin errores
