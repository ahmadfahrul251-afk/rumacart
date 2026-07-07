import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/landing/Hero";
import { Categories } from "@/components/landing/Categories";
import { ProductSection } from "@/components/landing/ProductSection";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Advantages } from "@/components/landing/Advantages";
import { Testimonials } from "@/components/landing/Testimonials";
import { FAQSection } from "@/components/landing/FAQSection";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Categories />
        <ProductSection title="Produk Terlaris" />
        <ProductSection title="Promo Spesial Hari Ini" />
        <HowItWorks />
        <Advantages />
        <Testimonials />
        <FAQSection />
      </main>
      <Footer />
    </>
  );
}
