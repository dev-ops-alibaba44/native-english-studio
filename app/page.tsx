import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { FounderHero } from "@/components/marketing/FounderHero";
import { ValueProps } from "@/components/marketing/ValueProps";
import { StageThreadExplainer } from "@/components/marketing/StageThreadExplainer";
import { AudienceSplit } from "@/components/marketing/AudienceSplit";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <FounderHero />
        <ValueProps />
        <StageThreadExplainer />
        <AudienceSplit />
      </main>
      <SiteFooter />
    </>
  );
}
