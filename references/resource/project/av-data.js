/* Catálogo de juegos y rankings semilla — datos puros, sin UI. */
(function () {
  var GAMES = [
    { id: 'rompemuros', title: 'ROMPEMUROS', category: 'Acción', desc: 'Destruye la muralla con la pala y la bola.', long: 'Clásico de rebotes: mueve la pala y rompe cada ladrillo de la muralla antes de perder las tres vidas. Cada nivel acelera la bola y reordena los bloques. Encadena impactos sin fallar para multiplicar la puntuación.', thumb: 'linear-gradient(140deg, #ff006e 0%, #7a0038 55%, #12121a 100%)' },
    { id: 'serpiente', title: 'SERPIENTE', category: 'Clásico', desc: 'Crece sin morderte la cola.', long: 'Guía a la serpiente por la rejilla y come cada punto que aparece. Con cada bocado el cuerpo se alarga y el margen de error se reduce. Un solo choque contra el muro o contra ti mismo termina la partida.', thumb: 'linear-gradient(140deg, #00f5ff 0%, #00505c 55%, #0d0f16 100%)' },
    { id: 'invasores', title: 'INVASORES', category: 'Espacio', desc: 'Defiende la base del enjambre orbital.', long: 'Filas de naves enemigas descienden en formación mientras tu cañón se desplaza por la base. Dispara entre los huecos, cúbrete tras los búnkeres y limpia la oleada antes de que toque suelo. La velocidad sube con cada oleada superada.', thumb: 'linear-gradient(140deg, #f5ff00 0%, #5c5f00 55%, #0d0f16 100%)' },
    { id: 'asteroides', title: 'ASTEROIDES', category: 'Espacio', desc: 'Sobrevive al campo de rocas a la deriva.', long: 'Inercia pura: cada empuje del motor te sigue arrastrando. Pulveriza las rocas grandes y esquiva los fragmentos que se dispersan. El hiperespacio te salva una vez, pero nunca sabes dónde reaparecerás.', thumb: 'linear-gradient(140deg, #9b5cff 0%, #3a1b6b 55%, #0d0f16 100%)' },
    { id: 'bloques', title: 'BLOQUES', category: 'Puzzle', desc: 'Encaja las piezas que caen sin dejar huecos.', long: 'Las piezas bajan cada vez más rápido y solo tienes rotación y desplazamiento para colocarlas. Completa líneas horizontales para vaciar el tablero. Cuatro líneas de golpe valen el máximo de puntos.', thumb: 'linear-gradient(140deg, #00ff9d 0%, #005c39 55%, #0d0f16 100%)' },
    { id: 'laberinto', title: 'LABERINTO', category: 'Clásico', desc: 'Come todos los puntos y escapa de los guardianes.', long: 'Recorre el laberinto recogiendo puntos mientras cuatro guardianes patrullan los pasillos. Las cápsulas de energía invierten la persecución durante unos segundos. Vacía el tablero para pasar al siguiente plano.', thumb: 'linear-gradient(140deg, #ff8a00 0%, #6b3200 55%, #0d0f16 100%)' }
  ];

  var SEED = {
    rompemuros: [['NEONKID', 48720], ['V3CTOR', 44150], ['MARTA_88', 39980], ['PIXELON', 35240], ['DRA_ZERO', 31170], ['CRT_MAX', 27650], ['LUCIA.EXE', 24310], ['TOKENZ', 20890], ['GRIS', 17420], ['BIT_ANA', 14060]],
    serpiente: [['CULEBRO', 31240], ['ANITA_9', 28870], ['NODO', 25190], ['ZAS', 22450], ['MIRLO', 19980], ['R0SA', 17310], ['CABLE', 15020], ['ELOY', 12640], ['OCHO', 10480], ['VIB', 8320]],
    invasores: [['ORBITA', 62310], ['CMDR_RUIZ', 57840], ['NOVA_7', 51260], ['ESTELA', 46990], ['PLASMA', 41120], ['HELIO', 36780], ['DUNA', 32050], ['IKER', 27430], ['ZENIT', 23180], ['LUME', 19040]],
    asteroides: [['DERIVA', 55480], ['ROCA_X', 50220], ['TITAN', 45870], ['SARA_V', 40310], ['ORION', 36240], ['GRAVE', 31890], ['MAR_88', 27560], ['EJE', 23110], ['POLVO', 19740], ['NEO', 15390]],
    bloques: [['TETRA', 74120], ['LINEA4', 68350], ['JOAN_P', 61780], ['GIRO', 55240], ['HUECO', 49610], ['PILAR', 43280], ['NIEVE', 38150], ['CUBO', 32470], ['ANDER', 27920], ['CAIDA', 22360]],
    laberinto: [['GLOTON', 45930], ['FANTAS', 41260], ['NURIA_1', 37880], ['PILDORA', 33410], ['TUNEL', 29750], ['CEREZA', 25320], ['OMAR', 21690], ['SIRENA', 18140], ['TIC', 14780], ['ECO', 11250]]
  };

  window.AVData = {
    GAMES: GAMES,
    SEED: SEED,
    CATEGORIES: ['Todos', 'Acción', 'Clásico', 'Espacio', 'Puzzle'],
    byId: function (id) {
      for (var i = 0; i < GAMES.length; i++) if (GAMES[i].id === id) return GAMES[i];
      return GAMES[0];
    }
  };
})();
