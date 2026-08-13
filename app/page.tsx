import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { FounderHero } from "@/components/marketing/FounderHero";
import { ValueProps } from "@/components/marketing/ValueProps";
import { ProductShowcase } from "@/components/marketing/ProductShowcase";
import { StageThreadExplainer } from "@/components/marketing/StageThreadExplainer";
import { PhotoGallery } from "@/components/marketing/PhotoGallery";
import { PersonalStorySection } from "@/components/marketing/PersonalStorySection";
import { PhilosophySection } from "@/components/marketing/PhilosophySection";
import { TestimonialsSection } from "@/components/marketing/TestimonialsSection";
import { AudienceSplit } from "@/components/marketing/AudienceSplit";
import { ChatWidget } from "@/components/marketing/ChatWidget";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <FounderHero />
        <ValueProps />
        <ProductShowcase />
        <StageThreadExplainer />
        <PhotoGallery />
        <PersonalStorySection />
        <PhilosophySection />
        <TestimonialsSection />
        <AudienceSplit />
      </main>
      <SiteFooter />
      <ChatWidget />
    </>
  );
}
