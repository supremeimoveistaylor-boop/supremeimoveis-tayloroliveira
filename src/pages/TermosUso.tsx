import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const TermosUso = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-16 bg-background">
        <div className="container mx-auto px-4 max-w-4xl prose prose-lg dark:prose-invert">
          <h1 className="text-3xl md:text-4xl font-bold text-primary mb-2">Termos de Uso</h1>
          <p className="text-muted-foreground mb-8">Supreme Empreendimentos / Supreme Imóveis — Última atualização: Fevereiro de 2026</p>

          <section className="space-y-6 text-foreground/90 leading-relaxed">
            <div>
              <h2 className="text-xl font-semibold text-primary">1. ACEITAÇÃO DOS TERMOS</h2>
              <p>Ao acessar este site, utilizar o chat, preencher formulários ou solicitar simulações, você declara estar de acordo com estes Termos de Uso.</p>
              <p>Caso não concorde, não utilize os serviços.</p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-primary">2. OBJETO</h2>
              <p>O site tem como finalidade:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Divulgação de imóveis</li>
                <li>Captação de interessados</li>
                <li>Simulação de financiamento imobiliário</li>
                <li>Agendamento de visitas</li>
                <li>Atendimento comercial</li>
              </ul>
              <p>As informações apresentadas podem sofrer alterações sem aviso prévio.</p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-primary">3. SIMULAÇÕES</h2>
              <p>As simulações apresentadas:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>São estimativas</li>
                <li>Não representam proposta oficial de crédito</li>
                <li>Dependem de análise e aprovação da instituição financeira</li>
              </ul>
              <p>A aprovação está sujeita à análise de crédito e políticas internas dos bancos.</p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-primary">4. RESPONSABILIDADES DO USUÁRIO</h2>
              <p>O usuário se compromete a:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Fornecer informações verdadeiras</li>
                <li>Não utilizar o site para fins ilícitos</li>
                <li>Não tentar invadir, modificar ou comprometer o sistema</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-primary">5. PROPRIEDADE INTELECTUAL</h2>
              <p>Todo o conteúdo do site (textos, imagens, marcas, layout) é protegido por direitos autorais.</p>
              <p>É proibida a reprodução sem autorização.</p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-primary">6. LIMITAÇÃO DE RESPONSABILIDADE</h2>
              <p>A empresa não se responsabiliza por:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Decisões financeiras tomadas com base nas simulações</li>
                <li>Indisponibilidade temporária do sistema</li>
                <li>Informações fornecidas incorretamente pelo usuário</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-primary">7. LGPD E PROTEÇÃO DE DADOS</h2>
              <p>O tratamento de dados pessoais segue a Lei nº 13.709/2018 (LGPD), conforme detalhado na Política de Privacidade.</p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-primary">8. CONTATO</h2>
              <p>Dúvidas, solicitações ou questões jurídicas:</p>
              <p>📧 <a href="mailto:supremeimoveis.taylor@gmail.com" className="text-accent hover:underline">supremeimoveis.taylor@gmail.com</a></p>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TermosUso;
