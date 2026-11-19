import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Termos de Serviço",
  description:
    "Condições para criar uma conta e usar a Bodega Literária e suas integrações opcionais.",
  alternates: { canonical: "/termos" },
};

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-[1120px] flex-1 px-7 pt-12 pb-24 max-[640px]:px-5 max-[640px]:pt-8">
      <article className="max-w-[72ch]">
        <header className="mb-14 flex flex-col gap-5">
          <h1 className="m-0 text-balance font-bold font-title text-5xl leading-[1.05] max-[640px]:text-4xl">
            Termos de Serviço
          </h1>
          <p className="m-0 max-w-[62ch] text-lg text-mute leading-7">
            Estes termos definem as condições para criar uma conta e usar a
            Bodega Literária e suas integrações opcionais.
          </p>
          <p className="m-0 text-mute text-sm">
            Última atualização: 18 de novembro de 2026.
          </p>
        </header>

        <div className="flex flex-col gap-12 text-base leading-7">
          <section aria-labelledby="aceitacao" className="flex flex-col gap-4">
            <h2 className="m-0 font-bold font-title text-2xl" id="aceitacao">
              Aceitação
            </h2>
            <p className="m-0">
              Ao criar uma conta ou usar o aplicativo, você concorda com estes
              termos e com a{" "}
              <Link
                className="underline underline-offset-4"
                href="/privacidade"
              >
                Política de Privacidade
              </Link>
              . Se não concordar, não use o serviço.
            </p>
          </section>

          <section aria-labelledby="servico" className="flex flex-col gap-4">
            <h2 className="m-0 font-bold font-title text-2xl" id="servico">
              O serviço
            </h2>
            <p className="m-0">
              A Bodega Literária é um catálogo pessoal para registrar livros,
              acompanhar leituras e metas, consultar dados do acervo, exportar
              informações e, opcionalmente, compartilhar uma estante pública ou
              criar cópias no Google Sheets.
            </p>
          </section>

          <section aria-labelledby="conta" className="flex flex-col gap-4">
            <h2 className="m-0 font-bold font-title text-2xl" id="conta">
              Sua conta
            </h2>
            <p className="m-0">
              Você deve fornecer informações corretas, manter suas credenciais
              em segurança e avisar pelo canal de suporte publicado caso perceba
              uso não autorizado. Você responde pelas ações realizadas na sua
              conta, salvo quando a legislação aplicável determinar o contrário.
            </p>
          </section>

          <section
            aria-labelledby="uso-aceitavel"
            className="flex flex-col gap-4"
          >
            <h2
              className="m-0 font-bold font-title text-2xl"
              id="uso-aceitavel"
            >
              Uso aceitável
            </h2>
            <p className="m-0">
              Não use o serviço para violar leis ou direitos de terceiros,
              publicar conteúdo ilícito, tentar acessar contas ou dados alheios,
              contornar limites técnicos, interferir na operação do aplicativo
              ou automatizar requisições de forma abusiva.
            </p>
          </section>

          <section aria-labelledby="conteudo" className="flex flex-col gap-4">
            <h2 className="m-0 font-bold font-title text-2xl" id="conteudo">
              Seu conteúdo e a estante pública
            </h2>
            <p className="m-0">
              Você mantém a responsabilidade pelos dados que cadastra. Ao usar o
              serviço, autoriza o tratamento técnico necessário para armazenar,
              organizar, exibir e exportar esse conteúdo conforme suas escolhas.
            </p>
            <p className="m-0">
              A publicação da estante é opcional. Ao ativá-la, você autoriza a
              exibição pública dos campos descritos na Política de Privacidade e
              confirma que tem direito de compartilhar essas informações. Você
              pode tornar a estante privada novamente a qualquer momento.
            </p>
          </section>

          <section aria-labelledby="terceiros" className="flex flex-col gap-4">
            <h2 className="m-0 font-bold font-title text-2xl" id="terceiros">
              Serviços de terceiros
            </h2>
            <p className="m-0">
              Algumas funções dependem de serviços externos, como Google,
              provedores de hospedagem, banco de dados, e-mail, diagnóstico,
              inteligência artificial e catálogos de livros. O uso dessas
              funções também pode estar sujeito aos termos desses fornecedores.
              Não controlamos a disponibilidade ou as mudanças feitas por
              terceiros.
            </p>
          </section>

          <section
            aria-labelledby="disponibilidade"
            className="flex flex-col gap-4"
          >
            <h2
              className="m-0 font-bold font-title text-2xl"
              id="disponibilidade"
            >
              Disponibilidade e resultados
            </h2>
            <p className="m-0">
              Buscamos manter o serviço seguro e disponível, mas não garantimos
              operação ininterrupta, ausência total de erros ou permanência de
              recursos externos. Resultados de busca, capas e identificação por
              foto podem estar incompletos ou incorretos; revise as informações
              antes de salvá-las.
            </p>
            <p className="m-0">
              Faça exportações periódicas se os dados forem importantes para
              você. Na extensão permitida pela legislação aplicável, o serviço é
              oferecido no estado em que se encontra, sem garantia de adequação
              a uma finalidade específica.
            </p>
          </section>

          <section
            aria-labelledby="encerramento"
            className="flex flex-col gap-4"
          >
            <h2 className="m-0 font-bold font-title text-2xl" id="encerramento">
              Suspensão e encerramento
            </h2>
            <p className="m-0">
              Você pode excluir sua conta em <strong>Configurações</strong>.
              Podemos limitar ou encerrar o acesso em caso de abuso, risco de
              segurança, violação destes termos, exigência legal ou
              descontinuação do serviço. Quando razoável e permitido, buscaremos
              informar a pessoa afetada.
            </p>
            <p className="m-0">
              Excluir a conta não apaga automaticamente planilhas já criadas no
              seu Google Drive; você controla esses arquivos pela Conta Google.
            </p>
          </section>

          <section
            aria-labelledby="alteracoes-termos"
            className="flex flex-col gap-4"
          >
            <h2
              className="m-0 font-bold font-title text-2xl"
              id="alteracoes-termos"
            >
              Alterações destes termos
            </h2>
            <p className="m-0">
              Podemos atualizar estes termos para refletir mudanças no serviço
              ou em exigências legais. A data no início da página identifica a
              versão vigente. O uso continuado após a entrada em vigor de uma
              atualização representa aceitação dos novos termos, quando
              permitido por lei.
            </p>
          </section>

          <section aria-labelledby="contato" className="flex flex-col gap-4">
            <h2 className="m-0 font-bold font-title text-2xl" id="contato">
              Contato
            </h2>
            <p className="m-0">
              Para dúvidas sobre estes termos, use o e-mail de suporte publicado
              na tela de consentimento do Google.
            </p>
          </section>
        </div>

        <nav aria-label="Próximo documento" className="mt-16 text-sm">
          <Link className="font-semibold" href="/privacidade">
            Ler a Política de Privacidade
          </Link>
        </nav>
      </article>
    </main>
  );
}
