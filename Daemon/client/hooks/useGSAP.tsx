import { useEffect, useRef, RefObject } from 'react';
import gsap from 'gsap';

// Custom hook for GSAP animations
export function useGSAPFadeIn(delay: number = 0) {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (elementRef.current) {
      gsap.fromTo(
        elementRef.current,
        {
          opacity: 0,
          y: 30,
        },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          delay,
          ease: 'power3.out',
        }
      );
    }
  }, [delay]);

  return elementRef;
}

// Slide in from direction
export function useGSAPSlideIn(direction: 'left' | 'right' | 'top' | 'bottom' = 'bottom', delay: number = 0) {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (elementRef.current) {
      const directionMap = {
        left: { x: -100, y: 0 },
        right: { x: 100, y: 0 },
        top: { x: 0, y: -100 },
        bottom: { x: 0, y: 100 },
      };

      gsap.fromTo(
        elementRef.current,
        {
          opacity: 0,
          ...directionMap[direction],
        },
        {
          opacity: 1,
          x: 0,
          y: 0,
          duration: 0.8,
          delay,
          ease: 'power3.out',
        }
      );
    }
  }, [direction, delay]);

  return elementRef;
}

// Scale animation
export function useGSAPScale(delay: number = 0) {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (elementRef.current) {
      gsap.fromTo(
        elementRef.current,
        {
          opacity: 0,
          scale: 0.8,
        },
        {
          opacity: 1,
          scale: 1,
          duration: 0.8,
          delay,
          ease: 'back.out(1.7)',
        }
      );
    }
  }, [delay]);

  return elementRef;
}

// Stagger animation for multiple elements
export function useGSAPStagger(selector: string, delay: number = 0) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      const elements = containerRef.current.querySelectorAll(selector);
      
      gsap.fromTo(
        elements,
        {
          opacity: 0,
          y: 50,
          scale: 0.9,
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.6,
          stagger: 0.1,
          delay,
          ease: 'power2.out',
        }
      );
    }
  }, [selector, delay]);

  return containerRef;
}

// 3D Flip animation
export function useGSAPFlip(delay: number = 0) {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (elementRef.current) {
      gsap.fromTo(
        elementRef.current,
        {
          opacity: 0,
          rotationY: 90,
          transformPerspective: 1000,
        },
        {
          opacity: 1,
          rotationY: 0,
          duration: 1,
          delay,
          ease: 'power3.out',
        }
      );
    }
  }, [delay]);

  return elementRef;
}

// Magnetic hover effect
export function useMagneticHover(strength: number = 0.3) {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = element.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;

      gsap.to(element, {
        x: x * strength,
        y: y * strength,
        duration: 0.3,
        ease: 'power2.out',
      });
    };

    const handleMouseLeave = () => {
      gsap.to(element, {
        x: 0,
        y: 0,
        duration: 0.5,
        ease: 'elastic.out(1, 0.5)',
      });
    };

    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [strength]);

  return elementRef;
}

// Parallax scroll effect
export function useParallaxScroll(speed: number = 0.5) {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleScroll = () => {
      const scrolled = window.scrollY;
      gsap.to(element, {
        y: scrolled * speed,
        duration: 0.5,
        ease: 'power1.out',
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [speed]);

  return elementRef;
}

// Reveal on scroll
export function useRevealOnScroll(threshold: number = 0.2) {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            gsap.fromTo(
              entry.target,
              {
                opacity: 0,
                y: 50,
              },
              {
                opacity: 1,
                y: 0,
                duration: 0.8,
                ease: 'power3.out',
              }
            );
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [threshold]);

  return elementRef;
}

