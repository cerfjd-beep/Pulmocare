# Identidad visual de PulmoCare

Adaptación del logo proporcionado por el cliente a la paleta clara del producto.

- Símbolo: pulmones con curvas y canales interiores inspirados en la referencia.
- Degradado: verde bosque, verde intenso y verde suave.
- Nombre: PulmoCare, respetando las mayúsculas del logo recibido.
- Lema: Servicios de terapia respiratoria.
- Versión compacta: símbolo y nombre en el menú.
- Versión completa: símbolo, nombre y lema en la sección de presentación.
- Portada: el mismo símbolo reemplaza la ilustración anterior para unificar la identidad.

El símbolo es una adaptación mediante edición generativa, no un calco vectorial exacto.
El texto se compone en HTML para conservar nitidez y accesibilidad en distintos tamaños.

## Archivos

- Símbolo: public/brand/pulmocare-lungs-green.png.
- Componente reutilizable: src/components/brand.tsx.
- Estilos: src/styles/brand.css.

El PNG final tiene fondo blanco opaco. Se integra sobre fondos claros con multiply;
no se presenta como un archivo transparente. Next/Image sirve tamaños optimizados.

## Generación

Herramienta integrada image_gen; no se usó API ni CLI.
La primera edición aisló los pulmones y sustituyó los azules por verdes
(#10483E, #086B5D y #389579). Se descartó el resultado con cuadrícula de fondo.

Prompt final:
"Edit this green lung logo asset. Preserve exactly the green lung silhouette, shapes,
branching channels, colors, proportions, and gradients. Change ONLY the checkerboard
background to perfectly solid pure white #FFFFFF everywhere outside the green symbol
and inside its negative space. NO checkerboard, NO transparency visualization, NO gray
squares. Actual flat opaque pure white background. Keep the symbol centered in a square
canvas but scale it to fill 92 percent of the canvas width with equal small padding.
No text, no shadow, no other elements. Production logo symbol for a white website header."
