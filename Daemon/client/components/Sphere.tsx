import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface SphereProps {
  className?: string;
  theme?: 'light' | 'dark';
}

export default function Sphere({ className = '', theme = 'dark' }: SphereProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    camera: THREE.PerspectiveCamera;
    scene: THREE.Scene;
    renderer: THREE.WebGLRenderer;
    localGroup: THREE.Group;
    particles: THREE.Mesh[];
    particlesSlice: THREE.Group[];
    framesCount: number;
    animationId: number | null;
  } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // Math variables
    const deg = Math.PI / 180; // one degree

    // INIT Scene
    const scene = new THREE.Scene();

    // INIT Camera
    const camera = new THREE.PerspectiveCamera(
      50,
      width / height,
      0.1,
      1000
    );
    camera.position.set(0, 0, 5);

    // INIT Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    
    // Set background color based on theme
    const backgroundColor = theme === 'light' ? '#f8fafc' : '#0a0a15';
    renderer.setClearColor(backgroundColor, 1);

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    containerRef.current.appendChild(renderer.domElement);

    // Initialize arrays
    const particles: THREE.Mesh[] = [];
    const particlesSlice: THREE.Group[] = [];
    let framesCount = 0;

    // Create particles
    const sceneParticles = (size: number, length: number) => {
      const geometry = new THREE.SphereGeometry(size, 16, 16);
      // Initial color based on theme - will be animated later
      const initialColor = theme === 'light' ? 'hsl(210, 60%, 30%)' : 'hsl(21, 100%, 64%)';
      const material = new THREE.MeshBasicMaterial({ color: initialColor });

      let i = 0;

      // Two Dimensions (x & y)
      for (let ix = 0; ix < length; ++ix) {
        // Third Dimension (z)
        for (let iy = 0; iy < length; ++iy) {
          const particle = new THREE.Mesh(geometry, material.clone());
          particles[i++] = particle;

          particle.position.x = Math.sin((iy * (2 / length)) * Math.PI);
          particle.position.y = Math.cos((iy * (2 / length)) * Math.PI);

          scene.add(particle);
        }
      }
    };

    // Create slices of particles
    const groupSlices = (length: number) => {
      let i = 0;

      // Two Dimensions (x & y)
      for (let ix = 0; ix < length; ++ix) {
        particlesSlice[ix] = new THREE.Group();

        // Third Dimension (z)
        for (let iy = 0; iy < length; ++iy) {
          i++;
          particlesSlice[ix].add(particles[i - 1]);
        }

        scene.add(particlesSlice[ix]);

        // Initial positioning
        particlesSlice[ix].rotation.x = deg * (ix / length * 180);
        particlesSlice[ix].rotation.y = deg * (ix / length * 180) * 3;
        particlesSlice[ix].rotation.z = deg * (ix / length * 180) * 6;
      }
    };

    // Create group
    const localGroup = new THREE.Group();
    const sceneGroup = (group: THREE.Group, objs: THREE.Group[]) => {
      objs.forEach((obj) => {
        group.add(obj);
      });

      scene.add(group);
    };

    // Create particles
    sceneParticles(0.005, 64);

    // Create slices of particles
    groupSlices(64);

    // Create fog with theme-based color
    const fogColor = theme === 'light' ? 0xf8fafc : 0x0a0a15;
    scene.fog = new THREE.FogExp2(fogColor, 0.065);

    // Create group
    sceneGroup(localGroup, particlesSlice);

    // Animation loop
    const sceneAnimation = () => {
      const animationId = requestAnimationFrame(sceneAnimation);
      sceneRef.current!.animationId = animationId;

      framesCount++;

      // Slice Animation
      for (let i = 0; i < particlesSlice.length; ++i) {
        particlesSlice[i].rotation.x += 0.0010 + 0.0002 * i;
        particlesSlice[i].rotation.y += 0.0015 + 0.0001 * i;
        particlesSlice[i].rotation.z += 0.0020 + 0.0002 * i;
      }

      // Single Particles Animation
      for (let i = 0; i < particles.length; ++i) {
        // Scaling
        particles[i].scale.set(
          Math.sin(framesCount * 0.00001 * i),
          Math.sin(framesCount * 0.00001 * i),
          Math.sin(framesCount * 0.00001 * i)
        );

        // Color - adjust based on theme
        const material = particles[i].material as THREE.MeshBasicMaterial;
        if (theme === 'light') {
          // Dark particles for light theme
          material.color.setHSL(
            Math.sin(framesCount * 0.0075 + i * 0.001) * 0.5 + 0.5,
            0.7,
            0.3  // Lower lightness for dark particles
          );
        } else {
          // Light particles for dark theme
          material.color.setHSL(
            Math.sin(framesCount * 0.0075 + i * 0.001) * 0.5 + 0.5,
            0.75,
            0.75
          );
        }
      }

      // Sphere Animation
      localGroup.rotation.y = Math.cos(framesCount * 0.01);
      localGroup.rotation.z = Math.sin(framesCount * 0.01);

      renderer.render(scene, camera);
    };

    // Handle window resize
    const onWindowResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth || window.innerWidth;
      const newHeight = container.clientHeight || window.innerHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', onWindowResize, false);

    // Store references
    sceneRef.current = {
      camera,
      scene,
      renderer,
      localGroup,
      particles,
      particlesSlice,
      framesCount,
      animationId: null,
    };

    // Start animation
    sceneAnimation();

    // Cleanup
    return () => {
      window.removeEventListener('resize', onWindowResize);

      if (sceneRef.current?.animationId) {
        cancelAnimationFrame(sceneRef.current.animationId);
      }

      // Dispose of Three.js objects
      particles.forEach((particle) => {
        particle.geometry.dispose();
        (particle.material as THREE.Material).dispose();
      });

      renderer.dispose();

      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [theme]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        overflow: 'hidden',
      }}
    />
  );
}

