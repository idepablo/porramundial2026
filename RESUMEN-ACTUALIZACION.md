# Resumen de la actualización — Porra Mundial 2026

Fecha: 10–11 de junio de 2026 (lanzamiento del torneo)

---

## ✅ HECHO Y EN FUNCIONAMIENTO

### Base de datos (Supabase) — ejecutado y confirmado
- **`setup-supabase.sql`** y **`scoring-engine.sql`** ejecutados (tablas + motor de puntos `recalculate_all_scores`).
- **`backups-and-rollback.sql`** ejecutado con `pg_cron` activado:
  - Copias de seguridad automáticas a las **07:00 y 19:00 UTC**.
  - Limpieza diaria (conserva las últimas 14 + las manuales / previas a restauración).
  - Restauración por etiqueta: `select backups.restore_snapshot('etiqueta', true);`
  - Snapshot inicial `baseline_launch` creado.
- **`fix-spanish-data.sql`** ejecutado:
  - Nombres de las 48 selecciones traducidos al español (España, Alemania, Estados Unidos, Bosnia y Herzegovina, Curazao, Haití, etc.).
  - País de los usuarios corregido: `United States → Estados Unidos`, `Spain → España`, y limpieza de espacios.
- **Modo mantenimiento** confirmado desactivado en la base de datos.

### Funcionalidades nuevas (código ya subido a GitHub)
1. **Logo → Iniciar sesión**: el logo de la portada enlaza al login.
2. **Selector de zona horaria** en el aviso/banner del admin (Costa Este EST o Costa Oeste/Seattle PST); siempre se guarda en hora del Este.
3. **Desglose de puntos clicable** en Clasificación: al pulsar los puntos se abre el detalle por fase.
4. **Pestaña Comunicación** en el admin: panel de destinatarios (copiar correos para CCO por estado de pago) + redactor de email con 4 plantillas, contador de caracteres y "abrir en cliente de correo".
5. **Partidos anteriores** en "Partidos y Puntos": revisar o corregir resultados de días pasados, con filtro "Solo sin resultado".
6. **Cuadro de Honor — bloqueo de edición**: "Editar ⇄ Bloquear" para Campeón y Subcampeón.
7. **Copias de seguridad + restauración** (el SQL de arriba).

### Arreglos rápidos (código en el último .zip)
- Quitado el texto "Activa el Bonus ×2 o ×3…" en Partidos y Puntos.
- "3º (repesca)" → "**3º (clasifica)**" (eliminado "repesca").
- El widget **FAQ/Contacto ya no aparece** encima del avatar en el panel de admin.
- **Bota y Balón de Oro**: ahora tienen "Editar" y están bloqueados hasta el día de la final (19 jul).
- **Móvil — Inicio**: las pestañas de navegación ya no desaparecen; ahora son una tira deslizable, así que se puede llegar a **"En vivo"** y al resto.
- **Móvil — Clasificación completa**: la tabla se desplaza en horizontal para ver todas las columnas.
- **Página de mantenimiento reforzada**: comprueba el estado real en Supabase, libera a la gente al instante en cuanto se desactiva (sin esperar 30 s), se actualiza al volver a la app o desbloquear el móvil, y evita quedarse atascado por caché.

---

## ⏳ PENDIENTE PARA MAÑANA (próxima ronda)

### Listo en código — solo falta subir el último .zip a GitHub
- **Espacio raro en "Estados Unidos"** (y otros países de dos palabras: Costa de Marfil, Países Bajos, Bosnia y Herzegovina): **arreglado** (era la fuente de emoji aplicada al texto). Está en el último .zip; falta hacer la subida a GitHub para que se vea en producción.
- *(Si aún no lo habías subido: el refuerzo de la página de mantenimiento y los arreglos rápidos también viajan en este mismo .zip.)*

### Por desarrollar (no empezado — para hacerlo con calma)
- **Móvil — carga lenta**: la web tarda más en cargar en móvil que en escritorio. Necesita un análisis de rendimiento real.
- **Móvil — login poco reactivo**: hay que pulsar varias veces y tarda en abrir. (El login funciona —ya hay 26 usuarios y 1.584 predicciones— pero la experiencia táctil hay que pulirla.)
- **Móvil — Predicciones difíciles de leer**: adaptar la vista de predicciones a pantallas pequeñas.
- **Clasificación (admin) → detalle al pulsar puntos**: abrir la misma pantalla de desglose que en Modo Pruebas al hacer clic en un jugador.
- **Botón Admin/Usuario en todas las páginas** (solo para admin), para navegar más fácil.
- **Botón "Volver" visible en todas las páginas** (sobre todo en móvil).
- **Botón "Partidos de hoy en directo"** destacado que lleve a "En vivo" (de momento se llega por la pestaña del menú).

---

## 📝 Notas
- Probar los partidos en directo: los widgets solo muestran datos **en vivo** cuando hay partidos jugándose; antes del torneo no hay nada que mostrar. La página "En vivo" es de **solo lectura** (no escribe en la base de datos), así que no hay riesgo en abrirla durante un partido real. Para pruebas aisladas, lo ideal sería una copia del repo en otra URL apuntando a la misma base de datos.
- Las traducciones y arreglos de datos **no afectan a las predicciones** (están en tablas distintas y los partidos se enlazan por ID, no por nombre).
