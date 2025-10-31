// Variables globales
let scene, camera, renderer, controls;
let crystalGroup, planeGroup, axisGroup, projectionGroup;
let atomsGroup, bondsGroup, internalLinesGroup, anionMailleGroup, cationMailleGroup;
let animationId = null;
let isInitialized = false;
let rotationSpeed = 0.005;
let isAnimating = false;
let isProjectionMode = false;
let originalCameraPosition;
let currentCrystalType = 'cubique-simple';
let currentAngle = 0;
let showInternalLines = false;
let showMailleImbriquee = false;
let projectionMode = 'base'; // 'base', 'sites', 'all'

// Définitions des vues
const viewPresets = {
    'standard': {
        position: new THREE.Vector3(0, -12, 5),
        target: new THREE.Vector3(0.5, 0.5, 0.5),
        description: "Vue standard 3D - Hexagonal debout"
    },
    'plan-basal': {
        position: new THREE.Vector3(0, 0, 15),
        target: new THREE.Vector3(0.5, 0.5, 0.5),
        description: "Vue du plan basal montrant l'hexagone"
    },
    'edifice': {
        position: new THREE.Vector3(10, 30, 12),
        target: new THREE.Vector3(0.5, 0.5, 0.5),
        description: "Vue de l'édifice ABAB"
    },
    'axiale': {
        position: new THREE.Vector3(0, -8, 12),
        target: new THREE.Vector3(0.5, 0.5, 0.5),
        description: "Vue axiale parallèle à l'axe c"
    },
    'diagonale': {
        position: new THREE.Vector3(8, -8, 8),
        target: new THREE.Vector3(0.5, 0.5, 0.5),
        description: "Vue diagonale isométrique"
    },
    'cristallographique': {
        position: new THREE.Vector3(5, 25, 10),
        target: new THREE.Vector3(0.5, 0.5, 0.5),
        description: "Vue cristallographique standard"
    }
};

// Initialisation de la scène Three.js
function initThreeJS() {
    if (isInitialized) return;
    
    // Vérifier si WebGL est supporté
    if (!window.WebGLRenderingContext) {
        document.getElementById('loading-message').innerHTML = 
            'Votre navigateur ne supporte pas WebGL. Veuillez utiliser un navigateur plus récent.';
        return;
    }
    
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
        
        // Ajouter les contrôles orbitaux avec centre en (1/2,1/2,1/2)
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.target.set(0.5, 0.5, 0.5);
        
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
        anionMailleGroup = new THREE.Group();
        cationMailleGroup = new THREE.Group();
        planeGroup = new THREE.Group();
        axisGroup = new THREE.Group();
        projectionGroup = new THREE.Group();
        
        crystalGroup.add(atomsGroup);
        crystalGroup.add(bondsGroup);
        crystalGroup.add(internalLinesGroup);
        crystalGroup.add(anionMailleGroup);
        crystalGroup.add(cationMailleGroup);
        crystalGroup.add(axisGroup);
        scene.add(planeGroup);
        scene.add(projectionGroup);
        
        // Masquer les groupes par défaut
        internalLinesGroup.visible = false;
        anionMailleGroup.visible = false;
        cationMailleGroup.visible = false;
        
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
        
        console.log(`Vue appliquée: ${view.description}`);
    }
}

// Créer le système d'axes
function createAxisSystem() {
    while(axisGroup.children.length > 0) { 
        const child = axisGroup.children[0];
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
        axisGroup.remove(child);
    }
    
    const a = parseFloat(document.getElementById('a-param').value);
    const b = parseFloat(document.getElementById('b-param').value);
    const c_val = parseFloat(document.getElementById('c-param').value);
    const crystalType = document.getElementById('crystal-type').value;
    
    // Origine (point O)
    const originGeometry = new THREE.SphereGeometry(0.15, 16, 16);
    const originMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const origin = new THREE.Mesh(originGeometry, originMaterial);
    origin.position.set(0, 0, 0);
    axisGroup.add(origin);
    
    if (crystalType === 'hexagonal') {
        const angle120 = (2 * Math.PI) / 3;
        
        // Vecteur a (axe X)
        const arrowHelperA = new THREE.ArrowHelper(
            new THREE.Vector3(-1, 0, 0),
            new THREE.Vector3(0, 0, 0),
            a,
            0xff4444,
            0.4,
            0.2
        );
        axisGroup.add(arrowHelperA);
        
        // Vecteur b à 120° de a
        const arrowHelperB = new THREE.ArrowHelper(
            new THREE.Vector3(-Math.cos(angle120), -Math.sin(angle120), 0),
            new THREE.Vector3(0, 0, 0),
            b,
            0x44ff44,
            0.4,
            0.2
        );
        axisGroup.add(arrowHelperB);
        
        // Vecteur c (axe Z)
        const arrowHelperC = new THREE.ArrowHelper(
            new THREE.Vector3(0, 0, 1),
            new THREE.Vector3(0, 0, 0),
            c_val,
            0x4444ff,
            0.4,
            0.2
        );
        axisGroup.add(arrowHelperC);
    } else {
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
        
        // Vecteur b (axe Z)
        const arrowHelperB = new THREE.ArrowHelper(
            new THREE.Vector3(0, 0, 1),
            new THREE.Vector3(0, 0, 0),
            b,
            0x44ff44,
            0.4,
            0.2
        );
        axisGroup.add(arrowHelperB);
        
        // Vecteur c (axe Y)
        const arrowHelperC = new THREE.ArrowHelper(
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(0, 0, 0),
            c_val,
            0x4444ff,
            0.4,
            0.2
        );
        axisGroup.add(arrowHelperC);
    }
}

// Mettre à jour la légende des atomes
function updateAtomLegend(type, isProjection = false) {
    const legendContent = document.getElementById('legend-content');
    legendContent.innerHTML = '';
    
    if (isProjection && projectionMode === 'sites') {
        // Légende pour la vue projection des sites uniquement
        switch(type) {
            case 'ionique-nacl':
                addAtomToLegend('Na⁺ (octaédrique)', '#4a9eff', 'circle');
                break;
            case 'ionique-csz':
                addAtomToLegend('Cs⁺ (cubique)', '#9c27b0', 'circle');
                break;
            case 'ionique-zns':
                addAtomToLegend('Zn²⁺ (tétraédrique)', '#4a9eff', 'circle');
                break;
            case 'fluorine':
                addAtomToLegend('F⁻ (tétraédrique)', '#00ff00', 'circle');
                break;
            case 'antifluorine':
                addAtomToLegend('Na⁺ (tétraédrique)', '#4a9eff', 'circle');
                break;
            default:
                addAtomToLegend('Atome dans site', '#4a9eff', 'circle');
        }
    } else if (isProjection && projectionMode === 'base') {
        // Légende pour la vue projection de base uniquement
        switch(type) {
            case 'ionique-nacl':
                addAtomToLegend('Cl⁻ (réseau FCC)', '#4caf50', 'circle');
                break;
            case 'ionique-csz':
                addAtomToLegend('Cl⁻ (sommets)', '#4caf50', 'circle');
                break;
            case 'ionique-zns':
                addAtomToLegend('S²⁻ (réseau FCC)', '#ffa726', 'circle');
                break;
            case 'fluorine':
                addAtomToLegend('Ca²⁺ (réseau FCC)', '#888888', 'circle');
                break;
            case 'antifluorine':
                addAtomToLegend('O²⁻ (réseau FCC)', '#ff6b6b', 'circle');
                break;
            default:
                addAtomToLegend('Atome de base', '#4a9eff', 'circle');
        }
    } else if (isProjection) {
        // Légende pour la vue projection normale (tout)
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
    } else {
        // Légende pour la vue 3D normale (toujours des sphères)
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
}

// Ajouter un atome à la légende
function addAtomToLegend(name, color, shape) {
    const atomItem = document.createElement('div');
    atomItem.className = 'atom-item';
    
    if (shape === 'square-empty') {
        atomItem.innerHTML = `
            <div class="atom-square" style="border-color: ${color};"></div>
            <span>${name}</span>
        `;
    } else if (shape === 'square-filled') {
        atomItem.innerHTML = `
            <div class="atom-square-filled" style="color: ${color};"></div>
            <span>${name}</span>
        `;
    } else {
        atomItem.innerHTML = `
            <div class="atom-color" style="background-color: ${color};"></div>
            <span>${name}</span>
        `;
    }
    document.getElementById('legend-content').appendChild(atomItem);
}

// Mettre à jour uniquement la géométrie sans réinitialiser la vue
function updateCrystalGeometry() {
    if (!atomsGroup || !bondsGroup) return;
    
    const savedPosition = camera.position.clone();
    const savedRotation = crystalGroup.rotation.clone();
    const savedTarget = controls.target.clone();
    
    while(atomsGroup.children.length > 0) { 
        const child = atomsGroup.children[0];
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
        atomsGroup.remove(child);
    }
    
    while(bondsGroup.children.length > 0) { 
        const child = bondsGroup.children[0];
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
        bondsGroup.remove(child);
    }
    
    while(internalLinesGroup.children.length > 0) { 
        const child = internalLinesGroup.children[0];
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
        internalLinesGroup.remove(child);
    }
    
    while(anionMailleGroup.children.length > 0) { 
        const child = anionMailleGroup.children[0];
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
        anionMailleGroup.remove(child);
    }
    
    while(cationMailleGroup.children.length > 0) { 
        const child = cationMailleGroup.children[0];
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
        cationMailleGroup.remove(child);
    }
    
    const a = parseFloat(document.getElementById('a-param').value);
    const b = parseFloat(document.getElementById('b-param').value);
    const c_val = parseFloat(document.getElementById('c-param').value);
    
    const atomMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x4a9eff, 
        shininess: 100 
    });
    
    const bondMaterial = new THREE.LineBasicMaterial({ 
        color: 0xffffff,
        linewidth: 2
    });
    
    switch(currentCrystalType) {
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
            createHexagonalStructure(a, c_val, atomMaterial, bondMaterial);
            break;
        case 'fluorine':
            createFluorineStructure(a, atomMaterial, bondMaterial);
            break;
        case 'antifluorine':
            createAntifluorineStructure(a, atomMaterial, bondMaterial);
            break;
    }
    
    createAxisSystem();
    
    camera.position.copy(savedPosition);
    crystalGroup.rotation.copy(savedRotation);
    controls.target.copy(savedTarget);
    controls.update();
    
    updateCrystalInfo(currentCrystalType, a, b, c_val);
}

// Créer un cristal basé sur le type sélectionné
function createCrystal(type) {
    currentCrystalType = type;
    
    if (!atomsGroup || !bondsGroup) return;
    
    while(atomsGroup.children.length > 0) { 
        const child = atomsGroup.children[0];
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
        atomsGroup.remove(child);
    }
    
    while(bondsGroup.children.length > 0) { 
        const child = bondsGroup.children[0];
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
        bondsGroup.remove(child);
    }
    
    while(internalLinesGroup.children.length > 0) { 
        const child = internalLinesGroup.children[0];
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
        internalLinesGroup.remove(child);
    }
    
    while(anionMailleGroup.children.length > 0) { 
        const child = anionMailleGroup.children[0];
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
        anionMailleGroup.remove(child);
    }
    
    while(cationMailleGroup.children.length > 0) { 
        const child = cationMailleGroup.children[0];
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
        cationMailleGroup.remove(child);
    }
    
    hideProjection();
    
    updateAtomLegend(type, false); // Vue 3D normale
    
    // Masquer les contrôles de mode uniquement pour l'hexagonal
    const projectionControls = document.getElementById('projection-mode-controls');
    if (type === 'hexagonal') {
        projectionControls.classList.add('hidden');
    } else {
        projectionControls.classList.remove('hidden');
    }
    
    const internalLinesControl = document.getElementById('internal-lines-control');
    if (type === 'hexagonal' || type === 'cubique-centre') {
        internalLinesControl.style.display = 'block';
    } else {
        internalLinesControl.style.display = 'none';
        showInternalLines = false;
        internalLinesGroup.visible = false;
        const button = document.getElementById('toggle-internal-lines');
        button.textContent = "Afficher les lignes intérieures";
        button.style.backgroundColor = '#4a9eff';
    }
    
    const mailleControl = document.getElementById('maille-control');
    if (type === 'ionique-nacl' || type === 'ionique-csz' || type === 'ionique-zns' || type === 'fluorine' || type === 'antifluorine') {
        mailleControl.style.display = 'block';
    } else {
        mailleControl.style.display = 'none';
        showMailleImbriquee = false;
        anionMailleGroup.visible = false;
        cationMailleGroup.visible = false;
        const button = document.getElementById('toggle-maille');
        button.textContent = "Afficher les mailles imbriquées";
        button.style.backgroundColor = '#4a9eff';
    }
    
    const a = parseFloat(document.getElementById('a-param').value);
    const b = parseFloat(document.getElementById('b-param').value);
    const c_val = parseFloat(document.getElementById('c-param').value);
    
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
            createHexagonalStructure(a, c_val, atomMaterial, bondMaterial);
            break;
        case 'fluorine':
            createFluorineStructure(a, atomMaterial, bondMaterial);
            break;
        case 'antifluorine':
            createAntifluorineStructure(a, atomMaterial, bondMaterial);
            break;
    }
    
    createAxisSystem();
    
    applyView('standard');
    
    updateCrystalInfo(type, a, b, c_val);
}

// Structure cubique simple
function createSimpleCubic(a, atomMaterial, bondMaterial) {
    for(let i = 0; i < 2; i++) {
        for(let j = 0; j < 2; j++) {
            for(let k = 0; k < 2; k++) {
                const atomGeometry = new THREE.SphereGeometry(0.3, 16, 16);
                const atom = new THREE.Mesh(atomGeometry, atomMaterial);
                atom.position.set(i * a, k * a, j * a);
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
    for(let i = 0; i < 2; i++) {
        for(let j = 0; j < 2; j++) {
            for(let k = 0; k < 2; k++) {
                const atomGeometry = new THREE.SphereGeometry(0.3, 16, 16);
                const atom = new THREE.Mesh(atomGeometry, atomMaterial);
                atom.position.set(i * a, k * a, j * a);
                atomsGroup.add(atom);
            }
        }
    }
    
    const centerAtomGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    const centerAtom = new THREE.Mesh(centerAtomGeometry, atomMaterial);
    centerAtom.position.set(a/2, a/2, a/2);
    atomsGroup.add(centerAtom);
    
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
    
    for(let i = 0; i < 2; i++) {
        for(let j = 0; j < 2; j++) {
            for(let k = 0; k < 2; k++) {
                const points = [];
                points.push(new THREE.Vector3(i*a, k*a, j*a));
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
    for(let i = 0; i < 2; i++) {
        for(let j = 0; j < 2; j++) {
            for(let k = 0; k < 2; k++) {
                const atomGeometry = new THREE.SphereGeometry(0.3, 16, 16);
                const atom = new THREE.Mesh(atomGeometry, atomMaterial);
                atom.position.set(i * a, k * a, j * a);
                atomsGroup.add(atom);
            }
        }
    }
    
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
    
    // Chlore (Cl⁻) - positions FCC (sommets + centres des faces)
    const clPositions = [
        // Coins
        [0,0,0], [a,0,0], [0,0,a], [a,0,a],
        [0,a,0], [a,a,0], [0,a,a], [a,a,a],
        // Centres des faces
        [a/2,a/2,0], [a/2,a/2,a],
        [a/2,0,a/2], [a/2,a,a/2],
        [0,a/2,a/2], [a,a/2,a/2]
    ];
    
    // Sodium (Na⁺) - TOUS les sites octaédriques
    const naPositions = [
        // Centre du cube
        [a/2, a/2, a/2],
        // Centres des arêtes
        [a/2, 0, 0], [a/2, 0, a], [0, a/2, 0], [a, a/2, 0],
        [0, 0, a/2], [a, 0, a/2], [0, a, a/2], [a, a, a/2],
        [a/2, a, 0], [a/2, a, a], [a, a/2, a], [0, a/2, a]
    ];
    
    function isInMaille(x, y, z, a) {
        const epsilon = 0.001;
        return (x >= -epsilon && x <= a + epsilon && 
                y >= -epsilon && y <= a + epsilon && 
                z >= -epsilon && z <= a + epsilon);
    }
    
    // Créer les atomes Cl⁻
    clPositions.forEach(pos => {
        if (!showMailleImbriquee || isInMaille(pos[0], pos[1], pos[2], a)) {
            const clGeometry = new THREE.SphereGeometry(0.3, 16, 16);
            const clAtom = new THREE.Mesh(clGeometry, clMaterial);
            clAtom.position.set(pos[0], pos[1], pos[2]);
            atomsGroup.add(clAtom);
        }
    });
    
    // Créer les atomes Na⁺
    naPositions.forEach(pos => {
        if (!showMailleImbriquee || isInMaille(pos[0], pos[1], pos[2], a)) {
            const naGeometry = new THREE.SphereGeometry(0.25, 16, 16);
            const naAtom = new THREE.Mesh(naGeometry, naMaterial);
            naAtom.position.set(pos[0], pos[1], pos[2]);
            atomsGroup.add(naAtom);
        }
    });
    
    const edges = [
        [0,0,0, a,0,0], [0,0,a, a,0,a], [0,0,0, 0,0,a], [a,0,0, a,0,a],
        [0,a,0, a,a,0], [0,a,a, a,a,a], [0,a,0, 0,a,a], [a,a,0, a,a,a],
        [0,0,0, 0,a,0], [a,0,0, a,a,0], [0,0,a, 0,a,a], [a,0,a, a,a,a]
    ];
    
    edges.forEach(edge => {
        const points = [];
        points.push(new THREE.Vector3(edge[0], edge[1], edge[2]));
        points.push(new THREE.Vector3(edge[3], edge[4], edge[5]));
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, bondMaterial);
        bondsGroup.add(line);
    });
    
    if (showMailleImbriquee) {
        createMailleImbriquee(a);
    }
}

// Structure CsCl
function createCsClStructure(a, atomMaterial, bondMaterial) {
    const csMaterial = new THREE.MeshPhongMaterial({ color: 0x9c27b0 });
    const clMaterial = new THREE.MeshPhongMaterial({ color: 0x4caf50 });
    
    function isInMaille(x, y, z, a) {
        const epsilon = 0.001;
        return (x >= -epsilon && x <= a + epsilon && 
                y >= -epsilon && y <= a + epsilon && 
                z >= -epsilon && z <= a + epsilon);
    }
    
    for(let i = 0; i < 2; i++) {
        for(let j = 0; j < 2; j++) {
            for(let k = 0; k < 2; k++) {
                if (!showMailleImbriquee || isInMaille(i*a, j*a, k*a, a)) {
                    const clGeometry = new THREE.SphereGeometry(0.3, 16, 16);
                    const clAtom = new THREE.Mesh(clGeometry, clMaterial);
                    clAtom.position.set(i * a, j * a, k * a);
                    atomsGroup.add(clAtom);
                }
            }
        }
    }
    
    if (!showMailleImbriquee || isInMaille(a/2, a/2, a/2, a)) {
        const csGeometry = new THREE.SphereGeometry(0.4, 16, 16);
        const csAtom = new THREE.Mesh(csGeometry, csMaterial);
        csAtom.position.set(a/2, a/2, a/2);
        atomsGroup.add(csAtom);
    }
    
    const cubeEdges = [
        [0,0,0, a,0,0], [0,0,a, a,0,a], [0,0,0, 0,0,a], [a,0,0, a,0,a],
        [0,a,0, a,a,0], [0,a,a, a,a,a], [0,a,0, 0,a,a], [a,a,0, a,a,a],
        [0,0,0, 0,a,0], [a,0,0, a,a,0], [0,0,a, 0,a,a], [a,0,a, a,a,a]
    ];
    
    cubeEdges.forEach(edge => {
        const points = [];
        points.push(new THREE.Vector3(edge[0], edge[1], edge[2]));
        points.push(new THREE.Vector3(edge[3], edge[4], edge[5]));
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, bondMaterial);
        bondsGroup.add(line);
    });
    
    if (showMailleImbriquee) {
        createMailleImbriquee(a);
    }
}

// Structure ZnS (Blende)
function createZnSStructure(a, atomMaterial, bondMaterial) {
    const znMaterial = new THREE.MeshPhongMaterial({ color: 0x4a9eff });
    const sMaterial = new THREE.MeshPhongMaterial({ color: 0xffa726 });
    
    function isInMaille(x, y, z, a) {
        const epsilon = 0.001;
        return (x >= -epsilon && x <= a + epsilon && 
                y >= -epsilon && y <= a + epsilon && 
                z >= -epsilon && z <= a + epsilon);
    }
    
    // Soufre (S²⁻) - positions FCC
    const sPositions = [
        // Coins
        [0,0,0], [a,0,0], [0,0,a], [a,0,a],
        [0,a,0], [a,a,0], [0,a,a], [a,a,a],
        // Centres des faces
        [a/2,a/2,0], [a/2,a/2,a],
        [a/2,0,a/2], [a/2,a,a/2],
        [0,a/2,a/2], [a,a/2,a/2]
    ];
    
    // Zinc (Zn²⁺) - dans la moitié des sites tétraédriques (alternés)
    const znPositions = [
        [a/4, a/4, a/4],     // Site tétraédrique 1
        [3*a/4, 3*a/4, a/4], // Site tétraédrique 2  
        [3*a/4, a/4, 3*a/4], // Site tétraédrique 3
        [a/4, 3*a/4, 3*a/4]  // Site tétraédrique 4
    ];
    
    // Créer les atomes S²⁻
    sPositions.forEach(pos => {
        if (!showMailleImbriquee || isInMaille(pos[0], pos[1], pos[2], a)) {
            const sGeometry = new THREE.SphereGeometry(0.3, 16, 16);
            const sAtom = new THREE.Mesh(sGeometry, sMaterial);
            sAtom.position.set(pos[0], pos[1], pos[2]);
            atomsGroup.add(sAtom);
        }
    });
    
    // Créer les atomes Zn²⁺
    znPositions.forEach(pos => {
        if (!showMailleImbriquee || isInMaille(pos[0], pos[1], pos[2], a)) {
            const znGeometry = new THREE.SphereGeometry(0.25, 16, 16);
            const znAtom = new THREE.Mesh(znGeometry, znMaterial);
            znAtom.position.set(pos[0], pos[1], pos[2]);
            atomsGroup.add(znAtom);
        }
    });
    
    const cubeEdges = [
        [0,0,0, a,0,0], [0,0,a, a,0,a], [0,0,0, 0,0,a], [a,0,0, a,0,a],
        [0,a,0, a,a,0], [0,a,a, a,a,a], [0,a,0, 0,a,a], [a,a,0, a,a,a],
        [0,0,0, 0,a,0], [a,0,0, a,a,0], [0,0,a, 0,a,a], [a,0,a, a,a,a]
    ];
    
    cubeEdges.forEach(edge => {
        const points = [];
        points.push(new THREE.Vector3(edge[0], edge[1], edge[2]));
        points.push(new THREE.Vector3(edge[3], edge[4], edge[5]));
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, bondMaterial);
        bondsGroup.add(line);
    });
    
    if (showMailleImbriquee) {
        createMailleImbriquee(a);
    }
}

// Structure hexagonale compacte
function createHexagonalStructure(a, c_val, atomMaterial, bondMaterial) {
    const angle120 = (2 * Math.PI) / 3;
    
    const atomPositions = [
        [-1, -1, 0],
        [0, -1, 0],
        [-1, 0, 0],
        [0, 0, 0],
        [-1, -1, 1],
        [0, -1, 1],
        [-1, 0, 1],
        [0, 0, 1],
        [-1/3, -2/3, 1/2]
    ];
    
    atomPositions.forEach(fracPos => {
        const x = fracPos[0] * a + fracPos[1] * a * Math.cos(angle120);
        const y = fracPos[1] * a * Math.sin(angle120);
        const z = fracPos[2] * c_val;
        
        const atomGeometry = new THREE.SphereGeometry(0.3, 16, 16);
        const atom = new THREE.Mesh(atomGeometry, atomMaterial);
        atom.position.set(x, y, z);
        atomsGroup.add(atom);
    });
    
    const baseBonds = [
        [-1,-1,0, 0,-1,0],
        [-1,-1,0, -1,0,0],
        [0,-1,0, 0,0,0],
        [-1,0,0, 0,0,0],
    ];
    
    const topBonds = [
        [-1,-1,1, 0,-1,1],
        [-1,-1,1, -1,0,1],
        [0,-1,1, 0,0,1],
        [-1,0,1, 0,0,1],
    ];
    
    const verticalBonds = [
        [-1,-1,0, -1,-1,1],
        [0,-1,0, 0,-1,1],
        [-1,0,0, -1,0,1],
        [0,0,0, 0,0,1]
    ];
    
    const internalBonds = [
        [-1,-1,0, -1/3,-2/3,1/2],
        [0,-1,0, -1/3,-2/3,1/2],
        [-1,0,0, -1/3,-2/3,1/2],
        [0,0,0, -1/3,-2/3,1/2],
        [-1,-1,1, -1/3,-2/3,1/2],
        [0,-1,1, -1/3,-2/3,1/2],
        [-1,0,1, -1/3,-2/3,1/2],
        [0,0,1, -1/3,-2/3,1/2]
    ];
    
    function fracToCart(fracPos) {
        const x = fracPos[0] * a + fracPos[1] * a * Math.cos(angle120);
        const y = fracPos[1] * a * Math.sin(angle120);
        const z = fracPos[2] * c_val;
        return new THREE.Vector3(x, y, z);
    }
    
    [...baseBonds, ...topBonds, ...verticalBonds].forEach(bond => {
        const startPos = fracToCart([bond[0], bond[1], bond[2]]);
        const endPos = fracToCart([bond[3], bond[4], bond[5]]);
        
        const points = [startPos, endPos];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, bondMaterial);
        bondsGroup.add(line);
    });
    
    internalBonds.forEach(bond => {
        const startPos = fracToCart([bond[0], bond[1], bond[2]]);
        const endPos = fracToCart([bond[3], bond[4], bond[5]]);
        
        const points = [startPos, endPos];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, bondMaterial);
        internalLinesGroup.add(line);
    });
}

// Structure Fluorine (CaF₂)
function createFluorineStructure(a, atomMaterial, bondMaterial) {
    const caMaterial = new THREE.MeshPhongMaterial({ color: 0x888888 });
    const fMaterial = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
    
    function isInMaille(x, y, z, a) {
        const epsilon = 0.001;
        return (x >= -epsilon && x <= a + epsilon && 
                y >= -epsilon && y <= a + epsilon && 
                z >= -epsilon && z <= a + epsilon);
    }
    
    // Calcium (Ca²⁺) - positions FCC
    const caPositions = [
        // Coins
        [0,0,0], [a,0,0], [0,0,a], [a,0,a],
        [0,a,0], [a,a,0], [0,a,a], [a,a,a],
        // Centres des faces
        [a/2,a/2,0], [a/2,a/2,a],
        [a/2,0,a/2], [a/2,a,a/2],
        [0,a/2,a/2], [a,a/2,a/2]
    ];
    
    // Fluor (F⁻) - dans TOUS les sites tétraédriques
    const fPositions = [
        [a/4, a/4, a/4], [3*a/4, 3*a/4, a/4],
        [3*a/4, a/4, 3*a/4], [a/4, 3*a/4, 3*a/4],
        [3*a/4, 3*a/4, 3*a/4], [a/4, a/4, 3*a/4],
        [a/4, 3*a/4, a/4], [3*a/4, a/4, a/4]
    ];
    
    // Créer les atomes Ca²⁺
    caPositions.forEach(pos => {
        if (!showMailleImbriquee || isInMaille(pos[0], pos[1], pos[2], a)) {
            const atomGeometry = new THREE.SphereGeometry(0.35, 16, 16);
            const atom = new THREE.Mesh(atomGeometry, caMaterial);
            atom.position.set(pos[0], pos[1], pos[2]);
            atomsGroup.add(atom);
        }
    });
    
    // Créer les atomes F⁻
    fPositions.forEach(pos => {
        if (!showMailleImbriquee || isInMaille(pos[0], pos[1], pos[2], a)) {
            const atomGeometry = new THREE.SphereGeometry(0.25, 16, 16);
            const atom = new THREE.Mesh(atomGeometry, fMaterial);
            atom.position.set(pos[0], pos[1], pos[2]);
            atomsGroup.add(atom);
        }
    });
    
    const cubeEdges = [
        [0,0,0, a,0,0], [0,0,a, a,0,a], [0,0,0, 0,0,a], [a,0,0, a,0,a],
        [0,a,0, a,a,0], [0,a,a, a,a,a], [0,a,0, 0,a,a], [a,a,0, a,a,a],
        [0,0,0, 0,a,0], [a,0,0, a,a,0], [0,0,a, 0,a,a], [a,0,a, a,a,a]
    ];
    
    cubeEdges.forEach(edge => {
        const points = [];
        points.push(new THREE.Vector3(edge[0], edge[1], edge[2]));
        points.push(new THREE.Vector3(edge[3], edge[4], edge[5]));
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, bondMaterial);
        bondsGroup.add(line);
    });
    
    if (showMailleImbriquee) {
        createMailleImbriquee(a);
    }
}

// Structure Antifluorine (Na₂O)
function createAntifluorineStructure(a, atomMaterial, bondMaterial) {
    const naMaterial = new THREE.MeshPhongMaterial({ color: 0x4a9eff });
    const oMaterial = new THREE.MeshPhongMaterial({ color: 0xff6b6b });
    
    function isInMaille(x, y, z, a) {
        const epsilon = 0.001;
        return (x >= -epsilon && x <= a + epsilon && 
                y >= -epsilon && y <= a + epsilon && 
                z >= -epsilon && z <= a + epsilon);
    }
    
    // Oxygène (O²⁻) - positions FCC
    const oPositions = [
        // Coins
        [0,0,0], [a,0,0], [0,0,a], [a,0,a],
        [0,a,0], [a,a,0], [0,a,a], [a,a,a],
        // Centres des faces
        [a/2,a/2,0], [a/2,a/2,a],
        [a/2,0,a/2], [a/2,a,a/2],
        [0,a/2,a/2], [a,a/2,a/2]
    ];
    
    // Sodium (Na⁺) - dans TOUS les sites tétraédriques
    const naPositions = [
        [a/4, a/4, a/4], [3*a/4, 3*a/4, a/4],
        [3*a/4, a/4, 3*a/4], [a/4, 3*a/4, 3*a/4],
        [3*a/4, 3*a/4, 3*a/4], [a/4, a/4, 3*a/4],
        [a/4, 3*a/4, a/4], [3*a/4, a/4, a/4]
    ];
    
    // Créer les atomes O²⁻
    oPositions.forEach(pos => {
        if (!showMailleImbriquee || isInMaille(pos[0], pos[1], pos[2], a)) {
            const atomGeometry = new THREE.SphereGeometry(0.35, 16, 16);
            const atom = new THREE.Mesh(atomGeometry, oMaterial);
            atom.position.set(pos[0], pos[1], pos[2]);
            atomsGroup.add(atom);
        }
    });
    
    // Créer les atomes Na⁺
    naPositions.forEach(pos => {
        if (!showMailleImbriquee || isInMaille(pos[0], pos[1], pos[2], a)) {
            const atomGeometry = new THREE.SphereGeometry(0.25, 16, 16);
            const atom = new THREE.Mesh(atomGeometry, naMaterial);
            atom.position.set(pos[0], pos[1], pos[2]);
            atomsGroup.add(atom);
        }
    });
    
    const cubeEdges = [
        [0,0,0, a,0,0], [0,0,a, a,0,a], [0,0,0, 0,0,a], [a,0,0, a,0,a],
        [0,a,0, a,a,0], [0,a,a, a,a,a], [0,a,0, 0,a,a], [a,a,0, a,a,a],
        [0,0,0, 0,a,0], [a,0,0, a,a,0], [0,0,a, 0,a,a], [a,0,a, a,a,a]
    ];
    
    cubeEdges.forEach(edge => {
        const points = [];
        points.push(new THREE.Vector3(edge[0], edge[1], edge[2]));
        points.push(new THREE.Vector3(edge[3], edge[4], edge[5]));
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, bondMaterial);
        bondsGroup.add(line);
    });
    
    if (showMailleImbriquee) {
        createMailleImbriquee(a);
    }
}

// Créer les mailles imbriquées pour les cristaux ioniques
function createMailleImbriquee(a) {
    const anionMailleMaterial = new THREE.LineBasicMaterial({ color: 0xff6b6b });
    const cationMailleMaterial = new THREE.LineBasicMaterial({ color: 0x4a9eff });
    
    const anionEdges = [
        [0,0,0, a,0,0], [0,0,a, a,0,a], [0,0,0, 0,0,a], [a,0,0, a,0,a],
        [0,a,0, a,a,0], [0,a,a, a,a,a], [0,a,0, 0,a,a], [a,a,0, a,a,a],
        [0,0,0, 0,a,0], [a,0,0, a,a,0], [0,0,a, 0,a,a], [a,0,a, a,a,a]
    ];
    
    anionEdges.forEach(edge => {
        const points = [];
        points.push(new THREE.Vector3(edge[0], edge[1], edge[2]));
        points.push(new THREE.Vector3(edge[3], edge[4], edge[5]));
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, anionMailleMaterial);
        anionMailleGroup.add(line);
    });
    
    const cationEdges = [
        [a/2,a/2,a/2, 3*a/2,a/2,a/2], [a/2,a/2,3*a/2, 3*a/2,a/2,3*a/2], 
        [a/2,a/2,a/2, a/2,a/2,3*a/2], [3*a/2,a/2,a/2, 3*a/2,a/2,3*a/2],
        [a/2,3*a/2,a/2, 3*a/2,3*a/2,a/2], [a/2,3*a/2,3*a/2, 3*a/2,3*a/2,3*a/2],
        [a/2,3*a/2,a/2, a/2,3*a/2,3*a/2], [3*a/2,3*a/2,a/2, 3*a/2,3*a/2,3*a/2],
        [a/2,a/2,a/2, a/2,3*a/2,a/2], [3*a/2,a/2,a/2, 3*a/2,3*a/2,a/2],
        [a/2,a/2,3*a/2, a/2,3*a/2,3*a/2], [3*a/2,a/2,3*a/2, 3*a/2,3*a/2,3*a/2]
    ];
    
    cationEdges.forEach(edge => {
        const points = [];
        points.push(new THREE.Vector3(edge[0], edge[1], edge[2]));
        points.push(new THREE.Vector3(edge[3], edge[4], edge[5]));
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, cationMailleMaterial);
        cationMailleGroup.add(line);
    });
    
    anionMailleGroup.visible = true;
    cationMailleGroup.visible = true;
}

// Fonction pour calculer les côtes CORRECTES selon le plan choisi et son offset
function calculateCorrectDistance(atomPosition, h, k, l, offset, a) {
    if (h === 0 && k === 0 && l === 0) return 0;
    
    const normal = new THREE.Vector3(h, k, l).normalize();
    const d = offset / Math.sqrt(h*h + k*k + l*l);
    const planePoint = normal.clone().multiplyScalar(d);
    
    const toAtom = atomPosition.clone().sub(planePoint);
    const distanceToPlane = toAtom.dot(normal);
    
    let sign = 1;
    
    if (offset === 0) {
        const testPoint = new THREE.Vector3(0, 0, 1);
        const toTestPoint = testPoint.clone().sub(planePoint);
        const testDistance = toTestPoint.dot(normal);
        
        if (testDistance > 0) {
            sign = (distanceToPlane > 0) ? 1 : -1;
        } else {
            sign = (distanceToPlane > 0) ? -1 : 1;
        }
    } else {
        const origin = new THREE.Vector3(0, 0, 0);
        const toOrigin = origin.clone().sub(planePoint);
        const originDistance = toOrigin.dot(normal);
        
        if (originDistance > 0) {
            sign = (distanceToPlane > 0) ? -1 : 1;
        } else {
            sign = (distanceToPlane > 0) ? 1 : -1;
        }
    }
    
    let normalizedDistance;
    const distanceValue = Math.abs(distanceToPlane);
    
    if (h === 0 && k === 0) {
        normalizedDistance = distanceValue / a;
    } else if (l === 0) {
        normalizedDistance = distanceValue / a;
    } else {
        normalizedDistance = distanceValue / Math.sqrt(h*h + k*k + l*l);
    }
    
    return sign * normalizedDistance;
}

// Fonction pour formater les côtes avec fractions
function formatDistance(distance) {
    if (Math.abs(distance - Math.round(distance)) < 0.001) {
        return Math.round(distance).toString();
    }
    
    const fractions = [
        {value: 1/2, text: '½'},
        {value: 1/3, text: '⅓'},
        {value: 2/3, text: '⅔'},
        {value: 1/4, text: '¼'},
        {value: 3/4, text: '¾'},
        {value: -1/2, text: '-½'},
        {value: -1/3, text: '-⅓'},
        {value: -2/3, text: '-⅔'},
        {value: -1/4, text: '-¼'},
        {value: -3/4, text: '-¾'}
    ];
    
    for (let fraction of fractions) {
        if (Math.abs(distance - fraction.value) < 0.001) {
            return fraction.text;
        }
    }
    
    return distance.toFixed(2);
}

// Afficher un plan réticulaire
function showReticularPlane() {
    if (!planeGroup) return;
    
    while(planeGroup.children.length > 0) { 
        const child = planeGroup.children[0];
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
        planeGroup.remove(child);
    }
    
    const a = parseFloat(document.getElementById('a-param').value);
    const h = parseInt(document.getElementById('h-plane').value);
    const k = parseInt(document.getElementById('k-plane').value);
    const l = parseInt(document.getElementById('l-plane').value);
    const offset = parseInt(document.getElementById('plan-offset').value);
    
    if (h === 0 && k === 0 && l === 0) return;
    
    const planeGeometry = new THREE.PlaneGeometry(20, 20);
    const planeMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xff6b6b, 
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.4
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    
    const d = offset / Math.sqrt(h*h + k*k + l*l);
    const normal = new THREE.Vector3(h, k, l).normalize();
    plane.lookAt(normal);
    plane.position.copy(normal.multiplyScalar(d));
    
    planeGroup.add(plane);
}

// Afficher la projection sur un plan
function showProjection() {
    if (!projectionGroup) return;
    
    while(projectionGroup.children.length > 0) { 
        const child = projectionGroup.children[0];
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
        projectionGroup.remove(child);
    }
    
    const offset = parseInt(document.getElementById('projection-offset').value);
    const h = parseInt(document.getElementById('h-plane').value);
    const k = parseInt(document.getElementById('k-plane').value);
    const l = parseInt(document.getElementById('l-plane').value);
    const a = parseFloat(document.getElementById('a-param').value);
    
    if (h === 0 && k === 0 && l === 0) return;
    
    atomsGroup.visible = false;
    bondsGroup.visible = false;
    axisGroup.visible = false;
    planeGroup.visible = false;
    anionMailleGroup.visible = false;
    cationMailleGroup.visible = false;
    
    const normal = new THREE.Vector3(h, k, l).normalize();
    const d = offset / Math.sqrt(h*h + k*k + l*l);
    const planePoint = normal.clone().multiplyScalar(d);
    
    const projectedPositions = new Map();
    
    // Définir quels atomes sont dans les sites selon le type de cristal
    const baseAtoms = new Set();
    const siteAtoms = new Set();
    
    atomsGroup.children.forEach((atom, index) => {
        const atomPosition = atom.position.clone();
        const atomColor = atom.material.color.getHex();
        
        // Identifier les atomes selon le type de cristal et le mode
        if (currentCrystalType === 'ionique-nacl') {
            if (atomColor === 0x4caf50) { // Cl⁻
                baseAtoms.add(index);
            } else if (atomColor === 0x4a9eff) { // Na⁺
                siteAtoms.add(index);
            }
        } else if (currentCrystalType === 'ionique-csz') {
            if (atomColor === 0x4caf50) { // Cl⁻
                baseAtoms.add(index);
            } else if (atomColor === 0x9c27b0) { // Cs⁺
                siteAtoms.add(index);
            }
        } else if (currentCrystalType === 'ionique-zns') {
            if (atomColor === 0xffa726) { // S²⁻
                baseAtoms.add(index);
            } else if (atomColor === 0x4a9eff) { // Zn²⁺
                siteAtoms.add(index);
            }
        } else if (currentCrystalType === 'fluorine') {
            if (atomColor === 0x888888) { // Ca²⁺
                baseAtoms.add(index);
            } else if (atomColor === 0x00ff00) { // F⁻
                siteAtoms.add(index);
            }
        } else if (currentCrystalType === 'antifluorine') {
            if (atomColor === 0xff6b6b) { // O²⁻
                baseAtoms.add(index);
            } else if (atomColor === 0x4a9eff) { // Na⁺
                siteAtoms.add(index);
            }
        } else if (currentCrystalType === 'hexagonal') {
            // Pour l'hexagonal, tous les atomes sont affichés
            baseAtoms.add(index);
        } else {
            // Pour les autres structures, tous les atomes sont de base
            baseAtoms.add(index);
        }
    });
    
    // Projeter tous les atomes d'abord
    atomsGroup.children.forEach((atom, index) => {
        const atomPosition = atom.position.clone();
        
        const toAtom = atomPosition.sub(planePoint);
        const distanceToPlane = toAtom.dot(normal);
        const projection = atomPosition.sub(normal.clone().multiplyScalar(distanceToPlane));
        
        projectedPositions.set(index, {
            position: projection.clone(),
            distance: distanceToPlane,
            isBaseAtom: baseAtoms.has(index),
            isSiteAtom: siteAtoms.has(index),
            atom: atom
        });
    });
    
    // Filtrer les atomes selon le mode d'affichage
    let atomsToDisplay = [];
    
    if (currentCrystalType === 'hexagonal') {
        // Pour l'hexagonal, toujours afficher tous les atomes
        atomsToDisplay = Array.from(atomsGroup.children.keys());
    } else if (projectionMode === 'base') {
        atomsToDisplay = Array.from(baseAtoms);
    } else if (projectionMode === 'sites') {
        atomsToDisplay = Array.from(siteAtoms);
    } else { // 'all'
        atomsToDisplay = Array.from(atomsGroup.children.keys());
    }
    
    // Grouper les atomes par position projetée
    const atomsByProjection = new Map();
    
    atomsToDisplay.forEach(index => {
        const data = projectedPositions.get(index);
        const projectionKey = `${data.position.x.toFixed(2)},${data.position.y.toFixed(2)},${data.position.z.toFixed(2)}`;
        
        if (!atomsByProjection.has(projectionKey)) {
            atomsByProjection.set(projectionKey, []);
        }
        
        const correctDistance = calculateCorrectDistance(data.atom.position, h, k, l, offset, a);
        
        atomsByProjection.get(projectionKey).push({
            atom: data.atom,
            distance: correctDistance,
            isBaseAtom: data.isBaseAtom,
            isSiteAtom: data.isSiteAtom
        });
    });
    
    // Créer les points projetés (TOUJOURS des disques)
    atomsByProjection.forEach((atoms, projectionKey) => {
        const firstAtom = atoms[0];
        const projection = projectedPositions.get(atomsGroup.children.indexOf(firstAtom.atom)).position;
        
        // TOUJOURS utiliser des disques (sphères aplaties)
        const pointGeometry = new THREE.SphereGeometry(0.25, 12, 12);
        const pointMaterial = new THREE.MeshBasicMaterial({ 
            color: firstAtom.atom.material.color 
        });
        const projectedPoint = new THREE.Mesh(pointGeometry, pointMaterial);
        
        projectedPoint.position.copy(projection);
        projectionGroup.add(projectedPoint);
        
        // Afficher les côtes pour tous les atomes
        const distances = atoms.map(a => a.distance).sort((a, b) => a - b);
        const uniqueDistances = [...new Set(distances.map(d => formatDistance(d)))];
        
        if (uniqueDistances.length === 0) return;
        
        const distanceText = uniqueDistances.join(',');
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = Math.max(80, distanceText.length * 12);
        canvas.height = 30;
        
        context.fillStyle = 'rgba(0, 0, 0, 0.85)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        context.fillStyle = 'white';
        context.font = 'bold 14px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        context.fillText(distanceText, canvas.width / 2, canvas.height / 2);
        
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ 
            map: texture,
            transparent: true
        });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.position.copy(projection);
        
        const offsetDirection = new THREE.Vector3(
            Math.random() * 2 - 1,
            Math.random() * 2 - 1, 
            0
        ).normalize();
        sprite.position.add(offsetDirection.multiplyScalar(0.8));
        
        sprite.scale.set(canvas.width / 50, canvas.height / 50, 1);
        
        projectionGroup.add(sprite);
    });
    
    // TOUJOURS projeter les arêtes du cube (lignes blanches)
    const bondMaterial = new THREE.LineBasicMaterial({ 
        color: 0xffffff,
        linewidth: 2
    });
    
    bondsGroup.children.forEach(bond => {
        const positions = bond.geometry.attributes.position;
        if (positions && positions.count >= 2) {
            const startIndex = findClosestAtom(positions.getX(0), positions.getY(0), positions.getZ(0));
            const endIndex = findClosestAtom(positions.getX(1), positions.getY(1), positions.getZ(1));
            
            if (projectedPositions.has(startIndex) && projectedPositions.has(endIndex)) {
                const points = [];
                points.push(projectedPositions.get(startIndex).position);
                points.push(projectedPositions.get(endIndex).position);
                
                const geometry = new THREE.BufferGeometry().setFromPoints(points);
                const line = new THREE.Line(geometry, bondMaterial);
                projectionGroup.add(line);
            }
        }
    });
    
    updateLegendForProjection();
    
    const planeNormal = normal.clone();
    
    const bbox = new THREE.Box3().setFromObject(projectionGroup);
    const center = bbox.getCenter(new THREE.Vector3());
    const size = bbox.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    
    const distance = Math.max(15, maxDim * 2);
    camera.position.copy(planeNormal.multiplyScalar(distance).add(center));
    camera.lookAt(center);
    controls.target.copy(center);
    controls.update();
    
    isProjectionMode = true;
}

// Mettre à jour la légende pour la projection
function updateLegendForProjection() {
    updateAtomLegend(currentCrystalType, true); // Vue projection
}

// Trouver l'atome le plus proche d'une position
function findClosestAtom(x, y, z) {
    let closestIndex = -1;
    let minDistance = Infinity;
    const targetPos = new THREE.Vector3(x, y, z);
    
    atomsGroup.children.forEach((atom, index) => {
        const distance = atom.position.distanceTo(targetPos);
        if (distance < minDistance) {
            minDistance = distance;
            closestIndex = index;
        }
    });
    
    return closestIndex;
}

// Masquer la projection
function hideProjection() {
    if (!projectionGroup) return;
    
    while(projectionGroup.children.length > 0) { 
        const child = projectionGroup.children[0];
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
        projectionGroup.remove(child);
    }
    
    atomsGroup.visible = true;
    bondsGroup.visible = true;
    axisGroup.visible = true;
    planeGroup.visible = true;
    
    if (showMailleImbriquee) {
        anionMailleGroup.visible = true;
        cationMailleGroup.visible = true;
    }
    
    updateAtomLegend(currentCrystalType, false); // Vue 3D normale
    
    camera.position.copy(originalCameraPosition);
    controls.target.set(0.5, 0.5, 0.5);
    controls.update();
    
    isProjectionMode = false;
}

// Changer le mode de projection
function setProjectionMode(mode) {
    projectionMode = mode;
    
    // Mettre à jour l'apparence des boutons
    document.getElementById('show-base-projection').classList.remove('active-mode');
    document.getElementById('show-sites-projection').classList.remove('active-mode');
    document.getElementById('show-all-projection').classList.remove('active-mode');
    
    document.getElementById(`show-${mode}-projection`).classList.add('active-mode');
    
    // Si on est déjà en mode projection, mettre à jour l'affichage
    if (isProjectionMode) {
        showProjection();
    }
}

// Basculer l'affichage des mailles imbriquées
function toggleMailleImbriquee() {
    showMailleImbriquee = !showMailleImbriquee;
    
    const button = document.getElementById('toggle-maille');
    if (showMailleImbriquee) {
        button.textContent = "Masquer les mailles imbriquées";
        button.style.backgroundColor = '#ff6b6b';
        updateCrystalGeometry();
    } else {
        button.textContent = "Afficher les mailles imbriquées";
        button.style.backgroundColor = '#4a9eff';
        anionMailleGroup.visible = false;
        cationMailleGroup.visible = false;
        updateCrystalGeometry();
    }
}

// Mettre à jour les informations sur le cristal
function updateCrystalInfo(type, a, b, c) {
    let infoText = "";
    
    switch(type) {
        case 'cubique-simple':
            infoText = `Structure: Cubique Simple (SC)<br>
                        Paramètre de maille: ${a.toFixed(1)} Å<br>
                        Groupe d'espace: Pm-3m<br>
                        Sites interstitiels: Cubiques`;
            break;
        case 'cubique-centre':
            infoText = `Structure: Cubique Centré (BCC)<br>
                        Paramètre de maille: ${a.toFixed(1)} Å<br>
                        Groupe d'espace: Im-3m<br>
                        Sites interstitiels: Tétraédriques`;
            break;
        case 'cubique-faces-centrees':
            infoText = `Structure: Cubique à Faces Centrées (FCC)<br>
                        Paramètre de maille: ${a.toFixed(1)} Å<br>
                        Groupe d'espace: Fm-3m<br>
                        Sites interstitiels: Octaédriques`;
            break;
        case 'ionique-nacl':
            infoText = `Structure: Chlorure de Sodium (NaCl)<br>
                        Paramètre de maille: ${a.toFixed(1)} Å<br>
                        Groupe d'espace: Fm-3m<br>
                        Coordination: 6:6<br>
                        Cl⁻: FCC, Na⁺: sites octaédriques`;
            break;
        case 'ionique-csz':
            infoText = `Structure: Chlorure de Césium (CsCl)<br>
                        Paramètre de maille: ${a.toFixed(1)} Å<br>
                        Groupe d'espace: Pm-3m<br>
                        Coordination: 8:8<br>
                        Cl⁻: sommets, Cs⁺: centre`;
            break;
        case 'ionique-zns':
            infoText = `Structure: Sulfure de Zinc (ZnS - Blende)<br>
                        Paramètre de maille: ${a.toFixed(1)} Å<br>
                        Groupe d'espace: F-43m<br>
                        Coordination: 4:4<br>
                        S²⁻: FCC, Zn²⁺: ½ sites tétraédriques`;
            break;
        case 'hexagonal':
            infoText = `Structure: Hexagonale Compacte (HCP)<br>
                        Paramètres: a=b=${a.toFixed(1)} Å, c=${c.toFixed(1)} Å<br>
                        Angle a-b: 120°<br>
                        Groupe d'espace: P6₃/mmc<br>
                        Empilement: ABAB`;
            break;
        case 'fluorine':
            infoText = `Structure: Fluorine (CaF₂)<br>
                        Paramètre de maille: ${a.toFixed(1)} Å<br>
                        Groupe d'espace: Fm-3m<br>
                        Coordination: Ca²⁺:8, F⁻:4<br>
                        Ca²⁺: FCC, F⁻: tous sites tétraédriques`;
            break;
        case 'antifluorine':
            infoText = `Structure: Antifluorine (Na₂O)<br>
                        Paramètre de maille: ${a.toFixed(1)} Å<br>
                        Groupe d'espace: Fm-3m<br>
                        Coordination: Na⁺:4, O²⁻:8<br>
                        O²⁻: FCC, Na⁺: tous sites tétraédriques`;
            break;
    }
    
    document.getElementById('crystal-info').innerHTML = infoText;
}

// Changer de section du menu
function switchMenuSection(sectionId) {
    document.querySelectorAll('.menu-section').forEach(section => {
        section.classList.remove('active');
    });
    
    document.getElementById(sectionId).classList.add('active');
}

// Rotation de la caméra par incréments de 5°
function rotateCamera(angleIncrement) {
    currentAngle += angleIncrement;
    
    if (currentAngle >= 360) currentAngle -= 360;
    if (currentAngle < 0) currentAngle += 360;
    
    document.getElementById('current-angle').textContent = currentAngle;
    
    const angleRad = currentAngle * (Math.PI / 180);
    const radius = 15;
    const x = radius * Math.sin(angleRad);
    const z = radius * Math.cos(angleRad);
    
    camera.position.set(x, -12, z);
    camera.lookAt(0.5, 0.5, 0.5);
    controls.update();
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

// Configurer les écouteurs d'événements
function setupEventListeners() {
    document.getElementById('menu-section').addEventListener('change', function() {
        switchMenuSection(this.value);
    });
    
    document.getElementById('crystal-type').addEventListener('change', function() {
        const type = this.value;
        
        if (type === 'hexagonal') {
            const a = parseFloat(document.getElementById('a-param').value);
            document.getElementById('b-param').value = a;
            document.getElementById('b-value').textContent = a.toFixed(1);
            
            const calculated_c = 2 * a * Math.sqrt(2/3);
            document.getElementById('c-param').value = calculated_c.toFixed(2);
            document.getElementById('c-value').textContent = calculated_c.toFixed(2);
        } else {
            const a = parseFloat(document.getElementById('a-param').value);
            document.getElementById('b-param').value = a;
            document.getElementById('b-value').textContent = a.toFixed(1);
            document.getElementById('c-param').value = a;
            document.getElementById('c-value').textContent = a.toFixed(1);
        }
        
        createCrystal(type);
    });
    
    document.getElementById('a-param').addEventListener('input', function() {
        const a = parseFloat(this.value);
        document.getElementById('a-value').textContent = a.toFixed(1);
        
        const type = document.getElementById('crystal-type').value;
        
        if (type === 'hexagonal') {
            document.getElementById('b-param').value = a;
            document.getElementById('b-value').textContent = a.toFixed(1);
            
            const calculated_c = 2 * a * Math.sqrt(2/3);
            document.getElementById('c-param').value = calculated_c.toFixed(2);
            document.getElementById('c-value').textContent = calculated_c.toFixed(2);
        } else {
            document.getElementById('b-param').value = a;
            document.getElementById('b-value').textContent = a.toFixed(1);
            document.getElementById('c-param').value = a;
            document.getElementById('c-value').textContent = a.toFixed(1);
        }
        
        updateCrystalGeometry();
    });
    
    document.getElementById('b-param').addEventListener('input', function() {
        const b = parseFloat(this.value);
        document.getElementById('b-value').textContent = b.toFixed(1);
        
        const type = document.getElementById('crystal-type').value;
        
        if (type === 'hexagonal') {
            document.getElementById('a-param').value = b;
            document.getElementById('a-value').textContent = b.toFixed(1);
            
            const calculated_c = 2 * b * Math.sqrt(2/3);
            document.getElementById('c-param').value = calculated_c.toFixed(2);
            document.getElementById('c-value').textContent = calculated_c.toFixed(2);
        } else {
            document.getElementById('a-param').value = b;
            document.getElementById('a-value').textContent = b.toFixed(1);
            document.getElementById('c-param').value = b;
            document.getElementById('c-value').textContent = b.toFixed(1);
        }
        
        updateCrystalGeometry();
    });
    
    document.getElementById('c-param').addEventListener('input', function() {
        const c_val = parseFloat(this.value);
        document.getElementById('c-value').textContent = c_val.toFixed(1);
        
        const type = document.getElementById('crystal-type').value;
        
        if (type !== 'hexagonal') {
            document.getElementById('a-param').value = c_val;
            document.getElementById('a-value').textContent = c_val.toFixed(1);
            document.getElementById('b-param').value = c_val;
            document.getElementById('b-value').textContent = c_val.toFixed(1);
        }
        
        updateCrystalGeometry();
    });
    
    document.getElementById('rotation-speed').addEventListener('input', function() {
        const speed = parseInt(this.value);
        document.getElementById('speed-value').textContent = speed + '%';
        rotationSpeed = (speed / 50) * 0.005;
    });
    
    document.getElementById('h-plane').addEventListener('input', function() {
        document.getElementById('h-value').textContent = this.value;
    });
    
    document.getElementById('k-plane').addEventListener('input', function() {
        document.getElementById('k-value').textContent = this.value;
    });
    
    document.getElementById('l-plane').addEventListener('input', function() {
        document.getElementById('l-value').textContent = this.value;
    });
    
    document.getElementById('plan-offset').addEventListener('input', function() {
        document.getElementById('offset-value').textContent = this.value;
    });
    
    // Nouveaux écouteurs pour les boutons de mode de projection
    document.getElementById('show-base-projection').addEventListener('click', function() {
        setProjectionMode('base');
    });
    
    document.getElementById('show-sites-projection').addEventListener('click', function() {
        setProjectionMode('sites');
    });
    
    document.getElementById('show-all-projection').addEventListener('click', function() {
        setProjectionMode('all');
    });
    
    document.getElementById('apply-view').addEventListener('click', function() {
        const viewType = document.getElementById('view-type').value;
        applyView(viewType);
    });
    
    document.getElementById('rotate-left').addEventListener('click', function() {
        rotateCamera(-5);
    });
    
    document.getElementById('rotate-right').addEventListener('click', function() {
        rotateCamera(5);
    });
    
    document.getElementById('toggle-internal-lines').addEventListener('click', toggleInternalLines);
    
    document.getElementById('toggle-maille').addEventListener('click', toggleMailleImbriquee);
    
    document.getElementById('show-plane').addEventListener('click', showReticularPlane);
    
    document.getElementById('hide-plane').addEventListener('click', function() {
        if (planeGroup) {
            while(planeGroup.children.length > 0) { 
                const child = planeGroup.children[0];
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
                planeGroup.remove(child);
            }
        }
    });
    
    document.getElementById('show-projection').addEventListener('click', showProjection);
    document.getElementById('hide-projection').addEventListener('click', hideProjection);
    
    document.getElementById('reset-view').addEventListener('click', function() {
        if (controls) {
            controls.reset();
            applyView('standard');
            currentAngle = 0;
            document.getElementById('current-angle').textContent = currentAngle;
        }
    });
    
    document.getElementById('toggle-animation').addEventListener('click', function() {
        if (isAnimating) {
            isAnimating = false;
            this.textContent = "Démarrer Animation";
        } else {
            isAnimating = true;
            this.textContent = "Arrêter Animation";
        }
    });
}

// Gérer le redimensionnement de la fenêtre
function onWindowResize() {
    if (!camera || !renderer) return;
    
    const container = document.getElementById('crystal-container');
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

// Fonction d'animation
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

// Initialiser l'application lorsque la page est chargée
window.addEventListener('DOMContentLoaded', function() {
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
