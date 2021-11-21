import "./style.css";
import * as THREE from "three";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = 2;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

document.body.appendChild(renderer.domElement);

const numberOfPetals = 5;
const distanceSteps = 5;

// A noter que pour l'instant la pétale va être parfaitement plate. Ce sera avec une transformation plus
// tard qu'on la fera prendre une certaine élévation.
const makePetalGeometry = () => {
  const petalGeometry = new THREE.BufferGeometry();

  // Le but est de faire un tableau (verticesPositions) qui contient tous les points (x)
  // représenté dans ce fantastique dessin en ASCII.
  //
  //                             --------x---------
  //          ---------x-----------------|------------------x
  // x-----------------|-----------------|------------------|
  // x-----------------x-----------------x------------------x
  // ^ verticesPositions[0]
  //                   ^ verticesPositions[1]
  //                                     ^ verticesPositions[2]
  //                                                        ^ verticesPositions[3]
  //
  // Et pour chacun des éléments du tableau, verticesPositions[i][0] est la ligne du bas
  // et verticesPositions[i][1] est la ligne arrondie du haut.
  //
  // Le but, plus loin dans l'algo, est de faire une symétrie axiale en utilisant la ligne
  // du bas afin d'avoir la fameuse forme de fleur.
  const verticesPositions = new Array(distanceSteps)
    .fill(null)
    .map((_, index) => {
      const distanceFromCenter = index / (distanceSteps - 1); // 0 -> 1

      const angle = Math.PI / numberOfPetals;

      const angleFactor = Math.pow(1 - distanceFromCenter, 0.5) * 0.6 + 0.4;

      return [
        [distanceFromCenter, 0, 0],
        [
          distanceFromCenter * Math.cos(angle * angleFactor),
          distanceFromCenter * Math.sin(angle * angleFactor),
          0,
        ],
      ];
    });

  // Maintenant qu'on a ce tableau de point, on va pouvoir faire des quadrilatères
  // (on se la pète pour pas dire "carrés tordus"), avec :
  //
  // * verticesPositions[i][0]
  // * verticesPositions[i][1]
  // * verticesPositions[i+1][1]
  // * verticesPositions[i+1][0]
  //
  // Le problème c'est qu'en 3D, il faut fonctionner avec des triangles et non des
  // carrés quadrilatères. Donc on va découper chaque carrés en deux pour avoir deux
  // triangles.
  //
  // Deuxième point d'attention, on veut faire en sorte que les triangles soient
  // visibles d'en haut et soient tous orientés vers le haut. Pour cela, on doit
  // s'assurer que les triangles soient tous dans le sens anti-horaire : on organise
  // les points afin que si on les dessine en les regardant du dessus, on aille dans
  // le sens trigonométrique ou anti-horaire. C'est pour cette raison qu'il y a des
  // `reverse`.
  //
  // Troisième point : c'est le bon moment pour faire la symétrie mentionnée plus haut.
  // On reprend donc les `topTriangles`, on fait la symétrie (y -> -y), puis on inverse
  // le sens des triangles pour s'assurer d'être toujours orienté vers le haut.
  const triangles = verticesPositions
    .slice(0, -1)
    .map((startVertices, index) => {
      const endVertices = verticesPositions[index + 1];
      const topTriangles = [
        [...startVertices, endVertices[0]].reverse(),
        [startVertices[1], ...endVertices],
      ];

      const bottomTriangles = topTriangles.map((triangle) => {
        return triangle
          .map((vertex) => [vertex[0], -vertex[1], vertex[2]])
          .reverse();
      });

      return [...topTriangles, ...bottomTriangles];
    })
    .flat()
    .flat();

  const vertices = new Float32Array(triangles.flat());

  const normals = new Float32Array(triangles.map(() => [0, 0, 1]).flat());

  // itemSize = 3 -> chaque point à trois dimensions
  // Sûrement possibilité de faire autrement, mais pour pas trop se compliquer la vie
  // on va rester sur de la 3D classique.
  const itemSize = 3;

  petalGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(vertices, itemSize)
  );
  petalGeometry.setAttribute(
    "normal",
    new THREE.BufferAttribute(normals, itemSize)
  );

  return petalGeometry;
};

const petalGeometry = makePetalGeometry();
const petalMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });

// Maintenant qu'on a la geometry d'une pétale, plutôt que d'en faire X différentes
// on va plutôt faire X meshs qui réutilisent la même geometry, mais avec une rotation
// appliquée à chaque fois.
const petalsMeshes = new Array(numberOfPetals).fill(null).map((_, index) => {
  const progression = index / numberOfPetals;
  const mesh = new THREE.Mesh(petalGeometry, petalMaterial);
  mesh.rotation.z = Math.PI * 2 * progression;
  return mesh;
});

scene.add(...petalsMeshes);

// On ajoute une petite animation qui va nous permettre de faire tourner la petal
function updateScene(t) {
  petalsMeshes.forEach((petal) => {
    petal.rotation.z += t / 5000;
  });
}

let start = performance.now();
function animate() {
  const now = performance.now();

  updateScene(now - start);
  renderer.render(scene, camera);

  start = now;
  requestAnimationFrame(animate);
}
animate();

renderer.render(scene, camera);
