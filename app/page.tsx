import { NavBar } from "@/components/landing/NavBar";
import { Hero } from "@/components/landing/Hero";
import { PipelineDiagram } from "@/components/landing/PipelineDiagram";
import { PhonologyCards } from "@/components/landing/PhonologyCards";
import { TaxonomySection } from "@/components/landing/TaxonomySection";
import { DifferentiationSection } from "@/components/landing/DifferentiationSection";
import { MathSection } from "@/components/landing/MathSection";
import { RoadmapSection } from "@/components/landing/RoadmapSection";
import { AbstractSection } from "@/components/landing/AbstractSection";

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)" }}>
      <NavBar />
      <Hero />
      <PipelineDiagram />
      <PhonologyCards />
      <TaxonomySection />
      <DifferentiationSection />
      <MathSection />
      <RoadmapSection />
      <AbstractSection />
    </div>
  );
}
