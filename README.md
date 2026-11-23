# Subsuelo · Drop 01

Versión editorial de Subsuelo basada en la propuesta visual elegida por Alejandro. Incluye fotografía de campaña generada con ImageGen a partir de las prendas del catálogo, una entrada de luz, profundidad por scroll, galería con arrastre, transición de la foto hacia la ficha y de regreso, y cartel de locales con iluminación y selección coordinadas.

La intro recupera el revelado del logo y la apertura del proyecto original con la paleta cálida actual. Dura aproximadamente tres segundos y enlaza automáticamente con la portada. Cuando la persona usa movimiento reducido, la portada aparece directamente.

## Vista local

Desde esta carpeta, ejecutá `node servidor.mjs` y abrí `http://127.0.0.1:8774`. La variable `SUBSUELO_PORT` permite elegir otro puerto. La web estática está en `dist/`.

Las fichas permiten explorar frente, tres cuartos y espalda y activar la lupa. El probador conserva los conjuntos y las vistas preparados del proyecto original. Las combinaciones sin imágenes preparadas muestran su estado disponible. La generación adicional usa la integración original y requiere configurar `POLLINATIONS_API_KEY` en el entorno del servidor.

Los locales, las direcciones y los horarios son ilustrativos, tal como indica la página. La fotografía de campaña es una imagen generada con las prendas originales como referencias.

## Referencias de movimiento

Las galerías de [Designeer](https://designeer.org/inspiration/design-galleries) orientan el recorrido y sus [componentes animados](https://designeer.org/best/animated-component-libraries) sirven para comparar gestos. La continuidad de tarjeta a detalle sigue el patrón de [Morphing Dialog](https://github.com/ibelick/motion-primitives/blob/main/components/core/morphing-dialog.tsx). El arrastre con asentamiento se inspira en el comportamiento del [Circular Slider](https://annnimate.com/animations/circular-slider). La implementación adapta estos gestos al JavaScript existente, con animaciones nativas y una alternativa para movimiento reducido.

Las fuentes se sirven localmente. Los avisos de Barlow y DM Sans están en `dist/assets/`.
