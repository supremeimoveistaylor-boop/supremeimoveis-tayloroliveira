import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const PoliticaPrivacidade = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-16 bg-background">
        <div className="container mx-auto px-4 max-w-4xl prose prose-lg dark:prose-invert">
          <h1 className="text-3xl md:text-4xl font-bold text-primary mb-2">Política de Privacidade</h1>
          <p className="text-muted-foreground mb-8">Supreme Empreendimentos / Supreme Imóveis — Última atualização: Fevereiro de 2026</p>

          <section className="space-y-6 text-foreground/90 leading-relaxed">
            <div>
              <h2 className="text-xl font-semibold text-primary">1. INTRODUÇÃO</h2>
              <p>A Supreme Empreendimentos / Supreme Imóveis respeita sua privacidade e está comprometida com a proteção dos dados pessoais de seus clientes, visitantes e parceiros.</p>
              <p>Esta Política de Privacidade explica como coletamos, utilizamos, armazenamos e protegemos suas informações, em conformidade com a Lei Geral de Proteção de Dados – LGPD (Lei nº 13.709/2018).</p>
              <p>Ao utilizar nosso site, landing pages, formulários ou chat, você concorda com os termos aqui descritos.</p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-primary">2. DADOS COLETADOS</h2>
              <h3 className="text-lg font-medium">2.1 Dados fornecidos pelo usuário:</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>Nome completo</li>
                <li>Telefone</li>
                <li>E-mail</li>
                <li>Informações sobre interesse em imóveis</li>
                <li>Dados financeiros informados para simulação (renda, valor do imóvel, financiamento)</li>
              </ul>
              <h3 className="text-lg font-medium mt-4">2.2 Dados coletados automaticamente:</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>Endereço IP</li>
                <li>Tipo de navegador</li>
                <li>Dispositivo utilizado</li>
                <li>Páginas acessadas</li>
                <li>Tempo de navegação</li>
                <li>Cookies e tecnologias similares</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-primary">3. FINALIDADE DO USO DOS DADOS</h2>
              <p>Os dados são utilizados para:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Atendimento via chat ou WhatsApp</li>
                <li>Agendamento de visitas</li>
                <li>Envio de propostas comerciais</li>
                <li>Simulações de financiamento</li>
                <li>Apresentação de imóveis compatíveis com seu perfil</li>
                <li>Cumprimento de obrigações legais</li>
                <li>Melhoria da experiência do usuário</li>
              </ul>
              <p className="font-semibold mt-2">Não vendemos nem comercializamos seus dados pessoais.</p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-primary">4. COMPARTILHAMENTO DE DADOS</h2>
              <p>Os dados poderão ser compartilhados apenas quando necessário com:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Instituições financeiras para simulação de crédito</li>
                <li>Parceiros comerciais envolvidos na negociação</li>
                <li>Plataformas de hospedagem e tecnologia</li>
                <li>Autoridades legais, quando exigido por lei</li>
              </ul>
              <p>Sempre respeitando os princípios da necessidade e segurança.</p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-primary">5. ARMAZENAMENTO E SEGURANÇA</h2>
              <p>Adotamos medidas técnicas e administrativas para proteger seus dados contra:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Acesso não autorizado</li>
                <li>Vazamentos</li>
                <li>Alteração indevida</li>
                <li>Destruição ou perda</li>
              </ul>
              <p>Os dados são armazenados pelo tempo necessário para cumprir as finalidades descritas nesta política.</p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-primary">6. DIREITOS DO TITULAR (LGPD)</h2>
              <p>Nos termos da LGPD, você pode solicitar:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Confirmação da existência de tratamento de dados</li>
                <li>Acesso aos seus dados</li>
                <li>Correção de dados incompletos ou desatualizados</li>
                <li>Exclusão de dados desnecessários</li>
                <li>Portabilidade dos dados</li>
                <li>Revogação do consentimento</li>
              </ul>
              <p>Para exercer seus direitos, entre em contato:</p>
              <p>📧 <a href="mailto:supremeimoveis.taylor@gmail.com" className="text-accent hover:underline">supremeimoveis.taylor@gmail.com</a></p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-primary">7. COOKIES</h2>
              <p>Utilizamos cookies para:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Melhorar a navegação</li>
                <li>Personalizar conteúdos</li>
                <li>Analisar métricas de acesso</li>
              </ul>
              <p>Você pode desativar cookies nas configurações do seu navegador.</p>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-primary">8. ALTERAÇÕES NA POLÍTICA</h2>
              <p>Esta Política pode ser atualizada a qualquer momento para adequação legal ou melhoria dos serviços.</p>
              <p>Recomendamos revisão periódica.</p>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PoliticaPrivacidade;
