import LandingNav from '../components/landing/LandingNav';
import Hero from '../components/landing/Hero';
import Features from '../components/landing/Features';
import HowItWorks from '../components/landing/HowItWorks';
import Pricing from '../components/landing/Pricing';
import FAQ from '../components/landing/FAQ';
import LandingFooter from '../components/landing/LandingFooter';

export default function Landing() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
      <LandingNav />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Pricing />
        <FAQ />
      </main>
      <LandingFooter />
    </div>
  );
}
