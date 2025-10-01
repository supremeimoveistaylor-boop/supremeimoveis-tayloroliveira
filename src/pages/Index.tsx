import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { FeaturedProperties } from "@/components/FeaturedProperties";
import { About } from "@/components/About";
import { Contact } from "@/components/Contact";
import { Footer } from "@/components/Footer";
import { FloatingWhatsApp } from "@/components/FloatingWhatsApp";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const propertyId = params.get('property');
      if (propertyId) {
        navigate(`/property/${propertyId}`, { replace: true });
      }
    } catch (e) {
      // no-op
    }
  }, [navigate]);

  return (
    <div className="min-h-screen">
      <Header />
      <Hero />
      <FeaturedProperties />
      <About />
      <Contact />
      <Footer />
      <FloatingWhatsApp />
    </div>
  );
};

export default Index;