import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel, { type EmblaOptionsType } from "embla-carousel-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function Onboarding() {
  const options: EmblaOptionsType = {
    loop: false,
    align: "start",
    dragFree: false,
  };
  const [emblaRef, emblaApi] = useEmblaCarousel(options);
  const [index, setIndex] = useState(0);
  const slideCount = 4;
  const [leaving, setLeaving] = useState(false);
  const navigate = useNavigate();
  const loginWithTransition = () => {
    if (leaving) return;
    setLeaving(true);
    setTimeout(() => navigate("/login"), 450);
  };

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
  }, [emblaApi, onSelect]);

  const scrollTo = (i: number) => emblaApi?.scrollTo(i);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-indigo-50">
      <motion.div
        initial={{ opacity: 1, y: 0, scale: 1 }}
        animate={{
          opacity: leaving ? 0 : 1,
          y: leaving ? -24 : 0,
          scale: leaving ? 0.98 : 1,
        }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto flex min-h-screen max-w-screen-sm flex-col px-6 py-10"
      >
        <div className="mb-8 flex items-center justify-center">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500" />
        </div>
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex">
            {/* Slide 1 */}
            <section className="min-w-0 shrink-0 grow-0 basis-full py-4">
              <div className="flex flex-col items-center text-center">
                <h1 className="mb-3 text-3xl font-semibold tracking-tight">
                  Smart Contract Pre-Audit
                </h1>
                <p className="max-w-xs text-muted-foreground">
                  Automated vulnerability checks to flag malicious or risky
                  contracts before exposure.
                </p>
              </div>
            </section>

            {/* Slide 2 */}
            <section className="min-w-0 shrink-0 grow-0 basis-full py-4">
              <div className="flex flex-col items-center text-center">
                <h2 className="mb-3 text-3xl font-semibold tracking-tight">
                  OSINT Enhanced
                </h2>
                <p className="max-w-xs text-muted-foreground">
                  Go beyond the blockchain with integrated open-source
                  intelligence for off-chain context.
                </p>
              </div>
            </section>
            {/* Slide 3 */}
            <section className="min-w-0 shrink-0 grow-0 basis-full py-4">
              <div className="flex flex-col items-center text-center">
                <h2 className="mb-3 text-3xl font-semibold tracking-tight">
                  Forensic Reporting
                </h2>
                <p className="max-w-xs text-muted-foreground">
                  Generate investigation-grade case reports with fund flow
                  mapping, entity attribution, and sanctions intelligence.
                </p>
              </div>
            </section>

            {/* Slide 4 */}
            <section className="min-w-0 shrink-0 grow-0 basis-full py-4">
              <div className="flex flex-col items-center text-center">
                <h2 className="mb-3 text-3xl font-semibold tracking-tight">
                  Risk Engine
                </h2>
                <p className="max-w-xs text-muted-foreground">
                  AI-powered detection from address screening and transaction
                  monitoring.
                </p>
                <div className="mt-8 flex flex-col items-center gap-3">
                  <Button onClick={loginWithTransition} className="px-6">
                    Login with Solana
                  </Button>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="mt-auto w-full pb-6">
          {/* Dots above arrows */}
          <div className="mb-4 flex items-center justify-center gap-2">
            {Array.from({ length: slideCount }).map((_, i) => (
              <button
                key={i}
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => scrollTo(i)}
                className={
                  i === index
                    ? "h-2.5 w-6 rounded-full bg-indigo-600 transition-all"
                    : "h-2.5 w-2.5 rounded-full bg-indigo-200 transition-all"
                }
              />
            ))}
          </div>
          {/* Arrow-only controls at the very bottom */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Back"
              onClick={() => index > 0 && scrollTo(index - 1)}
              disabled={index === 0}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Next"
              onClick={() => index < slideCount - 1 && scrollTo(index + 1)}
              disabled={index === slideCount - 1}
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
