import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { ReactNode, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

interface PageTransitionProps {
  children: ReactNode;
}

// Advanced page transition with Framer Motion + GSAP
export default function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();
  const contentRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  // Fix hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // GSAP animations on route change
  useEffect(() => {
    if (!mounted) return;
    
    if (contentRef.current) {
      // Advanced GSAP timeline for smooth entrance
      const tl = gsap.timeline();
      
      tl.fromTo(
        contentRef.current,
        {
          opacity: 0,
          scale: 0.95,
          rotationX: 5,
          transformPerspective: 1000,
        },
        {
          opacity: 1,
          scale: 1,
          rotationX: 0,
          duration: 0.8,
          ease: 'power3.out',
        }
      );

      // Parallax effect for child elements
      const elements = contentRef.current.querySelectorAll('.animate-in');
      if (elements.length > 0) {
        gsap.fromTo(
          elements,
          {
            y: 50,
            opacity: 0,
          },
          {
            y: 0,
            opacity: 1,
            duration: 0.6,
            stagger: 0.1,
            ease: 'power2.out',
            delay: 0.2,
          }
        );
      }
    }
  }, [location.pathname, mounted]);

  const pageVariants = {
    initial: {
      opacity: 0,
      x: 100,
      scale: 0.98,
    },
    in: {
      opacity: 1,
      x: 0,
      scale: 1,
    },
    out: {
      opacity: 0,
      x: -100,
      scale: 1.02,
    }
  };

  const pageTransition = {
    type: "spring" as const,
    stiffness: 260,
    damping: 26,
    mass: 0.8,
  };

  // Prevent rendering until mounted
  if (!mounted) {
    return <div className="w-full h-full">{children}</div>;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        className="w-full h-full"
        style={{ 
          position: 'relative',
          willChange: 'transform, opacity',
        }}
      >
        <div ref={contentRef} className="w-full h-full">
          {children}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Smooth fade transition with GSAP
export function SmoothFadeTransition({ children }: PageTransitionProps) {
  const location = useLocation();
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      gsap.fromTo(
        contentRef.current,
        {
          opacity: 0,
          y: 30,
        },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: 'power2.out',
        }
      );
    }
  }, [location.pathname]);

  const fadeVariants = {
    initial: { opacity: 0 },
    in: { opacity: 1 },
    out: { opacity: 0 }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="in"
        exit="out"
        variants={fadeVariants}
        transition={{ duration: 0.4 }}
        className="w-full h-full"
      >
        <div ref={contentRef}>
          {children}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Morphing transition with 3D effect
export function MorphTransition({ children }: PageTransitionProps) {
  const location = useLocation();
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      const tl = gsap.timeline();
      
      // 3D morphing effect
      tl.fromTo(
        contentRef.current,
        {
          opacity: 0,
          scale: 0.8,
          rotationY: 90,
          transformPerspective: 1200,
          transformOrigin: 'center center',
        },
        {
          opacity: 1,
          scale: 1,
          rotationY: 0,
          duration: 1,
          ease: 'power4.out',
        }
      );
    }
  }, [location.pathname]);

  const morphVariants = {
    initial: {
      opacity: 0,
      rotateY: -90,
      scale: 0.8,
    },
    in: {
      opacity: 1,
      rotateY: 0,
      scale: 1,
    },
    out: {
      opacity: 0,
      rotateY: 90,
      scale: 0.8,
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="in"
        exit="out"
        variants={morphVariants}
        transition={{
          duration: 0.8,
          ease: [0.43, 0.13, 0.23, 0.96]
        }}
        style={{
          perspective: 1200,
          transformStyle: 'preserve-3d',
        }}
        className="w-full h-full"
      >
        <div ref={contentRef}>
          {children}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
