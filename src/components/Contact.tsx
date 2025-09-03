import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, Mail, MapPin, Clock, MessageSquare, Instagram } from "lucide-react";

export const Contact = () => {
  return (
    <section id="contato" className="py-16 bg-white-soft">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
            Entre em <span className="text-accent">Contato</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Nossos especialistas estão prontos para ajudar você a encontrar o imóvel perfeito
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Contact Information */}
          <div className="lg:col-span-1">
            <Card className="bg-primary text-primary-foreground border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-accent text-xl">Informações de Contato</CardTitle>
                <p className="text-white-soft">
                  Estamos sempre disponíveis para atender você
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-start space-x-3">
                  <Phone className="h-5 w-5 text-accent mt-1" />
                  <div>
                    <p className="font-medium text-white-soft">Telefone</p>
                    <p className="text-gray-300">(62) 99991-8353</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Mail className="h-5 w-5 text-accent mt-1" />
                  <div>
                    <p className="font-medium text-white-soft">E-mail</p>
                    <p className="text-gray-300">supremeimoveis.taylor@gmail.com</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <MapPin className="h-5 w-5 text-accent mt-1" />
                  <div>
                    <p className="font-medium text-white-soft">Endereço</p>
                    <p className="text-gray-300">
                      Goiânia - Goiás<br />
                      CEP: 74000-000
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Clock className="h-5 w-5 text-accent mt-1" />
                  <div>
                    <p className="font-medium text-white-soft">Horário de Funcionamento</p>
                    <p className="text-gray-300">
                      Segunda a Sexta: 8h às 18h<br />
                      Sábado: 8h às 12h
                    </p>
                  </div>
                </div>

                <div className="pt-4 space-y-3">
                  <Button 
                    className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold"
                    onClick={() => window.open('https://wa.me/5562999918353', '_blank')}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    WhatsApp
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full border-accent text-accent hover:bg-accent hover:text-accent-foreground font-semibold"
                    onClick={() => window.open('https://instagram.com/supremeimoveis', '_blank')}
                  >
                    <Instagram className="h-4 w-4 mr-2" />
                    Instagram
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact Forms */}
          <div className="lg:col-span-2 space-y-6">
            {/* Interest Form */}
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="text-primary">Tenho Interesse em um Imóvel</CardTitle>
                <p className="text-muted-foreground">
                  Preencha o formulário e entraremos em contato
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <Input placeholder="Seu nome completo" />
                  <Input placeholder="Seu telefone" />
                </div>
                <Input placeholder="Seu e-mail" />
                
                <div className="grid md:grid-cols-2 gap-4">
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Tipo de imóvel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="casa">Casa</SelectItem>
                      <SelectItem value="apartamento">Apartamento</SelectItem>
                      <SelectItem value="rural">Propriedade Rural</SelectItem>
                      <SelectItem value="terreno">Terreno</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Finalidade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="comprar">Comprar</SelectItem>
                      <SelectItem value="alugar">Alugar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Textarea placeholder="Descreva o imóvel que você procura (localização, características, orçamento...)" rows={4} />
                
                <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
                  Enviar Interesse
                </Button>
              </CardContent>
            </Card>

            {/* Advertise Property Form */}
            <Card className="shadow-lg border-0 bg-accent/5">
              <CardHeader>
                <CardTitle className="text-primary">Quero Anunciar meu Imóvel</CardTitle>
                <p className="text-muted-foreground">
                  Avaliação gratuita e publicidade profissional
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <Input placeholder="Seu nome completo" />
                  <Input placeholder="Seu telefone" />
                </div>
                <Input placeholder="Seu e-mail" />
                
                <div className="grid md:grid-cols-2 gap-4">
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Tipo do imóvel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="casa">Casa</SelectItem>
                      <SelectItem value="apartamento">Apartamento</SelectItem>
                      <SelectItem value="rural">Propriedade Rural</SelectItem>
                      <SelectItem value="terreno">Terreno</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Input placeholder="Localização do imóvel" />
                </div>

                <Textarea placeholder="Descreva seu imóvel (características, valor desejado, motivo da venda...)" rows={4} />
                
                <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold">
                  Solicitar Avaliação Gratuita
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};