import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Home, MapPin, Ruler, Wrench, Phone, Mail, Calculator, CheckCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

const CITY_MAP: Record<string, string> = {
  'goiania': 'Goiânia',
  'sao-paulo': 'São Paulo',
  'aparecida-de-goiania': 'Aparecida de Goiânia',
  'anapolis': 'Anápolis',
  'brasilia': 'Brasília',
};

interface PropertyData {
  tipo_imovel: string;
  cidade: string;
  bairro: string;
  quartos: number | null;
  vagas: number | null;
  area: number | null;
  estado_imovel: string;
}

interface LeadData {
  nome: string;
  telefone: string;
  email: string;
}

const AvaliarImovel = () => {
  const { cidade: cidadeSlug } = useParams<{ cidade?: string }>();
  const cidadeFromUrl = cidadeSlug ? CITY_MAP[cidadeSlug] || cidadeSlug : '';

  const [currentStep, setCurrentStep] = useState(1);

  // SEO metadata
  useEffect(() => {
    const cityLabel = cidadeFromUrl || 'sua cidade';
    document.title = `Avaliar Imóvel em ${cityLabel} | Quanto Vale Meu Imóvel - Supreme`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', `Descubra quanto vale seu imóvel em ${cityLabel}. Simulador gratuito de avaliação imobiliária. Receba uma estimativa instantânea e avaliação completa de um corretor especializado.`);
    }
  }, [cidadeFromUrl]);
  const [propertyData, setPropertyData] = useState<PropertyData>({
    tipo_imovel: '',
    cidade: '',
    bairro: '',
    quartos: null,
    vagas: null,
    area: null,
    estado_imovel: ''
  });
  const [leadData, setLeadData] = useState<LeadData>({
    nome: '',
    telefone: '',
    email: ''
  });
  const [estimatedValue, setEstimatedValue] = useState({ min: 0, max: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const totalSteps = 5;
  const progress = (currentStep / totalSteps) * 100;

  // Calculate estimated value based on inputs
  const calculateEstimatedValue = () => {
    let baseValue = 200000; // Base value for Goiânia market

    // Property type multipliers
    const typeMultipliers = {
      'apartamento': 1.0,
      'casa': 1.2,
      'terreno': 0.4,
      'comercial': 1.5
    };

    // Neighborhood multipliers (simplified for demo)
    const neighborhoodMultipliers = {
      'setor-oeste': 1.8,
      'setor-bueno': 1.6,
      'setor-marista': 1.7,
      'jardim-goias': 1.5,
      'setor-aeroporto': 1.2,
      'vila-nova': 1.1,
      'outros': 1.0
    };

    // Area multiplier
    const areaMultiplier = propertyData.area ? Math.max(0.5, propertyData.area / 80) : 1;

    // Condition multipliers
    const conditionMultipliers = {
      'novo': 1.2,
      'bom-estado': 1.0,
      'precisa-reforma': 0.7
    };

    // Rooms bonus
    const roomsBonus = propertyData.quartos ? propertyData.quartos * 0.1 : 0;
    const parkingBonus = propertyData.vagas ? propertyData.vagas * 0.05 : 0;

    baseValue *= (typeMultipliers[propertyData.tipo_imovel as keyof typeof typeMultipliers] || 1);
    baseValue *= (neighborhoodMultipliers[propertyData.bairro as keyof typeof neighborhoodMultipliers] || 1);
    baseValue *= areaMultiplier;
    baseValue *= (conditionMultipliers[propertyData.estado_imovel as keyof typeof conditionMultipliers] || 1);
    baseValue *= (1 + roomsBonus + parkingBonus);

    // Add variance (±15%)
    const minValue = Math.round(baseValue * 0.85 / 10000) * 10000;
    const maxValue = Math.round(baseValue * 1.15 / 10000) * 10000;

    setEstimatedValue({ min: minValue, max: maxValue });
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else if (currentStep === 4) {
      calculateEstimatedValue();
      setCurrentStep(5);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('captacao_imoveis')
        .insert({
          nome: leadData.nome,
          telefone: leadData.telefone.replace(/\D/g, ''),
          email: leadData.email || null,
          tipo_imovel: propertyData.tipo_imovel,
          cidade: propertyData.cidade,
          bairro: propertyData.bairro,
          quartos: propertyData.quartos,
          vagas: propertyData.vagas,
          area: propertyData.area,
          estado_imovel: propertyData.estado_imovel,
          valor_estimado_min: estimatedValue.min,
          valor_estimado_max: estimatedValue.max,
          status: 'novo'
        });

      if (error) throw error;

      // Also create lead in the general leads table
      await supabase
        .from('leads')
        .insert({
          name: leadData.nome,
          phone: leadData.telefone.replace(/\D/g, ''),
          email: leadData.email || null,
          origin: 'captacao_imoveis',
          intent: `Avaliar ${propertyData.tipo_imovel} em ${propertyData.bairro}`,
          status: 'novo'
        });

      setSubmitted(true);
      toast({
        title: "✅ Avaliação solicitada!",
        description: "Em breve um corretor entrará em contato com você.",
      });
    } catch (error: any) {
      console.error('Erro ao enviar solicitação:', error);
      toast({
        title: "Erro ao enviar solicitação",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return propertyData.tipo_imovel !== '';
      case 2:
        return propertyData.cidade !== '' && propertyData.bairro !== '';
      case 3:
        return true; // Optional fields
      case 4:
        return propertyData.estado_imovel !== '';
      case 5:
        return leadData.nome !== '' && leadData.telefone !== '';
      default:
        return false;
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold mb-4">Avaliação Solicitada!</h1>
            <p className="text-lg text-muted-foreground mb-8">
              Recebemos sua solicitação. Um corretor especializado entrará em contato em até 24 horas para agendar a avaliação do seu imóvel.
            </p>
            <div className="bg-muted p-6 rounded-lg mb-8">
              <h3 className="font-semibold mb-2">Estimativa Inicial:</h3>
              <p className="text-2xl font-bold text-primary">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                }).format(estimatedValue.min)} - {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                }).format(estimatedValue.max)}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                *Valor estimado baseado nos dados informados. A avaliação completa pode apresentar valores diferentes.
              </p>
            </div>
            <Button onClick={() => window.location.href = '/'} size="lg">
              Voltar ao Site
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Avalie seu Imóvel</h1>
            <p className="text-lg text-muted-foreground">
              Descubra quanto vale seu imóvel em poucos passos
            </p>
          </div>

          {/* Progress */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Passo {currentStep} de {totalSteps}</span>
              <span className="text-sm text-muted-foreground">{Math.round(progress)}% concluído</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <Card>
            <CardHeader>
              {currentStep === 1 && (
                <>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Home className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle>Tipo de Imóvel</CardTitle>
                  <CardDescription>Qual tipo de imóvel você deseja avaliar?</CardDescription>
                </>
              )}
              {currentStep === 2 && (
                <>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <MapPin className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle>Localização</CardTitle>
                  <CardDescription>Onde está localizado seu imóvel?</CardDescription>
                </>
              )}
              {currentStep === 3 && (
                <>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Ruler className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle>Características</CardTitle>
                  <CardDescription>Nos conte mais sobre as características do imóvel</CardDescription>
                </>
              )}
              {currentStep === 4 && (
                <>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Wrench className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle>Estado do Imóvel</CardTitle>
                  <CardDescription>Como está o estado de conservação?</CardDescription>
                </>
              )}
              {currentStep === 5 && (
                <>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Calculator className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle>Avaliação Completa</CardTitle>
                  <CardDescription>Receba a avaliação detalhada do seu imóvel</CardDescription>
                </>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step 1: Property Type */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <Label>Selecione o tipo do imóvel:</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: 'apartamento', label: 'Apartamento', icon: '🏢' },
                      { value: 'casa', label: 'Casa', icon: '🏠' },
                      { value: 'terreno', label: 'Terreno', icon: '🟩' },
                      { value: 'comercial', label: 'Comercial', icon: '🏪' }
                    ].map((type) => (
                      <Button
                        key={type.value}
                        variant={propertyData.tipo_imovel === type.value ? 'default' : 'outline'}
                        className="h-16 flex flex-col items-center justify-center gap-2"
                        onClick={() => setPropertyData({ ...propertyData, tipo_imovel: type.value })}
                      >
                        <span className="text-xl">{type.icon}</span>
                        <span className="text-sm">{type.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Location */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="cidade">Cidade</Label>
                    <Select value={propertyData.cidade} onValueChange={(value) => setPropertyData({ ...propertyData, cidade: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a cidade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="goiania">Goiânia</SelectItem>
                        <SelectItem value="aparecida-de-goiania">Aparecida de Goiânia</SelectItem>
                        <SelectItem value="anapolis">Anápolis</SelectItem>
                        <SelectItem value="outras">Outras cidades</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="bairro">Bairro</Label>
                    <Select value={propertyData.bairro} onValueChange={(value) => setPropertyData({ ...propertyData, bairro: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o bairro" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="setor-oeste">Setor Oeste</SelectItem>
                        <SelectItem value="setor-bueno">Setor Bueno</SelectItem>
                        <SelectItem value="setor-marista">Setor Marista</SelectItem>
                        <SelectItem value="jardim-goias">Jardim Goiás</SelectItem>
                        <SelectItem value="setor-aeroporto">Setor Aeroporto</SelectItem>
                        <SelectItem value="vila-nova">Vila Nova</SelectItem>
                        <SelectItem value="outros">Outros bairros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Step 3: Features */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="quartos">Quartos</Label>
                      <Select value={propertyData.quartos?.toString() || ""} onValueChange={(value) => setPropertyData({ ...propertyData, quartos: value ? parseInt(value) : null })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Qtd" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1</SelectItem>
                          <SelectItem value="2">2</SelectItem>
                          <SelectItem value="3">3</SelectItem>
                          <SelectItem value="4">4</SelectItem>
                          <SelectItem value="5">5+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="vagas">Vagas</Label>
                      <Select value={propertyData.vagas?.toString() || ""} onValueChange={(value) => setPropertyData({ ...propertyData, vagas: value ? parseInt(value) : null })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Qtd" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">0</SelectItem>
                          <SelectItem value="1">1</SelectItem>
                          <SelectItem value="2">2</SelectItem>
                          <SelectItem value="3">3</SelectItem>
                          <SelectItem value="4">4+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="area">Área (m²)</Label>
                      <Input
                        id="area"
                        type="number"
                        placeholder="Ex: 120"
                        value={propertyData.area || ''}
                        onChange={(e) => setPropertyData({ ...propertyData, area: e.target.value ? parseFloat(e.target.value) : null })}
                      />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    * Estes campos são opcionais, mas ajudam a melhorar a precisão da avaliação
                  </p>
                </div>
              )}

              {/* Step 4: Condition */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  <Label>Estado de conservação do imóvel:</Label>
                  <div className="space-y-3">
                    {[
                      { value: 'novo', label: 'Novo ou seminovo', desc: 'Imóvel em excelente estado' },
                      { value: 'bom-estado', label: 'Bom estado', desc: 'Pequenos reparos necessários' },
                      { value: 'precisa-reforma', label: 'Precisa de reforma', desc: 'Reformas significativas necessárias' }
                    ].map((condition) => (
                      <Button
                        key={condition.value}
                        variant={propertyData.estado_imovel === condition.value ? 'default' : 'outline'}
                        className="w-full justify-start h-auto p-4"
                        onClick={() => setPropertyData({ ...propertyData, estado_imovel: condition.value })}
                      >
                        <div className="text-left">
                          <div className="font-medium">{condition.label}</div>
                          <div className="text-sm text-muted-foreground">{condition.desc}</div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 5: Lead Capture + Results */}
              {currentStep === 5 && (
                <div className="space-y-6">
                  {/* Estimated Value Display */}
                  <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-6 rounded-lg text-center">
                    <h3 className="text-lg font-semibold mb-2">Estimativa de Valor</h3>
                    <p className="text-3xl font-bold text-primary mb-2">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      }).format(estimatedValue.min)} - {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      }).format(estimatedValue.max)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Seu imóvel pode valer ainda mais com uma avaliação detalhada de um corretor especializado.
                    </p>
                  </div>

                  {/* Lead Form */}
                  <div className="space-y-4">
                    <h4 className="font-semibold">Receba uma Avaliação Completa Grátis</h4>
                    <div>
                      <Label htmlFor="nome">Nome completo *</Label>
                      <Input
                        id="nome"
                        value={leadData.nome}
                        onChange={(e) => setLeadData({ ...leadData, nome: e.target.value })}
                        placeholder="Seu nome completo"
                      />
                    </div>
                    <div>
                      <Label htmlFor="telefone">Telefone *</Label>
                      <Input
                        id="telefone"
                        value={leadData.telefone}
                        onChange={(e) => setLeadData({ ...leadData, telefone: e.target.value })}
                        placeholder="(62) 99999-9999"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">E-mail</Label>
                      <Input
                        id="email"
                        type="email"
                        value={leadData.email}
                        onChange={(e) => setLeadData({ ...leadData, email: e.target.value })}
                        placeholder="seu@email.com (opcional)"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStep === 1}
                >
                  Voltar
                </Button>
                
                {currentStep < 5 ? (
                  <Button
                    onClick={handleNext}
                    disabled={!canProceed()}
                  >
                    Continuar
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={!canProceed() || isSubmitting}
                  >
                    {isSubmitting ? 'Enviando...' : 'Receber Avaliação Completa'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AvaliarImovel;