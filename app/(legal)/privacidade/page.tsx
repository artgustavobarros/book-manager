import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description:
    "Saiba quais dados a Bodega Literária trata, por que eles são usados e como controlar ou excluir suas informações.",
  alternates: { canonical: "/privacidade" },
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-[1120px] flex-1 px-7 pt-12 pb-24 max-[640px]:px-5 max-[640px]:pt-8">
      <article className="max-w-[72ch]">
        <header className="mb-14 flex flex-col gap-5">
          <h1 className="m-0 text-balance font-bold font-title text-5xl leading-[1.05] max-[640px]:text-4xl">
            Política de Privacidade
          </h1>
          <p className="m-0 max-w-[62ch] text-lg text-mute leading-7">
            Esta política explica como a Bodega Literária trata seus dados ao
            organizar o acervo, autenticar sua conta e usar integrações
            opcionais.
          </p>
          <p className="m-0 text-mute text-sm">
            Última atualização: 18 de novembro de 2026.
          </p>
        </header>

        <div className="flex flex-col gap-12 text-base leading-7">
          <section
            aria-labelledby="dados-coletados"
            className="flex flex-col gap-4"
          >
            <h2
              className="m-0 font-bold font-title text-2xl"
              id="dados-coletados"
            >
              Dados que tratamos
            </h2>
            <p className="m-0">
              Para criar e proteger sua conta, tratamos nome, endereço de
              e-mail, senha em formato de hash, dados de sessão e o status de
              verificação do e-mail. A senha original não é armazenada.
            </p>
            <p className="m-0">
              Para prestar o serviço, armazenamos os livros cadastrados, metas
              de leitura, preferências, configurações e informações necessárias
              às integrações que você ativar. Também podemos receber dados
              técnicos de segurança e diagnóstico, como endereço IP, navegador,
              data do acesso e detalhes de erros.
            </p>
          </section>

          <section
            aria-labelledby="finalidades"
            className="flex flex-col gap-4"
          >
            <h2 className="m-0 font-bold font-title text-2xl" id="finalidades">
              Como usamos os dados
            </h2>
            <p className="m-0">
              Usamos os dados para autenticar sua conta, manter e exibir seu
              acervo, gerar estatísticas, exportações e cópias solicitadas,
              enviar e-mails de segurança, prevenir abuso e corrigir falhas. Não
              vendemos dados pessoais nem os usamos para publicidade
              comportamental.
            </p>
          </section>

          <section aria-labelledby="google" className="flex flex-col gap-4">
            <h2 className="m-0 font-bold font-title text-2xl" id="google">
              Google: login, Drive e Sheets
            </h2>
            <p className="m-0">
              Se você entrar com Google, recebemos os dados básicos de
              identidade disponibilizados por essa conta, como nome, e-mail e
              identificador. Se ativar a cópia semanal no Google Sheets,
              solicitamos o escopo{" "}
              <code className="rounded bg-soft px-1.5 py-0.5 text-sm">
                drive.file
              </code>
              , que permite criar e manter arquivos usados com o aplicativo sem
              dar acesso geral ao seu Google Drive.
            </p>
            <p className="m-0">
              Os tokens de autorização são armazenados de forma criptografada. A
              planilha recebe um retrato semanal dos livros do acervo; metas e
              demais configurações não são exportadas. Você pode desconectar a
              integração em <strong>Minha conta</strong> e revogar o acesso nas
              configurações da sua Conta Google.
            </p>
            <p className="m-0">
              O uso e a transferência de informações recebidas das APIs do
              Google seguem a{" "}
              <a
                className="underline underline-offset-4"
                href="https://developers.google.com/terms/api-services-user-data-policy"
              >
                Política de Dados do Usuário dos Serviços de API do Google
              </a>
              , inclusive os requisitos de Uso Limitado.
            </p>
          </section>

          <section aria-labelledby="fotos" className="flex flex-col gap-4">
            <h2 className="m-0 font-bold font-title text-2xl" id="fotos">
              Identificação de livros por foto
            </h2>
            <p className="m-0">
              Quando você escolhe identificar um livro por foto, o navegador
              reduz a imagem, converte-a para JPEG e remove metadados antes do
              envio. A imagem é processada pelo OpenRouter e pelo provedor do
              modelo selecionado. O aplicativo não mantém uma cópia da foto.
            </p>
            <p className="m-0">
              Por padrão, a solicitação exige um provedor que negue coleta de
              dados. Se outra política estiver habilitada no ambiente, ela é
              mostrada antes do envio. As regras de retenção e tratamento do
              provedor também se aplicam ao processamento.
            </p>
          </section>

          <section
            aria-labelledby="compartilhamento"
            className="flex flex-col gap-4"
          >
            <h2
              className="m-0 font-bold font-title text-2xl"
              id="compartilhamento"
            >
              Estante pública e compartilhamento
            </h2>
            <p className="m-0">
              A estante começa privada. Se você decidir publicá-la, visitantes
              poderão ver seu nome e, dos livros elegíveis, capa, título, autor,
              gênero, páginas, editora, ano e estado de leitura. Anotações,
              empréstimos, datas de aquisição e livros marcados como doados não
              são publicados. Você pode tornar a estante privada novamente a
              qualquer momento.
            </p>
          </section>

          <section
            aria-labelledby="fornecedores"
            className="flex flex-col gap-4"
          >
            <h2 className="m-0 font-bold font-title text-2xl" id="fornecedores">
              Fornecedores e serviços externos
            </h2>
            <p className="m-0">
              Usamos fornecedores somente para operar funções do aplicativo:
              Vercel para hospedagem, Neon para banco de dados, serviços de
              e-mail, Sentry para diagnóstico de erros, Google para autenticação
              e cópias no Sheets, OpenRouter e seus provedores para leitura de
              fotos, além de catálogos públicos de livros e capas. Cada serviço
              trata dados conforme seus próprios termos e políticas.
            </p>
          </section>

          <section aria-labelledby="cookies" className="flex flex-col gap-4">
            <h2 className="m-0 font-bold font-title text-2xl" id="cookies">
              Cookies e armazenamento local
            </h2>
            <p className="m-0">
              Usamos cookies e armazenamento do navegador necessários à sessão,
              ao tema, ao fuso horário e às preferências do aplicativo. Não
              usamos esses recursos para publicidade comportamental.
            </p>
          </section>

          <section aria-labelledby="retencao" className="flex flex-col gap-4">
            <h2 className="m-0 font-bold font-title text-2xl" id="retencao">
              Retenção e segurança
            </h2>
            <p className="m-0">
              Mantemos os dados da conta enquanto ela estiver ativa e pelo tempo
              necessário para operar, proteger e cumprir obrigações aplicáveis.
              Provedores de infraestrutura podem conservar logs e cópias de
              segurança segundo suas próprias políticas. Aplicamos controles
              como hash de senha, sessão protegida e criptografia dos tokens do
              Google, mas nenhum sistema é totalmente imune a incidentes.
            </p>
          </section>

          <section aria-labelledby="controles" className="flex flex-col gap-4">
            <h2 className="m-0 font-bold font-title text-2xl" id="controles">
              Seus controles e direitos
            </h2>
            <p className="m-0">
              Pelo aplicativo, você pode corrigir dados da conta, exportar o
              acervo em CSV ou JSON, desligar a estante pública, desconectar o
              Google e excluir a conta. A exclusão remove do aplicativo a conta,
              o acervo e as configurações associadas. Planilhas já criadas
              permanecem no seu Google Drive e podem ser apagadas por você.
            </p>
            <p className="m-0">
              Para solicitações de privacidade, use o e-mail de suporte
              publicado na tela de consentimento do Google. Podemos precisar
              confirmar sua identidade antes de atender um pedido relacionado à
              conta.
            </p>
          </section>

          <section aria-labelledby="alteracoes" className="flex flex-col gap-4">
            <h2 className="m-0 font-bold font-title text-2xl" id="alteracoes">
              Alterações desta política
            </h2>
            <p className="m-0">
              Esta política pode mudar quando o serviço, as integrações ou as
              exigências legais mudarem. A data no início da página indica a
              versão vigente.
            </p>
          </section>
        </div>

        <nav aria-label="Próximo documento" className="mt-16 text-sm">
          <Link className="font-semibold" href="/termos">
            Ler os Termos de Serviço
          </Link>
        </nav>
      </article>
    </main>
  );
}
