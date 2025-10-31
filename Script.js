// Variables globales
let scene, camera, renderer, controls;
let crystalGroup, planeGroup, axisGroup, projectionGroup;
let atomsGroup, bondsGroup, internalLinesGroup;
let animationId = null;
let isInitialized = false;
let rotationSpeed = 0.005;
let isAnimating = false;
let isProjectionMode = false;
let originalCameraPosition;
let currentCrystalType = 'cubique-simple';
let currentAngle = 0;
let showInternalLines = false;

// Définitions des vues
const viewPresets = {
    'standard': {
        position: new THREE.Vector3(0, -12, 5),
        target: new THREE.Vector3(0, 0, 0)
    },
    'axiale': {
        position: new THREE.Vector3(0, -8, 12),
        target: new THREE.Vector3(0, 0, 0)
    },
    'diagonale': {
        position: new THREE.Vector3(8, -8, 8),
        target: new THREE.Vector3(0, 0, 0)
    }
};

// Initialisation de la scène Three.js
function initThreeJS() {
    if (isInitialized) return;
    
    try {
        // Créer la scène
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a0a2a);
        
        // Créer la caméra
        const container = document.getElementById('crystal-container');
        camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
        camera.position.set(0, -12, 5);
        originalCameraPosition = camera.position.clone();
        
        // Créer le rendu
        renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true 
        });
        renderer.setSize(container.clientWidth, container.clientHeight);
        container.appendChild(renderer.domElement);
        
        // Ajouter les contrôles orbitaux
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.target.set(0, 0, 0);
        
        // Ajouter l'éclairage
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 5);
        scene.add(directionalLight);
        
        // Groupes principaux
        crystalGroup = new THREE.Group();
        scene.add(crystalGroup);
        
        atomsGroup = new THREE.Group();
        bondsGroup = new THREE.Group();
        internalLinesGroup = new THREE.Group();
        planeGroup = new THREE.Group();
        axisGroup = new THREE.Group();
        projectionGroup = new THREE.Group();
        
        crystalGroup.add(atomsGroup);
        crystalGroup.add(bondsGroup);
        crystalGroup.add(internalLinesGroup);
        crystalGroup.add(axisGroup);
        scene.add(planeGroup);
        scene.add(projectionGroup);
        
        // Masquer les groupes par défaut
        internalLinesGroup.visible = false;
        
        // Créer le cristal initial
        createCrystal('cubique-simple');
        createAxisSystem();
        
        // Cacher le message de chargement
        document.getElementById('loading-message').style.display = 'none';
        
        // Gérer le redimensionnement de la fenêtre
        window.addEventListener('resize', onWindowResize);
        
        // Commencer l'animation
        animate();
        
        isInitialized = true;
        console.log("Three.js initialisé avec succès");
    } catch (error) {
        console.error("Erreur lors de l'initialisation de Three.js:", error);
        document.getElementById('loading-message').innerHTML = 
            'Erreur lors du chargement de la visualisation 3D. Vérifiez la console pour plus de détails.';
    }
}

// Appliquer une vue prédéfinie
function applyView(viewType) {
    const view = viewPresets[viewType];
    
    if (view) {
        camera.position.copy(view.position);
        controls.target.copy(view.target);
        controls.update();
    }
}

// Créer le système d'axes
function createAxisSystem() {
    while(axisGroup.children.length > 0) { 
        axisGroup.remove(axisGroup.children[0]);
    }
    
    const a = 4; // Valeur par défaut
    
    // Origine (point O)
    const originGeometry = new THREE.SphereGeometry(0.15, 16, 16);
    const originMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const origin = new THREE.Mesh(originGeometry, originMaterial);
    origin.position.set(0, 0, 0);
    axisGroup.add(origin);
    
    // Vecteur a (axe X)
    const arrowHelperA = new THREE.ArrowHelper(
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(0, 0, 0),
        a,
        0xff4444,
        0.4,
        0.2
    );
    axisGroup.add(arrowHelperA);
    
    // Vecteur b (axe Y)
    const arrowHelperB = new THREE.ArrowHelper(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(0, 0, 0),
        a,
        0x44ff44,
        0.4,
        0.2
    );
    axisGroup.add(arrowHelperB);
    
    // Vecteur c (axe Z)
    const arrowHelperC = new THREE.ArrowHelper(
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(0, 0, 0),
        a,
        0x4444ff,
        0.4,
        0.2
    );
    axisGroup.add(arrowHelperC);
}

// Mettre à jour la légende des atomes
function updateAtomLegend(type) {
    const legendContent = document.getElementById('legend-content');
    legendContent.innerHTML = '';
    
    switch(type) {
        case 'cubique-simple':
        case 'cubique-centre':
        case 'cubique-faces-centrees':
            addAtomToLegend('Atome métallique', '#4a9eff', 'circle');
            break;
        case 'ionique-nacl':
            addAtomToLegend('Na⁺ (Sodium)', '#4a9eff', 'circle');
            addAtomToLegend('Cl⁻ (Chlore)', '#4caf50', 'circle');
            break;
        case 'ionique-csz':
            addAtomToLegend('Cs⁺ (Césium)', '#9c27b0', 'circle');
            addAtomToLegend('Cl⁻ (Chlore)', '#4caf50', 'circle');
            break;
        case 'ionique-zns':
            addAtomToLegend('Zn²⁺ (Zinc)', '#4a9eff', 'circle');
            addAtomToLegend('S²⁻ (Soufre)', '#ffa726', 'circle');
            break;
        case 'hexagonal':
            addAtomToLegend('Atome métallique', '#4a9eff', 'circle');
            break;
        case 'fluorine':
            addAtomToLegend('Ca²⁺ (Calcium)', '#888888', 'circle');
            addAtomToLegend('F⁻ (Fluor)', '#00ff00', 'circle');
            break;
        case 'antifluorine':
            addAtomToLegend('Na⁺ (Sodium)', '#4a9eff', 'circle');
            addAtomToLegend('O²⁻ (Oxygène)', '#ff6b6b', 'circle');
            break;
        default:
            addAtomToLegend('Atome principal', '#4a9eff', 'circle');
    }
}

// Ajouter un atome à la légende
function addAtomToLegend(name, color, shape) {
    const atomItem = document.createElement('div');
    atomItem.className = 'atom-item';
    
    atomItem.innerHTML = `
        <div class="atom-color" style="background-color: ${color};"></div>
        <span>${name}</span>
    `;
    document.getElementById('legend-content').appendChild(atomItem);
}

// Créer un cristal basé sur le type sélectionné
function createCrystal(type) {
    currentCrystalType = type;
    
    // Nettoyer les groupes existants
    while(atomsGroup.children.length > 0) {
        atomsGroup.remove(atomsGroup.children[0]);
    }
    while(bondsGroup.children.length > 0) {
        bondsGroup.remove(bondsGroup.children[0]);
    }
    while(internalLinesGroup.children.length > 0) {
        internalLinesGroup.remove(internalLinesGroup.children[0]);
    }
    
    // Masquer la projection si active
    hideProjection();
    
    // Mettre à jour la légende
    updateAtomLegend(type);
    
    const a = parseFloat(document.getElementById('a-param').value);
    
    const atomMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x4a9eff, 
        shininess: 100 
    });
    
    const bondMaterial = new THREE.LineBasicMaterial({ 
        color: 0xffffff,
        linewidth: 2
    });
    
    switch(type) {
        case 'cubique-simple':
            createSimpleCubic(a, atomMaterial, bondMaterial);
            break;
        case 'cubique-centre':
            createBodyCenteredCubic(a, atomMaterial, bondMaterial);
            break;
        case 'cubique-faces-centrees':
            createFaceCenteredCubic(a, atomMaterial, bondMaterial);
            break;
        case 'ionique-nacl':
            createNaClStructure(a, atomMaterial, bondMaterial);
            break;
        case 'ionique-csz':
            createCsClStructure(a, atomMaterial, bondMaterial);
            break;
        case 'ionique-zns':
            createZnSStructure(a, atomMaterial, bondMaterial);
            break;
        case 'hexagonal':
            createHexagonalStructure(a, a, atomMaterial, bondMaterial);
            break;
        case 'fluorine':
            createFluorineStructure(a, atomMaterial, bondMaterial);
            break;
        case 'antifluorine':
            createAntifluorineStructure(a, atomMaterial, bondMaterial);
            break;
    }
    
    // Mettre à jour le système d'axes
    createAxisSystem();
    
    // Appliquer la vue standard
    applyView('standard');
}

// Structure cubique simple
function createSimpleCubic(a, atomMaterial, bondMaterial) {
    for(let i = 0; i < 2; i++) {
        for(let j = 0; j < 2; j++) {
            for(let k = 0; k < 2; k++) {
                const atomGeometry = new THREE.SphereGeometry(0.3, 16, 16);
                const atom = new THREE.Mesh(atomGeometry, atomMaterial);
                atom.position.set(i * a, j * a, k * a);
                atomsGroup.add(atom);
            }
        }
    }
    
    const edges = [
        [0,0,0, 1,0,0], [0,0,1, 1,0,1], [0,0,0, 0,0,1], [1,0,0, 1,0,1],
        [0,1,0, 1,1,0], [0,1,1, 1,1,1], [0,1,0, 0,1,1], [1,1,0, 1,1,1],
        [0,0,0, 0,1,0], [1,0,0, 1,1,0], [0,0,1, 0,1,1], [1,0,1, 1,1,1]
    ];
    
    edges.forEach(edge => {
        const points = [];
        points.push(new THREE.Vector3(edge[0]*a, edge[1]*a, edge[2]*a));
        points.push(new THREE.Vector3(edge[3]*a, edge[4]*a, edge[5]*a));
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, bondMaterial);
        bondsGroup.add(line);
    });
}

// Structure cubique centrée
function createBodyCenteredCubic(a, atomMaterial, bondMaterial) {
    // Atomes aux coins
    for(let i = 0; i < 2; i++) {
        for(let j = 0; j < 2; j++) {
            for(let k = 0; k < 2; k++) {
                const atomGeometry = new THREE.SphereGeometry(0.3, 16, 16);
                const atom = new THREE.Mesh(atomGeometry, atomMaterial);
                atom.position.set(i * a, j * a, k * a);
                atomsGroup.add(atom);
            }
        }
    }
    
    // Atome au centre
    const centerAtomGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    const centerAtom = new THREE.Mesh(centerAtomGeometry, atomMaterial);
    centerAtom.position.set(a/2, a/2, a/2);
    atomsGroup.add(centerAtom);
    
    // Arêtes du cube
    const cubeEdges = [
        [0,0,0, 1,0,0], [0,0,1, 1,0,1], [0,0,0, 0,0,1], [1,0,0, 1,0,1],
        [0,1,0, 1,1,0], [0,1,1, 1,1,1], [0,1,0, 0,1,1], [1,1,0, 1,1,1],
        [0,0,0, 0,1,0], [1,0,0, 1,1,0], [0,0,1, 0,1,1], [1,0,1, 1,1,1]
    ];
    
    cubeEdges.forEach(edge => {
        const points = [];
        points.push(new THREE.Vector3(edge[0]*a, edge[1]*a, edge[2]*a));
        points.push(new THREE.Vector3(edge[3]*a, edge[4]*a, edge[5]*a));
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, bondMaterial);
        bondsGroup.add(line);
    });
    
    // Lignes intérieures (centre vers coins)
    for(let i = 0; i < 2; i++) {
        for(let j = 0; j < 2; j++) {
            for(let k = 0; k < 2; k++) {
                const points = [];
                points.push(new THREE.Vector3(i*a, j*a, k*a));
                points.push(new THREE.Vector3(a/2, a/2, a/2));
                const geometry = new THREE.BufferGeometry().setFromPoints(points);
                const line = new THREE.Line(geometry, bondMaterial);
                internalLinesGroup.add(line);
            }
        }
    }
}

// Structure cubique à faces centrées
function createFaceCenteredCubic(a, atomMaterial, bondMaterial) {
    // Atomes aux coins
    for(let i = 0; i < 2; i++) {
        for(let j = 0; j < 2; j++) {
            for(let k = 0; k < 2; k++) {
                const atomGeometry = new THREE.SphereGeometry(0.3, 16, 16);
                const atom = new THREE.Mesh(atomGeometry, atomMaterial);
                atom.position.set(i * a, j * a, k * a);
                atomsGroup.add(atom);
            }
        }
    }
    
    // Atomes aux centres des faces
    const faceCenters = [
        [0.5, 0.5, 0], [0.5, 0.5, 1],
        [0.5, 0, 0.5], [0.5, 1, 0.5],
        [0, 0.5, 0.5], [1, 0.5, 0.5]
    ];
    
    faceCenters.forEach(center => {
        const atomGeometry = new THREE.SphereGeometry(0.3, 16, 16);
        const atom = new THREE.Mesh(atomGeometry, atomMaterial);
        atom.position.set(center[0]*a, center[1]*a, center[2]*a);
        atomsGroup.add(atom);
    });
    
    // Arêtes du cube
    const cubeEdges = [
        [0,0,0, 1,0,0], [0,0,1, 1,0,1], [0,0,0, 0,0,1], [1,0,0, 1,0,1],
        [0,1,0, 1,1,0], [0,1,1, 1,1,1], [0,1,0, 0,1,1], [1,1,0, 1,1,1],
        [0,0,0, 0,1,0], [1,0,0, 1,1,0], [0,0,1, 0,1,1], [1,0,1, 1,1,1]
    ];
    
    cubeEdges.forEach(edge => {
        const points = [];
        points.push(new THREE.Vector3(edge[0]*a, edge[1]*a, edge[2]*a));
        points.push(new THREE.Vector3(edge[3]*a, edge[4]*a, edge[5]*a));
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, bondMaterial);
        bondsGroup.add(line);
    });
}

// Structure NaCl
function createNaClStructure(a, atomMaterial, bondMaterial) {
    const naMaterial = new THREE.MeshPhongMaterial({ color: 0x4a9eff });
    const clMaterial = new THREE.MeshPhongMaterial({ color: 0x4caf50 });
    
    // Positions pour Cl⁻ (sommets)
    for(let i = 0; i < 2; i++) {
        for(let j = 0; j < 2; j++) {
            for(let k = 0; k < 2; k++) {
                const clGeometry = new THREE.SphereGeometry(0.3, 16, 16);
                const clAtom = new THREE.Mesh(clGeometry, clMaterial);
                clAtom.position.set(i * a, j * a, k * a);
                atomsGroup.add(clAtom);
            }
        }
    }
    
    // Positions pour Na⁺ (centres des arêtes)
    const naPositions = [
        [0.5, 0, 0], [0.5, 0, 1], [0.5, 1, 0], [0.5, 1, 1],
        [0, 0.5, 0], [0, 0.5, 1], [1, 0.5, 0], [1, 0.5, 1],
        [0, 0, 0.5], [0, 1, 0.5], [1, 0, 0.5], [1, 1, 0.5]
    ];
    
    naPositions.forEach(pos => {
        const naGeometry = new THREE.SphereGeometry(0.25, 16, 16);
        const naAtom = new THREE.Mesh(naGeometry, naMaterial);
        naAtom.position.set(pos[0]*a, pos[1]*a, pos[2]*a);
        atomsGroup.add(naAtom);
    });
    
    // Arêtes du cube
    const cubeEdges = [
        [0,0,0, 1,0,0], [0,0,1, 1,0,1], [0,0,0, 0,0,1], [1,0,0, 1,0,1],
        [0,1,0, 1,1,0], [0,1,1, 1,1,1], [0,1,0, 0,1,1], [1,1,0, 1,1,1],
        [0,0,0, 0,1,0], [1,0,0, 1,1,0], [0,0,1, 0,1,1], [1,0,1, 1,1,1]
    ];
    
    cubeEdges.forEach(edge => {
        const points = [];
        points.push(new THREE.Vector3(edge[0]*a, edge[1]*a, edge[2]*a));
        points.push(new THREE.Vector3(edge[3]*a, edge[4]*a, edge[5]*a));
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, bondMaterial);
        bondsGroup.add(line);
    });
}

// Structure CsCl
function createCsClStructure(a, atomMaterial, bondMaterial) {
    const csMaterial = new THREE.MeshPhongMaterial({ color: 0x9c27b0 });
    const clMaterial = new THREE.MeshPhongMaterial({ color: 0x4caf50 });
    
    // Cl⁻ aux coins
    for(let i = 0; i < 2; i++) {
        for(let j = 0; j < 2; j++) {
            for(let k = 0; k < 2; k++) {
                const clGeometry = new THREE.SphereGeometry(0.3, 16, 16);
                const clAtom = new THREE.Mesh(clGeometry, clMaterial);
                clAtom.position.set(i * a, j * a, k * a);
                atomsGroup.add(clAtom);
            }
        }
    }
    
    // Cs⁺ au centre
    const csGeometry = new THREE.SphereGeometry(0.4, 16, 16);
    const csAtom = new THREE.Mesh(csGeometry, csMaterial);
    csAtom.position.set(a/2, a/2, a/2);
    atomsGroup.add(csAtom);
    
    // Arêtes du cube
    const cubeEdges = [
        [0,0,0, 1,0,0], [0,0,1, 1,0,1], [0,0,0, 0,0,1], [1,0,0, 1,0,1],
        [0,1,0, 1,1,0], [0,1,1, 1,1,1], [0,1,0, 0,1,1], [1,1,0, 1,1,1],
        [0,0,0, 0,1,0], [1,0,0, 1,1,0], [0,0,1, 0,1,1], [1,0,1, 1,1,1]
    ];
    
    cubeEdges.forEach(edge => {
        const points = [];
        points.push(new THREE.Vector3(edge[0]*a, edge[1]*a, edge[2]*a));
        points.push(new THREE.Vector3(edge[3]*a, edge[4]*a, edge[5]*a));
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, bondMaterial);
        bondsGroup.add(line);
    });
}

// Structure ZnS (Blende)
function createZnSStructure(a, atomMaterial, bondMaterial) {
    const znMaterial = new THREE.MeshPhongMaterial({ color: 0x4a9eff });
    const sMaterial = new THREE.MeshPhongMaterial({ color: 0xffa726 });
    
    // S²⁻ aux positions FCC
    const sPositions = [
        // Coins
        [0,0,0], [1,0,0], [0,0,1], [1,0,1],
        [0,1,0], [1,1,0], [0,1,1], [1,1,1],
        // Centres des faces
        [0.5,0.5,0], [0.5,0.5,1],
        [0.5,0,0.5], [0.5,1,0.5],
        [0,0.5,0.5], [1,0.5,0.5]
    ];
    
    sPositions.forEach(pos => {
        const sGeometry = new THREE.SphereGeometry(0.3, 16, 16);
        const sAtom = new THREE.Mesh(sGeometry, sMaterial);
        sAtom.position.set(pos[0]*a, pos[1]*a, pos[2]*a);
        atomsGroup.add(sAtom);
    });
    
    // Zn²⁺ dans la moitié des sites tétraédriques
    const znPositions = [
        [0.25, 0.25, 0.25],
        [0.75, 0.75, 0.25],
        [0.75, 0.25, 0.75],
        [0.25, 0.75, 0.75]
    ];
    
    znPositions.forEach(pos => {
        const znGeometry = new THREE.SphereGeometry(0.25, 16, 16);
        const znAtom = new THREE.Mesh(znGeometry, znMaterial);
        znAtom.position.set(pos[0]*a, pos[1]*a, pos[2]*a);
        atomsGroup.add(znAtom);
    });
    
    // Arêtes du cube
    const cubeEdges = [
        [0,0,0, 1,0,0], [0,0,1, 1,0,1], [0,0,0, 0,0,1], [1,0,0, 1,0,1],
        [0,1,0, 1,1,0], [0,1,1, 1,1,1], [0,1,0, 0,1,1], [1,1,0, 1,1,1],
        [0,0,0, 0,1,0], [1,0,0, 1,1,0], [0,0,1, 0,1,1], [1,0,1, 1,1,1]
    ];
    
    cubeEdges.forEach(edge => {
        const points = [];
        points.push(new THREE.Vector3(edge[0]*a, edge[1]*a, edge[2]*a));
        points.push(new THREE.Vector3(edge[3]*a, edge[4]*a, edge[5]*a));
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, bondMaterial);
        bondsGroup.add(line);
    });
}

// Structure hexagonale compacte
function createHexagonalStructure(a, c, atomMaterial, bondMaterial) {
    const angle120 = (2 * Math.PI) / 3;
    
    // Positions des atomes dans le plan de base
    const basePositions = [
        [0, 0, 0],
        [a, 0, 0],
        [a * Math.cos(angle120), a * Math.sin(angle120), 0],
        [a + a * Math.cos(angle120), a * Math.sin(angle120), 0],
        [a * Math.cos(2 * angle120), a * Math.sin(2 * angle120), 0],
        [a + a * Math.cos(2 * angle120), a * Math.sin(2 * angle120), 0]
    ];
    
    // Atomes du plan de base
    basePositions.forEach(pos => {
        const atomGeometry = new THREE.SphereGeometry(0.3, 16, 16);
        const atom = new THREE.Mesh(atomGeometry, atomMaterial);
        atom.position.set(pos[0], pos[1], pos[2]);
        atomsGroup.add(atom);
    });
    
    // Atomes du plan supérieur (décalés)
    const topPositions = [
        [a/2, a * Math.sin(angle120)/2, c/2],
        [a + a/2, a * Math.sin(angle120)/2, c/2],
        [a * Math.cos(angle120) + a/2, a * Math.sin(angle120) + a * Math.sin(angle120)/2, c/2],
        [a + a * Math.cos(angle120) + a/2, a * Math.sin(angle120) + a * Math.sin(angle120)/2, c/2],
        [a * Math.cos(2 * angle120) + a/2, a * Math.sin(2 * angle120) + a * Math.sin(angle120)/2, c/2],
        [a + a * Math.cos(2 * angle120) + a/2, a * Math.sin(2 * angle120) + a * Math.sin(angle120)/2, c/2]
    ];
    
    topPositions.forEach(pos => {
        const atomGeometry = new THREE.SphereGeometry(0.3, 16, 16);
        const atom = new THREE.Mesh(atomGeometry, atomMaterial);
        atom.position.set(pos[0], pos[1], pos[2]);
        atomsGroup.add(atom);
    });
    
    // Liaisons dans le plan de base (simplifiées)
    for(let i = 0; i < basePositions.length; i++) {
        for(let j = i + 1; j < basePositions.length; j++) {
            const dist = Math.sqrt(
                Math.pow(basePositions[i][0] - basePositions[j][0], 2) +
                Math.pow(basePositions[i][1] - basePositions[j][1], 2)
            );
            if (dist < a * 1.1) { // Liaisons entre atomes proches
                const points = [
                    new THREE.Vector3(basePositions[i][0], basePositions[i][1], basePositions[i][2]),
                    new THREE.Vector3(basePositions[j][0], basePositions[j][1], basePositions[j][2])
                ];
                const geometry = new THREE.BufferGeometry().setFromPoints(points);
                const line = new THREE.Line(geometry, bondMaterial);
                bondsGroup.add(line);
            }
        }
    }
    
    // Liaisons verticales
    for(let i = 0; i < Math.min(basePositions.length, topPositions.length); i++) {
        const points = [
            new THREE.Vector3(basePositions[i][0], basePositions[i][1], basePositions[i][2]),
            new THREE.Vector3(topPositions[i][0], topPositions[i][1], topPositions[i][2])
        ];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, bondMaterial);
        bondsGroup.add(line);
    }
}

// Structure Fluorine (CaF₂)
function createFluorineStructure(a, atomMaterial, bondMaterial) {
    const caMaterial = new THREE.MeshPhongMaterial({ color: 0x888888 });
    const fMaterial = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
    
    // Ca²⁺ aux positions FCC
    const caPositions = [
        // Coins
        [0,0,0], [1,0,0], [0,0,1], [1,0,1],
        [0,1,0], [1,1,0], [0,1,1], [1,1,1],
        // Centres des faces
        [0.5,0.5,0], [0.5,0.5,1],
        [0.5,0,0.5], [0.5,1,0.5],
        [0,0.5,0.5], [1,0.5,0.5]
    ];
    
    caPositions.forEach(pos => {
        const atomGeometry = new THREE.SphereGeometry(0.35, 16, 16);
        const atom = new THREE.Mesh(atomGeometry, caMaterial);
        atom.position.set(pos[0]*a, pos[1]*a, pos[2]*a);
        atomsGroup.add(atom);
    });
    
    // F⁻ dans tous les sites tétraédriques
    const fPositions = [
        [0.25, 0.25, 0.25], [0.75, 0.75, 0.25],
        [0.75, 0.25, 0.75], [0.25, 0.75, 0.75],
        [0.75, 0.75, 0.75], [0.25, 0.25, 0.75],
        [0.25, 0.75, 0.25], [0.75, 0.25, 0.25]
    ];
    
    fPositions.forEach(pos => {
        const atomGeometry = new THREE.SphereGeometry(0.25, 16, 16);
        const atom = new THREE.Mesh(atomGeometry, fMaterial);
        atom.position.set(pos[0]*a, pos[1]*a, pos[2]*a);
        atomsGroup.add(atom);
    });
    
    // Arêtes du cube
    const cubeEdges = [
        [0,0,0, 1,0,0], [0,0,1, 1,0,1], [0,0,0, 0,0,1], [1,0,0, 1,0,1],
        [0,1,0, 1,1,0], [0,1,1, 1,1,1], [0,1,0, 0,1,1], [1,1,0, 1,1,1],
        [0,0,0, 0,1,0], [1,0,0, 1,1,0], [0,0,1, 0,1,1], [1,0,1, 1,1,1]
    ];
    
    cubeEdges.forEach(edge => {
        const points = [];
        points.push(new THREE.Vector3(edge[0]*a, edge[1]*a, edge[2]*a));
        points.push(new THREE.Vector3(edge[3]*a, edge[4]*a, edge[5]*a));
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, bondMaterial);
        bondsGroup.add(line);
    });
}

// Structure Antifluorine (Na₂O)
function createAntifluorineStructure(a, atomMaterial, bondMaterial) {
    const naMaterial = new THREE.MeshPhongMaterial({ color: 0x4a9eff });
    const oMaterial = new THREE.MeshPhongMaterial({ color: 0xff6b6b });
    
    // O²⁻ aux positions FCC
    const oPositions = [
        // Coins
        [0,0,0], [1,0,0], [0,0,1], [1,0,1],
        [0,1,0], [1,1,0], [0,1,1], [1,1,1],
        // Centres des faces
        [0.5,0.5,0], [0.5,0.5,1],
        [0.5,0,0.5], [0.5,1,0.5],
        [0,0.5,0.5], [1,0.5,0.5]
    ];
    
    oPositions.forEach(pos => {
        const atomGeometry = new THREE.SphereGeometry(0.35, 16, 16);
        const atom = new THREE.Mesh(atomGeometry, oMaterial);
        atom.position.set(pos[0]*a, pos[1]*a, pos[2]*a);
        atomsGroup.add(atom);
    });
    
    // Na⁺ dans tous les sites tétraédriques
    const naPositions = [
        [0.25, 0.25, 0.25], [0.75, 0.75, 0.25],
        [0.75, 0.25, 0.75], [0.25, 0.75, 0.75],
        [0.75, 0.75, 0.75], [0.25, 0.25, 0.75],
        [0.25, 0.75, 0.25], [0.75, 0.25, 0.25]
    ];
    
    naPositions.forEach(pos => {
        const atomGeometry = new THREE.SphereGeometry(0.25, 16, 16);
        const atom = new THREE.Mesh(atomGeometry, naMaterial);
        atom.position.set(pos[0]*a, pos[1]*a, pos[2]*a);
        atomsGroup.add(atom);
    });
    
    // Arêtes du cube
    const cubeEdges = [
        [0,0,0, 1,0,0], [0,0,1, 1,0,1], [0,0,0, 0,0,1], [1,0,0, 1,0,1],
        [0,1,0, 1,1,0], [0,1,1, 1,1,1], [0,1,0, 0,1,1], [1,1,0, 1,1,1],
        [0,0,0, 0,1,0], [1,0,0, 1,1,0], [0,0,1, 0,1,1], [1,0,1, 1,1,1]
    ];
    
    cubeEdges.forEach(edge => {
        const points = [];
        points.push(new THREE.Vector3(edge[0]*a, edge[1]*a, edge[2]*a));
        points.push(new THREE.Vector3(edge[3]*a, edge[4]*a, edge[5]*a));
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, bondMaterial);
        bondsGroup.add(line);
    });
}

// Afficher un plan réticulaire
function showReticularPlane() {
    if (!planeGroup) return;
    
    // Nettoyer le groupe plan
    while(planeGroup.children.length > 0) {
        planeGroup.remove(planeGroup.children[0]);
    }
    
    const a = parseFloat(document.getElementById('a-param').value);
    const h = parseInt(document.getElementById('h-plane').value);
    const k = parseInt(document.getElementById('k-plane').value);
    const l = parseInt(document.getElementById('l-plane').value);
    
    if (h === 0 && k === 0 && l === 0) {
        alert("Les indices du plan ne peuvent pas être tous nuls");
        return;
    }
    
    const planeGeometry = new THREE.PlaneGeometry(20, 20);
    const planeMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xff6b6b, 
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.4
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    
    // Positionner le plan selon les indices (h,k,l)
    const normal = new THREE.Vector3(h, k, l).normalize();
    plane.lookAt(normal);
    plane.position.copy(normal.multiplyScalar(2));
    
    planeGroup.add(plane);
}

// Masquer le plan
function hidePlane() {
    if (!planeGroup) return;
    
    while(planeGroup.children.length > 0) {
        planeGroup.remove(planeGroup.children[0]);
    }
}

// Masquer la projection
function hideProjection() {
    if (!projectionGroup) return;
    
    while(projectionGroup.children.length > 0) {
        projectionGroup.remove(projectionGroup.children[0]);
    }
    
    // Réafficher les atomes et liaisons
    atomsGroup.visible = true;
    bondsGroup.visible = true;
    axisGroup.visible = true;
    
    // Restaurer la caméra
    if (originalCameraPosition) {
        camera.position.copy(originalCameraPosition);
        controls.target.set(0, 0, 0);
        controls.update();
    }
    
    isProjectionMode = false;
}

// Basculer l'affichage des lignes intérieures
function toggleInternalLines() {
    showInternalLines = !showInternalLines;
    internalLinesGroup.visible = showInternalLines;
    
    const button = document.getElementById('toggle-internal-lines');
    if (showInternalLines) {
        button.textContent = "Masquer les lignes intérieures";
        button.style.backgroundColor = '#ff6b6b';
    } else {
        button.textContent = "Afficher les lignes intérieures";
        button.style.backgroundColor = '#4a9eff';
    }
}

// Configuration des événements
function setupEventListeners() {
    // Changement de section menu
    document.getElementById('menu-section').addEventListener('change', function() {
        const sections = document.querySelectorAll('.menu-section');
        sections.forEach(section => section.classList.remove('active'));
        document.getElementById(this.value).classList.add('active');
    });
    
    // Changement de type de cristal
    document.getElementById('crystal-type').addEventListener('change', function() {
        createCrystal(this.value);
    });
    
    // Contrôles des paramètres de maille
    document.getElementById('a-param').addEventListener('input', function() {
        const value = parseFloat(this.value);
        document.getElementById('a-value').textContent = value.toFixed(1);
        createCrystal(currentCrystalType);
    });
    
    document.getElementById('b-param').addEventListener('input', function() {
        const value = parseFloat(this.value);
        document.getElementById('b-value').textContent = value.toFixed(1);
        createCrystal(currentCrystalType);
    });
    
    document.getElementById('c-param').addEventListener('input', function() {
        const value = parseFloat(this.value);
        document.getElementById('c-value').textContent = value.toFixed(1);
        createCrystal(currentCrystalType);
    });
    
    // Contrôle de vitesse de rotation
    document.getElementById('rotation-speed').addEventListener('input', function() {
        const speed = parseInt(this.value);
        document.getElementById('speed-value').textContent = speed + '%';
        rotationSpeed = (speed / 50) * 0.005;
    });
    
    // Contrôles des plans réticulaires
    document.getElementById('h-plane').addEventListener('input', function() {
        document.getElementById('h-value').textContent = this.value;
    });
    
    document.getElementById('k-plane').addEventListener('input', function() {
        document.getElementById('k-value').textContent = this.value;
    });
    
    document.getElementById('l-plane').addEventListener('input', function() {
        document.getElementById('l-value').textContent = this.value;
    });
    
    // Boutons des plans
    document.getElementById('show-plane').addEventListener('click', showReticularPlane);
    document.getElementById('hide-plane').addEventListener('click', hidePlane);
    
    // Boutons de vue
    document.getElementById('apply-view').addEventListener('click', function() {
        const viewType = document.getElementById('view-type').value;
        applyView(viewType);
    });
    
    document.getElementById('reset-view').addEventListener('click', function() {
        if (controls) {
            controls.reset();
            applyView('standard');
        }
    });
    
    document.getElementById('toggle-animation').addEventListener('click', function() {
        isAnimating = !isAnimating;
        this.textContent = isAnimating ? "Arrêter Animation" : "Démarrer Animation";
    });
    
    // Bouton lignes intérieures
    document.getElementById('toggle-internal-lines').addEventListener('click', toggleInternalLines);
}

// Gérer le redimensionnement de la fenêtre
function onWindowResize() {
    if (!camera || !renderer) return;
    
    const container = document.getElementById('crystal-container');
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

// Fonction d'animation principale
function animate() {
    animationId = requestAnimationFrame(animate);
    
    if (crystalGroup && isAnimating && !isProjectionMode) {
        crystalGroup.rotation.y += rotationSpeed;
    }
    
    if (controls) {
        controls.update();
    }
    
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

// Initialisation au chargement de la page
window.addEventListener('DOMContentLoaded', function() {
    console.log("Démarrage de l'application...");
    setTimeout(function() {
        try {
            initThreeJS();
            setupEventListeners();
            console.log("Application initialisée avec succès");
        } catch (error) {
            console.error("Erreur lors de l'initialisation:", error);
            document.getElementById('loading-message').innerHTML = 
                'Erreur lors du chargement de l\'application. Vérifiez la console pour plus de détails.';
        }
    }, 500);
});
