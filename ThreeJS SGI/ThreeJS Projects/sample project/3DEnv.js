// Importar todos os componentes do modulo Three
//  e outros componentes de modulos complementares
import * as THREE from 'three'; // importar todos sob o nome THREE
import Stats from 'three/addons/libs/stats.module.js' // importar default 
import { OrbitControls } from 'three/addons/controls/OrbitControls.js' // importar componente especifica

//criar um cubo 1x1x1... 
let geometria = new THREE.BoxGeometry(0.2, 0.2, 0.2);
let material = new THREE.MeshNormalMaterial();
let cubo = new THREE.Mesh(geometria, material);

// criar uma cena... 
let cena = new THREE.Scene();

// adicionar o cubo à cena... 
cena.add(cubo);

// preparar um renderer WebGL e adicioná-lo à pagina 
let renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// criar uma camara... 
let camara = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100);
camara.position.z = 1;

// criar estatisticas e adiciona-las sobre o canvas
let stats = new Stats()
stats.dom.style.position= 'relative';
renderer.domElement.style.position= 'absolute';
document.body.appendChild(stats.dom);

// adicionar controlos orbitais
const controls = new OrbitControls( camara, renderer.domElement );

// limitar taxa de atualizacao
let delta = 0;                      // tempo que passou desde a última atualização
let relogio = new THREE.Clock();    // componente auxiliar para obtenção do delta
let latencia_minima = 1 / 60;       // limita a taxa de atualização a 60 atualizações por segundo

// loop principal 
function animar() {
    requestAnimationFrame(animar);  // agendar animar para o próximo animation frame

    delta += relogio.getDelta();    // acumular tempo que passou desde a ultima chamada de getDelta

    if (delta  < latencia_minima)   // não exceder a taxa de atualizações definida
        return;                     

    const excedente = delta % latencia_minima // por quanto tempo delta excede um multiplo da latencia minima

    // atualizar e mostrar
    { 
        stats.update()                  // atualizar estatisticas
        
        const latenciaDiscreta = delta - excedente
        const velocidadeAngular = 1               // radianos por segundo
        cubo.rotateY(velocidadeAngular * latenciaDiscreta);  // atualizar rotacao do cubo... 

        renderer.render(cena, camara);  // mostrar ("desenhar" cena 3d)
    }

    delta = excedente;// atualizar delta com o excedente
}

// iniciar animação... 
animar();