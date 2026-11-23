const pieces = [
  { id: 'cargo', name: 'Cargo Túnel', group: 'ropa', type: 'Pantalón', color: 'Rosa', description: 'Paneles desflecados que cruzan la rodilla y un ruedo que cae sobre la zapatilla.',
    outfitSlot: 'piernas', fit: 'Cargo de pierna ancha y tiro bajo', materials: 'Denim rosa desgastado', sizes: ['36', '38', '40', '42', '44'] },
  { id: 'hoodie', name: 'Hoodie Eco', group: 'ropa', type: 'Buzo', color: 'Espresso', description: 'Capucha profunda, bolsillo dividido y estrellas rosa sobre el pecho.',
    outfitSlot: 'torso', covers: ['cabeza'], fit: 'Buzo amplio con cierre', materials: 'Tela afelpada y cierre metálico', sizes: ['S', 'M', 'L', 'XL'] },
  { id: 'varsity', name: 'Bomber Andén', group: 'ropa', type: 'Campera', color: 'Carbón', description: 'Cuerpo corto y una costura rosa que recorre cada manga hasta el puño.',
    outfitSlot: 'torso', fit: 'Bomber corta de mangas amplias', materials: 'Nailon mate lavado y puños acanalados', sizes: ['S', 'M', 'L', 'XL'] },
  { id: 'remera', name: 'Remera Frecuencia', group: 'ropa', type: 'Remera', color: 'Gris', description: 'Mangas al codo y un estampado inspirado en una onda de sonido.',
    outfitSlot: 'torso', fit: 'Remera ancha de corte recto', materials: 'Algodón pesado lavado', sizes: ['S', 'M', 'L', 'XL'] },
  { id: 'gorra', name: 'Gorra Contravía', group: 'accesorios', type: 'Gorra', color: 'Espresso', description: 'Visera curva gastada y estrella bordada sobre la costura frontal.',
    outfitSlot: 'cabeza', fit: 'Gorra ajustable de seis paneles', materials: 'Sarga lavada y hebilla metálica', sizes: ['Único ajustable'] },
  { id: 'bolso', name: 'Bandolera Pasaje', group: 'accesorios', type: 'Bandolera', color: 'Grafito', description: 'Correa ancha, paneles curvos y pespuntes rosa sobre el tejido oscuro.',
    outfitSlot: 'bandolera', fit: 'Bandolera compacta', materials: 'Tejido grafito lavado y herrajes metálicos', sizes: ['Único'] },
];

if (typeof module !== 'undefined') module.exports = pieces;
