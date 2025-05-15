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
        animations: {
          "animation1": "../models/animation1.glb",
          "animation2": "../models/animation2.glb",
          "animation3": "../models/animation3.glb"
        },
        face: {
          "face1": "../models/animation1.glb"
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
            
            // Animation sequence properties
            this.animations = [];
            this.currentAnimationIndex = 0;
            this.isAnimationPlaying = false;
            this.currentAction = null;
            this.animationFiles = ["animation1", "animation2", "animation3"];
            this.loadedAnimationCount = 0;
            
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
                shirt: false,
                allAnimationsLoaded: false
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
            
            // Load base character model first
            this.loadCharacterModel();
            
            // Then load hair and shirt models
            this.loadHairModel();
            this.loadShirtModel();
            
            // Load additional animation files
            this.loadAnimationFiles();
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
                    
                    // Store initial animations
                    if (gltf.animations.length) {
                        // Add these animations to our collection
                        this.animations = [...gltf.animations];
                        console.log(`Loaded ${this.animations.length} animations from base model`);
                        
                        // Add a finished event listener to the mixer
                        this.mixer.addEventListener('finished', this.onAnimationFinished.bind(this));
                    }
                    
                    this.models.character.position.set(0, -0.5, 0);
                    this.models.character.scale.set(1, 1, 1);
                    
                    this.loadingStatus.character = true;
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
        
        // New method to load additional animation files
        loadAnimationFiles() {
            for (let i = 1; i < this.animationFiles.length; i++) {
                const animFile = this.animationFiles[i];
                this.loadAnimationFile(animFile);
            }
        }
        
        // Load a single animation file and add its animations to our collection
        loadAnimationFile(animationName) {
            const loader = new THREE.GLTFLoader();
            const animPath = modelConfig.animations[animationName];
            
            if (!animPath) {
                console.error(`Animation file ${animationName} not found in config`);
                return;
            }
            
            console.log(`Loading animation file: ${animPath}`);
            
            loader.load(
                animPath,
                (gltf) => {
                    if (gltf.animations.length) {
                        console.log(`Loaded ${gltf.animations.length} animations from ${animationName}`);
                        
                        // Add these animations to our collection
                        this.animations = [...this.animations, ...gltf.animations];
                        
                        // Track how many animation files we've loaded
                        this.loadedAnimationCount++;
                        
                        console.log(`Total animations loaded: ${this.animations.length}`);
                        
                        // If this was the last animation file to load, start playing
                        if (this.loadedAnimationCount >= this.animationFiles.length - 1) {
                            console.log("All animation files loaded, starting playback");
                            this.loadingStatus.allAnimationsLoaded = true;
                            
                            // Only start playing if we haven't already started
                            if (!this.isAnimationPlaying) {
                                this.playNextAnimation();
                            }
                        }
                    }
                },
                // Progress callback
                (xhr) => {
                    console.log(`Animation ${animationName}: ${(xhr.loaded / xhr.total * 100)}% loaded`);
                },
                // Error callback
                (error) => {
                    console.error(`Error loading animation file ${animationName}:`, error);
                    
                    // Even if there's an error, increment our counter so we don't block playback
                    this.loadedAnimationCount++;
                }
            );
        }
        
        // Method to play the next animation in the sequence
        playNextAnimation() {
            // Stop current animation if one is playing
            if (this.currentAction) {
                this.currentAction.stop();
            }
            
            // Check if we have animations and haven't reached the end
            if (this.animations.length > 0 && this.currentAnimationIndex < this.animations.length) {
                console.log(`Playing animation ${this.currentAnimationIndex + 1}/${this.animations.length}`);
                
                // Get the current animation clip
                const clip = this.animations[this.currentAnimationIndex];
                
                // Create an action for this clip
                this.currentAction = this.mixer.clipAction(clip);
                
                // Set this action to only play once (not loop)
                this.currentAction.setLoop(THREE.LoopOnce);
                this.currentAction.clampWhenFinished = true;
                
                // Start the action
                this.currentAction.reset();
                this.currentAction.play();
                
                this.isAnimationPlaying = true;
            } else if (this.animations.length > 0) {
                // We've reached the end, loop back to the beginning
                console.log('Restarting animation sequence');
                this.currentAnimationIndex = 0;
                this.playNextAnimation();
            }
        }
        
        // Event handler for when an animation finishes
        onAnimationFinished(e) {
            console.log('Animation finished');
            this.isAnimationPlaying = false;
            
            // Move to the next animation
            this.currentAnimationIndex++;
            
            // Add a small delay before playing the next animation (optional)
            setTimeout(() => {
                this.playNextAnimation();
            }, 500); // 500ms delay between animations
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
        }
        
        startRecording(duration, fps = 30) {
            return new Promise((resolve, reject) => {
                try {
                    // Get the canvas element
                    const canvas = this.renderer.domElement;
                    
                    // Create a stream from the canvas with specified frame rate
                    const stream = canvas.captureStream(fps);
                    
                    // Set up media recorder with appropriate options
                    const options = { mimeType: 'video/webm;codecs=vp9' };
                    const mediaRecorder = new MediaRecorder(stream, options);
                    
                    // Array to store chunks of video data
                    const chunks = [];
                    
                    // Event listeners
                    mediaRecorder.ondataavailable = (e) => {
                        if (e.data.size > 0) {
                            chunks.push(e.data);
                        }
                    };
                    
                    mediaRecorder.onstop = () => {
                        // Create blob from chunks
                        const blob = new Blob(chunks, { type: 'video/webm' });
                        resolve(blob);
                    };
                    
                    // Start recording
                    mediaRecorder.start();
                    
                    // Stop recording after specified duration
                    setTimeout(() => {
                        mediaRecorder.stop();
                    }, duration * 1000);
                } catch (err) {
                    reject(err);
                }
            });
        }
        
        animate = () => {
            requestAnimationFrame(this.animate);
            
            if (this.mixer) {
              let delta = this.clock.getDelta();
              // don't let one big pause advance more than 1/fps
              const maxStep = 1 / 30;
              this.mixer.update(Math.min(delta, maxStep));
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

        // Method to manually control animations
        playAnimationByIndex(index) {
            if (index >= 0 && index < this.animations.length) {
                this.currentAnimationIndex = index;
                this.playNextAnimation();
                return true;
            }
            return false;
        }

        // Get the number of available animations
        getAnimationCount() {
            return this.animations.length;
        }

        // Get the currently playing animation index
        getCurrentAnimationIndex() {
            return this.currentAnimationIndex;
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
    
    // Expose methods to window for external access
    window.startRecording = (duration, fps) => {
        return sceneManager.startRecording(duration, fps);
    };
    
    // Add new controls for animations
    window.playAnimationByIndex = (index) => {
        return sceneManager.playAnimationByIndex(index);
    };
    
    window.getAnimationCount = () => {
        return sceneManager.getAnimationCount();
    };
    
    window.getCurrentAnimationIndex = () => {
        return sceneManager.getCurrentAnimationIndex();
    };
    
    // Method to load additional animation files programmatically
    window.loadAdditionalAnimation = (animationFileName) => {
        if (sceneManager && typeof sceneManager.loadAnimationFile === 'function') {
            return sceneManager.loadAnimationFile(animationFileName);
        }
        return false;
    };
});