document.addEventListener('DOMContentLoaded', () => {
    const modelConfig = {
        hair: {
          "default":"",
          "hair1": "../models/hair.glb",
          
        },
        shirt: {
          "blue": "../models/shirt.glb",
          "bw": "../models/shirt1.glb"
        },
        face: {
          "face1": "../models/character 2.glb"
        }
      };
    class SceneManager {
        constructor() {
            this.scene = new THREE.Scene();
            this.camera = new THREE.PerspectiveCamera(75, 800 / 600, 0.1, 1000);
            this.renderer = new THREE.WebGLRenderer({
                canvas: document.getElementById('scene'),
                antialias: true
            });
            this.mixer = null;
            this.clock = new THREE.Clock();
            
            this.params = this.getQueryParams();
            

            // Store all models
            this.models = {
                character: null,
                hair: null,
                shirt: null
            };
            
            // Track loading status
            this.loadingStatus = {
                character: false,
                hair: false,
                shirt: false
            };
            
            this.init();
            this.animate();
        }

        getQueryParams() {
            const params = {};
            const queryString = window.location.search;
            const urlParams = new URLSearchParams(queryString);
            
            // Get specific parameters we're interested in
            params.hair = urlParams.get('hair');
            params.shirt = urlParams.get('shirt');
            params.face = urlParams.get('face');
            
            return params;
        }

        

        init() {
            // Renderer setup
            this.renderer.setSize(1920, 1080);
            
            // Create a gradient background
            const bgTexture = this.createGradientBackground();
            this.scene.background = bgTexture;
            
            // Camera position
            this.camera.position.z = 5;
            
            // Add lights
            const light = new THREE.DirectionalLight(0xffffff, 1);
            light.position.set(1, 1, 1);
            this.scene.add(light);
            this.scene.add(new THREE.AmbientLight(0x404040));
            

            // Load all models
            this.loadCharacterModel();
            this.loadHairModel();
            this.loadShirtModel();
        }
        
        loadCharacterModel() {
            const loader = new THREE.GLTFLoader();
            const modelPath = modelConfig.face[this.params.face] || modelConfig.face["face1"];
            loader.load(
                modelPath, 
                (gltf) => {
                    // Add model to scene
                    this.models.character = gltf.scene;
                    this.scene.add(this.models.character);

                    // Setup animation mixer
                    this.mixer = new THREE.AnimationMixer(this.models.character);

                    // Get all animations
                    if (gltf.animations.length) {
                        // Play all animations
                        gltf.animations.forEach((clip) => {
                            const action = this.mixer.clipAction(clip);
                            action.play();
                        });
                    }
                    
                    this.models.character.position.set(0, -0.5, 0);
                    this.models.character.scale.set(1, 1, 1);
                    
                    this.loadingStatus.character = true;
                    // this.positionAllModels();
                },
                // Progress callback
                (xhr) => {
                    console.log(`Character model: ${(xhr.loaded / xhr.total * 100)}% loaded`);
                },
                // Error callback
                (error) => {
                    console.error('Error loading character GLB:', error);
                }
            );
        }
        
        loadHairModel() {
            const loader = new THREE.GLTFLoader();
            const modelPath = modelConfig.hair[this.params.hair] || modelConfig.hair['default'];
            if(modelPath===""){
                return;
            }
            console.log(`Loading hair model: ${modelPath}`);
            loader.load(
                modelPath, 
                (gltf) => {
                    this.models.hair = gltf.scene;
                    this.scene.add(this.models.hair);
                    
                    // Hair should initially be at the same position as the character
                    this.models.hair.position.set(0, -15.5, 0);
                    this.models.hair.scale.set(10, 10 ,10);
                    
                    this.loadingStatus.hair = true;
                    console.log(this.models.hair.position)
                    console.log(this.models.hair.scale)
                    // this.positionAllModels();
                },
                // Progress callback
                (xhr) => {
                    console.log(`Hair model: ${(xhr.loaded / xhr.total * 100)}% loaded`);
                    
                },
                // Error callback
                (error) => {
                    console.error('Error loading hair GLB:', error);
                }
            );
        }
        
        loadShirtModel() {
            const loader = new THREE.GLTFLoader();
            const modelPath = modelConfig.shirt[this.params.shirt] || modelConfig.shirt["blue"];
            loader.load(
                modelPath, 
                (gltf) => {
                    // Add shirt model to scene
                    this.models.shirt = gltf.scene;
                    this.scene.add(this.models.shirt);
                    
                    // Shirt should initially be at the same position as the character
                    //shirt
                    
                    if(modelPath==="../models/shirt.glb"){
                        this.models.shirt.position.set(0, -2.25, 0);
                        this.models.shirt.scale.set(0.06, 0.06, 0.06);
                    }
                    else{
                        //shirt1
                        this.models.shirt.position.set(0, -10.75, 0);
                        this.models.shirt.scale.set(6.5,6.5, 6.5);
                    }
                    
                    
                    

                    this.loadingStatus.shirt = true;
                    // this.positionAllModels();
                },
                // Progress callback
                (xhr) => {
                    console.log(`Shirt model: ${(xhr.loaded / xhr.total * 100)}% loaded`);
                },
                // Error callback
                (error) => {
                    console.error('Error loading shirt GLB:', error);
                }
            );
        }
        
        // Position models relative to each other once they're loaded
        positionAllModels() {
            // Only proceed if all models are loaded
            if (!this.loadingStatus.character || !this.loadingStatus.hair || !this.loadingStatus.shirt) {
                return;
            }
            
            console.log('All models loaded, positioning them relative to each other');
            
            // Get character's bounding box to help with positioning
            const characterBox = new THREE.Box3().setFromObject(this.models.character);
            const characterHeight = characterBox.max.y - characterBox.min.y;
            const characterTop = characterBox.max.y;
            const characterBottom = characterBox.min.y;
            console.log("Character postion",this.models.character.position)
            console.log("Hair postion",this.models.hair.position)
            // Position hair directly above the character's head
            this.models.hair.position.y = characterTop;
            
            // Position shirt directly below the character's body
            // this.models.shirt.position.y = characterBottom;
            
            // Make sure all models are aligned horizontally
            this.models.hair.position.x = this.models.character.position.x;
            this.models.hair.position.z = this.models.character.position.z;
            
            this.models.shirt.position.x = this.models.character.position.x;
            this.models.shirt.position.z = this.models.character.position.z;
            
            // You may need to adjust these positions based on your specific models
            // console.log('Models positioned');
        }

        animate = () => {
            requestAnimationFrame(this.animate);
            
            // Update animations
            if (this.mixer) {
                const delta = this.clock.getDelta();
                this.mixer.update(delta);
            }
            this.renderer.render(this.scene, this.camera);
        }

        createGradientBackground() {
            const canvas = document.createElement('canvas');
            canvas.width = 2;
            canvas.height = 2;
            
            const context = canvas.getContext('2d');
            
            // Create gradient
            const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
            gradient.addColorStop(0, '#4B0082');  
            gradient.addColorStop(1, '#800080');  
            
            // Fill gradient
            context.fillStyle = gradient;
            context.fillRect(0, 0, canvas.width, canvas.height);
            
            const texture = new THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;
            
            return texture;
        }

        dispose() {
            if (this.mixer) {
                this.mixer.stopAllAction();
            }
            this.renderer.dispose();
        }
    }

    // Initialize the scene
    const sceneManager = new SceneManager();
    console.log('Scene initialized');
});